import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { randomUUID } from 'node:crypto';

const MAX_DURATION_DAYS = 30;
const ID_PATTERN = /^[A-Za-z0-9_-]{1,150}$/;

function clean(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, max) : '';
}
function validUid(value: unknown): value is string {
  return typeof value === 'string' && ID_PATTERN.test(value);
}

export interface SocialChallengeInput {
  title?: unknown;
  description?: unknown;
  topic?: unknown;
  durationDays?: unknown;
  targetPosts?: unknown;
}

export async function createSocialChallenge(db: Firestore, creatorId: string, input: SocialChallengeInput) {
  if (!validUid(creatorId)) throw new Error('A valid account is required.');
  const title = clean(input.title, 80);
  const description = clean(input.description, 600);
  const topic = clean(input.topic, 40);
  const durationDays = input.durationDays ?? 7;
  const targetPosts = input.targetPosts ?? 1;
  if (title.length < 4 || description.length < 12 || topic.length < 2
    || !Number.isInteger(durationDays) || Number(durationDays) < 1 || Number(durationDays) > MAX_DURATION_DAYS
    || !Number.isInteger(targetPosts) || Number(targetPosts) < 1 || Number(targetPosts) > 1000) {
    throw new Error('Challenge details are invalid. Check the title, description, topic and limits.');
  }
  const now = new Date();
  const endAt = new Date(now.getTime() + Number(durationDays) * 86400000);
  const challengeId = randomUUID();
  const challengeRef = db.collection('socialChallenges').doc(challengeId);
  const participantRef = challengeRef.collection('participants').doc(creatorId);
  const activeChallenges = await db.collection('socialChallenges').where('creatorId', '==', creatorId).where('status', '==', 'active').limit(5).get();
  if (activeChallenges.size >= 5) throw new Error('You have reached the active challenge limit.');
  await db.runTransaction(async tx => {
    tx.create(challengeRef, {
      id: challengeId, creatorId, title, description, topic,
      targetPosts: Number(targetPosts), status: 'active',
      participantCount: 1, contributionCount: 0,
      startAt: now, endAt, createdAt: FieldValue.serverTimestamp(),
    });
    tx.create(participantRef, { userId: creatorId, joinedAt: FieldValue.serverTimestamp(), contributionCount: 0 });
  });
  return { challengeId, postTag: '#nxchallenge_' + challengeId, endAt: endAt.toISOString() };
}

export async function joinSocialChallenge(db: Firestore, uid: string, challengeId: string) {
  if (!validUid(uid) || typeof challengeId !== 'string' || !ID_PATTERN.test(challengeId)) {
    throw new Error('A valid challenge is required.');
  }
  const challengeRef = db.collection('socialChallenges').doc(challengeId);
  const participantRef = challengeRef.collection('participants').doc(uid);
  return db.runTransaction(async tx => {
    const [challenge, participant] = await Promise.all([tx.get(challengeRef), tx.get(participantRef)]);
    if (!challenge.exists || challenge.get('status') !== 'active' || challenge.get('endAt')?.toDate?.() <= new Date()) {
      throw new Error('This challenge is closed or unavailable.');
    }
    if (participant.exists) return { joined: false };
    tx.create(participantRef, { userId: uid, joinedAt: FieldValue.serverTimestamp(), contributionCount: 0 });
    tx.update(challengeRef, { participantCount: FieldValue.increment(1) });
    return { joined: true };
  });
}

export async function listSocialChallenges(db: Firestore, uid: string) {
  if (!validUid(uid)) throw new Error('A valid account is required.');
  const snapshot = await db.collection('socialChallenges').where('status', '==', 'active').limit(40).get();
  const now = Date.now();
  const activeDocs = snapshot.docs.filter(doc => {
      const endAt = doc.get('endAt')?.toDate?.()?.getTime?.() || 0;
      return endAt > now;
  }).sort((a, b) => (b.get('createdAt')?.toDate?.()?.getTime?.() || 0) - (a.get('createdAt')?.toDate?.()?.getTime?.() || 0));
  const challenges = await Promise.all(activeDocs.map(async doc => {
    const participant = await doc.ref.collection('participants').doc(uid).get();
    return {
      id: doc.id, creatorId: doc.get('creatorId'), title: doc.get('title'),
      description: doc.get('description'), topic: doc.get('topic'),
      targetPosts: doc.get('targetPosts'), participantCount: doc.get('participantCount') || 0,
      contributionCount: doc.get('contributionCount') || 0,
      joinedByMe: participant.exists,
      myContributionCount: participant.exists ? Number(participant.get('contributionCount') || 0) : 0,
      endAt: doc.get('endAt')?.toDate?.()?.toISOString?.() || null,
    };
  }));
  return { challenges };
}

/** Called only by the trusted post-created trigger; the tag opts a public post into a challenge. */
export async function recordSocialChallengePost(db: Firestore, uid: string, postId: string, challengeId: string) {
  if (!validUid(uid) || !ID_PATTERN.test(postId) || !ID_PATTERN.test(challengeId)) return { recorded: false };
  const challengeRef = db.collection('socialChallenges').doc(challengeId);
  const participantRef = challengeRef.collection('participants').doc(uid);
  const entryRef = challengeRef.collection('entries').doc(postId);
  return db.runTransaction(async tx => {
    const [challenge, participant, entry] = await Promise.all([
      tx.get(challengeRef), tx.get(participantRef), tx.get(entryRef),
    ]);
    if (!challenge.exists || challenge.get('status') !== 'active'
      || challenge.get('endAt')?.toDate?.() <= new Date() || !participant.exists || entry.exists) {
      return { recorded: false };
    }
    tx.create(entryRef, { postId, userId: uid, createdAt: FieldValue.serverTimestamp() });
    const nextContributionCount = Number(challenge.get('contributionCount') || 0) + 1;
    tx.update(challengeRef, {
      contributionCount: nextContributionCount,
      ...(nextContributionCount >= Number(challenge.get('targetPosts') || 1)
        ? { status: 'completed', completedAt: FieldValue.serverTimestamp() } : {}),
    });
    tx.update(participantRef, { contributionCount: FieldValue.increment(1), lastContributionAt: FieldValue.serverTimestamp() });
    return { recorded: true };
  });
}
