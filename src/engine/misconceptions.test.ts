import { describe, expect, it } from "vitest";
import { addendBugAnswers, detectMisconception, totalBugAnswers } from "./misconceptions";
import { createRng } from "./rng";
import type { Challenge } from "./types";

const total = (a: number, b: number): Pick<Challenge, "a" | "b" | "total" | "unknown" | "answer"> => ({
  a,
  b,
  total: a + b,
  unknown: "total",
  answer: a + b,
});

const addend = (a: number, b: number): Pick<Challenge, "a" | "b" | "total" | "unknown" | "answer"> => ({
  a,
  b,
  total: a + b,
  unknown: "addend",
  answer: b,
});

describe("detectMisconception for totals", () => {
  it.each([
    [715, "columnConcat"],
    [75, "droppedCarry"],
    [95, "extraTen"],
    [22, "digitSum"],
    [9, "subtracted"],
    [84, "offByOne"],
    [86, "offByOne"],
  ] as const)("47 + 38 answered %i is %s", (given, expected) => {
    expect(detectMisconception(total(47, 38), given)).toBe(expected);
  });

  it("returns null for the correct answer and for unknown mistakes", () => {
    expect(detectMisconception(total(47, 38), 85)).toBeNull();
    expect(detectMisconception(total(47, 38), 60)).toBeNull();
  });

  it("spots a ones digit lined up under the tens", () => {
    expect(detectMisconception(total(47, 8), 127)).toBe("placeValueShift");
    expect(detectMisconception(total(6, 52), 112)).toBe("placeValueShift");
  });

  it("does not invent carrying mistakes when nothing regroups", () => {
    const ids = totalBugAnswers(43, 25).map((bug) => bug.id);
    expect(ids).not.toContain("columnConcat");
    expect(ids).not.toContain("droppedCarry");
  });
});

describe("detectMisconception for missing addends", () => {
  it.each([
    [73, "addedInsteadOfFinding"],
    [45, "gaveTotal"],
    [16, "offByOne"],
    [18, "offByOne"],
  ] as const)("28 + ? = 45 answered %i is %s", (given, expected) => {
    expect(detectMisconception(addend(28, 17), given)).toBe(expected);
  });

  it("returns null for the correct missing number", () => {
    expect(detectMisconception(addend(28, 17), 17)).toBeNull();
  });
});

describe("bug answers", () => {
  it("never include the correct answer and never repeat a value", () => {
    const rng = createRng(2026);
    for (let i = 0; i < 500; i++) {
      const a = rng.int(0, 99);
      const b = rng.int(0, 99);
      const totals = totalBugAnswers(a, b).map((bug) => bug.value);
      expect(totals).not.toContain(a + b);
      expect(new Set(totals).size).toBe(totals.length);

      const addends = addendBugAnswers(a, a + b).map((bug) => bug.value);
      expect(addends).not.toContain(b);
      expect(addends.every((value) => value >= 0)).toBe(true);
    }
  });
});
