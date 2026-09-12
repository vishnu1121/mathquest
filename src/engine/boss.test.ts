import { describe, expect, it } from "vitest";
import { createBossRound, scoreBossRound, type BossResult } from "./boss";
import { createLearnerModel } from "./learnerModel";
import { createRng } from "./rng";

describe("createBossRound", () => {
  it("mixes five different kinds of challenge, ending with a stretch", () => {
    const model = createLearnerModel(2);
    const withLevels = { ...model, skills: { ...model.skills, regroup: { ...model.skills.regroup, level: 3 as const } } };
    const round = createBossRound(withLevels, createRng(5));

    expect(round).toHaveLength(5);
    expect(new Set(round.map((item) => item.label)).size).toBe(5);
    expect(round.map((item) => item.challenge.format)).toEqual(["equation", "visual", "missingAddend", "wordProblem", "equation"]);
    expect(round[3]?.challenge.story).toBeDefined();
    expect(round[4]?.challenge.level).toBe(4);
  });
});

describe("scoreBossRound", () => {
  const result = (skill: BossResult["skill"], correct: boolean, hintLevel: BossResult["hintLevel"] = 0): BossResult => ({
    skill,
    correct,
    hintLevel,
  });

  it("passes with four right and at most one hint", () => {
    const outcome = scoreBossRound([
      result("twoDigit", true),
      result("regroup", true, 2),
      result("regroup", true),
      result("wordProblems", true),
      result("regroup", false),
    ]);
    expect(outcome.passed).toBe(true);
    expect(outcome.trainOn).toEqual(["regroup"]);
    expect(outcome.strengths).toEqual(["twoDigit", "wordProblems"]);
  });

  it("does not pass when help was needed twice", () => {
    const outcome = scoreBossRound([
      result("twoDigit", true, 1),
      result("regroup", true, 2),
      result("regroup", true),
      result("wordProblems", true),
      result("regroup", true),
    ]);
    expect(outcome.passed).toBe(false);
    expect(outcome.hinted).toBe(2);
  });

  it("names what to train on after a miss", () => {
    const outcome = scoreBossRound([
      result("twoDigit", true),
      result("regroup", false),
      result("regroup", true),
      result("wordProblems", false),
      result("regroup", true),
    ]);
    expect(outcome.passed).toBe(false);
    expect(outcome.trainOn).toEqual(["regroup", "wordProblems"]);
    expect(outcome.strengths).toEqual(["twoDigit"]);
  });
});
