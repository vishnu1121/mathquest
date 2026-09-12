// Ready-made starting points for demo recordings and visual QA: ?scenario=forest | pip | gate | blocks.
// They run through the real engine and reducer, so every scene behaves exactly like live play.
import { createChallenge } from "@/engine/generators";
import { createLearnerModel, withPrior, type LearnerModel } from "@/engine/learnerModel";
import { createPipPuzzle } from "@/engine/pipPuzzle";
import { createRng } from "@/engine/rng";
import { SKILL_ORDER } from "@/engine/skills";
import { createInitialState, gameReducer } from "./reducer";
import type { GameState, Profile } from "./types";

/** Seed for repeatable demo recordings (?demo=1 and scenarios). The game still adapts to real answers. */
export const DEMO_SEED = 20260918;

export const SCENARIOS = ["forest", "pip", "gate", "blocks"] as const;
export type ScenarioId = (typeof SCENARIOS)[number];

export const isScenarioId = (value: string | null): value is ScenarioId =>
  value !== null && (SCENARIOS as readonly string[]).includes(value);

const DEMO_PROFILE: Profile = { hero: "wizard", name: "Nova", grade: 2 };

/** A grade-2 learner who can add but is still learning to carry. */
function learningToCarry(): LearnerModel {
  const model = createLearnerModel(2);
  return {
    ...model,
    skills: {
      ...model.skills,
      simple: withPrior(model.skills.simple, 0.5, 4),
      twoDigit: withPrior(model.skills.twoDigit, 0.5, 3),
      regroup: withPrior(model.skills.regroup, 0.25, 3),
      wordProblems: withPrior(model.skills.wordProblems, 0.25, 2),
    },
  };
}

const MASTERED_LEVELS = { simple: 4, twoDigit: 3, regroup: 3, wordProblems: 3 } as const;

function everythingMastered(): LearnerModel {
  const model = createLearnerModel(2);
  const skills = Object.fromEntries(
    SKILL_ORDER.map((id) => [
      id,
      {
        ...withPrior(model.skills[id], 0.9, MASTERED_LEVELS[id]),
        mastered: true,
        evidence: 8,
        independentFormats: ["equation", "visual", "wordProblem"],
      },
    ]),
  ) as LearnerModel["skills"];
  return { ...model, skills };
}

export function buildScenario(id: ScenarioId, at: number): GameState {
  const start: GameState = { ...createInitialState(DEMO_SEED), profile: DEMO_PROFILE, screen: "placement" };
  const model = id === "gate" ? everythingMastered() : learningToCarry();
  const inForest = gameReducer({ ...start, model }, { type: "enterForest", at });
  if (id === "forest" || id === "gate") return inForest;

  const rng = createRng(inForest.rngState);
  if (id === "blocks") {
    const challenge = createChallenge({ skill: "regroup", level: 3, format: "visual" }, rng, "demo-blocks");
    return {
      ...inForest,
      rngState: rng.state(),
      turn: {
        kind: "challenge",
        plan: {
          kind: "scaffold",
          skill: "regroup",
          level: 3,
          format: "visual",
          misconception: "columnConcat",
          reason: "Same mistake twice, so blocks with easier numbers",
        },
        challenge,
        attempt: 1,
        hintLevel: 0,
        startedAt: at,
        lastEvaluation: null,
        status: "answering",
        missRecorded: false,
        firstWrong: null,
      },
    };
  }

  const puzzle = createPipPuzzle("columnConcat", rng, "demo-pip");
  return {
    ...inForest,
    rngState: rng.state(),
    turn: {
      kind: "pip",
      plan: {
        kind: "pipPuzzle",
        skill: "regroup",
        level: 3,
        format: "pipPuzzle",
        misconception: "columnConcat",
        reason: "The mistake is fixed, so Pip's Puzzle checks that the fix really stuck",
      },
      puzzle,
      startedAt: at,
      wrongTaps: [],
      wrongPicks: [],
      status: "finding",
    },
  };
}
