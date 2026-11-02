import {
  collection,
  doc,
  deleteDoc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, functions } from '../../lib/firebase';
import { httpsCallable } from 'firebase/functions';
import type { Circle } from '../../types';

const COMMUNITY_NAME_LIMIT = 60;
const COMMUNITY_DESCRIPTION_LIMIT = 500;
const COMMUNITY_TAG_LIMIT = 8;

function validText(value: string, max: number): boolean {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max;
}

function mapCommunity(id: string, data: Record<string, unknown>, isJoinedByMe: boolean): Circle {
  return {
    id,
    name: String(data.name || ''),
    description: String(data.description || ''),
    bannerImage: typeof data.bannerImage === 'string' ? data.bannerImage : '',
    avatarImage: typeof data.avatarImage === 'string' ? data.avatarImage : undefined,
    creatorId: String(data.creatorId || data.ownerId || ''),
    ownerId: String(data.ownerId || ''),
    type: data.type === 'private' || data.type === 'invite-only' ? data.type : 'public',
    rules: Array.isArray(data.rules) ? data.rules.filter((item): item is string => typeof item === 'string').slice(0, 20) : [],
    tags: Array.isArray(data.tags) ? data.tags.filter((item): item is string => typeof item === 'string').slice(0, COMMUNITY_TAG_LIMIT) : [],
    moderators: Array.isArray(data.moderators) ? data.moderators.filter((item): item is string => typeof item === 'string') : [],
    admins: Array.isArray(data.admins) ? data.admins.filter((item): item is string => typeof item === 'string') : [],
    isJoinedByMe,
  };
}

