import { FieldPath, getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { getFirebaseAdminApp, resolveFirestoreDatabaseId } from './runtimeConfig.js';

const db = getFirestore(getFirebaseAdminApp(), resolveFirestoreDatabaseId());
const UID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

/**
 * Read-only preflight for the WorldWeave Membership V2 migration.
 * It deliberately does not create member records or change schema versions.
 * Run against staging first and review every conflict before authorizing a writer.
 */
export const auditWorldWeaveMembershipV2 = onCall(
  { maxInstances: 2, timeoutSeconds: 300 },
  async request => {
    const claims = request.auth?.token as Record<string, unknown> | undefined;
    if (!request.auth?.uid || !(claims?.admin === true
      || claims?.role === 'admin' || claims?.role === 'founder'
      || claims?.role === 'super_admin')) {
      throw new HttpsError('permission-denied', 'Only NEXORA administrators can audit the WorldWeave migration.');
    }

    const rawLimit = request.data?.limit;
    const limit = rawLimit === undefined ? 10 : Number(rawLimit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 25) {
      throw new HttpsError('invalid-argument', 'Choose an audit page size from 1 to 25.');
    }
    const cursor = request.data?.cursor;
    if (cursor !== undefined && cursor !== null
      && (typeof cursor !== 'string' || !UID_PATTERN.test(cursor))) {
      throw new HttpsError('invalid-argument', 'The WorldWeave audit cursor is invalid.');
    }

    let query: FirebaseFirestore.Query = db.collection('worldWeaves')
      .orderBy(FieldPath.documentId()).limit(limit + 1);
    if (cursor) query = query.startAfter(cursor);
    const page = await query.get();
    const hasMore = page.docs.length > limit;
    const docs = page.docs.slice(0, limit);
    const results = await Promise.all(docs.map(async snapshot => {
      const data = snapshot.data();
      const ownerId = typeof data.ownerId === 'string' && UID_PATTERN.test(data.ownerId)
        ? data.ownerId : null;
      const rawParticipants = Array.isArray(data.participantIds) ? data.participantIds : [];
      const validParticipants = rawParticipants.filter(
        (uid): uid is string => typeof uid === 'string' && UID_PATTERN.test(uid),
      );
      const uniqueParticipants = [...new Set(validParticipants)];
      const membersSnapshot = await snapshot.ref.collection('members').limit(501).get();
      const memberDocs = membersSnapshot.docs;
      const memberConflicts: string[] = [];
      for (const member of memberDocs) {
        const memberData = member.data();
        if (member.id !== memberData.userId) memberConflicts.push(member.id + ':userId_mismatch');
        if (!['owner', 'contributor'].includes(String(memberData.role))) memberConflicts.push(member.id + ':invalid_role');
        if (!['active', 'removed'].includes(String(memberData.status))) memberConflicts.push(member.id + ':invalid_status');
        if (memberData.status === 'active' && memberData.role === 'owner' && member.id !== ownerId) {
          memberConflicts.push(member.id + ':unexpected_active_owner');
        }
      }
      const activeOwners = memberDocs.filter(d => d.get('status') === 'active' && d.get('role') === 'owner');
      if (membersSnapshot.size > 500) memberConflicts.push('members:over_500_sample_limit');
      if (data.membershipSchemaVersion === 2 && activeOwners.length !== 1) {
        memberConflicts.push('v2:active_owner_count_not_one');
      }
      if (data.membershipSchemaVersion === 2 && ownerId && activeOwners[0]?.id !== ownerId) {
        memberConflicts.push('v2:owner_pointer_mismatch');
      }
      const count = typeof data.memberCount === 'number' ? data.memberCount : null;
      const issues: string[] = [];
      if (!ownerId) issues.push('missing_or_invalid_owner');
      if (rawParticipants.length !== validParticipants.length) issues.push('invalid_legacy_participant_ids');
      if (rawParticipants.length > 500) issues.push('legacy_membership_over_500');
      if (validParticipants.length !== uniqueParticipants.length) issues.push('duplicate_legacy_participant_ids');
      if (ownerId && !uniqueParticipants.includes(ownerId)) issues.push('owner_missing_from_legacy_participants');
      if (count !== null && count !== uniqueParticipants.length) issues.push('legacy_member_count_mismatch');
      if (membersSnapshot.size > 500) issues.push('member_sample_truncated');
      if (memberConflicts.length) issues.push('membership_record_conflicts');
      if (data.membershipSchemaVersion === 2 && membersSnapshot.empty) issues.push('v2_has_no_member_records');
      if (data.membershipSchemaVersion !== 2 && membersSnapshot.size > 0) issues.push('existing_membership_records_require_reconciliation');
      return {
        weaveId: snapshot.id,
        schemaVersion: data.membershipSchemaVersion === 2 ? 2 : 1,
        ownerId,
        legacyParticipantCount: rawParticipants.length,
        uniqueValidParticipantCount: uniqueParticipants.length,
        legacyMemberCount: count,
        existingMemberRecordCount: membersSnapshot.size,
        activeOwnerRecordCount: activeOwners.length,
        issues,
        memberConflicts,
        eligibleForBackfill: issues.length === 0 && memberConflicts.length === 0
          && data.membershipSchemaVersion !== 2,
      };
    }));

    return {
      mode: 'read_only_preflight',
      writesPerformed: 0,
      scanned: docs.length,
      nextCursor: hasMore ? docs[docs.length - 1]?.id ?? null : null,
      done: !hasMore,
      summary: {
        eligibleForBackfill: results.filter(item => item.eligibleForBackfill).length,
        requiresReview: results.filter(item => !item.eligibleForBackfill && item.schemaVersion !== 2).length,
        alreadyVersion2: results.filter(item => item.schemaVersion === 2).length,
      },
      results,
    };
  },
);
