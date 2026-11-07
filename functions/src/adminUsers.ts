import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { getFirebaseAdminApp, resolveFirestoreDatabaseId } from './runtimeConfig.js';

const app = getFirebaseAdminApp();
const db = getFirestore(app, resolveFirestoreDatabaseId());
const auth = getAuth(app);

type Request = { auth?: { uid: string; token: Record<string, unknown> } | null; data?: Record<string, unknown> };

function requireReviewer(request: Request): string {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in to access the admin dashboard.');
  const token = request.auth.token || {};
  const role = typeof token.role === 'string' ? token.role : '';
  if (!(token.moderator === true || token.admin === true
    || ['moderator', 'senior_moderator', 'admin', 'founder'].includes(role))) {
    throw new HttpsError('permission-denied', 'Admin dashboard access is required.');
  }
  return request.auth.uid;
}

function requireAdmin(request: Request): string {
  const uid = requireReviewer(request);
  const token = request.auth?.token || {};
  if (!(token.admin === true || ['admin', 'founder'].includes(String(token.role || '')))) {
    throw new HttpsError('permission-denied', 'Administrator access is required for account management.');
  }
  return uid;
}

function requireFounder(request: Request): string {
  const uid = requireAdmin(request);
  const token = request.auth?.token || {};
  if (!(token.founder === true || token.role === 'founder')) {
    throw new HttpsError('permission-denied', 'Only the founder can change administrator roles.');
  }
  return uid;
}

function validUid(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9._:-]{1,160}$/.test(value);
}

export const listAdminUsers = onCall({ maxInstances: 5 }, async request => {
  requireReviewer(request);
  const token = request.auth?.token || {};
  const canManage = token.admin === true || ['admin', 'founder'].includes(String(token.role || ''));
  const canManageRoles = token.founder === true || token.role === 'founder';
  try {
    const snapshot = await db.collection('users').orderBy('createdAt', 'desc').limit(200).get();
    const users = await Promise.all(snapshot.docs.map(async item => {
      const data = item.data();
      const status = await db.collection('accountStatus').doc(item.id).get();
      const account = status.data() || {};
      return {
        id: item.id,
        username: String(data.username || ''),
        name: String(data.name || 'NEXORA member'),
        avatar: String(data.avatar || ''),
        ...(canManage && typeof data.email === 'string' ? { email: data.email } : {}),
        role: String(data.role || 'user'),
        isVerified: data.isVerified === true,
        isBanned: account.banned === true || data.isBanned === true,
        isSuspended: account.suspended === true || data.isSuspended === true,
        reputationPoints: Number.isSafeInteger(data.reputationPoints) && data.reputationPoints >= 0 ? data.reputationPoints : 0,
        reputationBreakdown: data.reputationBreakdown && typeof data.reputationBreakdown === 'object'
          ? data.reputationBreakdown : { contributions: 0, helpfulness: 0, missionsCompleted: 0, skillsVerified: 0 },
      };
    }));
    return { users, permissions: { canManage, canManageRoles } };
  } catch {
    throw new HttpsError('unavailable', 'The protected user directory is temporarily unavailable.');
  }
});

