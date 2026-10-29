import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { CATALOG } from './monetizationPolicy.js';
import { resolveFirestoreDatabaseId } from './runtimeConfig.js';

const app = getApps().find(candidate => candidate.name === '[DEFAULT]') || initializeApp();
const db = getFirestore(app, resolveFirestoreDatabaseId());
// No provider adapter is shipped in this repository. Secrets alone never activate checkout.
const providerConfigured = false;

function requireAuth(request: { auth?: { uid: string } | null }): string {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in before managing billing.');
  return request.auth.uid;
}

function hasFinanceClaim(request: { auth?: { token?: Record<string, unknown> } | null }): boolean {
  const token = request.auth?.token || {};
  return token.finance_admin === true || token.admin === true || token.role === 'finance_admin' || token.role === 'founder';
}

export const getMonetizationCatalog = onCall(async (request) => {
  requireAuth(request);
  return {
    providerConfigured,
    checkoutEnabled: providerConfigured,
    currencyPolicy: 'minor_units',
    products: CATALOG.filter(product => product.available && providerConfigured).map(product => ({
      id: product.id,
      name: product.name,
      description: product.description,
      amountMinor: product.amountMinor,
      currency: product.currency,
      interval: product.interval,
      entitlements: product.entitlements,
      version: product.version,
    })),
  };
});

export const createCheckoutSession = onCall(async (request) => {
  requireAuth(request);
  if (!providerConfigured) throw new HttpsError('failed-precondition', 'Checkout is not enabled until Nexora payment provider configuration is complete.');
  throw new HttpsError('unavailable', 'The payment provider checkout adapter is not configured. No payment was created.');
});

export const getBillingSummary = onCall(async (request) => {
  const uid = requireAuth(request);
  const [transactions, subscriptions, entitlements] = await Promise.all([
    db.collection('financialTransactions').where('ownerId', '==', uid).orderBy('createdAt', 'desc').limit(25).get(),
    db.collection('subscriptions').where('ownerId', '==', uid).limit(10).get(),
    db.collection('entitlements').where('ownerId', '==', uid).limit(50).get(),
  ]);
  return {
    transactions: transactions.docs.map(snapshot => {
      const data = snapshot.data();
      return { id: snapshot.id, productId: data.productId, amountMinor: data.amountMinor, currency: data.currency, status: data.status, createdAt: data.createdAt?.toDate?.()?.toISOString() || null, safeReference: data.safeReference || snapshot.id };
    }),
    subscriptions: subscriptions.docs.map(snapshot => {
      const data = snapshot.data();
      return { id: snapshot.id, productId: data.productId, status: data.status, interval: data.interval, currentPeriodEnd: data.currentPeriodEnd?.toDate?.()?.toISOString() || null, cancelAtPeriodEnd: data.cancelAtPeriodEnd === true };
    }),
    entitlements: entitlements.docs.map(snapshot => ({ id: snapshot.id, key: snapshot.data().key, status: snapshot.data().status, expiresAt: snapshot.data().expiresAt?.toDate?.()?.toISOString() || null })),
    providerConfigured,
  };
});

export const getFinanceOverview = onCall(async (request) => {
  requireAuth(request);
  if (!hasFinanceClaim(request)) throw new HttpsError('permission-denied', 'Finance access requires a finance administrator claim.');
  const [transactions, checkoutAttempts, webhookFailures] = await Promise.all([
    db.collection('financialTransactions').orderBy('createdAt', 'desc').limit(100).get(),
    db.collection('checkoutAttempts').orderBy('createdAt', 'desc').limit(100).get(),
    db.collection('paymentWebhookFailures').orderBy('createdAt', 'desc').limit(50).get(),
  ]);
  return {
    providerConfigured,
    transactions: transactions.docs.map(snapshot => ({ id: snapshot.id, ...snapshot.data(), ownerId: undefined })),
    checkoutAttempts: checkoutAttempts.docs.map(snapshot => ({ id: snapshot.id, productId: snapshot.data().productId, status: snapshot.data().status, createdAt: snapshot.data().createdAt?.toDate?.()?.toISOString() || null })),
    webhookFailures: webhookFailures.docs.map(snapshot => ({ id: snapshot.id, eventType: snapshot.data().eventType, reason: snapshot.data().reason, createdAt: snapshot.data().createdAt?.toDate?.()?.toISOString() || null })),
  };
});
