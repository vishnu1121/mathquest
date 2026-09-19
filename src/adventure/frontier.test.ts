import { describe, expect, it } from "vitest";
import { createRng } from "../engine/rng";
import { frontierPuzzle, gardenMeasure, gardenReady, waterMove, waterReady, waterSolution, WATER_ACTIONS, courierBoard, courierMove, courierReady, courierSolution, popBoard, popGroup, popMove } from "./frontier";

describe("construction missions", () => {
  it("counts outside edges without row wrapping and requires edge-connected gardens", () => {
    expect(gardenMeasure([0, 1, 5, 6])).toEqual({ area: 4, perimeter: 8, connected: true });
    expect(gardenMeasure([4, 5])).toEqual({ area: 2, perimeter: 8, connected: false });
    expect(gardenMeasure([0, 6]).connected).toBe(false);
    expect(gardenMeasure([0, 0, 1]).area).toBe(2);
    expect(gardenReady({ kind: "garden", width: 5, area: 4, perimeter: null }, [0, 1, 2, 3])).toBe(true);
    expect(gardenReady({ kind: "garden", width: 5, area: 4, perimeter: 8 }, [0, 1, 2, 3])).toBe(false);
  });
  it("generates achievable gardens and keeps more than one arrangement possible", () => {
    for (let seed = 0; seed < 120; seed++) for (let round = 0; round < 4; round++) {
      const p = frontierPuzzle("garden", seed, round); if (p.kind !== "garden") throw Error("wrong game");
      const candidates = [];
      for (let h = 1; h <= 5; h++) for (let w = 1; w <= 5; w++) if (h * w === p.area && (p.perimeter === null || 2 * (h + w) === p.perimeter)) candidates.push(Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => y * 5 + x)).flat());
      expect(candidates.length).toBeGreaterThan(0);
      expect(gardenReady(p, candidates[0]!)).toBe(true);
      expect(gardenReady(p, [])).toBe(false);
    }
  });
  it("every generated water rescue is reachable; pours conserve water and respect capacity", () => {
    for (let seed = 0; seed < 100; seed++) for (let round = 0; round < 4; round++) {
      const p = frontierPuzzle("water", seed, round); if (p.kind !== "water") throw Error("wrong game");
      const solution = waterSolution(p); expect(solution?.length).toBeGreaterThan(0); expect(solution!.length).toBeLessThan(15);
      let state: [number, number] = [0, 0];
      for (const action of solution!) {
        const next = waterMove(p, state, action);
        expect(next.every((n, i) => n >= 0 && n <= p.capacities[i]!)).toBe(true);
        if (action.startsWith("pour")) expect(next[0] + next[1]).toBe(state[0] + state[1]);
        state = next;
      }
      expect(waterReady(p, state)).toBe(true);
      for (const action of WATER_ACTIONS) expect(waterSolution(p, waterMove(p, state, action))).not.toBeNull();
    }
  });
  it("stops pours at a full destination and finds guidance from an intermediate state", () => {
    const p = { kind: "water" as const, capacities: [3, 5] as [number, number], target: 4 };
    expect(waterMove(p, [3, 4], "pour-a")).toEqual([2, 5]);
    expect(waterMove(p, [0, 5], "pour-b")).toEqual([3, 2]);
    expect(waterSolution(p, [0, 4])).toEqual([]);
  });
});
describe("playable pocket games", () => {
  it("all depot variants have a valid solution using only legal pushes", () => {
    for (let seed = 0; seed < 24; seed++) for (let round = 0; round < 3; round++) {
      let board = courierBoard(seed, round); expect(board).toEqual(courierBoard(seed, round));
      const path = courierSolution(board); expect(path).not.toBeNull(); expect(path!.length).toBeGreaterThan(0);
      for (const move of path!) { const next = courierMove(board, move); expect(next).not.toBeNull(); board = next!; }
      expect(courierReady(board)).toBe(true);
    }
  });
  it("cannot push two boxes, walk through a wall or wrap to another row", () => {
    const board = { width: 6 as const, walls: [0], goals: [7, 8], boxes: [2, 3], player: 1 };
    expect(courierMove(board, "right")).toBeNull(); expect(courierMove(board, "left")).toBeNull();
    expect(courierMove({ ...board, player: 5 }, "right")).toBeNull();
  });
  it("does not count diagonal or row-wrapped gems as a group", () => {
    const board = Array.from({ length: 36 }, (_, i) => i); board[5] = 100; board[6] = 100;
    expect(popGroup(board, 5)).toEqual([5]);
    expect(popMove(board, 5, createRng(1))).toBeNull();
    expect(popGroup(board, -1)).toEqual([]);
  });
  it("keeps legal groups available and stable 36-gem boards through long replays", () => {
    for (let seed = 1; seed <= 15; seed++) { const rng = createRng(seed); let board = popBoard(rng), points = 0;
      for (let turn = 0; turn < 50; turn++) {
        const index = board.findIndex((_, i) => popGroup(board, i).length >= 2); expect(index).toBeGreaterThanOrEqual(0);
        const result = popMove(board, index, rng)!; points += result.points; board = result.board;
        expect(board).toHaveLength(36); expect(board.every((n) => n >= 0 && n < 4)).toBe(true);
      }
      expect(points).toBeGreaterThanOrEqual(100);
    }
  });
});
