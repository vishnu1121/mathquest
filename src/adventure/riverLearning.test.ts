import { describe, expect, it } from "vitest";
import { createRng } from "../engine/rng";
import { riverRound } from "./riverLearning";

describe("adventure river learning", () => {
  it("offers a shorter path after repeated overshoots, while preserving tens practice", () => {
    const round = riverRound({ round: 1, replay: false, overshoots: 2, usedBig: true }, createRng(1));
    expect(round.support).toBe(true);
    expect(round.hop).toBeGreaterThanOrEqual(10);
    expect(round.start % 10 + round.hop % 10).toBeLessThan(10);
  });
  it("keeps the first story and its teaching example stable", () => {
    expect(riverRound({ round: 0, replay: false, overshoots: 0, usedBig: false }, createRng(1)))
      .toMatchObject({ start: 8, hop: 5, predict: false });
  });
  it("keeps replay numbers bounded and preserves the intended regrouping progression", () => {
    const seen = new Set();
    for (let seed = 0; seed < 200; seed++) {
      for (let round = 0; round < 3; round++) {
        const path = riverRound({ round, replay: true, overshoots: 0, usedBig: true }, createRng(seed));
        expect(path.start + path.hop).toBeLessThan(100);
        expect(path.hop).toBeGreaterThan(0);
        expect(path.hop).toBeLessThan(20);
        if (round === 1) expect(path.start % 10 + path.hop % 10).toBeLessThan(10);
        if (round === 2) expect(path.start % 10 + path.hop % 10).toBeGreaterThanOrEqual(10);
        seen.add(`${path.start}+${path.hop}`);
      }
    }
    expect(seen.size).toBeGreaterThan(50);
  });
  it("does not require regrouping before the learner has tried tens", () => {
    expect(riverRound({ round: 2, replay: true, overshoots: 0, usedBig: false }, createRng(1)))
      .toMatchObject({ start: 21, hop: 16, predict: true, support: true });
  });
  it("honors easier replay levels without turning a single-digit addend into a big hop", () => {
    for (const learningLevel of [1, 2] as const) for (let seed = 0; seed < 100; seed++) {
      const path = riverRound({ round: 2, replay: true, overshoots: 0, usedBig: true, learningLevel }, createRng(seed));
      expect(path.hop).toBeLessThan(10);
      expect(path.start + path.hop).toBeLessThan(100);
      expect(path.start % 10 + path.hop).toBeGreaterThanOrEqual(10);
    }
  });
});
