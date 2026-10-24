/** Build storage paths matching storage.rules; voice media is scoped to chat participants. */
export function mediaStoragePath(userId: string, mediaId: string, chatId?: string): string {
  return chatId
    ? `chats/${chatId}/audio/${userId}/${mediaId}`
    : `users/${userId}/media/${mediaId}`;
}
