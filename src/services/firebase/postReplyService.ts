import { httpsCallable } from 'firebase/functions';
import { functions } from '../../lib/firebase';

interface ReplyResult {
  reply: {
    id: string; userId: string; username: string; name: string;
    avatar: string; content: string; timestamp: string;
  };
  created: boolean;
}

export async function addPostCommentReply(
  postId: string, commentId: string, content: string, replyId: string,
): Promise<ReplyResult['reply']> {
  const callable = httpsCallable<
    { postId: string; commentId: string; content: string; replyId: string },
    ReplyResult
  >(functions, 'replyToPublicPostComment');
  const result = await callable({ postId, commentId, content, replyId });
  return result.data.reply;
}
