import { describe, expect, it } from "vitest";
import { setSkillLevel } from "../engine/learnerModel";
import { createRng } from "../engine/rng";
import { additionSkill, adventurePlan, describeLearning, freshAdventureModel, makeNumberShield, observeAdventure, restoreAdventureModel, type AdventureEvidence } from "./learning";

const answer: AdventureEvidence = { skill: "regroup", level: 3, format: "missingAddend", correct: true, attempt: 1, hintLevel: 0 };

describe("adventure learning evidence", () => {
  it("loads older saves and rejects malformed learning data without needing a reset", () => {
    const fresh = freshAdventureModel();
    for (const raw of [undefined, null, {}, { ...fresh, skills: { ...fresh.skills, regroup: { ...fresh.skills.regroup, mastery: NaN } } }]) {
      expect(restoreAdventureModel(raw)).toEqual(fresh);
    }
    const recorded = observeAdventure(fresh, answer, 1234);
    expect(restoreAdventureModel(JSON.parse(JSON.stringify(recorded)))).toEqual(recorded);
  });

  it("separates independent success, hints and retries without a speed signal", () => {
    let model = freshAdventureModel();
    model = observeAdventure(model, answer, 1);
    model = observeAdventure(model, { ...answer, hintLevel: 1 }, 1);
    model = observeAdventure(model, { ...answer, attempt: 2 }, 9000000);
    expect(model.skills.regroup.recent.map((r) => r.independent)).toEqual([true, false, false]);
    expect(model.skills.regroup.guesses).toBe(0);
    expect(describeLearning(model).find((s) => s.id === "regroup")).toMatchObject({ independent: 1, supported: 2, recent: 3 });
  });

  it("uses a pattern before stepping down, then gives a new level time to settle", () => {
    let model = freshAdventureModel();
    model = observeAdventure(model, { ...answer, correct: false }, 1);
    expect(adventurePlan(model, "regroup").kind).toBe("practice");
    model = observeAdventure(model, { ...answer, correct: false, attempt: 2 }, 2);
    model = observeAdventure(model, { ...answer, attempt: 3 }, 3);
    const next = adventurePlan(model, "regroup");
    expect(next).toMatchObject({ kind: "stepDown", level: 2 });
    expect(adventurePlan(next.model, "regroup")).toMatchObject({ kind: "practice", level: 2 });
    expect(model.skills.regroup.level).toBe(3);
  });

  it("steps up after independent practice and respects the adventure's number ceiling", () => {
    let model = setSkillLevel(freshAdventureModel(), "regroup", 2);
    for (let i = 0; i < 3; i++) model = observeAdventure(model, { ...answer, level: 2 }, i);
    const next = adventurePlan(model, "regroup");
    expect(next).toMatchObject({ kind: "stepUp", level: 3 });
    model = next.model;
    for (let i = 0; i < 3; i++) model = observeAdventure(model, answer, i);
    expect(adventurePlan(model, "regroup")).toMatchObject({ kind: "practice", level: 3 });
  });

  it("never changes a chapter's skill when the general engine changes focus", () => {
    const model = freshAdventureModel();
    model.skills.regroup = { ...model.skills.regroup, mastered: true, mastery: 1 };
    expect(adventurePlan(model, "regroup")).toMatchObject({ kind: "practice", level: 3 });
  });

  it("does not turn repeated success in one interaction into a mastery claim", () => {
    let model = freshAdventureModel();
    for (let i = 0; i < 30; i++) model = observeAdventure(model, answer, i);
    expect(model.skills.regroup).toMatchObject({ evidence: 30, mastered: false });
    expect(model.skills.regroup.recent).toHaveLength(8);
    expect(describeLearning(model).find((s) => s.id === "regroup")).toMatchObject({ independent: 8, recent: 8 });
  });

  it("classifies the math actually shown in the river", () => {
    expect(additionSkill(8, 5)).toEqual({ skill: "simple", level: 3 });
    expect(additionSkill(23, 14)).toEqual({ skill: "twoDigit", level: 3 });
    expect(additionSkill(28, 17)).toEqual({ skill: "regroup", level: 3 });
    expect(additionSkill(21, 16)).toEqual({ skill: "twoDigit", level: 3 });
  });
});

describe("adaptive number spells", () => {
  it("always deals five bounded cards with exactly one regrouping pair", () => {
    const seen = new Set<string>();
    for (const level of [1, 2, 3, 4] as const) for (let seed = 0; seed < 250; seed++) {
      const shield = makeNumberShield(level, createRng(seed));
      expect(shield.hand).toHaveLength(5);
      expect(shield.target).toBeLessThan(100);
      expect(shield.hand.every((n) => Number.isInteger(n) && n > 0 && n < 100)).toBe(true);
      const pairs = shield.hand.flatMap((a, i) => shield.hand.slice(i + 1).filter((b) => a + b === shield.target).map((b) => [a, b]));
      expect(pairs).toHaveLength(1);
      const [a, b] = pairs[0]!;
      expect(a! % 10 + b! % 10).toBeGreaterThanOrEqual(10);
      if (level < 3) expect(Math.min(a!, b!)).toBeLessThan(10);
      else expect(Math.min(a!, b!)).toBeGreaterThanOrEqual(10);
      seen.add(shield.hand.join(","));
    }
    expect(seen.size).toBeGreaterThan(700);
  });
});
