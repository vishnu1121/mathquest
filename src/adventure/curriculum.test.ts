import { describe, expect, it } from "vitest";
import { createRng } from "../engine/rng";
import { blankAnswer, checkTrailAnswer, CONCEPT_IDS, expeditionRoute, generateTrailPuzzle, practiceStatus, recommendTrail, recordPractice, restoreCurriculum, validShape, type Band, type TrailPuzzle } from "./curriculum";

function solve(p: TrailPuzzle) {
  const a = blankAnswer();
  if (p.concept === "subtraction") { a.picks = Array.from({ length: p.b }, (_, i) => i); a.value = p.a - p.b; }
  if (p.concept === "multiplication") { a.rows = p.a; a.columns = p.target / p.a; }
  if (p.concept === "division") a.bowls = Array(p.a).fill(Math.floor(p.target / p.a));
  if (p.concept === "fractions") a.picks = Array.from({ length: p.a * p.parts / p.b }, (_, i) => i);
  if (p.concept === "patterns") a.sequence = p.solution;
  if (p.concept === "measurement") { a.offset = p.a; a.value = p.mode === "ruler" ? p.b : 2 * (p.a + p.b); }
  if (p.concept === "geometry") a.picks = p.solution;
  return a;
}

describe("the learning atlas puzzle bank", () => {
  for (const concept of CONCEPT_IDS) it(`${concept}: generates bounded, solvable challenges at all three bands`, () => {
    const seen = new Set();
    for (const level of [1, 2, 3] as Band[]) for (let seed = 0; seed < 180; seed++) {
      const puzzle = generateTrailPuzzle(concept, level, seed % 5, createRng(seed));
      expect(checkTrailAnswer(puzzle, solve(puzzle)).correct, puzzle.key).toBe(true);
      expect(checkTrailAnswer(puzzle, blankAnswer()).correct).toBe(false);
      expect([puzzle.a, puzzle.b, puzzle.parts, puzzle.target].every((n) => Number.isInteger(n) && n >= 0 && n < 100)).toBe(true);
      expect(puzzle.sequence.every((n) => Number.isInteger(n) && n >= 0 && n < 100)).toBe(true);
      if (concept === "patterns") expect(puzzle.solution.every((n) => puzzle.options.includes(n))).toBe(true);
      if (concept === "division") expect(puzzle.target - puzzle.a * puzzle.b).toBeLessThan(puzzle.a);
      if (concept === "fractions") expect(puzzle.a * puzzle.parts % puzzle.b).toBe(0);
      seen.add(puzzle.key);
    }
    expect(seen.size).toBeGreaterThan(12);
  });
  it("reproduces an expedition from a seed without modifying saved progress", () => {
    const m = restoreCurriculum(null);
    const first = expeditionRoute(m, 3);
    expect(first).toHaveLength(5);
    expect(expeditionRoute(m, 3)).toEqual(first);
    m.trails.division.attempts = 5; m.trails.fractions.attempts = 5;
    const next = expeditionRoute(m, 15);
    expect(next.slice(0, 4).every((id) => ["division", "fractions"].includes(id))).toBe(true);
    expect(new Set(next.filter((id) => !["division", "fractions"].includes(id))).size).toBe(1);
    expect(m.trails.subtraction.attempts).toBe(0);
  });
  it("rejects impossible or repeated fraction pieces", () => {
    const p = generateTrailPuzzle("fractions", 2, 1, createRng(5));
    const a = solve(p);
    a.picks[0] = p.parts;
    expect(checkTrailAnswer(p, a).correct).toBe(false);
  });
});

describe("constellation geometry", () => {
  it("accepts squares and rectangles under rotation and reversed drawing order", () => {
    expect(validShape([0, 3, 15, 12], "square")).toBe(true);
    expect(validShape([12, 15, 3, 0], "square")).toBe(true);
    expect(validShape([0, 2, 14, 12], "rectangle")).toBe(true);
    expect(validShape([1, 7, 14, 8], "rectangle")).toBe(true);
  });
  it("rejects bow ties, collinear corners, repeated pegs and unequal square sides", () => {
    expect(validShape([0, 15, 3, 12], "rectangle")).toBe(false);
    expect(validShape([0, 1, 2], "triangle")).toBe(false);
    expect(validShape([0, 3, 3], "triangle")).toBe(false);
    expect(validShape([0, 2, 14, 12], "square")).toBe(false);
    expect(validShape([-1, 3, 12], "triangle")).toBe(false);
  });
  it("accepts alternative constructions, not only the example drawing", () => {
    expect(validShape([0, 2, 8], "triangle")).toBe(true);
    expect(validShape([0, 1, 5, 4], "square")).toBe(true);
    expect(validShape([1, 7, 15, 12, 4], "pentagon")).toBe(true);
  });
});

describe("saved pathway practice", () => {
  it("recovers one damaged trail without discarding the other trails", () => {
    const m = restoreCurriculum(null); m.trails.fractions.completed = 3;
    const damaged = { ...m, trails: { ...m.trails, division: { level: 99 } } };
    expect(restoreCurriculum(damaged).trails.fractions.completed).toBe(3);
    expect(restoreCurriculum(damaged).trails.division.level).toBe(1);
    expect(restoreCurriculum({})).toEqual(restoreCurriculum(null));
  });
  it("counts hints and retries separately and waits for a pattern before adapting", () => {
    let m = restoreCurriculum(null);
    m = recordPractice(m, "division", true, 1, false, 1, "equal");
    expect(m.trails.division.level).toBe(1);
    m = recordPractice(m, "division", true, 1, false, 1, "equal");
    m = recordPractice(m, "division", true, 1, false, 1, "equal");
    expect(m.trails.division.level).toBe(2);
    m = recordPractice(m, "division", false, 1, false, 2, "equal");
    m = recordPractice(m, "division", true, 2, false, 2, "equal");
    m = recordPractice(m, "division", true, 1, true, 2, "equal");
    expect(m.trails.division.level).toBe(1);
    expect(m.trails.division.recent.slice(-3).every((r) => !r.independent)).toBe(true);
    expect(practiceStatus(m.trails.division)).toBe("Finding your way");
  });
  it("keeps progress bounded and does not label one repeated format as confidence", () => {
    let m = restoreCurriculum(null);
    for (let i = 0; i < 50; i++) m = recordPractice(m, "fractions", true, 1, false, 3, "pizza");
    expect(m.trails.fractions.recent).toHaveLength(8);
    expect(practiceStatus(m.trails.fractions)).toBe("Finding your way");
    m = recordPractice(m, "fractions", true, 1, false, 3, "equivalent");
    expect(practiceStatus(m.trails.fractions)).toBe("Growing confidence");
  });
  it("recommends support after repeated mistakes and a new trail after completion", () => {
    let m = restoreCurriculum(null);
    expect(recommendTrail(m)).toBe("subtraction");
    m.trails.subtraction.completed = 1;
    expect(recommendTrail(m)).toBe("multiplication");
    m = recordPractice(m, "geometry", false, 1, false, 1, "triangle");
    m = recordPractice(m, "geometry", false, 2, false, 1, "triangle");
    expect(recommendTrail(m)).toBe("geometry");
  });
});
