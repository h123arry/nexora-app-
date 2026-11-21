import { createHash } from 'node:crypto';
import { FieldValue, type Firestore } from 'firebase-admin/firestore';

function validId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 150 && !value.includes('/');
}

export async function setPublicPostCommentReplyLike(
  db: Firestore, uid: string, postId: string, commentId: string, replyId: string, desiredLiked: boolean,
): Promise<{ liked: boolean; likes: number; changed: boolean }> {
  if (!uid) throw new Error('Authentication is required.');
  if (!validId(postId) || !validId(commentId) || !validId(replyId)) throw new Error('A valid post, comment and reply are required.');
  if (typeof desiredLiked !== 'boolean') throw new Error('A desired reaction state is required.');
  const postRef = db.collection('posts').doc(postId);
  const markerId = createHash('sha256').update(`${postId}:${commentId}:${replyId}`).digest('hex');
  const markerRef = db.collection('users').doc(uid).collection('commentReplyLikes').doc(markerId);
  return db.runTransaction(async transaction => {
    const [post, marker] = await Promise.all([transaction.get(postRef), transaction.get(markerRef)]);
    if (!post.exists || post.get('audience') !== 'public') throw new Error('This public post is unavailable.');
    const comments = Array.isArray(post.get('comments')) ? [...post.get('comments')] : [];
    const commentIndex = comments.findIndex((comment: any) => comment?.id === commentId);
    if (commentIndex < 0) throw new Error('This comment is no longer available.');
    const comment = comments[commentIndex] as Record<string, any>;
    const replies = Array.isArray(comment.replies) ? [...comment.replies] : [];
    const replyIndex = replies.findIndex((reply: any) => reply?.id === replyId);
    if (replyIndex < 0) throw new Error('This reply is no longer available.');
    const reply = replies[replyIndex] as Record<string, any>;
    const likes = Number.isSafeInteger(reply.likes) && reply.likes >= 0 ? reply.likes : 0;
    if (marker.exists === desiredLiked) return { liked: desiredLiked, likes, changed: false };
    const nextLikes = Math.max(0, likes + (desiredLiked ? 1 : -1));
    replies[replyIndex] = { ...reply, likes: nextLikes };
    comments[commentIndex] = { ...comment, replies };
    if (desiredLiked) transaction.create(markerRef, { postId, commentId, replyId, createdAt: FieldValue.serverTimestamp() });
    else transaction.delete(markerRef);
    transaction.update(postRef, { comments, commentReactionsUpdatedAt: FieldValue.serverTimestamp() });
    return { liked: desiredLiked, likes: nextLikes, changed: true };
  });
}
