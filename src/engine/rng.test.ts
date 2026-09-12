import { describe, expect, it } from "vitest";
import { createRng } from "./rng";

describe("createRng", () => {
  it("repeats the same sequence for the same seed", () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it("gives different sequences for different seeds", () => {
    expect(createRng(1).next()).not.toEqual(createRng(2).next());
  });

  it("keeps int() inside inclusive bounds and reaches both ends", () => {
    const rng = createRng(7);
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const n = rng.int(3, 6);
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThanOrEqual(6);
      seen.add(n);
    }
    expect([...seen].sort()).toEqual([3, 4, 5, 6]);
  });

  it("rejects invalid bounds and empty picks", () => {
    const rng = createRng(1);
    expect(() => rng.int(5, 2)).toThrow(RangeError);
    expect(() => rng.int(1.5, 3)).toThrow(RangeError);
    expect(() => rng.pick([])).toThrow(RangeError);
  });

  it("shuffles into a permutation without mutating the input", () => {
    const input = [1, 2, 3, 4, 5, 6];
    const out = createRng(9).shuffle(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6]);
    expect([...out].sort()).toEqual(input);
  });

  it("resumes from a saved state", () => {
    const original = createRng(123);
    original.next();
    original.next();
    const resumed = createRng(original.state());
    expect(resumed.next()).toEqual(original.next());
  });
});
