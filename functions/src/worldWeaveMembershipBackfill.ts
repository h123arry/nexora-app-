import { randomUUID } from 'node:crypto';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { getFirebaseAdminApp, resolveFirestoreDatabaseId } from './runtimeConfig.js';

const db = getFirestore(getFirebaseAdminApp(), resolveFirestoreDatabaseId());
const UID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const MAX_MEMBERS = 500;
const MAX_WRITES_PER_PASS = 400;

function isAdmin(token: Record<string, unknown> | undefined): boolean {
  return token?.admin === true
    || token?.role === 'admin'
    || token?.role === 'founder'
    || token?.role === 'super_admin';
}

/**
 * Resumable, idempotent per-experience backfill.
 *
 * Each pass creates at most 400 member records. The schema version is advanced
 * only after every legacy participant has a matching active membership record
 * and no unexpected member documents exist. This callable does not change
 * client authorization; it only prepares data for a separately reviewed cutover.
 */
export const backfillWorldWeaveMembershipV2 = onCall(
  { maxInstances: 2, timeoutSeconds: 120 },
  async request => {
    if (!request.auth?.uid || !isAdmin(request.auth.token as Record<string, unknown> | undefined)) {
      throw new HttpsError('permission-denied', 'Only NEXORA administrators can migrate WorldWeave memberships.');
    }
    const weaveId = request.data?.weaveId;
    if (typeof weaveId !== 'string' || !UID_PATTERN.test(weaveId)) {
      throw new HttpsError('invalid-argument', 'A valid WorldWeave ID is required.');
    }

    const weaveRef = db.collection('worldWeaves').doc(weaveId);
    const membersRef = weaveRef.collection('members');
    const activityRef = weaveRef.collection('activity').doc(randomUUID());

    return db.runTransaction(async tx => {
      const [weave, memberSnapshot] = await Promise.all([
        tx.get(weaveRef),
        tx.get(membersRef.limit(MAX_MEMBERS + 1)),
      ]);
      if (!weave.exists) throw new HttpsError('not-found', 'This WorldWeave no longer exists.');
      if (weave.get('membershipSchemaVersion') === 2) {
        return { weaveId, completed: true, alreadyMigrated: true, created: 0, remaining: 0 };
      }
      if (weave.get('membershipSchemaVersion') !== undefined
        && weave.get('membershipSchemaVersion') !== null
        && weave.get('membershipSchemaVersion') !== 1) {
        throw new HttpsError('failed-precondition', 'This WorldWeave has an unsupported membership schema version.');
      }

      const ownerId = weave.get('ownerId');
      const rawParticipants = weave.get('participantIds');
      if (typeof ownerId !== 'string' || !UID_PATTERN.test(ownerId)
        || !Array.isArray(rawParticipants) || rawParticipants.length < 1
        || rawParticipants.length > MAX_MEMBERS
        || rawParticipants.some((uid: unknown) => typeof uid !== 'string' || !UID_PATTERN.test(uid))) {
        throw new HttpsError('failed-precondition', 'Legacy membership data is invalid or exceeds the safe migration limit.');
      }
      const participants = rawParticipants as string[];
      const uniqueParticipants = [...new Set(participants)];
      if (uniqueParticipants.length !== participants.length || !uniqueParticipants.includes(ownerId)) {
        throw new HttpsError('failed-precondition', 'Resolve duplicate members and ensure the owner is included before migration.');
      }
      if (typeof weave.get('memberCount') === 'number' && weave.get('memberCount') !== participants.length) {
        throw new HttpsError('failed-precondition', 'Resolve the legacy member count mismatch before migration.');
      }
      if (memberSnapshot.size > MAX_MEMBERS) {
        throw new HttpsError('failed-precondition', 'Existing membership records exceed the safe migration limit.');
      }

      const expected = new Map(participants.map(uid => [uid, uid === ownerId ? 'owner' : 'contributor']));
      for (const member of memberSnapshot.docs) {
        const expectedRole = expected.get(member.id);
        const data = member.data();
        if (!expectedRole || data.userId !== member.id || data.role !== expectedRole || data.status !== 'active') {
          throw new HttpsError('failed-precondition', 'Existing membership records conflict with the legacy participant list. Run the read-only audit and resolve the conflict first.');
        }
      }

      const existing = new Set(memberSnapshot.docs.map(doc => doc.id));
      const missing = participants.filter(uid => !existing.has(uid));
      const batch = missing.slice(0, MAX_WRITES_PER_PASS);
      for (const uid of batch) {
        const role = uid === ownerId ? 'owner' : 'contributor';
        tx.create(membersRef.doc(uid), {
          userId: uid,
          role,
          status: 'active',
          joinedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          migrationSource: 'legacy_participantIds',
        });
      }

      const remaining = missing.length - batch.length;
      const completed = remaining === 0;
      if (completed) {
        tx.update(weaveRef, {
          membershipSchemaVersion: 2,
          membershipMigratedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        tx.create(activityRef, {
          id: activityRef.id,
          actorUid: request.auth!.uid,
          targetUid: ownerId,
          action: 'membership_v2_migrated',
          migratedMemberCount: participants.length,
          createdAt: FieldValue.serverTimestamp(),
        });
      }

      return {
        weaveId,
        completed,
        alreadyMigrated: false,
        created: batch.length,
        remaining,
        totalMembers: participants.length,
      };
    });
  },
);
