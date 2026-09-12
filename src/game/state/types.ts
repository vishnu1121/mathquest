import type { Plan, PlanKind, Session } from "@/engine/adaptive";
import type { BossItem, BossOutcome, BossResult } from "@/engine/boss";
import type { WarmupAnswer, WarmupItem } from "@/engine/diagnostic";
import type { Evaluation } from "@/engine/evaluate";
import type { LearnerModel } from "@/engine/learnerModel";
import type { MistakePart, PipPuzzle } from "@/engine/pipPuzzle";
import type { Challenge, Grade, HintLevel, SkillId, StoryTheme } from "@/engine/types";

export const HEROES = [
  { id: "wizard", emoji: "🧙", label: "Wizard" },
  { id: "hero", emoji: "🦸", label: "Hero" },
  { id: "cat", emoji: "🐱", label: "Cat" },
  { id: "astronaut", emoji: "🧑‍🚀", label: "Astronaut" },
] as const;
export type HeroId = (typeof HEROES)[number]["id"];

/** Preset names only, so the game never collects a child's real name. */
export const HERO_NAMES = ["Nova", "Juniper", "Rocket", "Sage"] as const;
export type HeroName = (typeof HERO_NAMES)[number];

export const INTERESTS = [
  { id: "forest", emoji: "🌳", label: "Forest" },
  { id: "dinosaurs", emoji: "🦕", label: "Dinosaurs" },
  { id: "space", emoji: "🚀", label: "Space" },
  { id: "sports", emoji: "⚽", label: "Sports" },
  { id: "animals", emoji: "🐾", label: "Animals" },
] as const satisfies readonly { id: StoryTheme; emoji: string; label: string }[];

export interface Profile {
  hero: HeroId;
  name: HeroName;
  grade: Grade;
  /** What the child loves. Saves from before this existed read as "forest". */
  interest?: StoryTheme;
}

export type Screen =
  | "welcome"
  | "profile"
  | "warmup"
  | "placement"
  | "map"
  | "forest"
  | "boss"
  | "complete"
  | "grownups";

export interface Attempt {
  challenge: Challenge;
  /** 1 for the first try. */
  attempt: number;
  /** Highest hint shown so far. */
  hintLevel: HintLevel;
  startedAt: number;
  lastEvaluation: Evaluation | null;
  /** answering, solved (answered correctly) or shown (the final hint explained the answer). */
  status: "answering" | "solved" | "shown";
  /** The first wrong answer on this challenge was already recorded as evidence. */
  missRecorded: boolean;
  /** The child's first wrong answer, kept for the grown-ups view. */
  firstWrong: number | null;
}

export interface ForestTurn extends Attempt {
  kind: "challenge";
  plan: Plan;
}

export interface PipTurn {
  kind: "pip";
  plan: Plan;
  puzzle: PipPuzzle;
  startedAt: number;
  wrongTaps: MistakePart[];
  wrongPicks: number[];
  status: "finding" | "fixing" | "solved";
}

export type Turn = ForestTurn | PipTurn;

export interface WarmupRun {
  index: number;
  step: number;
  answers: WarmupAnswer[];
  item: WarmupItem;
  startedAt: number;
}

export interface BossRun {
  items: BossItem[];
  index: number;
  results: BossResult[];
  turn: Attempt;
  outcome: BossOutcome | null;
}

export type LogOutcome = "solved" | "helped" | "missed";

export interface LogEntry {
  at: number;
  kind: PlanKind | "warmup";
  skill: SkillId;
  reason: string;
  outcome: LogOutcome | null;
  /** The problem as shown, e.g. "47 + 38", and the child's wrong answer if any. */
  problem: string;
  wrongAnswer: number | null;
}

export type Celebration =
  | { kind: "plank" }
  | { kind: "mastered"; skill: SkillId }
  | { kind: "pip" }
  | { kind: "boss" };

export interface GameState {
  version: 1;
  screen: Screen;
  profile: Profile | null;
  rngState: number;
  xp: number;
  streak: number;
  model: LearnerModel | null;
  session: Session;
  warmup: WarmupRun | null;
  turn: Turn | null;
  boss: BossRun | null;
  bossPassed: boolean;
  /** Extra practice after a Guardian round that didn't pass, before the gate reopens. */
  training: { skills: SkillId[]; left: number } | null;
  log: LogEntry[];
  celebration: Celebration | null;
}
