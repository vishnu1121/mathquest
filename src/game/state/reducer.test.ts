import { describe, expect, it } from "vitest";
import { createLearnerModel, type LearnerModel } from "@/engine/learnerModel";
import { bugAnswersFor } from "@/engine/misconceptions";
import { createPipPuzzle } from "@/engine/pipPuzzle";
import { createRng } from "@/engine/rng";
import { SKILL_ORDER } from "@/engine/skills";
import { createInitialState, gameReducer } from "./reducer";
import type { ForestTurn, GameState, PipTurn } from "./types";

let now = 1_000_000;
const tick = (ms = 5000) => (now += ms);

function onboarded(): GameState {
  const started = gameReducer(createInitialState(42), { type: "begin" });
  return gameReducer(started, { type: "createProfile", profile: { hero: "wizard", name: "Nova", grade: 2 }, at: tick() });
}

function placedOnRegroup(): LearnerModel {
  const model = createLearnerModel(2);
  return {
    ...model,
    skills: {
      ...model.skills,
      simple: { ...model.skills.simple, mastery: 0.5 },
      twoDigit: { ...model.skills.twoDigit, mastery: 0.5 },
      regroup: { ...model.skills.regroup, level: 3 },
    },
  };
}

function allMastered(): LearnerModel {
  const model = createLearnerModel(2);
  const skills = Object.fromEntries(
    SKILL_ORDER.map((id) => [id, { ...model.skills[id], mastered: true, mastery: 0.95, level: 2 as const }]),
  ) as LearnerModel["skills"];
  return { ...model, skills };
}

const inForest = (model: LearnerModel): GameState =>
  gameReducer({ ...onboarded(), warmup: null, model, screen: "placement" }, { type: "enterForest", at: tick() });

function challengeTurn(state: GameState): ForestTurn {
  if (state.turn?.kind !== "challenge") throw new Error("expected a challenge turn");
  return state.turn;
}

describe("onboarding and warm-up", () => {
  it("takes a new player through the warm-up to a placement", () => {
    let state = onboarded();
    expect(state.screen).toBe("warmup");
    for (let i = 0; i < 8; i++) {
      const answer = state.warmup?.item.challenge.answer;
      expect(answer).toBeDefined();
      state = gameReducer(state, { type: "answerWarmup", value: String(answer), at: tick() });
    }
    expect(state.screen).toBe("placement");
    expect(state.warmup).toBeNull();
    expect(state.model?.skills.simple.mastery).toBeGreaterThan(0);
  });

  it("ignores empty or unreadable answers", () => {
    const state = onboarded();
    expect(gameReducer(state, { type: "answerWarmup", value: "", at: tick() })).toBe(state);
  });
});

describe("forest turns", () => {
  it("rewards a first-try answer and explains the decision in the log", () => {
    let state = inForest(placedOnRegroup());
    const turn = challengeTurn(state);
    state = gameReducer(state, { type: "submitAnswer", value: String(turn.challenge.answer), at: tick() });
    expect(challengeTurn(state).status).toBe("solved");
    expect(state.xp).toBe(10);
    expect(state.log.at(-1)).toMatchObject({ outcome: "solved", problem: `${turn.challenge.a} + ${turn.challenge.b}` });
    expect(state.log.at(-1)?.reason.length).toBeGreaterThan(0);

    const next = gameReducer(state, { type: "nextTurn", at: tick() });
    expect(challengeTurn(next).challenge.id).not.toBe(turn.challenge.id);
  });

  it("records only the first wrong answer and names the mistake", () => {
    let state = inForest(placedOnRegroup());
    const bug = bugAnswersFor(challengeTurn(state).challenge).find((b) => b.id === "columnConcat");
    expect(bug).toBeDefined();
    state = gameReducer(state, { type: "submitAnswer", value: String(bug?.value), at: tick() });
    state = gameReducer(state, { type: "submitAnswer", value: "1", at: tick() });

    expect(state.model?.skills.regroup.evidence).toBe(1);
    expect(state.model?.skills.regroup.misconceptions.columnConcat).toBe(1);
    expect(challengeTurn(state)).toMatchObject({ attempt: 3, firstWrong: bug?.value, status: "answering" });
  });

  it("does not count a too-fast guess", () => {
    let state = inForest(placedOnRegroup());
    state = gameReducer(state, { type: "submitAnswer", value: "1", at: tick(300) });
    expect(state.model?.skills.regroup.evidence).toBe(0);
    expect(state.model?.skills.regroup.guesses).toBe(1);
  });

  it("stops the hint ladder at the explanation and counts the turn as missed", () => {
    let state = inForest(placedOnRegroup());
    for (let i = 0; i < 6; i++) state = gameReducer(state, { type: "showHint", at: tick() });
    expect(challengeTurn(state)).toMatchObject({ hintLevel: 5, status: "shown" });
    expect(state.log.filter((entry) => entry.outcome === "missed")).toHaveLength(1);
  });

  it("switches to blocks after the same mistake twice", () => {
    let state = inForest(placedOnRegroup());
    for (let round = 0; round < 2; round++) {
      const bug = bugAnswersFor(challengeTurn(state).challenge).find((b) => b.id === "columnConcat");
      expect(bug).toBeDefined();
      state = gameReducer(state, { type: "submitAnswer", value: String(bug?.value), at: tick() });
      for (let i = 0; i < 5; i++) state = gameReducer(state, { type: "showHint", at: tick() });
      state = gameReducer(state, { type: "nextTurn", at: tick() });
    }
    const turn = challengeTurn(state);
    expect(turn.plan.kind).toBe("scaffold");
    expect(turn.challenge.format).toBe("visual");
  });

  it("keeps an unfinished turn when coming back from the map", () => {
    const state = inForest(placedOnRegroup());
    const back = gameReducer(gameReducer(state, { type: "goTo", screen: "map" }), { type: "enterForest", at: tick() });
    expect(challengeTurn(back).challenge.id).toBe(challengeTurn(state).challenge.id);
  });
});

