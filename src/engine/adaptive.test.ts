import { describe, expect, it } from "vitest";
import { commitPlan, createSession, focusSkill, planNext, type Session } from "./adaptive";
import { createLearnerModel, recordObservation, type LearnerModel, type Observation } from "./learnerModel";
import { SKILL_ORDER } from "./skills";
import type { Level, SkillId } from "./types";

let clock = 0;
const answer = (model: LearnerModel, overrides: Partial<Observation>): LearnerModel =>
  recordObservation(model, {
    skill: "regroup",
    level: 3,
    format: "equation",
    correct: true,
    attempt: 1,
    hintLevel: 0,
    responseMs: 5000,
    misconception: null,
    guess: false,
    at: ++clock,
    ...overrides,
  });

const repeat = (model: LearnerModel, n: number, overrides: Partial<Observation>) =>
  Array.from({ length: n }).reduce<LearnerModel>((m) => answer(m, overrides), model);

/** A grade-2 learner placed on carrying: the earlier skills are placed but not mastered. */
function placedOnRegroup(level: Level = 3): LearnerModel {
  const model = createLearnerModel(2);
  return {
    ...model,
    skills: {
      ...model.skills,
      simple: { ...model.skills.simple, mastery: 0.5 },
      twoDigit: { ...model.skills.twoDigit, mastery: 0.5 },
      regroup: { ...model.skills.regroup, level },
    },
  };
}

const session = (overrides: Partial<Session> = {}): Session => ({
  ...createSession(),
  lastSkill: "regroup",
  focus: "regroup",
  ...overrides,
});

describe("focusSkill", () => {
  it("starts a brand-new learner on the first skill", () => {
    expect(focusSkill(createLearnerModel(0))).toBe("simple");
  });

  it("skips skills the warm-up already placed", () => {
    expect(focusSkill(placedOnRegroup())).toBe("regroup");
  });

  it("starts a learner who aced the warm-up on the most advanced skill, not the easiest", () => {
    const model = createLearnerModel(2);
    const placed = Object.fromEntries(
      SKILL_ORDER.map((id) => [id, { ...model.skills[id], mastery: 0.5 }]),
    ) as LearnerModel["skills"];
    expect(focusSkill({ ...model, skills: placed })).toBe("regroup");
  });

  it("stays on the current skill until it is mastered", () => {
    const model = repeat(placedOnRegroup(2), 3, { level: 2 });
    expect(model.skills.regroup.mastery).toBeGreaterThanOrEqual(0.5);
    expect(focusSkill(model, "regroup")).toBe("regroup");
  });

  it("returns null once every skill is mastered", () => {
    const model = createLearnerModel(2);
    const allMastered = Object.fromEntries(
      SKILL_ORDER.map((id) => [id, { ...model.skills[id], mastered: true, mastery: 0.9 }]),
    ) as Record<SkillId, LearnerModel["skills"][SkillId]>;
    expect(focusSkill({ ...model, skills: allMastered })).toBeNull();
    expect(planNext({ ...model, skills: allMastered }, createSession()).kind).toBe("boss");
  });
});

describe("planNext", () => {
  it("helps a carry-dropper with blocks, returns to the original problem, then checks with Pip's Puzzle", () => {
    let model = repeat(placedOnRegroup(), 2, { correct: false, misconception: "columnConcat" });
    let s = session();

    const scaffold = planNext(model, s);
    expect(scaffold).toMatchObject({ kind: "scaffold", format: "visual", level: 2, misconception: "columnConcat" });
    ({ model, session: s } = commitPlan(model, s, scaffold));
    expect(s.returnQueue).toEqual([{ skill: "regroup", level: 3, format: "equation" }]);

    model = repeat(model, 2, { level: 2, format: "visual" });
    const back = planNext(model, s);
    expect(back).toMatchObject({ kind: "return", level: 3, format: "equation" });
    ({ model, session: s } = commitPlan(model, s, back));
    expect(s.returnQueue).toEqual([]);

    model = repeat(model, 1, {});
    const pip = planNext(model, s);
    expect(pip).toMatchObject({ kind: "pipPuzzle", misconception: "columnConcat" });
    ({ model, session: s } = commitPlan(model, s, pip));
    expect(planNext(model, s).kind).not.toBe("pipPuzzle");
  });

  it("steps up after three independent answers at the current level", () => {
    const model = repeat(placedOnRegroup(2), 3, { level: 2 });
    expect(planNext(model, session())).toMatchObject({ kind: "stepUp", level: 3 });
  });

  it("does not step down after a single hard miss", () => {
    let model = repeat(placedOnRegroup(3), 2, {});
    model = answer(model, { correct: false });
    expect(planNext(model, session()).kind).toBe("practice");
  });

  it("steps down after two misses in the last three", () => {
    let model = repeat(placedOnRegroup(3), 2, { correct: false });
    model = answer(model, {});
    expect(planNext(model, session())).toMatchObject({ kind: "stepDown", level: 2 });
  });

  it("probes once more when results keep alternating", () => {
    let model = placedOnRegroup(3);
    for (const correct of [true, false, true, false]) model = answer(model, { correct });
    expect(planNext(model, session()).kind).toBe("probe");
  });

  it("mixes in a nearly-mastered skill every few items", () => {
    const plan = planNext(placedOnRegroup(), session({ itemsServed: 2 }));
    expect(plan.kind).toBe("review");
    expect(["simple", "twoDigit"]).toContain(plan.skill);
  });

  it("applies level changes only when the plan is committed", () => {
    const model = repeat(placedOnRegroup(2), 3, { level: 2 });
    const plan = planNext(model, session());
    expect(model.skills.regroup.level).toBe(2);
    expect(commitPlan(model, session(), plan).model.skills.regroup.level).toBe(3);
  });
});
