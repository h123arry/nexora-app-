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
    transaction.update(targetRef, { role });
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
