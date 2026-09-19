import { describe, expect, it } from "vitest";
import { award, formatScore, inPowerMode, multiplier, nextStreak, powerFill, praise, recordBest, restoreBest, ruleFor } from "./arcadeScore";

describe("arcade streaks", () => {
  it("counts consecutive successes and resets on a miss", () => {
    let streak = 0;
    for (const correct of [true, true, true, false, true]) streak = nextStreak(streak, correct);
    expect(streak).toBe(1);
  });

  it("raises the multiplier one step per success in the glade and the duel", () => {
    const rule = ruleFor("fireflies");
    expect([0, 1, 2, 3, 5, 9].map((s) => multiplier(s, rule))).toEqual([1, 1, 2, 3, 5, 5]);
    expect(inPowerMode(2, rule)).toBe(false);
    expect(inPowerMode(3, rule)).toBe(true);
  });

  it("needs four clean hops per step in the river", () => {
    const rule = ruleFor("frog");
    expect([1, 4, 5, 8, 9, 17, 40].map((s) => multiplier(s, rule))).toEqual([1, 1, 2, 2, 3, 5, 5]);
    expect(inPowerMode(7, rule)).toBe(false);
    expect(inPowerMode(8, rule)).toBe(true);
  });

  it("uses one shared rule for the learning atlas trails", () => {
    expect(ruleFor("fractions")).toEqual(ruleFor("expedition"));
    expect(ruleFor("fractions").power).toBe(3);
  });

  it("doubles points in power mode", () => {
    const rule = ruleFor("guardian");
    expect(award(200, 1, rule)).toEqual({ points: 200, mult: 1, power: false });
    expect(award(200, 2, rule)).toEqual({ points: 400, mult: 2, power: false });
    expect(award(200, 3, rule)).toEqual({ points: 1200, mult: 3, power: true });
  });

  it("fills the power meter and stops at full", () => {
    const rule = ruleFor("fireflies");
    expect(powerFill(0, rule)).toBe(0);
    expect(powerFill(2, rule)).toBeCloseTo(2 / 3);
    expect(powerFill(12, rule)).toBe(1);
  });

  it("cheers only for streaks, louder as they grow", () => {
    expect(praise(1)).toBeNull();
    expect(praise(2)).toEqual({ word: "Nice!", tier: 1 });
    expect(praise(3)?.tier).toBe(2);
    expect(praise(7)).toEqual({ word: "Unstoppable!", tier: 3 });
  });
});

describe("best scores", () => {
  it("records a first score and only replaces it with a higher one", () => {
    const first = recordBest({}, "frog", 1200);
    expect(first).toEqual({ best: { frog: 1200 }, previous: 0, newBest: true });
    expect(recordBest(first.best, "frog", 900)).toEqual({ best: { frog: 1200 }, previous: 1200, newBest: false });
    expect(recordBest(first.best, "frog", 1200).newBest).toBe(false);
    expect(recordBest(first.best, "frog", 1500)).toEqual({ best: { frog: 1500 }, previous: 1200, newBest: true });
  });

  it("does not count an empty run as a best", () => {
    expect(recordBest({}, "guardian", 0)).toEqual({ best: {}, previous: 0, newBest: false });
  });

  it("drops malformed saved scores", () => {
    expect(restoreBest(null)).toEqual({});
    expect(restoreBest([5])).toEqual({});
    expect(restoreBest({ frog: 900, fireflies: "900", guardian: -3, trail: Number.NaN, "Bad Key": 50, big: 1e12 })).toEqual({ frog: 900, big: 9_999_999 });
  });

  it("formats scores for the panel", () => {
    expect(formatScore(0)).toBe("0");
    expect(formatScore(12345.9)).toBe("12,345");
    expect(formatScore(Number.NaN)).toBe("0");
    expect(formatScore(-40)).toBe("0");
  });
});
