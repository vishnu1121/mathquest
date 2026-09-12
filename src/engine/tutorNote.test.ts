import { describe, expect, it } from "vitest";
import { createLearnerModel, type LearnerModel } from "./learnerModel";
import { buildTutorFacts, noteUsesOnlyFactNumbers, templateNote, type NoteEvent } from "./tutorNote";

function modelAfterForest(): LearnerModel {
  const model = createLearnerModel(2);
  return {
    ...model,
    skills: {
      ...model.skills,
      simple: { ...model.skills.simple, mastered: true, mastery: 0.9, evidence: 8 },
      twoDigit: { ...model.skills.twoDigit, mastered: true, mastery: 0.9, evidence: 8 },
      regroup: { ...model.skills.regroup, mastery: 0.7, evidence: 9, misconceptions: { columnConcat: 2, offByOne: 1 } },
    },
  };
}

const events: NoteEvent[] = [
  { kind: "practice", skill: "regroup", problem: "47 + 38", wrongAnswer: 715, outcome: "missed" },
  { kind: "practice", skill: "regroup", problem: "63 + 29", wrongAnswer: 812, outcome: "helped" },
  { kind: "scaffold", skill: "regroup", problem: "28 + 5", wrongAnswer: null, outcome: "solved" },
  { kind: "return", skill: "regroup", problem: "56 + 37", wrongAnswer: null, outcome: "solved" },
  { kind: "pipPuzzle", skill: "regroup", problem: "52 + 19", wrongAnswer: null, outcome: "solved" },
];

describe("buildTutorFacts", () => {
  it("names the most common mistake with the child's real answers", () => {
    const facts = buildTutorFacts(modelAfterForest(), events, "Nova", "regroup");
    expect(facts.strong).toEqual(["simple", "twoDigit"]);
    expect(facts.pattern).toEqual({ misconception: "columnConcat", count: 2, examples: ["47 + 38 → 715", "63 + 29 → 812"] });
    expect(facts.helped).toBe("Trading with base-ten blocks on easier numbers");
    expect(facts.caughtInPuzzle).toBe(true);
  });

  it("has nothing to report for a brand-new learner", () => {
    const facts = buildTutorFacts(createLearnerModel(1), [], "Sage", "simple");
    expect(facts.pattern).toBeNull();
    expect(facts.helped).toBeNull();
    expect(templateNote(facts)).toBe("Sage is just getting started in Addition Forest. Next session: 10 minutes on adding within 20.");
  });
});

describe("templateNote", () => {
  it("writes three short sentences from the facts", () => {
    const note = templateNote(buildTutorFacts(modelAfterForest(), events, "Nova", "regroup"));
    expect(note).toContain("Nova is strong at adding within 20 and 2-digit adding without carrying.");
    expect(note).toContain("(47 + 38 → 715)");
    expect(note).toContain("later caught the same mistake in a puzzle");
    expect(note).toContain("Next session: 10 minutes on carrying (regrouping).");
    expect(note.split(". ").length).toBeLessThanOrEqual(4);
  });
});

describe("noteUsesOnlyFactNumbers", () => {
  const facts = buildTutorFacts(modelAfterForest(), events, "Nova", "regroup");

  it("accepts the template and notes that reuse fact numbers", () => {
    expect(noteUsesOnlyFactNumbers(templateNote(facts), facts)).toBe(true);
    expect(noteUsesOnlyFactNumbers("Nova wrote 715 for 47 + 38 at first.", facts)).toBe(true);
    expect(noteUsesOnlyFactNumbers("Nova is doing well.", facts)).toBe(true);
  });

  it("rejects a note that invents a number", () => {
    expect(noteUsesOnlyFactNumbers("Nova got 93% of questions right.", facts)).toBe(false);
  });
});
