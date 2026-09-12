// Rewards recognize independence, persistence and mastery, never speed (spec §25).
import type { LearnerModel, Observation } from "./learnerModel";
import { SKILL_ORDER } from "./skills";
import type { SkillId } from "./types";

export const XP = {
  independent: 10,
  persistence: 5,
  pipPuzzle: 15,
  mastery: 50,
  boss: 100,
} as const;

export type AnswerRewardReason = "independent" | "persistence" | "pipPuzzle" | "none";

export interface AnswerReward {
  xp: number;
  reason: AnswerRewardReason;
}

export function rewardForAnswer(o: Pick<Observation, "correct" | "attempt" | "hintLevel" | "guess" | "format">): AnswerReward {
  if (!o.correct || o.guess) return { xp: 0, reason: "none" };
  if (o.format === "pipPuzzle") return { xp: XP.pipPuzzle, reason: "pipPuzzle" };
  if (o.hintLevel === 0 && o.attempt <= 1) return { xp: XP.independent, reason: "independent" };
  return { xp: XP.persistence, reason: "persistence" };
}

/** Skills that became mastered between two models. */
export function newlyMastered(before: LearnerModel, after: LearnerModel): SkillId[] {
  return SKILL_ORDER.filter((id) => !before.skills[id].mastered && after.skills[id].mastered);
}

/** A gentle streak: it simply starts again after a miss, with no penalty shown. */
export const nextStreak = (streak: number, correct: boolean): number => (correct ? streak + 1 : 0);
