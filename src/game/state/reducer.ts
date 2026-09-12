// The game state machine. Pure: time arrives in actions and randomness comes from the seeded
// RNG stored in state, so every flow is reproducible and unit-tested.
import { commitPlan, planNext, type Plan } from "@/engine/adaptive";
import { createBossRound, scoreBossRound, type BossResult } from "@/engine/boss";
import { createWarmupItem, nextWarmupStep, placeLearner, WARMUP_LENGTH, warmupStartStep } from "@/engine/diagnostic";
import { evaluateAnswer, isLikelyGuess } from "@/engine/evaluate";
import { createChallenge } from "@/engine/generators";
import { MAX_HINT_LEVEL } from "@/engine/hints";
import { recordObservation, type LearnerModel, type Observation } from "@/engine/learnerModel";
import { createPipPuzzle, isPipMistake, type MistakePart } from "@/engine/pipPuzzle";
import { newlyMastered, nextStreak, rewardForAnswer, XP } from "@/engine/rewards";
import { createRng, type Rng } from "@/engine/rng";
import { createSession } from "@/engine/adaptive";
import { SKILLS } from "@/engine/skills";
import type { Challenge, Format, HintLevel, SkillId } from "@/engine/types";
import { deriveWorld } from "@/engine/world";
import type { Attempt, Celebration, GameState, LogEntry, LogOutcome, Profile, Turn } from "./types";

export type GameAction =
  | { type: "begin" }
  | { type: "createProfile"; profile: Profile; at: number }
  | { type: "answerWarmup"; value: string; at: number }
  | { type: "enterForest"; at: number }
  | { type: "submitAnswer"; value: string; at: number }
  | { type: "showHint"; at: number }
  | { type: "nextTurn"; at: number }
  | { type: "pipTap"; part: MistakePart; at: number }
  | { type: "pipPick"; value: number; at: number }
  | { type: "enterBoss"; at: number }
  | { type: "submitBossAnswer"; value: string; at: number }
  | { type: "showBossHint" }
  | { type: "nextBossItem"; at: number }
  | { type: "goTo"; screen: "map" | "grownups" | "placement" }
  | { type: "dismissCelebration" }
  | { type: "reset"; seed: number };

/** Guardian hints stop before the full explanation, which would give the answer away. */
const MAX_BOSS_HINT = 4;
const TRAINING_ITEMS = 4;
const TRAINING_FORMATS: Readonly<Record<SkillId, readonly Exclude<Format, "pipPuzzle">[]>> = {
  simple: ["visual", "equation", "wordProblem"],
  twoDigit: ["equation", "visual", "wordProblem"],
  regroup: ["visual", "wordProblem", "missingAddend", "equation"],
  wordProblems: ["wordProblem", "visual", "multipleChoice"],
};

export function createInitialState(seed: number): GameState {
  return {
    version: 1,
    screen: "welcome",
    profile: null,
    rngState: seed >>> 0,
    xp: 0,
    streak: 0,
    model: null,
    session: createSession(),
    warmup: null,
    turn: null,
    boss: null,
    bossPassed: false,
    training: null,
    log: [],
    celebration: null,
  };
}

function withRng<T>(state: GameState, make: (rng: Rng) => T): [T, number] {
  const rng = createRng(state.rngState);
  const value = make(rng);
  return [value, rng.state()];
}

export const problemText = (c: Challenge): string => (c.unknown === "addend" ? `${c.a} + ? = ${c.total}` : `${c.a} + ${c.b}`);

const freshAttempt = (challenge: Challenge, at: number): Attempt => ({
  challenge,
  attempt: 1,
  hintLevel: 0,
  startedAt: at,
  lastEvaluation: null,
  status: "answering",
  missRecorded: false,
  firstWrong: null,
});

function observe(
  attempt: Attempt,
  fields: Pick<Observation, "correct" | "misconception" | "guess">,
  at: number,
): Observation {
  const { challenge } = attempt;
  return {
    skill: challenge.skill,
    level: challenge.level,
    format: challenge.format,
    attempt: attempt.attempt,
    hintLevel: attempt.hintLevel,
    responseMs: at - attempt.startedAt,
    at,
    ...fields,
  };
}

