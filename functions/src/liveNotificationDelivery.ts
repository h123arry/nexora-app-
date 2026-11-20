import { FieldPath, type Firestore, type QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';

const FOLLOWER_PAGE_SIZE = 400;

export function buildLiveStartNotification(input: {
  sessionId: string;
  hostId: string;
  username: string;
  actorName: string;
  avatar: string;
  title: string;
  timestamp: string;
}) {
  return {
    id: `live_${input.sessionId}`,
    type: 'pulse_alert' as const,
    userId: input.hostId,
    username: input.username,
    actorName: input.actorName,
    avatar: input.avatar,
    targetId: input.sessionId,
    content: `${input.actorName} is live now: ${input.title}`,
    timestamp: input.timestamp,
    isRead: false,
    priority: 2,
    category: 'live',
    actionText: 'Join live',
    actionType: 'join_live',
  };
}

export function createLiveStartNotificationDelivery(db: Firestore) {
  return onDocumentCreated(
    { document: 'liveSessions/{sessionId}', retry: true },
    async event => {
      const session = event.data?.data();
      const sessionId = event.params.sessionId;
      const hostId = session?.hostId;
      if (!session || session.status !== 'live' || typeof hostId !== 'string' || !hostId || !sessionId) return;

      const [publicProfile, privateProfile] = await Promise.all([
        db.collection('publicProfiles').doc(hostId).get(),
        db.collection('users').doc(hostId).get(),
      ]);
      const profile = publicProfile.exists ? publicProfile.data() : privateProfile.data();
      const username = String(profile?.username || 'nexora_member').replace(/^@+/, '').slice(0, 40);
      const actorName = String(session.hostName || profile?.name || username).slice(0, 100);
      const avatar = typeof profile?.avatar === 'string' ? profile.avatar.slice(0, 1000) : '';
      const title = String(session.title || 'a live session').slice(0, 120);
      const timestamp = typeof event.time === 'string' && Number.isFinite(Date.parse(event.time))
        ? new Date(event.time).toISOString()
        : new Date().toISOString();

      let cursor: QueryDocumentSnapshot | undefined;
      while (true) {
        let followerQuery = db.collection('follows')
          .where('followingId', '==', hostId)
          .orderBy(FieldPath.documentId())
          .limit(FOLLOWER_PAGE_SIZE);
        if (cursor) followerQuery = followerQuery.startAfter(cursor);
        const followers = await followerQuery.get();
        if (followers.empty) break;

        const recipients = followers.docs
          .map(edge => edge.data().followerId)
          .filter((followerId): followerId is string =>
            typeof followerId === 'string' && followerId.length > 0 && followerId !== hostId && !followerId.includes('/'));
        const refs = recipients.map(recipientId =>
          db.collection('users').doc(recipientId).collection('notifications').doc(`live_${sessionId}`));
        if (refs.length) {
          const existing = await db.getAll(...refs);
          const batch = db.batch();
          let writes = 0;
          existing.forEach((snapshot, index) => {
            if (snapshot.exists) return;
            batch.set(snapshot.ref, buildLiveStartNotification({
              sessionId, hostId, username, actorName, avatar, title, timestamp,
            }));
            writes++;
          });
          if (writes) await batch.commit();
        }

        cursor = followers.docs[followers.docs.length - 1];
        if (followers.docs.length < FOLLOWER_PAGE_SIZE) break;
      }
    },
  );
}
