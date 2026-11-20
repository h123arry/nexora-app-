import { createHash, randomUUID } from 'node:crypto';
import { FieldValue, type Firestore } from 'firebase-admin/firestore';

export interface PublicPostReply {
  id: string;
  userId: string;
  username: string;
  name: string;
  avatar: string;
  content: string;
  timestamp: string;
}

function validId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 150 && !value.includes('/');
}

export async function addPublicPostCommentReply(
  db: Firestore,
  uid: string,
  postId: string,
  commentId: string,
  rawContent: string,
  replyId?: string,
): Promise<{ reply: PublicPostReply; created: boolean }> {
  if (!uid) throw new Error('Authentication is required.');
  if (!validId(postId) || !validId(commentId)) throw new Error('A valid post and comment are required.');
  const content = typeof rawContent === 'string' ? rawContent.trim() : '';
  if (!content || content.length > 500) throw new Error('Replies must be between 1 and 500 characters.');
  const id = validId(replyId) ? replyId : `reply_${randomUUID()}`;
  const postRef = db.collection('posts').doc(postId);
  const actorRef = db.collection('publicProfiles').doc(uid);

  return db.runTransaction(async transaction => {
    const [post, actor] = await Promise.all([transaction.get(postRef), transaction.get(actorRef)]);
    if (!post.exists || post.get('audience') !== 'public') throw new Error('This public post is unavailable.');
    if (!actor.exists) throw new Error('Complete your public profile before replying.');
    const comments = Array.isArray(post.get('comments')) ? [...post.get('comments')] : [];
    const index = comments.findIndex((comment: any) => comment?.id === commentId);
    if (index < 0) throw new Error('This comment is no longer available.');
    const comment = comments[index] as Record<string, any>;
    const replies = Array.isArray(comment.replies) ? [...comment.replies] : [];
    const existing = replies.find((reply: any) => reply?.id === id);
    if (existing) return { reply: existing as PublicPostReply, created: false };
    if (replies.length >= 200) throw new Error('This comment has reached its reply limit.');

    const profile = actor.data() || {};
    const reply: PublicPostReply = {
      id,
      userId: uid,
      username: String(profile.username || 'member').slice(0, 80),
      name: String(profile.name || profile.username || 'NEXORA member').slice(0, 100),
      avatar: typeof profile.avatar === 'string' ? profile.avatar.slice(0, 1000) : '',
      content,
      timestamp: new Date().toISOString(),
    };
    const mentionedUsernames = [...new Set([...content.matchAll(/(?:^|\s)@([a-zA-Z0-9_.]{1,40})\b/g)].map(match => match[1].toLowerCase()))].slice(0, 10);
    const mentionedProfiles = mentionedUsernames.length
      ? await transaction.get(db.collection('publicProfiles').where('username', 'in', mentionedUsernames))
      : null;
    comments[index] = { ...comment, replies: [...replies, reply] };
    transaction.update(postRef, { comments, repliesUpdatedAt: FieldValue.serverTimestamp() });

    const recipientId = String(comment.userId || '');
    if (recipientId && recipientId !== uid) {
      const notificationRef = db.collection('users').doc(recipientId).collection('notifications').doc(`reply_${randomUUID()}`);
      transaction.create(notificationRef, {
        id: notificationRef.id,
        type: 'comment_reply',
        userId: uid,
        username: reply.username,
        actorName: reply.name,
        avatar: reply.avatar,
        targetId: postId,
        content: 'replied to your comment',
        timestamp: reply.timestamp,
        isRead: false,
        priority: 2,
        actionText: 'View Post',
        actionType: 'view_post',
      });
    }
    if (mentionedProfiles) {
      for (const mentioned of mentionedProfiles.docs) {
        if (mentioned.id === uid) continue;
        const mentionedData = mentioned.data();
        const username = String(mentionedData.username || '').replace(/^@+/, '').toLowerCase();
        if (!username || !mentionedUsernames.includes(username)) continue;
        const digest = createHash('sha256').update(`${postId}:${commentId}:${id}:${mentioned.id}`).digest('hex').slice(0, 40);
        const mentionRef = db.collection('users').doc(mentioned.id).collection('notifications').doc(`mention_${digest}`);
        transaction.create(mentionRef, {
          id: mentionRef.id, type: 'mention', userId: uid,
          username: reply.username, actorName: reply.name, avatar: reply.avatar,
          targetId: postId, content: `mentioned you in a reply: "${content.slice(0, 90)}"`,
          timestamp: reply.timestamp, isRead: false, priority: 2,
          actionText: 'View Post', actionType: 'view_post', category: 'mentions',
        });
      }
    }
    return { reply, created: true };
  });
}
