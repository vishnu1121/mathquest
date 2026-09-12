// Core engine types. The engine is pure TypeScript: no React, no network, no AI.

export const SKILL_IDS = ["simple", "twoDigit", "regroup", "wordProblems"] as const;
export type SkillId = (typeof SKILL_IDS)[number];

export const FORMATS = [
  "equation",
  "multipleChoice",
  "visual",
  "missingAddend",
  "wordProblem",
  "pipPuzzle",
] as const;
export type Format = (typeof FORMATS)[number];

/** 0 means kindergarten. */
export type Grade = 0 | 1 | 2 | 3 | 4 | 5;
export type Level = 1 | 2 | 3 | 4;
export type HintLevel = 0 | 1 | 2 | 3 | 4 | 5;

export const MISCONCEPTION_IDS = [
  "columnConcat",
  "droppedCarry",
  "extraTen",
  "placeValueShift",
  "digitSum",
  "subtracted",
  "addedInsteadOfFinding",
  "gaveTotal",
  "offByOne",
] as const;
export type MisconceptionId = (typeof MISCONCEPTION_IDS)[number];

export interface Operands {
  a: number;
  b: number;
}

export type StoryKind = "addTo" | "putTogether" | "changeUnknown";

/** What the child loves; story problems are themed around it. */
export const STORY_THEMES = ["forest", "dinosaurs", "space", "sports", "animals"] as const;
export type StoryTheme = (typeof STORY_THEMES)[number];

export interface Story {
  kind: StoryKind;
  text: string;
  source: "template" | "ai";
}

export interface Challenge {
  id: string;
  skill: SkillId;
  level: Level;
  format: Format;
  a: number;
  b: number;
  /** Always a + b. */
  total: number;
  /** Which number the child must find. */
  unknown: "total" | "addend";
  /** The number the child must enter or pick. */
  answer: number;
  choices?: readonly number[];
  story?: Story;
}
