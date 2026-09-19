import { describe, expect, it } from "vitest";
import { HESITATION_SECONDS, SCAFFOLD_TIERS, ScaffoldEngine, tierFor } from "./scaffold";

describe("scaffold tier rules", () => {
  it("follows the tier table", () => {
    expect(tierFor(0, 0)).toBe(0);
    expect(tierFor(HESITATION_SECONDS, 0)).toBe(0);
    expect(tierFor(5.1, 0)).toBe(1);
    expect(tierFor(0, 1)).toBe(2);
    expect(tierFor(0, 2)).toBe(3);
    expect(tierFor(99, 7)).toBe(3);
  });

  it("documents a trigger and an action for every tier", () => {
    expect(SCAFFOLD_TIERS.map((t) => [t.tier, t.action])).toEqual([[0, "equation"], [1, "highlight"], [2, "blocks"], [3, "groupedBlocks"]]);
  });
});

describe("ScaffoldEngine", () => {
  it("raises help with hesitation, then with errors", () => {
    const engine = new ScaffoldEngine();
    expect(engine.snapshot()).toEqual({ tier: 0, action: "equation", timeSpentSeconds: 0, errorCount: 0 });
    engine.addTime(3);
    expect(engine.tier).toBe(0);
    engine.addTime(2.5);
    expect(engine.snapshot()).toEqual({ tier: 1, action: "highlight", timeSpentSeconds: 5.5, errorCount: 0 });
    engine.recordError();
    expect(engine.action).toBe("blocks");
    engine.recordError();
    expect(engine.action).toBe("groupedBlocks");
  });

  it("reaches block arrays after one error even without a pause", () => {
    const engine = new ScaffoldEngine();
    expect(engine.recordError()).toBe(2);
    expect(engine.errorCount).toBe(1);
  });

  it("never removes help during a problem, ignores invalid time, and resets for the next problem", () => {
    const engine = new ScaffoldEngine();
    engine.recordError();
    engine.recordError();
    engine.addTime(-20);
    engine.addTime(Number.NaN);
    engine.addTime(Number.POSITIVE_INFINITY);
    expect(engine.tier).toBe(3);
    expect(engine.timeSpentSeconds).toBe(0);
    engine.reset();
    expect(engine.snapshot()).toEqual({ tier: 0, action: "equation", timeSpentSeconds: 0, errorCount: 0 });
  });

  it("accepts a custom hesitation threshold", () => {
    const engine = new ScaffoldEngine(2);
    engine.addTime(2.01);
    expect(engine.tier).toBe(1);
  });
});
