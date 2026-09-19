import { describe, expect, it } from "vitest";
import { createRng } from "../engine/rng";
import { LANES, WAVES, basePossible, comboMultiplier, exactStep, judge, medalFor, planWave, recordRun, remaining, restoreChute, rivalScore } from "./chute";

const GRADES = ["3", "4", "5"] as const;
const plan = (mode: "sort" | "exact", grade: (typeof GRADES)[number], seed: number) =>
  Array.from({ length: WAVES }, (_, i) => planWave(mode, grade, i, createRng(seed + i)));

describe("Number Chute", () => {
  it("plans reproducible waves that get faster and ask for more", () => {
    for (const grade of GRADES) for (const mode of ["sort", "exact"] as const) for (let seed = 0; seed < 30; seed++) {
      const waves = plan(mode, grade, seed * 131);
      expect(waves).toEqual(plan(mode, grade, seed * 131));
      for (let i = 1; i < waves.length; i++) {
        expect(waves[i]!.fallMs).toBeLessThan(waves[i - 1]!.fallMs);
        expect(waves[i]!.gapMs).toBeLessThan(waves[i - 1]!.gapMs);
      }
      for (const wave of waves) {
        expect(wave.rule).toBeTruthy();
        expect(wave.hint).toBeTruthy();
        expect(wave.drops.length).toBeGreaterThan(8);
        for (const drop of wave.drops) { expect(drop.lane).toBeGreaterThanOrEqual(0); expect(drop.lane).toBeLessThan(LANES); }
      }
    }
  });
  it("labels a sorting wave correctly, and always offers enough right answers to clear it", () => {
    for (const grade of GRADES) for (let seed = 0; seed < 40; seed++) {
      for (const wave of plan("sort", grade, seed * 977)) {
        const good = wave.drops.filter((d) => d.good);
        expect(good.length).toBeGreaterThanOrEqual(wave.quota);
        const multiple = wave.rule.match(/multiples of (\d+)/), factor = wave.rule.match(/factors of (\d+)/), over = wave.rule.match(/greater than ([\d.]+)/);
        for (const drop of wave.drops) {
          if (multiple) expect(drop.good).toBe(drop.value % Number(multiple[1]) === 0);
          if (factor) expect(drop.good).toBe(Number(factor[1]) % drop.value === 0);
          if (over) expect(drop.good).toBe(drop.value > Number(over[1]));
          expect(drop.label).toBe(String(drop.value));
        }
      }
    }
  });
  it("never puts two drops in a row down the same chute", () => {
    for (const wave of plan("sort", "4", 5150)) for (let i = 1; i < wave.drops.length; i++) expect(wave.drops[i]!.lane).not.toBe(wave.drops[i - 1]!.lane);
  });
  it("gives an exact-order wave a target that can always be filled exactly", () => {
    for (const grade of GRADES) for (let seed = 0; seed < 40; seed++) {
      for (const wave of plan("exact", grade, seed * 619)) {
        expect(wave.target).toBeGreaterThan(0);
        // The target is a whole number of the smallest step, and that step keeps falling, so a child who
        // is short by one step is never stuck with nothing that fits.
        const step = exactStep(grade);
        expect(Math.round((wave.target / step) * 10) / 10 % 1).toBe(0);
        expect(wave.drops.filter((d) => d.value === step).length).toBeGreaterThanOrEqual(5);
        for (const drop of wave.drops) expect(Math.round((drop.value / step) * 10) / 10 % 1).toBe(0);
      }
    }
  });
  it("judges a catch against what is already in the basket", () => {
    expect(judge(0, 5, 25)).toBe("take");
    expect(judge(20, 5, 25)).toBe("exact");
    expect(judge(24, 5, 25)).toBe("over");
    // Tenths add up without the usual floating-point dust.
    expect(judge(0.1, 0.2, 0.3)).toBe("exact");
    expect(remaining(7.5, 12.5)).toBe(5);
  });
  it("rewards a clean streak, and never more than four times", () => {
    expect([0, 4, 5, 9, 10, 14, 15, 40].map(comboMultiplier)).toEqual([1, 1, 2, 2, 3, 3, 4, 4]);
  });
  it("sets medals and a rival from what a perfect run would score", () => {
    const base = basePossible("sort", plan("sort", "4", 7));
    expect(base).toBeGreaterThan(0);
    expect(medalFor(base, base)).toBe("gold");
    expect(medalFor(Math.round(base * 0.7), base)).toBe("silver");
    expect(medalFor(10, base)).toBe("bronze");
    expect(medalFor(0, base)).toBeNull();
    expect(rivalScore(base)).toBeLessThan(base);
  });
  it("keeps the best score and the best medal, and repairs a damaged save", () => {
    expect(restoreChute(undefined)).toEqual({ best: 0, medal: null });
    expect(restoreChute({ best: -5, medal: "platinum" })).toEqual({ best: 0, medal: null });
    const first = recordRun({ best: 0, medal: null }, 800, "silver");
    expect(first).toEqual({ record: { best: 800, medal: "silver" }, newBest: true });
    const worse = recordRun(first.record, 200, "bronze");
    expect(worse).toEqual({ record: { best: 800, medal: "silver" }, newBest: false });
    expect(recordRun(first.record, 900, "gold").record).toEqual({ best: 900, medal: "gold" });
  });
});
