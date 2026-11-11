import { FieldValue, type Firestore } from 'firebase-admin/firestore';

const ID = /^[A-Za-z0-9_-]{1,150}$/;

function readOptions(value: unknown): Array<{ id: string; text: string; votes: number }> {
  if (!Array.isArray(value) || value.length < 2 || value.length > 5) throw new Error('This post does not contain a valid poll.');
  return value.map(option => {
    if (!option || typeof option.id !== 'string' || !ID.test(option.id)
      || typeof option.text !== 'string' || option.text.length > 300
      || !Number.isSafeInteger(option.votes) || option.votes < 0) {
      throw new Error('This poll has invalid options.');
    }
    return { id: option.id, text: option.text, votes: option.votes };
  });
}

export async function voteOnPublicPostPoll(db: Firestore, uid: string, postId: string, optionId: string) {
  if (!ID.test(uid) || !ID.test(postId) || !ID.test(optionId)) throw new Error('Valid poll and option identifiers are required.');
  const postRef = db.collection('posts').doc(postId);
  const voteRef = postRef.collection('pollVotes').doc(uid);

  // The unique per-user marker is the transaction's idempotency boundary.
  // A retry after a competing vote returns the marker without attempting a
  // second counter update. Read the post after the transaction in that path;
  // this avoids emulator/server retry snapshots returning a stale post read.
  const result = await db.runTransaction(async tx => {
    const existingVote = await tx.get(voteRef);
    if (existingVote.exists) {
      return {
        voted: false as const,
        selectedOptionId: existingVote.get('optionId') as string,
      };
    }

    const post = await tx.get(postRef);
    if (!post.exists || post.get('audience') !== 'public') throw new Error('This public poll is unavailable.');
    const poll = post.get('interactivePoll');
    if (!poll || typeof poll.question !== 'string') throw new Error('This post does not contain a valid poll.');
    const options = readOptions(poll.options);
    if (!options.some(option => option.id === optionId)) throw new Error('Choose a valid poll option.');

    const nextOptions = options.map(option => option.id === optionId
      ? { ...option, votes: option.votes + 1 } : option);
    if (!nextOptions.every(option => Number.isSafeInteger(option.votes))) throw new Error('Poll vote totals are invalid.');

    tx.create(voteRef, { userId: uid, postId, optionId, createdAt: FieldValue.serverTimestamp() });
    tx.update(postRef, { 'interactivePoll.options': nextOptions });
    return { voted: true as const, selectedOptionId: optionId, options: nextOptions };
  });

  if (result.voted) return result;

  // A duplicate concurrent request is a successful idempotent read, not a
  // second vote. Revalidate public visibility before returning poll details.
  const post = await postRef.get();
  if (!post.exists || post.get('audience') !== 'public') throw new Error('This public poll is unavailable.');
  const poll = post.get('interactivePoll');
  if (!poll || typeof poll.question !== 'string') throw new Error('This post does not contain a valid poll.');
  return {
    voted: false,
    selectedOptionId: result.selectedOptionId,
    options: readOptions(poll.options),
  };
}

export async function getMyPublicPostPollVotes(db: Firestore, uid: string, postIds: unknown) {
  if (!ID.test(uid) || !Array.isArray(postIds) || postIds.length > 60
    || !postIds.every(id => typeof id === 'string' && ID.test(id))) {
    throw new Error('A valid list of poll posts is required.');
  }
  const uniqueIds = [...new Set(postIds as string[])];
  const votes = await Promise.all(uniqueIds.map(async postId => {
    const snapshot = await db.collection('posts').doc(postId).collection('pollVotes').doc(uid).get();
    return snapshot.exists ? [postId, snapshot.get('optionId')] as const : null;
  }));
  return { votes: Object.fromEntries(votes.filter((item): item is readonly [string, string] => !!item)) };
}