describe("Pip's Puzzle", () => {
  it("lets the child find the mistake, then fix it, and rewards the fix", () => {
    const base = inForest(placedOnRegroup());
    const puzzle = createPipPuzzle("columnConcat", createRng(3), "p1");
    const pipTurn: PipTurn = {
      kind: "pip",
      plan: { kind: "pipPuzzle", skill: "regroup", level: 3, format: "pipPuzzle", reason: "check", misconception: "columnConcat" },
      puzzle,
      startedAt: tick(),
      wrongTaps: [],
      wrongPicks: [],
      status: "finding",
    };
    let state: GameState = { ...base, turn: pipTurn };

    state = gameReducer(state, { type: "pipTap", part: "tens", at: tick() });
    expect(state.turn).toMatchObject({ status: "finding", wrongTaps: ["tens"] });
    state = gameReducer(state, { type: "pipTap", part: "ones", at: tick() });
    expect(state.turn?.kind === "pip" && state.turn.status).toBe("fixing");

    state = gameReducer(state, { type: "pipPick", value: puzzle.pipAnswer, at: tick() });
    expect(state.turn).toMatchObject({ status: "fixing", wrongPicks: [puzzle.pipAnswer] });

    const xpBefore = state.xp;
    state = gameReducer(state, { type: "pipPick", value: puzzle.correct, at: tick() });
    expect(state.turn?.kind === "pip" && state.turn.status).toBe("solved");
    expect(state.xp - xpBefore).toBeGreaterThanOrEqual(15);
    expect(state.log.at(-1)?.outcome).toBe("helped");
  });
});

describe("the Forest Guardian", () => {
  it("opens once every skill is mastered and completes the region on a pass", () => {
    let state = inForest(allMastered());
    expect(state.turn).toBeNull();

    state = gameReducer(state, { type: "enterBoss", at: tick() });
    expect(state.screen).toBe("boss");
    expect(state.boss?.items).toHaveLength(5);

    for (let i = 0; i < 5; i++) {
      state = gameReducer(state, { type: "submitBossAnswer", value: String(state.boss?.turn.challenge.answer), at: tick() });
      state = gameReducer(state, { type: "nextBossItem", at: tick() });
    }
    expect(state).toMatchObject({ screen: "complete", bossPassed: true, celebration: { kind: "boss" } });
    expect(state.xp).toBeGreaterThanOrEqual(100);
  });

  it("sets up training instead of a game over when the round doesn't pass", () => {
    let state = gameReducer(inForest(allMastered()), { type: "enterBoss", at: tick() });
    for (let i = 0; i < 5; i++) {
      state = gameReducer(state, { type: "submitBossAnswer", value: "9999", at: tick() });
      state = gameReducer(state, { type: "submitBossAnswer", value: "9998", at: tick() });
      state = gameReducer(state, { type: "nextBossItem", at: tick() });
    }
    expect(state.boss?.outcome?.passed).toBe(false);
    expect(state.training?.skills.length).toBeGreaterThan(0);
    expect(state.screen).toBe("boss");

    state = gameReducer(state, { type: "enterForest", at: tick() });
    expect(state.screen).toBe("forest");
    expect(state.boss).toBeNull();
    expect(state.turn).not.toBeNull();
  });

  it("won't open the gate before the skills are mastered", () => {
    const state = inForest(placedOnRegroup());
    expect(gameReducer(state, { type: "enterBoss", at: tick() })).toBe(state);
  });
});
