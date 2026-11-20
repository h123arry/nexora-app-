import type { Firestore } from 'firebase-admin/firestore';

export type VohJoinedCircle = {
  id: string;
  name: string;
  description: string;
  creatorId: string;
  membersCount: number | null;
  role: 'owner' | 'admin' | 'moderator' | 'member';
  type: 'public' | 'private' | 'invite-only' | 'unknown';
};

function boundedText(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function safeRole(value: unknown): VohJoinedCircle['role'] {
  return value === 'owner' || value === 'admin' || value === 'moderator' ? value : 'member';
}

function safeType(value: unknown): VohJoinedCircle['type'] {
  return value === 'public' || value === 'private' || value === 'invite-only' ? value : 'unknown';
}

/**
 * Load only communities for which the verified account has an active membership.
 * Membership document IDs and their userId field must both match the verified UID.
 */
export async function loadVohJoinedCircles(
  store: Pick<Firestore, 'collectionGroup'>,
  verifiedUid: string,
  requestedLimit = 25,
): Promise<VohJoinedCircle[]> {
  if (!verifiedUid) return [];
  const pageLimit = Number.isSafeInteger(requestedLimit) ? Math.max(1, Math.min(25, requestedLimit)) : 25;
  const memberships = await store.collectionGroup('members')
    .where('userId', '==', verifiedUid)
    .limit(pageLimit)
    .get();

  const circles = await Promise.all(memberships.docs.map(async membership => {
    if (membership.id !== verifiedUid
      || membership.get('userId') !== verifiedUid
      || membership.get('status') !== 'active') return null;
    const communityRef = membership.ref.parent.parent;
    if (!communityRef) return null;
    const community = await communityRef.get();
    if (!community.exists) return null;
    const data = community.data() || {};
    const name = boundedText(data.name, 120);
    if (!name) return null;
    const membersCount = Number.isSafeInteger(data.membersCount) && data.membersCount >= 0
      ? data.membersCount : null;
    return {
      id: community.id,
      name,
      description: boundedText(data.description, 400),
      creatorId: boundedText(data.creatorId || data.ownerId, 128),
      membersCount,
      role: safeRole(membership.get('role')),
      type: safeType(data.type),
    } satisfies VohJoinedCircle;
  }));
  return circles.filter((circle): circle is VohJoinedCircle => circle !== null);
}
