import { describe, expect, it } from "vitest";
import { totalBugAnswers } from "./misconceptions";
import { createPipPuzzle, isPipMistake, PIP_MISTAKES } from "./pipPuzzle";
import { createRng } from "./rng";

describe("createPipPuzzle", () => {
  it.each(PIP_MISTAKES)("builds a genuinely wrong %s example that matches the bug library", (mistake) => {
    const rng = createRng(mistake.length * 97);
    for (let i = 0; i < 200; i++) {
      const puzzle = createPipPuzzle(mistake, rng, `p${i}`);
      expect(puzzle.correct).toBe(puzzle.a + puzzle.b);
      expect(puzzle.pipAnswer).not.toBe(puzzle.correct);

      const bug = totalBugAnswers(puzzle.a, puzzle.b).find((b) => b.value === puzzle.pipAnswer);
      expect(bug?.id).toBe(mistake);

      if (puzzle.resultCells.length > 0) {
        expect([...puzzle.resultCells].reverse().join("")).toBe(String(puzzle.pipAnswer));
      }
    }
  });

  it("offers exactly one correct fix among three different choices", () => {
    const rng = createRng(4);
    for (const mistake of PIP_MISTAKES) {
      for (let i = 0; i < 50; i++) {
        const { choices, correct, pipAnswer } = createPipPuzzle(mistake, rng, "x");
        expect(choices).toHaveLength(3);
        expect(new Set(choices).size).toBe(3);
        expect(choices.filter((c) => c === correct)).toHaveLength(1);
        expect(choices).toContain(pipAnswer);
      }
    }
  });

  it("offers three different Teach Pip cards with exactly one naming the real mistake", () => {
    const rng = createRng(21);
    for (const mistake of PIP_MISTAKES) {
      const { teachCards, thanks } = createPipPuzzle(mistake, rng, "t");
      expect(teachCards).toHaveLength(3);
      expect(new Set(teachCards.map((card) => card.mistake)).size).toBe(3);
      expect(teachCards.filter((card) => card.mistake === mistake)).toHaveLength(1);
      expect(thanks.length).toBeGreaterThan(0);
    }
  });

  it("uses regrouping numbers so the mistake can actually happen", () => {
    const rng = createRng(8);
    for (let i = 0; i < 100; i++) {
      const { a, b } = createPipPuzzle("columnConcat", rng, "x");
      expect((a % 10) + (b % 10)).toBeGreaterThanOrEqual(10);
    }
  });

  it("only accepts place-value mistakes", () => {
    expect(isPipMistake("columnConcat")).toBe(true);
    expect(isPipMistake("offByOne")).toBe(false);
  });
});
