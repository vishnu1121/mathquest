import { describe, expect, it } from "vitest";
import { createRng } from "../engine/rng";
import { makeRail, railValue, makeRobot, robotReady, makeBridge, bridgeReady, restoreVoyage, chapterOpen, nextChapter, voyagePuzzle, rallyCourse, rallyMove, bowlLanding, bowlPoints } from "./voyage";

describe("Skybound missions", () => {
  it("generates reachable rail destinations with bounded intermediate numbers", () => {
    for (let seed = 0; seed < 400; seed++) for (let round = 0; round < 4; round++) {
      const p = makeRail(createRng(seed), round);
      const paths = p.gates.reduce<number[][]>((all, gate) => all.flatMap((prefix) => gate.map((_, i) => [...prefix, i])), [[]]);
      const values = paths.map((picks) => railValue(p, picks)!);
      expect(values).toContain(p.target);
      expect(values.every((n) => Number.isInteger(n) && n >= 0 && n <= 99)).toBe(true);
      expect(railValue(p, [-1, -1])).toBeNull();
    }
  });
  it("robot supply packs always divide the full recipe exactly", () => {
    for (let seed = 0; seed < 400; seed++) for (let round = 0; round < 4; round++) {
      const p = makeRobot(createRng(seed), round);
      const cells = p.robots * p.cells / p.cellPack, gears = p.robots * p.gears / p.gearPack;
      expect(robotReady(p, cells, gears)).toBe(true);
      expect(robotReady(p, cells + 1, gears)).toBe(false);
      expect(robotReady(p, 0, 0)).toBe(false);
      expect(robotReady(p, cells - .5, gears)).toBe(false);
    }
  });
  it("fraction bridges accept different equivalent constructions, with a shared whole", () => {
    for (let round = 0; round < 4; round++) {
      const p = makeBridge(createRng(87), round);
      const solutions = [[6], [3, 6], [4, 4], [6, 6]];
      expect(bridgeReady(p, solutions[round]!)).toBe(true);
      expect(bridgeReady(p, [])).toBe(false);
      expect(bridgeReady(p, [1, 1, 1, 1, 1, 1])).toBe(false);
      expect(bridgeReady(p, [...solutions[round]!, p.pieces[0]!])).toBe(false);
    }
    expect(bridgeReady(makeBridge(createRng(1), 3), [4, 4, 4])).toBe(true);
    expect(bridgeReady(makeBridge(createRng(1), 3), [3, 3, 3, 3])).toBe(true);
  });
  it("reconstructs the same encounter from a saved seed and round", () => {
    for (const id of ["skyrail", "robotworks", "cloudbridge"] as const) {
      expect(voyagePuzzle(id, 7328, 2)).toEqual(voyagePuzzle(id, 7328, 2));
    }
  });
});
describe("story continuity and persistence", () => {
  it("keeps old saves usable, ignores unknown fields and isolates corrupt fields", () => {
    const fresh = restoreVoyage(undefined);
    expect(fresh.camp).toHaveLength(9);
    expect(fresh.promise).toBeNull();
    const recovered = restoreVoyage({ ...fresh, promise: "listen", keepsakes: ["feather", "feather"], camp: ["bad"], runs: { skyrail: { seed: -3 } } });
    expect(recovered.promise).toBe("listen");
    expect(recovered.keepsakes).toEqual(["feather"]);
    expect(recovered.camp).toEqual(fresh.camp);
    expect(recovered.runs.skyrail).toBeUndefined();
  });
  it("persists checkpoint support and refuses impossible progress", () => {
    const v = restoreVoyage(undefined);
    v.runs.skyrail = { seed: 42, round: 4, independent: 2, helped: true };
    expect(restoreVoyage(JSON.parse(JSON.stringify(v))).runs.skyrail).toEqual(v.runs.skyrail);
    expect(restoreVoyage({ ...v, visits: Infinity }).visits).toBe(0);
  });
  it("continues the original story and opens new chapters in order", () => {
    expect(chapterOpen("frog", {})).toBe(true);
    expect(chapterOpen("skyrail", {})).toBe(false);
    expect(chapterOpen("skyrail", { guardian: true })).toBe(true);
    expect(chapterOpen("robotworks", { guardian: true })).toBe(false);
    expect(chapterOpen("not-a-level", {})).toBe(false);
    expect(nextChapter({ frog: true, fireflies: true, guardian: true })).toBe("skyrail");
  });
});
describe("friendly competitions", () => {
  it("uses repeatable courses, and rewards decisions without any clock", () => {
    const course = rallyCourse(101);
    expect(course).toEqual(rallyCourse(101));
    expect(course).toHaveLength(6);
    expect(rallyMove([3, 4, 6], 0, 1, false)).toBe(6);
    expect(rallyMove([3, 4, 6], 0, 1, true)).toBe(9);
    expect(rallyMove([3, 4, 6], 0, -1, false)).toBe(0);
  });
  it("scores landing distance and always awards a throw", () => {
    expect(bowlLanding(0, 5, 0)).toEqual({ x: 50, y: 52 });
    expect(bowlLanding(0, 5, 2).x).toBe(56);
    expect(bowlPoints({ x: 40, y: 30 }, { x: 40, y: 30 })).toBe(100);
    expect(bowlPoints({ x: 0, y: 0 }, { x: 95, y: 95 })).toBe(10);
  });
});
