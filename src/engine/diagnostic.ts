// The trail warm-up (spec §12): 8 staircase questions that set a starting point.
// It only sets priors. Warm-up results never exceed PRIOR_CAP and never mark a skill mastered.
import { createChallenge } from "./generators";
import { createLearnerModel, withPrior, type LearnerModel } from "./learnerModel";
import type { Rng } from "./rng";
import { clampLevel, SKILLS } from "./skills";
import type { Challenge, Format, Grade, Level, SkillId } from "./types";

export const WARMUP_LENGTH = 8;
export const PRIOR_CAP = 0.5;

const LADDER: readonly { skill: SkillId; level: Level }[] = [
  { skill: "simple", level: 1 },
  { skill: "simple", level: 2 },
  { skill: "simple", level: 3 },
  { skill: "simple", level: 4 },
  { skill: "twoDigit", level: 1 },
  { skill: "twoDigit", level: 3 },
  { skill: "regroup", level: 1 },
  { skill: "regroup", level: 2 },
  { skill: "regroup", level: 3 },
  { skill: "regroup", level: 4 },
];

const LADDER_SKILLS = ["simple", "twoDigit", "regroup"] as const;

export interface WarmupAnswer {
  index: number;
  step: number;
  skill: SkillId;
  level: Level;
  correct: boolean;
}

export interface WarmupItem {
  challenge: Challenge;
  skill: SkillId;
  level: Level;
}

export function warmupStartStep(grade: Grade): number {
  if (grade === 0) return 0;
  if (grade === 1) return 2;
  if (grade === 2) return 4;
  return 6;
}

export const nextWarmupStep = (step: number, correct: boolean): number =>
  Math.min(LADDER.length - 1, Math.max(0, step + (correct ? 1 : -1)));

/** The third question uses blocks and the sixth is a story, so placement isn't based on one format. */
export function warmupFormat(index: number): Exclude<Format, "pipPuzzle"> {
  if (index === 2) return "visual";
  if (index === 5) return "wordProblem";
  return "equation";
}

const storyLevelFor = (step: number): Level => (step <= 2 ? 1 : step <= 5 ? 2 : step <= 7 ? 3 : 4);

export function createWarmupItem(index: number, step: number, rng: Rng): WarmupItem {
  const rung = LADDER[Math.min(Math.max(step, 0), LADDER.length - 1)] ?? { skill: "simple", level: 1 };
  const format = warmupFormat(index);
  const skill: SkillId = format === "wordProblem" ? "wordProblems" : rung.skill;
  const level = format === "wordProblem" ? storyLevelFor(step) : rung.level;
  return { challenge: createChallenge({ skill, level, format }, rng, `warmup-${index + 1}`), skill, level };
}

/** Turns warm-up answers into a starting learner model. */
export function placeLearner(grade: Grade, answers: readonly WarmupAnswer[]): LearnerModel {
  const base = createLearnerModel(grade);
  const skills = { ...base.skills };
  const highestCorrectStep = Math.max(-1, ...answers.filter((a) => a.correct && a.skill !== "wordProblems").map((a) => a.step));

  for (const skill of LADDER_SKILLS) {
    const topStep = Math.max(...LADDER.flatMap((rung, i) => (rung.skill === skill ? [i] : [])));
    const own = answers.filter((a) => a.skill === skill);
    const ownCorrect = own.filter((a) => a.correct);

    let mastery = 0;
    let level: Level = 1;
    if (highestCorrectStep > topStep) {
      mastery = PRIOR_CAP;
      level = SKILLS[skill].maxLevel;
    } else if (ownCorrect.length > 0) {
      mastery = PRIOR_CAP * (ownCorrect.length / own.length);
      level = clampLevel(skill, Math.max(...ownCorrect.map((a) => a.level)));
    } else if (own.length > 0) {
      level = clampLevel(skill, Math.min(...own.map((a) => a.level)));
    }
    skills[skill] = withPrior(skills[skill], mastery, level);
  }

  const stories = answers.filter((a) => a.skill === "wordProblems");
  const storiesCorrect = stories.filter((a) => a.correct);
  skills.wordProblems = withPrior(
    skills.wordProblems,
    stories.length > 0 ? PRIOR_CAP * (storiesCorrect.length / stories.length) : 0,
    storiesCorrect.length > 0
      ? clampLevel("wordProblems", Math.max(...storiesCorrect.map((a) => a.level)))
      : clampLevel("wordProblems", Math.min(1, ...stories.map((a) => a.level - 1))),
  );

  return { ...base, skills };
}