function plankScore(model: LearnerModel, bossPassed: boolean): number {
  return deriveWorld(model, bossPassed).planks.reduce((sum, p) => sum + (p === "wobbly" ? 1 : p === "missing" ? 0 : 2), 0);
}

function celebrate(before: LearnerModel, after: LearnerModel, bossPassed: boolean): Celebration | null {
  const mastered = newlyMastered(before, after)[0];
  if (mastered) return { kind: "mastered", skill: mastered };
  return plankScore(after, bossPassed) > plankScore(before, bossPassed) ? { kind: "plank" } : null;
}

const logEntry = (plan: Plan, problem: string, outcome: LogOutcome, wrongAnswer: number | null, at: number): LogEntry => ({
  at,
  kind: plan.kind,
  skill: plan.skill,
  reason: plan.reason,
  outcome,
  problem,
  wrongAnswer,
});

const isTurnDone = (turn: Turn): boolean => (turn.kind === "pip" ? turn.status === "solved" : turn.status !== "answering");

function startNextTurn(state: GameState, at: number): GameState {
  const { model } = state;
  if (!model) return state;

  let plan = planNext(model, state.session);
  let training = state.training;
  if (plan.kind === "boss" && training && training.left > 0) {
    const skill = training.skills[training.left % training.skills.length] ?? "regroup";
    const formats = TRAINING_FORMATS[skill];
    plan = {
      kind: "review",
      skill,
      level: model.skills[skill].level,
      format: formats[training.left % formats.length] ?? "equation",
      reason: `Training for the Guardian with more ${SKILLS[skill].name.toLowerCase()}`,
    };
    training = training.left > 1 ? { ...training, left: training.left - 1 } : null;
  }
  if (plan.kind === "boss") return { ...state, turn: null, celebration: null };

  const committed = commitPlan(model, state.session, plan);
  const id = `t${committed.session.itemsServed}`;
  const base = { ...state, model: committed.model, session: committed.session, training, celebration: null };

  if (plan.kind === "pipPuzzle" && plan.misconception && isPipMistake(plan.misconception)) {
    const mistake = plan.misconception;
    const [puzzle, rngState] = withRng(state, (rng) => createPipPuzzle(mistake, rng, id));
    return { ...base, rngState, turn: { kind: "pip", plan, puzzle, startedAt: at, wrongTaps: [], wrongPicks: [], status: "finding" } };
  }

  const request = {
    skill: plan.skill,
    level: plan.level,
    format: plan.format === "pipPuzzle" ? "equation" : plan.format,
    theme: state.profile?.interest ?? "forest",
  } as const;
  const [challenge, rngState] = withRng(state, (rng) => createChallenge(request, rng, id));
  return { ...base, rngState, turn: { kind: "challenge", plan, ...freshAttempt(challenge, at) } };
}

function answerWarmup(state: GameState, value: string, at: number): GameState {
  const { warmup, profile } = state;
  if (!warmup || !profile) return state;
  const evaluation = evaluateAnswer(warmup.item.challenge, value);
  if (evaluation.value === null) return state;

  const answers = [
    ...warmup.answers,
    { index: warmup.index, step: warmup.step, skill: warmup.item.skill, level: warmup.item.level, correct: evaluation.correct },
  ];
  if (answers.length >= WARMUP_LENGTH) {
    return { ...state, warmup: null, model: placeLearner(profile.grade, answers), screen: "placement" };
  }
  const step = nextWarmupStep(warmup.step, evaluation.correct);
  const [item, rngState] = withRng(state, (rng) => createWarmupItem(answers.length, step, rng));
  return { ...state, rngState, warmup: { index: answers.length, step, answers, item, startedAt: at } };
}

