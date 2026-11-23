import { FieldPath, FieldValue, type Firestore, type QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { deleteOwnedOriginRecord } from './originCleanup.js';

const PAGE_SIZE = 200;

/** User-owned top-level records that are safe to erase with the account. */
export const ACCOUNT_OWNED_COLLECTIONS: ReadonlyArray<{ name: string; field: string }> = [
  { name: 'posts', field: 'userId' },
  { name: 'drafts', field: 'userId' },
  { name: 'activities', field: 'userId' },
  { name: 'creatorAnalytics', field: 'userId' },
  { name: 'analyticsEvents', field: 'actorId' },
  { name: 'notifications', field: 'userId' },
  { name: 'moderationReports', field: 'reporterId' },
  { name: 'moderationAppeals', field: 'userId' },
  { name: 'privacySettings', field: 'userId' },
  { name: 'presence', field: 'userId' },
  { name: 'pages', field: 'ownerId' },
  { name: 'communities', field: 'ownerId' },
  { name: 'mediaAssets', field: 'ownerId' },
  { name: 'mediaOrigins', field: 'ownerUid' },
  { name: 'academyProgress', field: 'userId' },
  { name: 'academyLessonNotes', field: 'userId' },
  { name: 'identityVerificationApplications', field: 'userId' },
  { name: 'identityVerificationPrivateSignals', field: 'userId' },
  { name: 'verifiedIdentities', field: 'userId' },
  { name: 'identityImpersonationCases', field: 'userId' },
];

export function accountStoragePrefixes(userId: string): string[] {
  if (!userId || userId.includes('/') || userId.includes('\\')) {
    throw new Error('A valid account ID is required for storage cleanup.');
  }
  return [
    `users/${userId}/`,
    `media/${userId}/`,
    // The media worker stores processed renditions outside the original upload prefix.
    `processed/${userId}/`,
  ];
}


/**
 * Erase a deleted account's embedded comments and replies from posts they did not own.
 * Keep other people's replies readable by replacing a deleted parent with a neutral
 * placeholder only when that thread still contains replies.
 */
export async function eraseUserCommentsFromPosts(
  db: Firestore,
  userId: string,
  onBatch?: () => Promise<void>,
): Promise<number> {
  if (!userId || userId.includes('/') || userId.includes('\\')) {
    throw new Error('A valid account ID is required for comment cleanup.');
  }

  let changedPosts = 0;
  let cursor: QueryDocumentSnapshot | undefined;
  while (true) {
    let query = db.collection('posts').orderBy(FieldPath.documentId()).limit(PAGE_SIZE);
    if (cursor) query = query.startAfter(cursor);
    const snapshot = await query.get();
    if (snapshot.empty) break;

    const batch = db.batch();
    let batchChanges = 0;
    for (const post of snapshot.docs) {
      const original = post.get('comments');
      if (!Array.isArray(original) || original.length === 0) continue;
      let removedTopLevel = 0;
      let changed = false;
      const comments = original.flatMap((raw: unknown) => {
        if (!raw || typeof raw !== 'object') return [raw];
        const comment = raw as Record<string, any>;
        const replies = Array.isArray(comment.replies) ? comment.replies : [];
        const remainingReplies = replies.filter((reply: unknown) =>
          !reply || typeof reply !== 'object' || (reply as Record<string, unknown>).userId !== userId
        );
        const repliesChanged = remainingReplies.length !== replies.length;

        if (comment.userId === userId) {
          changed = true;
          if (repliesChanged) changed = true;
          if (remainingReplies.length === 0) {
            removedTopLevel += 1;
            return [];
          }
          return [{
            id: comment.id,
            postId: comment.postId,
            timestamp: comment.timestamp,
            likes: Number.isSafeInteger(comment.likes) ? comment.likes : 0,
            userId: '',
            username: 'deleted_account',
            name: 'Deleted account',
            avatar: '',
            content: 'Comment removed',
            replies: remainingReplies,
          }];
        }

        if (!repliesChanged) return [raw];
        changed = true;
        return [{ ...comment, replies: remainingReplies }];
      });

      if (!changed) continue;
      const storedCount = post.get('commentsCount');
      const commentsCount = Number.isSafeInteger(storedCount) && storedCount >= 0
        ? Math.max(0, storedCount - removedTopLevel)
        : comments.length;
      batch.update(post.ref, { comments, commentsCount });
      batchChanges += 1;
    }

    if (batchChanges > 0) {
      await batch.commit();
      changedPosts += batchChanges;
    }
    await onBatch?.();
    cursor = snapshot.docs[snapshot.docs.length - 1];
    if (snapshot.size < PAGE_SIZE) break;
  }
  return changedPosts;
}

export async function deleteUserOwnedDocuments(db: Firestore, userId: string, onBatch?: () => Promise<void>): Promise<number> {
  if (!userId) throw new Error('A valid account ID is required for data cleanup.');
  let deleted = 0;
  // Financial settlement records are retained for reconciliation and legal/accounting evidence.
  // Do not erase a beneficiary while a provider transfer may still settle or need reconciliation.
  const activePayouts = await db.collection('creatorPayoutRequests')
    .where('creatorId', '==', userId)
    .where('status', 'in', ['submitting', 'processing', 'submission_unknown', 'awaiting_provider_approval'])
    .limit(1).get();
  if (!activePayouts.empty) {
    throw new Error('Account deletion is paused because a creator payout is still pending provider settlement or reconciliation.');
  }

  for (const target of ACCOUNT_OWNED_COLLECTIONS) {
    while (true) {
      const snapshot = await db.collection(target.name).where(target.field, '==', userId).limit(PAGE_SIZE).get();
      if (snapshot.empty) break;
      if (target.name === 'mediaOrigins') {
        for (const document of snapshot.docs) {
          deleted += await deleteOwnedOriginRecord(db, document.id, userId);
          await onBatch?.();
        }
        if (snapshot.size < PAGE_SIZE) break;
        continue;
      }
      const batch = db.batch();
      snapshot.docs.forEach(document => batch.delete(document.ref));
      await batch.commit();
      deleted += snapshot.size;
      await onBatch?.();
      if (snapshot.size < PAGE_SIZE) break;
    }
  }
  // Comments are embedded in other users' posts, so scrub them separately from owned documents.\n  await eraseUserCommentsFromPosts(db, userId, onBatch);\n\n  // Reporter signals are nested under the reported account; remove both target- and reporter-owned rows.
  const targetSignals = db.collection('identityImpersonationSignals').doc(userId);
  while (true) {
    const rows = await targetSignals.collection('reporters').limit(PAGE_SIZE).get();
    if (rows.empty) break;
    const batch = db.batch();
    rows.docs.forEach(row => batch.delete(row.ref));
    await batch.commit();
    deleted += rows.size;
    await onBatch?.();
    if (rows.size < PAGE_SIZE) break;
  }
  if ((await targetSignals.get()).exists) {
    await targetSignals.delete();
    deleted += 1;
    await onBatch?.();
  }
  while (true) {
    const rows = await db.collectionGroup('reporters').where('reporterId', '==', userId).limit(PAGE_SIZE).get();
    if (rows.empty) break;
    const batch = db.batch();
    rows.docs.forEach(row => batch.delete(row.ref));
    await batch.commit();
    deleted += rows.size;
    if (rows.size < PAGE_SIZE) break;
  }

  // Once all payouts are terminal, remove the bank-beneficiary and compliance documents.
  // Historical payout requests, provider events, wallet records and double-entry ledger rows remain intact.
  for (const collection of ['creatorPayoutBeneficiaries', 'creatorPayoutCompliance']) {
    const ref = db.collection(collection).doc(userId);
    if ((await ref.get()).exists) {
      await ref.delete();
      deleted += 1;
      await onBatch?.();
    }
  }

  // Historical settlement records remain for accounting, but the provider beneficiary
  // reference is no longer needed once the transfer is terminal and must not outlive the bank profile.
  let payoutCursor: QueryDocumentSnapshot | undefined;
  while (true) {
    let payoutQuery = db.collection('creatorPayoutRequests')
      .where('creatorId', '==', userId)
      .where('status', 'in', ['success', 'failed', 'reversed'])
      .orderBy(FieldPath.documentId())
      .limit(PAGE_SIZE);
    if (payoutCursor) payoutQuery = payoutQuery.startAfter(payoutCursor);
    const rows = await payoutQuery.get();
    if (rows.empty) break;
    const batch = db.batch();
    rows.docs.forEach(row => batch.update(row.ref, {
      beneficiaryRef: FieldValue.delete(),
    }));
    await batch.commit();
    await onBatch?.();
    payoutCursor = rows.docs[rows.docs.length - 1];
    if (rows.size < PAGE_SIZE) break;
  }

  // Keep payout audit evidence, but remove only the deleted account's identity.
  // Preserve a different creator or finance operator identity when that person is not
  // the account being deleted; always remove bank and beneficiary references.
  for (const identityField of ['creatorId', 'actorId'] as const) {
    while (true) {
      const rows = await db.collection('creatorPayoutAuditEvents')
        .where(identityField, '==', userId).limit(PAGE_SIZE).get();
      if (rows.empty) break;
      const batch = db.batch();
      rows.docs.forEach(row => batch.update(row.ref, {
        [identityField]: FieldValue.delete(),
        accountNumberLast4: FieldValue.delete(),
        bankCode: FieldValue.delete(),
        beneficiaryRef: FieldValue.delete(),
        evidenceReference: FieldValue.delete(),
        accountDeleted: true,
      }));
      await batch.commit();
      await onBatch?.();
      if (rows.size < PAGE_SIZE) break;
    }
  }

  // Keep audit history but remove account identifiers and free-text review notes.
  for (const field of ['userId', 'reviewerId', 'actorId']) {
    while (true) {
      const rows = await db.collection('identityVerificationAuditEvents').where(field, '==', userId).limit(PAGE_SIZE).get();
      if (rows.empty) break;
      const batch = db.batch();
      rows.docs.forEach(row => batch.update(row.ref, {
        [field]: FieldValue.delete(),
        reviewNote: FieldValue.delete(),
        accountDeleted: true,
      }));
      await batch.commit();
      await onBatch?.();
      if (rows.size < PAGE_SIZE) break;
    }
  }
  // Retain security audit events for accountability, but remove the deleted account identifier.
  while (true) {
    const rows = await db.collection('securityAuditEvents').where('userId', '==', userId).limit(PAGE_SIZE).get();
    if (rows.empty) break;
    const batch = db.batch();
    rows.docs.forEach(row => batch.update(row.ref, {
      userId: FieldValue.delete(),
      accountDeleted: true,
    }));
    await batch.commit();
    await onBatch?.();
    if (rows.size < PAGE_SIZE) break;
  }
  return deleted;
}
