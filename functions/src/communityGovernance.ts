import type { Firestore } from 'firebase-admin/firestore';
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


const MODERATION_ACTIONS = new Set(['remove', 'ban', 'unban']);
const ROLE_POWER: Record<string, number> = { owner: 4, admin: 3, moderator: 2, member: 1 };

export async function moderateCircleMember(
  db: Firestore,
  actorUid: string,
  communityId: string,
  targetUid: string,
  action: string,
  reason: string,
): Promise<{ userId: string; action: string; status: string }> {
  if (!actorUid || !validId(communityId) || !validId(targetUid) || actorUid === targetUid
    || !MODERATION_ACTIONS.has(action) || typeof reason !== 'string'
    || reason.trim().length < 3 || reason.trim().length > REASON_LIMIT) {
    throw new Error('A valid member, moderation action, and reason are required.');
  }

  const communityRef = db.collection('communities').doc(communityId);
  const actorRef = communityRef.collection('members').doc(actorUid);
  const targetRef = communityRef.collection('members').doc(targetUid);
  const banRef = communityRef.collection('bans').doc(targetUid);
  const auditRef = communityRef.collection('auditEvents').doc(randomUUID());

  const status = await db.runTransaction(async transaction => {
    const [community, actor, target, ban] = await Promise.all([
      transaction.get(communityRef),
      transaction.get(actorRef),
      transaction.get(targetRef),
      transaction.get(banRef),
    ]);
    if (!community.exists || !actor.exists || actor.get('status') !== 'active'
      || !['owner', 'admin', 'moderator'].includes(String(actor.get('role') || ''))) {
      throw new Error('Only active Circle managers can moderate members.');
    }

    const actorRole = String(actor.get('role'));
    const targetRole = action === 'unban'
      ? String(ban.get('previousRole') || 'member')
      : String(target.get('role') || 'member');
    if (targetRole === 'owner' || (ROLE_POWER[targetRole] || 0) >= ROLE_POWER[actorRole]) {
      throw new Error('You cannot moderate a member with an equal or higher role.');
    }

    if (action === 'unban') {
      if (!ban.exists) throw new Error('This member is not banned from the Circle.');
      transaction.delete(banRef);
      transaction.create(auditRef, {
        id: auditRef.id, actorUid, targetUid, action: 'member_unbanned',
        previousRole: targetRole, reason: reason.trim(), createdAt: new Date(),
      });
      return 'unbanned';
    }

    if (!target.exists || target.get('status') !== 'active') {
      throw new Error('The target must be an active Circle member.');
    }
    if (ban.exists) throw new Error('This member is already banned from the Circle.');

    if (action === 'ban') {
      transaction.create(banRef, {
        userId: targetUid,
        bannedBy: actorUid,
        bannedByRole: actorRole,
        previousRole: targetRole,
        reason: reason.trim(),
        createdAt: new Date(),
      });
    }
    transaction.delete(targetRef);
    transaction.create(auditRef, {
      id: auditRef.id, actorUid, targetUid,
      action: action === 'ban' ? 'member_banned' : 'member_removed',
      previousRole: targetRole, reason: reason.trim(), createdAt: new Date(),
    });
    return action === 'ban' ? 'banned' : 'removed';
  });

  return { userId: targetUid, action, status };
}


export async function listCircleBans(
  db: Firestore,
  actorUid: string,
  communityId: string,
): Promise<Array<{ userId: string; name: string; username: string; reason: string; bannedAt: string }>> {
  if (!actorUid || !validId(communityId)) throw new Error('A valid Circle is required.');
  const communityRef = db.collection('communities').doc(communityId);
  const actor = await communityRef.collection('members').doc(actorUid).get();
  if (!actor.exists || actor.get('status') !== 'active'
    || !['owner', 'admin', 'moderator'].includes(String(actor.get('role') || ''))) {
    throw new Error('Only active Circle managers can review the ban list.');
  }
  const bans = await communityRef.collection('bans').orderBy('createdAt', 'desc').limit(100).get();
  return Promise.all(bans.docs.map(async ban => {
    const userId = ban.id;
    const profile = await db.collection('publicProfiles').doc(userId).get();
    const profileData = profile.data() || {};
    const createdAt = ban.get('createdAt')?.toDate?.();
    return {
      userId,
      name: String(profileData.name || profileData.username || 'NEXORA member').slice(0, 80),
      username: String(profileData.username || '').slice(0, 40),
      reason: String(ban.get('reason') || '').slice(0, REASON_LIMIT),
      bannedAt: createdAt instanceof Date ? createdAt.toISOString() : '',
    };
  }));
}
