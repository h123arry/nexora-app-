import { httpsCallable } from 'firebase/functions';
import { functions } from '../../lib/firebase';

interface DeleteCommentResult { deleted: true; commentsCount: number; }

export async function deletePostComment(postId: string, commentId: string): Promise<DeleteCommentResult> {
  const callable = httpsCallable<
    { postId: string; commentId: string },
    DeleteCommentResult
  >(functions, 'deletePublicPostCommentEntry');
  const result = await callable({ postId, commentId });
  return result.data;
}
