// The Forest Guardian: a mastery check disguised as a boss (spec §23–24).
// Five challenges in five formats, so memorizing one question type can't win.
import { createChallenge } from "./generators";
import type { LearnerModel } from "./learnerModel";
import type { Rng } from "./rng";
import { clampLevel } from "./skills";
import type { Challenge, HintLevel, SkillId } from "./types";

export const BOSS_RULES = { size: 5, passCorrect: 4, maxHinted: 1 } as const;

export interface BossItem {
  /** Short label for the progress chips above the challenge. */
  label: string;
  challenge: Challenge;
}

export function createBossRound(model: LearnerModel, rng: Rng, idPrefix = "boss"): BossItem[] {
  const regroupLevel = model.skills.regroup.level;
  const make = (label: string, ...args: Parameters<typeof createChallenge>): BossItem => ({
    label,
    challenge: createChallenge(...args),
  });
  return [
    make("Equation", { skill: "twoDigit", level: model.skills.twoDigit.level, format: "equation" }, rng, `${idPrefix}-1`),
    make("Blocks", { skill: "regroup", level: clampLevel("regroup", Math.min(regroupLevel, 3)), format: "visual" }, rng, `${idPrefix}-2`),
    make("Missing number", { skill: "regroup", level: 2, format: "missingAddend" }, rng, `${idPrefix}-3`),
    make("Story", { skill: "wordProblems", level: model.skills.wordProblems.level, format: "wordProblem" }, rng, `${idPrefix}-4`),
    make("Stretch", { skill: "regroup", level: clampLevel("regroup", regroupLevel + 1), format: "equation" }, rng, `${idPrefix}-5`),
  ];
}

export interface BossResult {
  skill: SkillId;
  correct: boolean;
  hintLevel: HintLevel;
}

export interface BossOutcome {
  passed: boolean;
  correct: number;
  hinted: number;
  /** Skills answered correctly without hints. */
  strengths: SkillId[];
  /** Skills with a wrong answer, used for the "Let's train" plan. */
  trainOn: SkillId[];
}

export function scoreBossRound(results: readonly BossResult[]): BossOutcome {
  const correct = results.filter((r) => r.correct).length;
  const hinted = results.filter((r) => r.hintLevel > 0).length;
  const skills = [...new Set(results.map((r) => r.skill))];
  const trainOn = skills.filter((s) => results.some((r) => r.skill === s && !r.correct));
  const strengths = skills.filter((s) => results.every((r) => r.skill !== s || (r.correct && r.hintLevel === 0)));
  return {
    passed: correct >= BOSS_RULES.passCorrect && hinted <= BOSS_RULES.maxHinted,
    correct,
    hinted,
    strengths,
    trainOn,
  };
}
