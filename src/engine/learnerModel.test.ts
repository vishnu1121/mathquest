import { describe, expect, it } from "vitest";
import {
  createLearnerModel,
  recordObservation,
  scoreObservation,
  starsFor,
  type LearnerModel,
  type Observation,
} from "./learnerModel";
import type { Format } from "./types";

let clock = 0;
const obs = (overrides: Partial<Observation> = {}): Observation => ({
  skill: "regroup",
  level: 3,
  format: "equation",
  correct: true,
  attempt: 1,
  hintLevel: 0,
  responseMs: 6000,
  misconception: null,
  guess: false,
  at: ++clock,
  ...overrides,
});

const play = (model: LearnerModel, items: Partial<Observation>[]) =>
  items.reduce((m, item) => recordObservation(m, obs(item)), model);

describe("scoreObservation", () => {
  it("weights independent success above retries, and retries above hints", () => {
    const first = scoreObservation(obs());
    const retry = scoreObservation(obs({ attempt: 2 }));
    const hinted = scoreObservation(obs({ hintLevel: 2 }));
    expect(first).toBe(1);
    expect(retry).toBe(0.7);
    expect(hinted).toBeCloseTo(0.4);
    expect(scoreObservation(obs({ hintLevel: 5 }))).toBe(0.2);
    expect(scoreObservation(obs({ correct: false }))).toBe(0);
  });

  it("ignores guesses", () => {
    expect(scoreObservation(obs({ correct: false, guess: true }))).toBeNull();
  });
});

describe("recordObservation", () => {
  it("never masters a skill from one correct answer", () => {
    const model = play(createLearnerModel(2), [{ format: "visual" }]);
    expect(model.skills.regroup.mastered).toBe(false);
  });

  it("does not count guesses as evidence", () => {
    const start = play(createLearnerModel(2), [{}]);
    const after = recordObservation(start, obs({ correct: false, guess: true, responseMs: 300 }));
    expect(after.skills.regroup.mastery).toBe(start.skills.regroup.mastery);
    expect(after.skills.regroup.evidence).toBe(start.skills.regroup.evidence);
    expect(after.skills.regroup.guesses).toBe(1);
  });

  it("needs independent success in several formats, including a transfer format", () => {
    const tenEquations = play(createLearnerModel(2), Array.from({ length: 10 }, () => ({ format: "equation" as Format })));
    expect(tenEquations.skills.regroup.mastery).toBeGreaterThan(0.8);
    expect(tenEquations.skills.regroup.mastered).toBe(false);

    const varied = play(tenEquations, [{ format: "multipleChoice" }, { format: "wordProblem" }]);
    expect(varied.skills.regroup.mastered).toBe(true);
    expect(varied.skills.regroup.masteredAt).not.toBeNull();
  });

  it("cannot reach mastery through hints alone", () => {
    const formats: Format[] = ["equation", "visual", "wordProblem", "multipleChoice"];
    const model = play(
      createLearnerModel(2),
      Array.from({ length: 24 }, (_, i) => ({ hintLevel: 2 as const, format: formats[i % formats.length] })),
    );
    expect(model.skills.regroup.mastery).toBeLessThan(0.5);
    expect(model.skills.regroup.mastered).toBe(false);
    expect(model.skills.regroup.hintedCorrect).toBe(24);
  });

  it("keeps a mastered skill through a slip but loses it after a real drop", () => {
    const mastered = play(createLearnerModel(2), [
      ...Array.from({ length: 8 }, () => ({})),
      { format: "visual" },
      { format: "wordProblem" },
    ]);
    expect(mastered.skills.regroup.mastered).toBe(true);

    const slip = play(mastered, [{ correct: false }]);
    expect(slip.skills.regroup.mastered).toBe(true);

    const drop = play(slip, Array.from({ length: 4 }, () => ({ correct: false })));
    expect(drop.skills.regroup.mastered).toBe(false);
  });

  it("counts named mistakes and keeps only recent results", () => {
    const model = play(
      createLearnerModel(2),
      Array.from({ length: 12 }, () => ({ correct: false, misconception: "columnConcat" as const })),
    );
    expect(model.skills.regroup.misconceptions.columnConcat).toBe(12);
    expect(model.skills.regroup.recent).toHaveLength(8);
  });

  it("tracks progress made alone separately and keeps the best progress shown", () => {
    const helped = play(createLearnerModel(2), Array.from({ length: 6 }, () => ({ hintLevel: 2 as const })));
    expect(helped.skills.regroup.soloMastery).toBe(0);
    expect(helped.skills.regroup.peakMastery).toBeGreaterThan(0.3);

    const solo = play(helped, [{}]);
    expect(solo.skills.regroup.soloMastery).toBeCloseTo(0.35);

    const slip = play(solo, [{ correct: false }, { correct: false }]);
    expect(slip.skills.regroup.soloMastery).toBeLessThan(solo.skills.regroup.soloMastery);
    expect(slip.skills.regroup.peakSolo).toBeCloseTo(0.35);
  });

  it("never mutates the previous model", () => {
    const start = createLearnerModel(2);
    const snapshot = JSON.stringify(start);
    recordObservation(start, obs());
    expect(JSON.stringify(start)).toBe(snapshot);
  });
});

describe("starsFor", () => {
  it("caps unmastered skills at 3 stars", () => {
    const model = play(createLearnerModel(2), Array.from({ length: 10 }, () => ({})));
    expect(model.skills.regroup.mastered).toBe(false);
    expect(starsFor(model.skills.regroup)).toBe(3);
  });
});
