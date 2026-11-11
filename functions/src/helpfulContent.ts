import { FieldValue, type Firestore } from 'firebase-admin/firestore';

const ID_PATTERN = /^[A-Za-z0-9_-]{1,150}$/;
const DAILY_LIMIT = 20;

export interface HelpfulEndorsementResult {
  endorsed: boolean;
  helpfulnessCount: number;
  changed: boolean;
}

export async function endorsePublicPostAsHelpful(
  db: Firestore, uid: string, postId: string,
): Promise<HelpfulEndorsementResult> {
  if (!ID_PATTERN.test(uid) || !ID_PATTERN.test(postId)) throw new Error('A valid account and post are required.');
  const postRef = db.collection('posts').doc(postId);
  const endorsementRef = postRef.collection('helpfulnessEndorsements').doc(uid);
  const day = new Date().toISOString().slice(0, 10);
  const dailyRef = db.collection('users').doc(uid).collection('helpfulnessLimits').doc(day);

  return db.runTransaction(async tx => {
    const post = await tx.get(postRef);
    const endorsement = await tx.get(endorsementRef);
    const daily = await tx.get(dailyRef);
    if (!post.exists || post.get('audience') !== 'public') throw new Error('This public post is unavailable.');
    const authorId = String(post.get('userId') || post.get('authorId') || '');
    if (!authorId) throw new Error('This post has no verifiable author.');
    if (authorId === uid) throw new Error('You cannot endorse your own post.');
    const rawCount = post.get('helpfulnessCount');
    const count = Number.isSafeInteger(rawCount) && Number(rawCount) >= 0 ? Number(rawCount) : 0;
    if (endorsement.exists) return { endorsed: true, helpfulnessCount: count, changed: false };
    const used = Number(daily.get('count') || 0);
    if (used >= DAILY_LIMIT) throw new Error('You have reached the daily helpfulness endorsement limit.');
    tx.create(endorsementRef, { userId: uid, createdAt: FieldValue.serverTimestamp() });
    tx.set(dailyRef, { count: used + 1, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    tx.update(postRef, { helpfulnessCount: count + 1, helpfulnessUpdatedAt: FieldValue.serverTimestamp() });
    return { endorsed: true, helpfulnessCount: count + 1, changed: true };
  });
}
