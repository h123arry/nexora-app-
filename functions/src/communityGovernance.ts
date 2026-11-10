import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { randomUUID } from 'node:crypto';

const ID_LIMIT = 150;
const REASON_LIMIT = 500;
const ASSIGNABLE_ROLES = new Set(['admin', 'moderator', 'member']);

function validId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= ID_LIMIT && !value.includes('/');
}

/**
 * Circle owners are the only principals allowed to delegate Circle roles.
 * The membership document is the canonical role source; public community
 * arrays are deliberately not treated as authorization data.
 */
export async function setCircleMemberRole(
  db: Firestore,
  actorUid: string,
  communityId: string,
  targetUid: string,
  role: string,
  reason: string,
): Promise<{ userId: string; role: string }> {
  if (!actorUid || !validId(communityId) || !validId(targetUid)
    || actorUid === targetUid || !ASSIGNABLE_ROLES.has(role)
    || typeof reason !== 'string' || reason.trim().length < 3 || reason.trim().length > REASON_LIMIT) {
    throw new Error('A valid member, role, and reason are required.');
  }

  const communityRef = db.collection('communities').doc(communityId);
  const actorRef = communityRef.collection('members').doc(actorUid);
  const targetRef = communityRef.collection('members').doc(targetUid);
  const auditRef = communityRef.collection('auditEvents').doc(randomUUID());

  await db.runTransaction(async transaction => {
    const [community, actor, target] = await Promise.all([
      transaction.get(communityRef),
      transaction.get(actorRef),
      transaction.get(targetRef),
    ]);

    if (!community.exists || community.get('ownerId') !== actorUid
      || !actor.exists || actor.get('status') !== 'active' || actor.get('role') !== 'owner') {
      throw new Error('Only the active Circle owner can delegate roles.');
    }
    if (!target.exists || target.get('status') !== 'active') {
      throw new Error('The target must be an active Circle member.');
    }
    if (target.get('role') === 'owner') {
      throw new Error('Circle ownership cannot be changed through role delegation.');
    }

    const previousRole = String(target.get('role') || 'member');
    const admins = Array.isArray(community.get('admins')) ? community.get('admins') as string[] : [];
    const moderators = Array.isArray(community.get('moderators')) ? community.get('moderators') as string[] : [];
    const nextAdmins = admins.filter(uid => uid !== targetUid);
    const nextModerators = moderators.filter(uid => uid !== targetUid);
    if (role === 'admin') nextAdmins.push(targetUid);
    if (role === 'moderator') nextModerators.push(targetUid);
    transaction.update(targetRef, { role });
    transaction.update(communityRef, { admins: nextAdmins, moderators: nextModerators });
    transaction.create(auditRef, {
      id: auditRef.id,
      actorUid,
      targetUid,
      action: 'member_role_changed',
      previousRole,
      newRole: role,
      reason: reason.trim(),
      createdAt: new Date(),
    });
  });

  return { userId: targetUid, role };
}


export async function moderateCircleMember(
  db: Firestore,
  actorUid: string,
  communityId: string,
  targetUid: string,
  action: 'mute' | 'unmute',
  durationMinutes: number,
  reason: string,
): Promise<{ userId: string; action: 'mute' | 'unmute'; mutedUntil: string | null }> {
  const cleanReason = typeof reason === 'string' ? reason.trim() : '';
  if (!validId(actorUid) || !validId(communityId) || !validId(targetUid)
    || actorUid === targetUid || !['mute', 'unmute'].includes(action)
    || cleanReason.length < 3 || cleanReason.length > REASON_LIMIT
    || (action === 'mute' && ![60, 1440, 10080].includes(durationMinutes))) {
    throw new Error('A valid Circle member, moderation action, duration and reason are required.');
  }
  const communityRef = db.collection('communities').doc(communityId);
  const actorRef = communityRef.collection('members').doc(actorUid);
  const targetRef = communityRef.collection('members').doc(targetUid);
  const auditRef = communityRef.collection('auditEvents').doc(randomUUID());
  const now = new Date();
  const mutedUntil = action === 'mute' ? new Date(now.getTime() + durationMinutes * 60_000) : null;

  await db.runTransaction(async tx => {
    const [community, actor, target] = await Promise.all([
      tx.get(communityRef), tx.get(actorRef), tx.get(targetRef),
    ]);
    const actorRole = String(actor.get('role') || '');
    const targetRole = String(target.get('role') || 'member');
    const isOwner = community.exists && community.get('ownerId') === actorUid && actorRole === 'owner';
    if (!community.exists || !actor.exists || actor.get('status') !== 'active'
      || !['owner', 'admin', 'moderator'].includes(actorRole)
      || (actorRole === 'owner' && !isOwner)) {
      throw new Error('Only an active Circle owner, admin or moderator can mute members.');
    }
    if (!target.exists || target.get('status') !== 'active') {
      throw new Error('The target must be an active Circle member.');
    }
    if (targetRole === 'owner' || targetUid === community.get('ownerId')) {
      throw new Error('Circle ownership cannot be muted.');
    }
    if (!isOwner && targetRole !== 'member') {
      throw new Error('Only the Circle owner can moderate another manager.');
    }

    if (action === 'mute') {
      tx.update(targetRef, {
        mutedUntil, mutedBy: actorUid, mutedAt: now, muteReason: cleanReason,
      });
    } else {
      tx.update(targetRef, {
        mutedUntil: FieldValue.delete(), mutedBy: FieldValue.delete(),
        mutedAt: FieldValue.delete(), muteReason: FieldValue.delete(),
      });
    }
    tx.create(auditRef, {
      id: auditRef.id, actorUid, targetUid,
      action: action === 'mute' ? 'member_muted' : 'member_unmuted',
      durationMinutes: action === 'mute' ? durationMinutes : null,
      reason: cleanReason, createdAt: now,
    });
  });
  return { userId: targetUid, action, mutedUntil: mutedUntil ? mutedUntil.toISOString() : null };
}
