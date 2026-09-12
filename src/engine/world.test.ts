import { describe, expect, it } from "vitest";
import { createLearnerModel, recordObservation, type LearnerModel, type Observation } from "./learnerModel";
import { SKILL_ORDER } from "./skills";
import { deriveWorld, TOTAL_PLANKS } from "./world";

let clock = 0;
const play = (model: LearnerModel, n: number, overrides: Partial<Observation>) =>
  Array.from({ length: n }).reduce<LearnerModel>(
    (m) =>
      recordObservation(m, {
        skill: "simple",
        level: 2,
        format: "equation",
        correct: true,
        attempt: 1,
        hintLevel: 0,
        responseMs: 4000,
        misconception: null,
        guess: false,
        at: ++clock,
        ...overrides,
      }),
    model,
  );

describe("deriveWorld", () => {
  it("starts foggy with every plank missing", () => {
    const world = deriveWorld(createLearnerModel(1), false);
    expect(world.planks).toHaveLength(TOTAL_PLANKS);
    expect(world.planks.every((p) => p === "missing")).toBe(true);
    expect(world).toMatchObject({ fogLayers: 4, weather: "fog", gateOpen: false, regionComplete: false });
  });

  it("keeps hint-earned planks wobbly until the child solves one alone", () => {
    const helped = play(createLearnerModel(1), 6, { hintLevel: 1 });
    expect(deriveWorld(helped, false).planks[0]).toBe("wobbly");

    const solo = play(helped, 1, {});
    expect(deriveWorld(solo, false).planks[0]).toBe("solid");
  });

  it("fills planks from the near bank and never takes one away after mistakes", () => {
    const strong = play(createLearnerModel(1), 3, {});
    const before = deriveWorld(strong, false).planks;
    expect(before[0]).toBe("solid");
    expect(before.slice(1).every((p) => p === "missing")).toBe(true);

    const afterMisses = play(strong, 3, { correct: false });
    expect(deriveWorld(afterMisses, false).planks).toEqual(before);
  });

  it("doesn't turn a plank earned alone into a wobbly one when a hint is used later", () => {
    const strong = play(createLearnerModel(1), 3, {});
    const helped = play(strong, 2, { hintLevel: 2 });
    expect(deriveWorld(helped, false).planks[0]).toBe("solid");
  });

  it("opens the Guardian gate and clears the sky once every skill is mastered", () => {
    const model = createLearnerModel(2);
    const skills = Object.fromEntries(
      SKILL_ORDER.map((id) => [id, { ...model.skills[id], mastered: true, mastery: 0.9 }]),
    ) as LearnerModel["skills"];
    const world = deriveWorld({ ...model, skills }, false);
    expect(world).toMatchObject({ gateOpen: true, weather: "sunny", fogLayers: 0, regionComplete: false });
    expect(world.planks.slice(0, -1).every((p) => p === "solid")).toBe(true);
    expect(world.planks.at(-1)).toBe("missing");

    const done = deriveWorld({ ...model, skills }, true);
    expect(done.regionComplete).toBe(true);
    expect(done.planks.every((p) => p === "gold")).toBe(true);
  });

  it("does not complete the region from a boss win alone", () => {
    expect(deriveWorld(createLearnerModel(2), true).regionComplete).toBe(false);
  });
});