export const updateAdminUser = onCall({ maxInstances: 5 }, async request => {
  const data = request.data || {};
  const action = data.action;
  const targetUid = data.targetUid;
  if (!validUid(targetUid)) throw new HttpsError('invalid-argument', 'A valid target account is required.');

  if (action === 'role') {
    const actorUid = requireFounder(request);
    const role = data.role;
    if (!['admin', 'user'].includes(String(role))) throw new HttpsError('invalid-argument', 'Choose a supported account role.');
    if (actorUid === targetUid) throw new HttpsError('failed-precondition', 'You cannot change your own administrator role.');
    const userRef = db.collection('users').doc(targetUid);
    const target = await userRef.get();
    if (!target.exists) throw new HttpsError('not-found', 'The target account does not exist.');
    if (target.get('username') === 'voh' || target.get('role') === 'founder') {
      throw new HttpsError('permission-denied', 'The founder account cannot be changed.');
    }
    const authUser = await auth.getUser(targetUid);
    if (authUser.customClaims?.role === 'founder' || authUser.customClaims?.founder === true) {
      throw new HttpsError('permission-denied', 'The founder account cannot be changed.');
    }
    const previousClaims = authUser.customClaims || {};
    const nextClaims: Record<string, unknown> = { ...previousClaims, role };
    if (role === 'admin') nextClaims.admin = true;
    else delete nextClaims.admin;
    await auth.setCustomUserClaims(targetUid, nextClaims);
    try {
      await db.runTransaction(async transaction => {
        const current = await transaction.get(userRef);
        if (!current.exists || current.get('username') === 'voh' || current.get('role') === 'founder') {
          throw new HttpsError('failed-precondition', 'The target account changed during this operation.');
        }
        transaction.update(userRef, { role, updatedAt: FieldValue.serverTimestamp() });
        transaction.create(db.collection('adminAuditEvents').doc(), {
          actorUid, targetUid, action: 'role_changed', previousRole: current.get('role') || 'user',
          newRole: role, createdAt: FieldValue.serverTimestamp(),
        });
      });
    } catch (error) {
      await auth.setCustomUserClaims(targetUid, previousClaims);
      throw error;
    }
    return { updated: true, targetUid, role };
  }

  const actorUid = requireAdmin(request);
  const userRef = db.collection('users').doc(targetUid);
  const statusRef = db.collection('accountStatus').doc(targetUid);
  if (action === 'reset_reputation') {
    await db.runTransaction(async transaction => {
      const target = await transaction.get(userRef);
      if (!target.exists) throw new HttpsError('not-found', 'The target account does not exist.');
      transaction.update(userRef, {
        reputationPoints: 0,
        reputationBreakdown: { contributions: 0, helpfulness: 0, missionsCompleted: 0, skillsVerified: 0 },
        updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.create(db.collection('adminAuditEvents').doc(), {
        actorUid, targetUid, action: 'reputation_reset', createdAt: FieldValue.serverTimestamp(),
      });
    });
    return { updated: true, targetUid, reputationPoints: 0 };
  }

  if (action !== 'ban' && action !== 'suspend') {
    throw new HttpsError('invalid-argument', 'A supported account-management action is required.');
  }
  const enabled = data.enabled;
  if (typeof enabled !== 'boolean') throw new HttpsError('invalid-argument', 'The new restriction state is required.');
  if (targetUid === actorUid) throw new HttpsError('failed-precondition', 'You cannot restrict your own administrator account.');
  if (action === 'ban') {
    const target = await userRef.get();
    if (target.get('username') === 'voh' || target.get('role') === 'founder') {
      throw new HttpsError('permission-denied', 'The founder account cannot be restricted.');
    }
  }
  await db.runTransaction(async transaction => {
    const [target, currentStatus] = await Promise.all([transaction.get(userRef), transaction.get(statusRef)]);
    if (!target.exists) throw new HttpsError('not-found', 'The target account does not exist.');
    if (target.get('username') === 'voh' || target.get('role') === 'founder') {
      throw new HttpsError('permission-denied', 'The founder account cannot be restricted.');
    }
    const status = currentStatus.data() || {};
    const banned = action === 'ban' ? enabled : status.banned === true;
    const suspended = action === 'suspend' ? enabled : status.suspended === true;
    const restricted = banned || suspended;
    transaction.set(statusRef, {
      accountId: targetUid,
      banned,
      suspended,
      postingRestricted: restricted,
      messagingRestricted: restricted,
      giftingRestricted: restricted,
      expiresAt: null,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: actorUid,
      source: 'admin_user_management',
    }, { merge: true });
    transaction.update(userRef, {
      isBanned: banned,
      isSuspended: suspended,
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.create(db.collection('adminAuditEvents').doc(), {
      actorUid, targetUid, action: action + (enabled ? '_enabled' : '_disabled'),
      createdAt: FieldValue.serverTimestamp(),
    });
  });
  return { updated: true, targetUid, action, enabled };
});
