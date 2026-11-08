import { createHash } from 'node:crypto';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { defineSecret } from 'firebase-functions/params';
import { onRequest } from 'firebase-functions/v2/https';
import { getFirebaseAdminApp, resolveFirestoreDatabaseId } from './runtimeConfig.js';
import { verifyPaystackWebhookSignature } from './paystackProvider.js';

const PAYSTACK_SECRET_KEY = defineSecret('PAYSTACK_SECRET_KEY');
const PAYSTACK_WEBHOOK_SECRET = defineSecret('PAYSTACK_WEBHOOK_SECRET');
const db = getFirestore(getFirebaseAdminApp(), resolveFirestoreDatabaseId());

export const receivePaystackPayoutWebhook = onRequest({
  maxInstances: 10,
  secrets: [PAYSTACK_SECRET_KEY, PAYSTACK_WEBHOOK_SECRET],
}, async (request, response) => {
  if (request.method !== 'POST') {
    response.set('Allow', 'POST').status(405).send('Method not allowed');
    return;
  }
  const rawBody = request.rawBody;
  if (!Buffer.isBuffer(rawBody) || rawBody.length === 0 || rawBody.length > 256 * 1024) {
    response.status(400).send('Invalid webhook body');
    return;
  }
  const valid = verifyPaystackWebhookSignature(
    rawBody,
    request.header('paystack-signature'),
    request.header('x-paystack-signature'),
    PAYSTACK_WEBHOOK_SECRET.value(),
    PAYSTACK_SECRET_KEY.value(),
  );
  if (!valid) {
    response.status(401).send('Invalid webhook signature');
    return;
  }

  let event: Record<string, any>;
  try {
    const parsed = JSON.parse(rawBody.toString('utf8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('invalid');
    event = parsed;
  } catch {
    response.status(400).send('Invalid webhook event');
    return;
  }
  if (event.event === 'ping') {
    response.status(200).send('ok');
    return;
  }
  const transferEvents = new Set(['transfer.success', 'transfer.failed', 'transfer.reversed']);
  if (typeof event.event !== 'string' || !transferEvents.has(event.event)) {
    response.status(200).send('Event ignored');
    return;
  }
  const data = event.data;
  if (!data || typeof data !== 'object' || typeof data.reference !== 'string'
    || !/^[a-z0-9_-]{16,50}$/.test(data.reference)
    || !Number.isSafeInteger(data.amount) || data.amount < 0
    || data.currency !== 'NGN' || typeof data.status !== 'string') {
    response.status(400).send('Invalid transfer event');
    return;
  }

  const eventHash = createHash('sha256').update(rawBody).digest('hex');
  const eventRef = db.collection('paystackWebhookEvents').doc(eventHash);
  try {
    await db.runTransaction(async transaction => {
      const existing = await transaction.get(eventRef);
      if (existing.exists) return;
      transaction.create(eventRef, {
        eventHash,
        eventType: event.event,
        reference: data.reference,
        transferCode: typeof data.transfer_code === 'string' ? data.transfer_code.slice(0, 100) : null,
        providerTransferId: typeof data.id === 'number' && Number.isSafeInteger(data.id) ? data.id : null,
        amountMinor: data.amount,
        currency: 'NGN',
        providerStatus: data.status.slice(0, 40),
        processingState: 'received',
        receivedAt: FieldValue.serverTimestamp(),
      });
    });
    response.status(200).send('ok');
  } catch {
    // Non-2xx tells Paystack to retry; event writes are idempotent by raw-body hash.
    response.status(500).send('Webhook persistence failed');
  }
});
