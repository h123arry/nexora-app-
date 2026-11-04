import { randomUUID } from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';

const ID_PATTERN = /^[A-Za-z0-9_-]{1,150}$/;
const MAX_GROUP_MEMBERS = 50;

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export async function createGroupChat(
  db: Firestore,
  ownerUid: string,
  rawName: unknown,
  rawDescription: unknown,
  rawParticipantIds: unknown,
): Promise<{ chatId: string; participantCount: number }> {
  const name = text(rawName, 80);
  const description = text(rawDescription, 500);
  if (!ownerUid || !name || name.length < 2 || !Array.isArray(rawParticipantIds)
    || rawParticipantIds.length < 2 || rawParticipantIds.length >= MAX_GROUP_MEMBERS) {
    throw new Error('A group needs a name and between 2 and 49 invited members.');
  }
  const participantIds = rawParticipantIds;
  if (participantIds.some((id: unknown) => typeof id !== 'string' || !ID_PATTERN.test(id) || id === ownerUid)
    || new Set(participantIds).size !== participantIds.length) {
    throw new Error('Choose valid, unique group members.');
  }

  const [ownerSnapshot, ownerPreferences, memberSnapshots, memberPreferences] = await Promise.all([
    db.collection('users').doc(ownerUid).get(),
    db.collection('users').doc(ownerUid).collection('settings').doc('preferences').get(),
    Promise.all(participantIds.map((id: string) => db.collection('users').doc(id).get())),
    Promise.all(participantIds.map((id: string) => db.collection('users').doc(id).collection('settings').doc('preferences').get())),
  ]);
  if (!ownerSnapshot.exists || ownerSnapshot.get('isBanned') === true || ownerSnapshot.get('isSuspended') === true) {
    throw new Error('Your account cannot create group conversations.');
  }
  const ownerBlockedIds = ownerPreferences.get('messaging.blockedUserIds');
  const ownerBlocked = Array.isArray(ownerBlockedIds) ? ownerBlockedIds : [];

  for (let index = 0; index < participantIds.length; index += 1) {
    const member = memberSnapshots[index];
    const preferences = memberPreferences[index];
    const memberId = participantIds[index];
    if (!member.exists || member.get('isBanned') === true || member.get('isSuspended') === true || member.get('isSeedProfile') === true) {
      throw new Error('One or more selected accounts cannot be invited.');
    }
    const privacy = preferences.get('privacy');
    const messaging = preferences.get('messaging');
    const blockedIds = messaging && typeof messaging === 'object'
      ? (messaging as Record<string, unknown>).blockedUserIds : undefined;
    if (ownerBlocked.includes(memberId) || (Array.isArray(blockedIds) && blockedIds.includes(ownerUid))) {
      throw new Error('A selected member has a privacy restriction that prevents this invitation.');
    }
    if (privacy && typeof privacy === 'object' && (privacy as Record<string, unknown>).allowDms === false) {
      throw new Error('A selected member does not accept new message invitations.');
    }
  }

  const now = new Date();
  const rateRef = db.collection('groupChatRateLimits').doc(ownerUid);
  await db.runTransaction(async tx => {
    const rate = await tx.get(rateRef);
    const previousStart = rate.get('windowStartedAt');
    const previousStartDate = previousStart && typeof previousStart.toDate === 'function' ? previousStart.toDate() : null;
    const windowActive = previousStartDate !== null && now.getTime() - previousStartDate.getTime() < 15 * 60 * 1000;
    const count = windowActive && Number.isSafeInteger(rate.get('count')) ? Number(rate.get('count')) : 0;
    if (count >= 5) throw new Error('Too many groups have been created recently. Please wait before trying again.');
    tx.set(rateRef, {
      windowStartedAt: windowActive ? previousStartDate : now,
      count: count + 1,
      updatedAt: now,
    });
  });

  const chatId = randomUUID();
  const timestamp = now.toISOString();
  const ownerName = text(ownerSnapshot.get('name'), 120) || 'NEXORA member';
  const ownerUsername = text(ownerSnapshot.get('username'), 40);
  const ownerAvatar = text(ownerSnapshot.get('avatar'), 2000);
  const participants = [ownerUid, ...participantIds];
  const chat = {
    id: chatId, participants, isGroup: true, isBroadcast: false,
    ownerId: ownerUid, creatorId: ownerUid, partnerId: 'group-' + chatId,
    partnerName: name, name, groupName: name, partnerAvatar: '', groupBanner: '',
    partnerBio: description, groupDescription: description, groupCategory: 'General',
    groupPrivacy: 'invite', groupTheme: '#7138FF', groupRules: [],
    welcomeMessage: description || 'Welcome to the group.',
    membersCount: participants.length, adminsCount: 1, unreadCount: 0,
    lastMessage: 'Group created', lastTimestamp: timestamp, createdAt: now,
  };

  const batch = db.batch();
  batch.create(db.collection('chats').doc(chatId), chat);
  for (const memberId of participantIds) {
    batch.create(db.collection('users').doc(memberId).collection('notifications').doc('group_' + chatId), {
      id: 'group_' + chatId, userId: memberId, type: 'message', category: 'messages',
      targetId: chatId, content: 'invited you to ' + name, actorName: ownerName,
      username: ownerUsername, avatar: ownerAvatar, timestamp, isRead: false, priority: 3,
    });
  }
  await batch.commit();
  return { chatId, participantCount: participants.length };
}
