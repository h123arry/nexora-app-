import type { Firestore } from 'firebase-admin/firestore';
import { randomUUID } from 'node:crypto';

const QUESTION_LIMIT = 240;
const OPTION_LIMIT = 80;
const MAX_OPTIONS = 5;

export interface CirclePollOption {
  id: string;
  text: string;
  votes: number;
}

export interface CirclePollResult {
  id: string;
  communityId: string;
  question: string;
  options: CirclePollOption[];
  createdBy: string;
  createdAt: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
  status: 'open' | 'closed';
}

function validId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 150 && !value.includes('/');
}

async function requireActiveMember(db: Firestore, communityId: string, uid: string): Promise<void> {
  const [community, membership] = await Promise.all([
    db.collection('communities').doc(communityId).get(),
    db.collection('communities').doc(communityId).collection('members').doc(uid).get(),
  ]);
  if (!community.exists || !membership.exists || membership.get('status') !== 'active') {
    throw new Error('Join this Circle to participate in its polls.');
  }
}

export async function createCirclePoll(
  db: Firestore,
  uid: string,
  communityId: string,
  question: string,
  optionTexts: string[],
): Promise<{ pollId: string }> {
  if (!uid || !validId(communityId)) throw new Error('A valid Circle is required.');
  const cleanQuestion = typeof question === 'string' ? question.trim() : '';
  const options = Array.isArray(optionTexts)
    ? optionTexts.map((option) => typeof option === 'string' ? option.trim() : '')
    : [];
  if (!cleanQuestion || cleanQuestion.length > QUESTION_LIMIT
    || options.length < 2 || options.length > MAX_OPTIONS
    || options.some((option) => !option || option.length > OPTION_LIMIT)
    || new Set(options.map((option) => option.toLocaleLowerCase())).size !== options.length) {
    throw new Error('Add a question and 2 to 5 distinct options within the character limits.');
  }

  await requireActiveMember(db, communityId, uid);
  const pollId = randomUUID();
  const pollRef = db.collection('communities').doc(communityId).collection('polls').doc(pollId);
  await pollRef.create({
    id: pollId,
    communityId,
    question: cleanQuestion,
    options: options.map((text) => ({ id: randomUUID(), text, votes: 0 })),
    createdBy: uid,
    createdAt: new Date(),
    status: 'open',
  });
  return { pollId };
}

export async function castCirclePollVote(
  db: Firestore,
  uid: string,
  communityId: string,
  pollId: string,
  optionId: string,
): Promise<{ voted: boolean; optionId: string; changed: boolean }> {
  if (!uid || !validId(communityId) || !validId(pollId) || !validId(optionId)) {
    throw new Error('A valid poll and option are required.');
  }
  const communityRef = db.collection('communities').doc(communityId);
  const membershipRef = communityRef.collection('members').doc(uid);
  const pollRef = communityRef.collection('polls').doc(pollId);
  const voteRef = pollRef.collection('votes').doc(uid);

  return db.runTransaction(async (transaction) => {
    const [community, membership, poll, vote] = await Promise.all([
      transaction.get(communityRef),
      transaction.get(membershipRef),
      transaction.get(pollRef),
      transaction.get(voteRef),
    ]);
    if (!community.exists || !membership.exists || membership.get('status') !== 'active') {
      throw new Error('Join this Circle to vote.');
    }
    if (!poll.exists || poll.get('status') !== 'open') throw new Error('This poll is closed or unavailable.');
    const options = poll.get('options') as CirclePollOption[];
    if (!Array.isArray(options) || !options.some((option) => option.id === optionId)) {
      throw new Error('Choose a valid poll option.');
    }
    if (vote.exists) {
      const existingOption = String(vote.get('optionId') || '');
      return { voted: true, optionId: existingOption, changed: false };
    }
    transaction.create(voteRef, { userId: uid, optionId, createdAt: new Date() });
    transaction.update(pollRef, {
      options: options.map((option) => option.id === optionId
        ? { ...option, votes: Math.max(0, Number(option.votes) || 0) + 1 }
        : option),
    });
    return { voted: true, optionId, changed: true };
  });
}
