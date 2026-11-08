import type { Firestore } from 'firebase-admin/firestore';

function validId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 150 && !value.includes('/');
}

export async function deletePublicPostComment(
  db: Firestore, uid: string, postId: string, commentId: string,
): Promise<{ deleted: true; commentsCount: number }> {
  if (!uid) throw new Error('Authentication is required.');
  if (!validId(postId) || !validId(commentId)) throw new Error('A valid post and comment are required.');
  const postRef = db.collection('posts').doc(postId);

  return db.runTransaction(async transaction => {
    const post = await transaction.get(postRef);
    if (!post.exists) throw new Error('This post is no longer available.');
    const comments = Array.isArray(post.get('comments')) ? [...post.get('comments')] : [];
    const index = comments.findIndex((comment: any) => comment?.id === commentId);
    if (index < 0) throw new Error('This comment is no longer available.');
    const comment = comments[index] as Record<string, any>;
    const postOwnerId = String(post.get('userId') || post.get('authorId') || '');
    const commentOwnerId = String(comment.userId || '');
    if (uid !== postOwnerId && uid !== commentOwnerId) {
      throw new Error('You do not have permission to delete this comment.');
    }
    comments.splice(index, 1);
    const currentCount = Number.isSafeInteger(post.get('commentsCount')) && post.get('commentsCount') >= 0
      ? post.get('commentsCount')
      : comments.length + 1;
    const commentsCount = Math.max(0, currentCount - 1);
    transaction.update(postRef, { comments, commentsCount });
    return { deleted: true, commentsCount };
  });
}
