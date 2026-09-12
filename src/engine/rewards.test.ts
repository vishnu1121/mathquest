import { describe, expect, it } from "vitest";
import { createLearnerModel } from "./learnerModel";
import { newlyMastered, nextStreak, rewardForAnswer, XP } from "./rewards";

const answer = { correct: true, attempt: 1, hintLevel: 0, guess: false, format: "equation" } as const;

describe("rewardForAnswer", () => {
  it("gives the most for solving on the first try without help", () => {
    expect(rewardForAnswer(answer)).toEqual({ xp: XP.independent, reason: "independent" });
  });

  it("rewards persistence after a retry or a hint", () => {
    expect(rewardForAnswer({ ...answer, attempt: 2 })).toEqual({ xp: XP.persistence, reason: "persistence" });
    expect(rewardForAnswer({ ...answer, hintLevel: 3 })).toEqual({ xp: XP.persistence, reason: "persistence" });
  });

  it("gives nothing for wrong answers or guesses", () => {
    expect(rewardForAnswer({ ...answer, correct: false }).xp).toBe(0);
    expect(rewardForAnswer({ ...answer, correct: false, guess: true }).xp).toBe(0);
  });

  it("gives a bonus for solving Pip's Puzzle", () => {
    expect(rewardForAnswer({ ...answer, format: "pipPuzzle" })).toEqual({ xp: XP.pipPuzzle, reason: "pipPuzzle" });
  });
});

describe("newlyMastered", () => {
  it("lists only skills that just became mastered", () => {
    const before = createLearnerModel(2);
    const after = {
      ...before,
      skills: {
        ...before.skills,
        simple: { ...before.skills.simple, mastered: true },
      },
    };
    expect(newlyMastered(before, after)).toEqual(["simple"]);
    expect(newlyMastered(after, after)).toEqual([]);
  });
});

describe("nextStreak", () => {
  it("counts up on success and quietly restarts after a miss", () => {
    expect(nextStreak(2, true)).toBe(3);
    expect(nextStreak(5, false)).toBe(0);
  });
});
