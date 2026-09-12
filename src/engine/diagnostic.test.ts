import { describe, expect, it } from "vitest";
import { focusSkill } from "./adaptive";
import {
  createWarmupItem,
  nextWarmupStep,
  placeLearner,
  PRIOR_CAP,
  WARMUP_LENGTH,
  warmupFormat,
  warmupStartStep,
  type WarmupAnswer,
  type WarmupItem,
} from "./diagnostic";
import { createRng } from "./rng";
import { SKILL_ORDER } from "./skills";
import type { Grade } from "./types";

function runWarmup(grade: Grade, isCorrect: (item: WarmupItem, index: number) => boolean): WarmupAnswer[] {
  const rng = createRng(grade + 100);
  const answers: WarmupAnswer[] = [];
  let step = warmupStartStep(grade);
  for (let index = 0; index < WARMUP_LENGTH; index++) {
    const item = createWarmupItem(index, step, rng);
    const correct = isCorrect(item, index);
    answers.push({ index, step, skill: item.skill, level: item.level, correct });
    step = nextWarmupStep(step, correct);
  }
  return answers;
}

describe("warm-up staircase", () => {
  it("starts older grades higher on the ladder", () => {
    expect([0, 1, 2, 3, 5].map((g) => warmupStartStep(g as Grade))).toEqual([0, 2, 4, 6, 6]);
  });

  it("moves one rung at a time and stays on the ladder", () => {
    expect(nextWarmupStep(0, false)).toBe(0);
    expect(nextWarmupStep(9, true)).toBe(9);
    expect(nextWarmupStep(4, true)).toBe(5);
  });

  it("includes a blocks question and a story", () => {
    expect(warmupFormat(2)).toBe("visual");
    expect(warmupFormat(5)).toBe("wordProblem");
    const story = createWarmupItem(5, 4, createRng(1));
    expect(story.skill).toBe("wordProblems");
    expect(story.challenge.story).toBeDefined();
  });
});

describe("placeLearner", () => {
  it("places a strong grade-2 learner without marking anything mastered", () => {
    const model = placeLearner(2, runWarmup(2, () => true));
    for (const id of SKILL_ORDER) {
      expect(model.skills[id].mastery).toBeLessThanOrEqual(PRIOR_CAP);
      expect(model.skills[id].mastered).toBe(false);
      expect(model.skills[id].evidence).toBe(0);
    }
    expect(model.skills.simple).toMatchObject({ mastery: PRIOR_CAP, level: 4 });
    expect(model.skills.twoDigit).toMatchObject({ mastery: PRIOR_CAP, level: 3 });
  });

  it("starts a struggling learner at the beginning", () => {
    const model = placeLearner(0, runWarmup(0, () => false));
    expect(SKILL_ORDER.every((id) => model.skills[id].mastery === 0)).toBe(true);
    expect(focusSkill(model)).toBe("simple");
  });

  it("sends a learner who can add but not carry to the carrying trail", () => {
    const answers = runWarmup(2, (item) => item.skill !== "regroup");
    const model = placeLearner(2, answers);
    expect(model.skills.regroup.mastery).toBeLessThan(0.5);
    expect(focusSkill(model)).toBe("regroup");
  });
});