function submitAnswer(state: GameState, value: string, at: number): GameState {
  const { turn, model } = state;
  if (!model || turn?.kind !== "challenge" || turn.status !== "answering") return state;
  const evaluation = evaluateAnswer(turn.challenge, value);
  if (evaluation.value === null) return state;

  if (evaluation.correct) {
    const observation = observe(turn, { correct: true, misconception: null, guess: false }, at);
    const nextModel = recordObservation(model, observation);
    const mastered = newlyMastered(model, nextModel);
    const outcome: LogOutcome = observation.attempt === 1 && observation.hintLevel === 0 ? "solved" : "helped";
    return {
      ...state,
      model: nextModel,
      xp: state.xp + rewardForAnswer(observation).xp + mastered.length * XP.mastery,
      streak: nextStreak(state.streak, true),
      celebration: celebrate(model, nextModel, state.bossPassed),
      turn: { ...turn, status: "solved", lastEvaluation: evaluation },
      log: [...state.log, logEntry(turn.plan, problemText(turn.challenge), outcome, turn.firstWrong, at)],
    };
  }

  // Only the first considered wrong answer counts as evidence; retries shouldn't pile on.
  const guess = isLikelyGuess(false, at - turn.startedAt);
  const record = !turn.missRecorded;
  const nextModel = record
    ? recordObservation(model, observe(turn, { correct: false, misconception: evaluation.misconception, guess }, at))
    : model;
  return {
    ...state,
    model: nextModel,
    streak: nextStreak(state.streak, false),
    turn: {
      ...turn,
      attempt: turn.attempt + 1,
      startedAt: at,
      lastEvaluation: evaluation,
      missRecorded: turn.missRecorded || (record && !guess),
      firstWrong: turn.firstWrong ?? evaluation.value,
    },
  };
}

function showHint(state: GameState, at: number): GameState {
  const { turn, model } = state;
  if (!model || turn?.kind !== "challenge" || turn.status !== "answering") return state;
  const hintLevel = Math.min(MAX_HINT_LEVEL, turn.hintLevel + 1) as HintLevel;
  if (hintLevel < MAX_HINT_LEVEL) return { ...state, turn: { ...turn, hintLevel } };

  // The last hint explains the answer, so this challenge counts as not solved.
  const shown = { ...turn, hintLevel, status: "shown" as const };
  const nextModel = turn.missRecorded
    ? model
    : recordObservation(model, observe(shown, { correct: false, misconception: null, guess: false }, at));
  return {
    ...state,
    model: nextModel,
    streak: 0,
    turn: { ...shown, missRecorded: true },
    log: [...state.log, logEntry(turn.plan, problemText(turn.challenge), "missed", turn.firstWrong, at)],
  };
}

function pipTap(state: GameState, part: MistakePart): GameState {
  const { turn } = state;
  if (turn?.kind !== "pip" || turn.status !== "finding") return state;
  return part === turn.puzzle.mistakePart
    ? { ...state, turn: { ...turn, status: "fixing" } }
    : { ...state, turn: { ...turn, wrongTaps: [...turn.wrongTaps, part] } };
}

function pipPick(state: GameState, value: number, at: number): GameState {
  const { turn, model } = state;
  if (!model || turn?.kind !== "pip" || turn.status !== "fixing") return state;
  if (value !== turn.puzzle.correct) return { ...state, turn: { ...turn, wrongPicks: [...turn.wrongPicks, value] } };

  const independent = turn.wrongTaps.length === 0 && turn.wrongPicks.length === 0;
  const observation: Observation = {
    skill: turn.plan.skill,
    level: turn.plan.level,
    format: "pipPuzzle",
    correct: true,
    attempt: independent ? 1 : 2,
    hintLevel: 0,
    responseMs: at - turn.startedAt,
    misconception: null,
    guess: false,
    at,
  };
  const nextModel = recordObservation(model, observation);
  const mastered = newlyMastered(model, nextModel);
  return {
    ...state,
    model: nextModel,
    xp: state.xp + rewardForAnswer(observation).xp + mastered.length * XP.mastery,
    streak: nextStreak(state.streak, true),
    celebration: mastered[0] ? { kind: "mastered", skill: mastered[0] } : { kind: "pip" },
    turn: { ...turn, status: "solved" },
    log: [
      ...state.log,
      logEntry(turn.plan, `${turn.puzzle.a} + ${turn.puzzle.b}`, independent ? "solved" : "helped", null, at),
    ],
  };
}

function enterBoss(state: GameState, at: number): GameState {
  const { model } = state;
  if (!model || !deriveWorld(model, state.bossPassed).gateOpen) return state;
  const [items, rngState] = withRng(state, (rng) => createBossRound(model, rng, `boss${state.session.itemsServed}`));
  const first = items[0];
  if (!first) return state;
  return {
    ...state,
    rngState,
    screen: "boss",
    turn: null,
    celebration: null,
    boss: { items, index: 0, results: [], turn: freshAttempt(first.challenge, at), outcome: null },
  };
}

