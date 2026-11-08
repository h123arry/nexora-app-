import { httpsCallable } from 'firebase/functions';
import { functions } from '../../lib/firebase';

interface CommentLikeResult { liked: boolean; likes: number; changed: boolean; }

export async function setPostCommentLike(postId: string, commentId: string, liked: boolean): Promise<CommentLikeResult> {
  const callable = httpsCallable<
    { postId: string; commentId: string; liked: boolean },
    CommentLikeResult
  >(functions, 'setPublicPostCommentLikeState');
  const result = await callable({ postId, commentId, liked });
  return result.data;
}
