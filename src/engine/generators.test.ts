import { describe, expect, it } from "vitest";
import { buildChoices, createChallenge, generateOperands } from "./generators";
import { createRng } from "./rng";
import type { Level, Operands, SkillId } from "./types";

const onesSum = ({ a, b }: Operands) => (a % 10) + (b % 10);
const sample = (skill: SkillId, level: Level, n = 400) => {
  const rng = createRng(level * 1000 + skill.length);
  return Array.from({ length: n }, () => generateOperands(skill, level, rng));
};

describe("generateOperands", () => {
  it("keeps simple addition inside each level's range", () => {
    for (const op of sample("simple", 1)) expect(op.a >= 1 && op.b >= 1 && op.a + op.b <= 5).toBe(true);
    for (const op of sample("simple", 2)) expect(op.a >= 1 && op.b >= 1 && op.a + op.b <= 10).toBe(true);
    for (const op of sample("simple", 3)) expect(op.a <= 9 && op.b <= 9 && op.a + op.b >= 11).toBe(true);
    for (const op of sample("simple", 4)) expect(op.b <= 9 && op.a + op.b <= 20).toBe(true);
  });

  it("never needs carrying in the no-carrying skill", () => {
    for (const level of [1, 2, 3] as const) {
      for (const op of sample("twoDigit", level)) {
        expect(onesSum(op)).toBeLessThanOrEqual(9);
        expect(op.a + op.b).toBeLessThan(100);
      }
    }
    for (const op of sample("twoDigit", 1)) expect(op.a >= 20 && op.b <= 9).toBe(true);
    for (const op of sample("twoDigit", 2)) expect(op.b % 10).toBe(0);
    for (const op of sample("twoDigit", 3)) expect(op.a >= 10 && op.b >= 10).toBe(true);
  });

  it("always needs carrying in the regrouping skill", () => {
    for (const level of [1, 2, 3, 4] as const) {
      for (const op of sample("regroup", level)) expect(onesSum(op)).toBeGreaterThanOrEqual(10);
    }
    for (const op of sample("regroup", 1)) expect(op.b <= 9 && op.a + op.b <= 48).toBe(true);
    for (const op of sample("regroup", 2)) expect(op.b <= 9 && op.a + op.b < 100).toBe(true);
    for (const op of sample("regroup", 3)) expect(op.a >= 10 && op.b >= 10 && op.a + op.b < 100).toBe(true);
    for (const op of sample("regroup", 4)) expect(op.a + op.b).toBeGreaterThanOrEqual(100);
  });

  it("is deterministic for a seed", () => {
    const a = createRng(5);
    const b = createRng(5);
    expect(generateOperands("regroup", 3, a)).toEqual(generateOperands("regroup", 3, b));
  });
});

describe("buildChoices", () => {
  it("offers four different choices including the correct answer and a real mistake", () => {
    const choices = buildChoices(47, 38, createRng(1));
    expect(choices).toHaveLength(4);
    expect(new Set(choices).size).toBe(4);
    expect(choices).toContain(85);
    expect(choices.some((c) => [715, 75, 95].includes(c))).toBe(true);
  });

  it("only offers positive numbers for tiny sums", () => {
    const rng = createRng(3);
    for (let i = 0; i < 200; i++) {
      const choices = buildChoices(1, 1, rng);
      expect(choices.every((c) => c > 0)).toBe(true);
      expect(new Set(choices).size).toBe(choices.length);
    }
  });
});

describe("createChallenge", () => {
  const rng = createRng(11);

  it("asks for the total in equations and the hidden number in missing-addend problems", () => {
    const eq = createChallenge({ skill: "regroup", level: 3, format: "equation" }, rng, "c1");
    expect(eq.answer).toBe(eq.a + eq.b);
    expect(eq.unknown).toBe("total");

    const missing = createChallenge({ skill: "regroup", level: 3, format: "missingAddend" }, rng, "c2");
    expect(missing.answer).toBe(missing.b);
    expect(missing.unknown).toBe("addend");
  });

  it("writes story problems whose numbers match the answer", () => {
    for (let i = 0; i < 60; i++) {
      const c = createChallenge({ skill: "wordProblems", level: 3, format: "wordProblem" }, rng, `w${i}`);
      expect(c.story).toBeDefined();
      expect(c.story?.text).toContain(String(c.a));
      if (c.story?.kind === "changeUnknown") {
        expect(c.answer).toBe(c.b);
        expect(c.story.text).toContain(String(c.total));
      } else {
        expect(c.answer).toBe(c.total);
        expect(c.story?.text).toContain(String(c.b));
      }
    }
  });

  it("includes the answer among multiple-choice options", () => {
    const c = createChallenge({ skill: "twoDigit", level: 3, format: "multipleChoice" }, rng, "m1");
    expect(c.choices).toContain(c.answer);
  });

  it("gives story-problem skills a story in every layout", () => {
    for (const format of ["multipleChoice", "visual", "wordProblem"] as const) {
      for (let i = 0; i < 30; i++) {
        const c = createChallenge({ skill: "wordProblems", level: 2, format }, rng, `s${format}${i}`);
        expect(c.story).toBeDefined();
        if (format === "multipleChoice") {
          expect(c.unknown).toBe("total");
          expect(c.choices).toContain(c.answer);
        }
      }
    }
  });
});