export const CommunityService = {
  async listPublicCommunities(userId: string, pageSize = 30): Promise<Circle[]> {
    if (!userId) throw new Error('Sign in to explore Circles.');
    const safeLimit = Math.max(1, Math.min(50, Math.floor(pageSize)));
    const snapshot = await getDocs(query(
      collection(db, 'communities'),
      where('type', '==', 'public'),
      limit(safeLimit),
    ));
    return Promise.all(snapshot.docs.map(async (community) => {
      const membership = await getDoc(doc(db, 'communities', community.id, 'members', userId));
      return mapCommunity(community.id, community.data(), membership.exists() && membership.data().status === 'active');
    }));
  },

  async createPublicCommunity(input: {
    ownerId: string;
    name: string;
    description: string;
    bannerImage: string;
    rules: string[];
    tags: string[];
  }): Promise<Circle> {
    if (!input.ownerId || !validText(input.name, COMMUNITY_NAME_LIMIT)
      || !validText(input.description, COMMUNITY_DESCRIPTION_LIMIT)
      || typeof input.bannerImage !== 'string' || input.bannerImage.length > 1200
      || !Array.isArray(input.rules) || input.rules.length > 20
      || input.rules.some(rule => typeof rule !== 'string' || rule.length > 300)
      || !Array.isArray(input.tags) || input.tags.length > COMMUNITY_TAG_LIMIT
      || input.tags.some(tag => typeof tag !== 'string' || tag.length > 40)) {
      throw new Error('Review the Circle details and try again.');
    }

    const communityRef = doc(collection(db, 'communities'));
    const memberRef = doc(db, 'communities', communityRef.id, 'members', input.ownerId);
    const batch = writeBatch(db);
    batch.set(communityRef, {
      id: communityRef.id,
      ownerId: input.ownerId,
      creatorId: input.ownerId,
      type: 'public',
      name: input.name.trim(),
      description: input.description.trim(),
      bannerImage: input.bannerImage,
      rules: input.rules,
      tags: input.tags,
      moderators: [],
      admins: [],
      pinnedPosts: [],
      events: [],
      mediaLibrary: [],
      createdAt: serverTimestamp(),
    });
    batch.set(memberRef, {
      userId: input.ownerId,
      role: 'owner',
      status: 'active',
      joinedAt: serverTimestamp(),
    });
    await batch.commit();
    return {
      id: communityRef.id,
      name: input.name.trim(),
      description: input.description.trim(),
      bannerImage: input.bannerImage,
      creatorId: input.ownerId,
      ownerId: input.ownerId,
      type: 'public',
      rules: input.rules,
      tags: input.tags,
      isJoinedByMe: true,
    };
  },

  async joinCommunity(userId: string, communityId: string): Promise<void> {
    if (!userId || !communityId || communityId.includes('/')) throw new Error('A valid Circle is required.');
    const communityRef = doc(db, 'communities', communityId);
    const memberRef = doc(db, 'communities', communityId, 'members', userId);
    const [community, membership] = await Promise.all([getDoc(communityRef), getDoc(memberRef)]);
    if (!community.exists() || community.data().type !== 'public') {
      throw new Error('This Circle is unavailable or requires an invitation.');
    }
    if (community.data().bannedUsers?.includes?.(userId)) throw new Error('You cannot join this Circle.');
    if (membership.exists() && membership.data().status === 'active') return;
    await setDoc(memberRef, {
      userId,
      role: 'member',
      status: 'active',
      joinedAt: serverTimestamp(),
    });
  },


  watchMessages(
    communityId: string,
    currentUserId: string,
    onMessages: (messages: Array<{ id: string; senderId: string; content: string; time: string }>) => void,
    onError: (error: Error) => void,
  ): () => void {
    if (!communityId || !currentUserId) {
      onError(new Error('Join this Circle to read its messages.'));
      return () => undefined;
    }
    const messagesQuery = query(
      collection(db, 'communities', communityId, 'messages'),
      orderBy('createdAt', 'desc'),
      limit(50),
    );
    return onSnapshot(messagesQuery, snapshot => {
      const messages = snapshot.docs.map(message => {
        const data = message.data();
        const createdAt = data.createdAt?.toDate?.();
        return {
          id: message.id,
          senderId: String(data.senderId || ''),
          content: String(data.content || ''),
          time: createdAt instanceof Date ? createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now',
        };
      }).reverse();
      onMessages(messages);
    }, error => onError(error));
  },

  async sendMessage(communityId: string, senderId: string, content: string): Promise<void> {
    const text = content.trim();
    if (!communityId || communityId.includes('/') || !senderId || !text || text.length > 2000) {
      throw new Error('Messages must contain 1 to 2,000 characters.');
    }
    const messageRef = doc(collection(db, 'communities', communityId, 'messages'));
    await setDoc(messageRef, {
      id: messageRef.id,
      senderId,
      content: text,
      createdAt: serverTimestamp(),
    });
  },


  watchPolls(
    communityId: string,
    currentUserId: string,
    onPolls: (polls: Array<{ id: string; question: string; options: Array<{ id: string; text: string; votes: number }>; createdBy: string; status: string; myVote: string | null; createdAt: string }>) => void,
    onError: (error: Error) => void,
  ): () => void {
    if (!communityId || !currentUserId) {
      onError(new Error('Join this Circle to view its polls.'));
      return () => undefined;
    }
    const pollsQuery = query(
      collection(db, 'communities', communityId, 'polls'),
      orderBy('createdAt', 'desc'),
      limit(20),
    );
    return onSnapshot(pollsQuery, async snapshot => {
      try {
        const polls = await Promise.all(snapshot.docs.map(async poll => {
          const data = poll.data();
          const vote = await getDoc(doc(db, 'communities', communityId, 'polls', poll.id, 'votes', currentUserId));
          const createdAt = data.createdAt?.toDate?.();
          return {
            id: poll.id,
            question: String(data.question || ''),
            options: Array.isArray(data.options) ? data.options.map((option: Record<string, unknown>) => ({
              id: String(option.id || ''),
              text: String(option.text || ''),
              votes: Number.isSafeInteger(option.votes) && Number(option.votes) >= 0 ? Number(option.votes) : 0,
            })) : [],
            createdBy: String(data.createdBy || ''),
            status: String(data.status || 'closed'),
            myVote: vote.exists() ? String(vote.data().optionId || '') : null,
            createdAt: createdAt instanceof Date ? createdAt.toLocaleDateString() : 'Recently',
          };
        }));
        onPolls(polls);
      } catch (error) {
        onError(error instanceof Error ? error : new Error('Circle polls could not be loaded.'));
      }
    }, error => onError(error));
  },

  async createPoll(communityId: string, question: string, options: string[]): Promise<void> {
    const create = httpsCallable(functions, 'createCommunityPoll');
    await create({ communityId, question, options });
  },

  async votePoll(communityId: string, pollId: string, optionId: string): Promise<void> {
    const vote = httpsCallable(functions, 'voteInCommunityPoll');
    await vote({ communityId, pollId, optionId });
  },

  async leaveCommunity(userId: string, communityId: string): Promise<void> {
    if (!userId || !communityId || communityId.includes('/')) throw new Error('A valid Circle is required.');
    const memberRef = doc(db, 'communities', communityId, 'members', userId);
    const membership = await getDoc(memberRef);
    if (!membership.exists()) return;
    if (membership.data().role === 'owner') throw new Error('Circle owners must transfer ownership before leaving.');
    await deleteDoc(memberRef);
  },
};
