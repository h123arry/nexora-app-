import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calculateDailyStreak } from "../functions/src/retentionPolicy.js";

const day = (value: string) => Date.parse(value + "T12:00:00.000Z");

describe("NEXORA daily streak policy", () => {
  it("starts a first-visit streak at one", () => {
    assert.equal(calculateDailyStreak({}, day("2026-11-10")).currentStreak, 1);
  });

  it("does not increment more than once on the same UTC day", () => {
    const result = calculateDailyStreak({ lastActiveDay: "2026-11-10", currentStreak: 4, longestStreak: 8 }, day("2026-11-10"));
    assert.equal(result.currentStreak, 4);
    assert.equal(result.longestStreak, 8);
  });

  it("increments on consecutive UTC days", () => {
    const result = calculateDailyStreak({ lastActiveDay: "2026-11-09", currentStreak: 4, longestStreak: 4 }, day("2026-11-10"));
    assert.equal(result.currentStreak, 5);
    assert.equal(result.longestStreak, 5);
    assert.equal(result.graceDayApplied, false);
  });

  it("bridges one missed day with one grace day in the ISO week", () => {
    const result = calculateDailyStreak({ lastActiveDay: "2026-11-08", currentStreak: 4, longestStreak: 7 }, day("2026-11-10"));
    assert.equal(result.currentStreak, 5);
    assert.equal(result.longestStreak, 7);
    assert.equal(result.graceDayApplied, true);
  });

  it("resets after more than one missed day or a second grace attempt in the same week", () => {
    const longGap = calculateDailyStreak({ lastActiveDay: "2026-11-06", currentStreak: 9 }, day("2026-11-10"));
    const repeatedGrace = calculateDailyStreak({ lastActiveDay: "2026-11-08", currentStreak: 9, graceWeekUsed: "2026-W46" }, day("2026-11-10"));
    assert.equal(longGap.currentStreak, 1);
    assert.equal(repeatedGrace.currentStreak, 1);
  });
});