function submitBossAnswer(state: GameState, value: string, at: number): GameState {
  const { boss, model } = state;
  if (!model || !boss || boss.outcome || boss.turn.status !== "answering") return state;
  const { turn } = boss;
  const evaluation = evaluateAnswer(turn.challenge, value);
  if (evaluation.value === null) return state;

  const observation = observe(turn, { correct: evaluation.correct, misconception: evaluation.misconception, guess: false }, at);
  const nextModel = evaluation.correct || !turn.missRecorded ? recordObservation(model, observation) : model;

  // One more try after a miss; a second-try success still counts, but as helped.
  if (!evaluation.correct && turn.attempt < 2) {
    return {
      ...state,
      model: nextModel,
      boss: { ...boss, turn: { ...turn, attempt: 2, startedAt: at, lastEvaluation: evaluation, missRecorded: true, firstWrong: evaluation.value } },
    };
  }

  const result: BossResult = {
    skill: turn.challenge.skill,
    correct: evaluation.correct,
    hintLevel: evaluation.correct && turn.attempt > 1 ? (Math.max(1, turn.hintLevel) as HintLevel) : turn.hintLevel,
  };
  return {
    ...state,
    model: nextModel,
    xp: state.xp + (evaluation.correct ? rewardForAnswer(observation).xp : 0),
    boss: {
      ...boss,
      results: [...boss.results, result],
      turn: { ...turn, status: evaluation.correct ? "solved" : "shown", lastEvaluation: evaluation, missRecorded: true },
    },
  };
}

function nextBossItem(state: GameState, at: number): GameState {
  const { boss } = state;
  if (!boss || boss.outcome || boss.turn.status === "answering") return state;
  const index = boss.index + 1;
  const item = boss.items[index];
  if (item) return { ...state, boss: { ...boss, index, turn: freshAttempt(item.challenge, at) } };

  const outcome = scoreBossRound(boss.results);
  if (outcome.passed) {
    return {
      ...state,
      bossPassed: true,
      xp: state.xp + XP.boss,
      screen: "complete",
      celebration: { kind: "boss" },
      training: null,
      boss: { ...boss, outcome },
    };
  }
  return {
    ...state,
    boss: { ...boss, outcome },
    training: { skills: outcome.trainOn.length > 0 ? outcome.trainOn : ["regroup"], left: TRAINING_ITEMS },
  };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "begin":
      return { ...state, screen: state.model ? "map" : state.warmup ? "warmup" : "profile" };
    case "createProfile": {
      const step = warmupStartStep(action.profile.grade);
      const [item, rngState] = withRng(state, (rng) => createWarmupItem(0, step, rng));
      return {
        ...state,
        profile: action.profile,
        rngState,
        screen: "warmup",
        warmup: { index: 0, step, answers: [], item, startedAt: action.at },
      };
    }
    case "answerWarmup":
      return answerWarmup(state, action.value, action.at);
    case "enterForest": {
      if (!state.model) return state;
      const entered: GameState = { ...state, screen: "forest", boss: state.boss?.outcome ? null : state.boss };
      return state.turn && !isTurnDone(state.turn) ? entered : startNextTurn(entered, action.at);
    }
    case "submitAnswer":
      return submitAnswer(state, action.value, action.at);
    case "showHint":
      return showHint(state, action.at);
    case "nextTurn":
      return state.turn && isTurnDone(state.turn) ? startNextTurn(state, action.at) : state;
    case "pipTap":
      return pipTap(state, action.part);
    case "pipPick":
      return pipPick(state, action.value, action.at);
    case "enterBoss":
      return enterBoss(state, action.at);
    case "submitBossAnswer":
      return submitBossAnswer(state, action.value, action.at);
    case "showBossHint": {
      const { boss } = state;
      if (!boss || boss.turn.status !== "answering") return state;
      const hintLevel = Math.min(MAX_BOSS_HINT, boss.turn.hintLevel + 1) as HintLevel;
      return { ...state, boss: { ...boss, turn: { ...boss.turn, hintLevel } } };
    }
    case "nextBossItem":
      return nextBossItem(state, action.at);
    case "goTo":
      return { ...state, screen: action.screen };
    case "dismissCelebration":
      return { ...state, celebration: null };
    case "reset":
      return createInitialState(action.seed);
  }
}
