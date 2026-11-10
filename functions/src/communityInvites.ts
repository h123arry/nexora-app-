import { createHash, randomBytes } from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';

const ID_LIMIT = 150;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{40,100}$/;
const MAX_USES = 100;
const MAX_TTL_DAYS = 30;

function validId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= ID_LIMIT && !value.includes('/');
}
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Create an opaque Circle invite. Only the raw token is returned once; Firestore stores its hash. */
export async function createCircleInvite(
  db: Firestore, actorUid: string, communityId: string, expiresInDays = 7, maxUses = 25,
): Promise<{ token: string; expiresAt: string; maxUses: number }> {
  if (!validId(communityId) || !Number.isInteger(expiresInDays) || expiresInDays < 1 || expiresInDays > MAX_TTL_DAYS
    || !Number.isInteger(maxUses) || maxUses < 1 || maxUses > MAX_USES) throw new Error('Invalid Circle invitation settings.');
  const circle = db.collection('communities').doc(communityId);
  const member = circle.collection('members').doc(actorUid);
  const [communitySnap, memberSnap] = await Promise.all([circle.get(), member.get()]);
  if (!communitySnap.exists || !memberSnap.exists || memberSnap.get('status') !== 'active'
    || !['owner', 'admin', 'moderator'].includes(String(memberSnap.get('role')))) {
    throw new Error('Only active Circle managers can create invitations.');
  }
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + expiresInDays * 86400000);
  await db.collection('communityInvites').doc(hashToken(token)).create({
    communityId, createdBy: actorUid, createdAt: new Date(), expiresAt, maxUses, useCount: 0, revokedAt: null,
  });
  return { token, expiresAt: expiresAt.toISOString(), maxUses };
}

/** Redeem transactionally; never trusts a community ID supplied by the client. */
export async function redeemCircleInvite(db: Firestore, userUid: string, token: string): Promise<{ communityId: string; joined: boolean }> {
  if (typeof token !== 'string' || !TOKEN_PATTERN.test(token)) throw new Error('Invalid or expired Circle invitation.');
  const inviteRef = db.collection('communityInvites').doc(hashToken(token));
  return db.runTransaction(async tx => {
    const invite = await tx.get(inviteRef);
    if (!invite.exists) throw new Error('Invalid or expired Circle invitation.');
    const data = invite.data()!;
    const now = new Date();
    if (data.revokedAt || !(data.expiresAt?.toDate?.() instanceof Date) || data.expiresAt.toDate() <= now
      || data.useCount >= data.maxUses) throw new Error('Invalid or expired Circle invitation.');
    const communityRef = db.collection('communities').doc(String(data.communityId));
    const memberRef = communityRef.collection('members').doc(userUid);
    const banRef = communityRef.collection('bans').doc(userUid);
    const [community, member, ban] = await Promise.all([tx.get(communityRef), tx.get(memberRef), tx.get(banRef)]);
    if (!community.exists || ban.exists || community.get('bannedUsers')?.includes?.(userUid)) {
      throw new Error('You cannot join this Circle.');
    }
    if (member.exists && member.get('status') === 'active') return { communityId: communityRef.id, joined: false };
    tx.set(memberRef, { userId: userUid, role: 'member', status: 'active', joinedAt: now });
    tx.update(inviteRef, { useCount: Number(data.useCount || 0) + 1, lastRedeemedAt: now });
    return { communityId: communityRef.id, joined: true };
  });
}

export async function revokeCircleInvite(db: Firestore, actorUid: string, token: string): Promise<void> {
  if (typeof token !== 'string' || !TOKEN_PATTERN.test(token)) throw new Error('Invalid Circle invitation.');
  const inviteRef = db.collection('communityInvites').doc(hashToken(token));
  await db.runTransaction(async tx => {
    const invite = await tx.get(inviteRef);
    if (!invite.exists) throw new Error('Invalid Circle invitation.');
    const communityId = String(invite.get('communityId') || '');
    const actor = await tx.get(db.collection('communities').doc(communityId).collection('members').doc(actorUid));
    if (!actor.exists || actor.get('status') !== 'active'
      || !['owner', 'admin', 'moderator'].includes(String(actor.get('role')))) {
      throw new Error('Only active Circle managers can revoke invitations.');
    }
    tx.update(inviteRef, { revokedAt: new Date(), revokedBy: actorUid });
  });
}
