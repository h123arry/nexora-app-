import { FieldValue, Firestore } from "firebase-admin/firestore";
import { calculateDailyStreak, DailyStreakRecord } from "./retentionPolicy.js";

export function createDailySessionRecorder(db: Firestore, clock: () => number = Date.now) {
  return async (uid: string) => {
    if (!uid) throw new Error("An authenticated account is required.");
    const reference = db.collection("userRetention").doc(uid);
    return db.runTransaction(async transaction => {
      const snapshot = await transaction.get(reference);
      const existing = (snapshot.data() || {}) as DailyStreakRecord & { lastVisitAt?: { toDate?: () => Date } };
      const previousLastVisitAt = existing.lastVisitAt?.toDate?.().toISOString() || null;
      const streak = calculateDailyStreak(existing, clock());
      transaction.set(reference, {
        userId: uid,
        ...streak,
        lastVisitAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      return { ...streak, previousLastVisitAt };
    });
  };
}
