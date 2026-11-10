import { FieldValue, Firestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { calculateDailyStreak, DailyStreakRecord } from "./retentionPolicy.js";

export function createDailySessionRecorder(db: Firestore, clock: () => number = Date.now) {
  return async (uid: string) => {
    if (!uid) throw new HttpsError("unauthenticated", "Sign in to record your NEXORA session.");
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

const adminDb = (await import("./runtimeConfig.js")).getFirebaseAdminApp;
