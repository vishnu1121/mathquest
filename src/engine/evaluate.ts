import { detectMisconception } from "./misconceptions";
import type { Challenge, MisconceptionId } from "./types";

export interface Evaluation {
  correct: boolean;
  /** The parsed answer, or null when the input was not a whole number. */
  value: number | null;
  misconception: MisconceptionId | null;
}

/** Wrong answers faster than this could not have been worked out, so they don't count as evidence. */
export const GUESS_WINDOW_MS = 1500;

/** Accepts whole numbers from the number pad, up to 4 digits. */
export function parseAnswer(raw: string): number | null {
  const trimmed = raw.trim();
  return /^\d{1,4}$/.test(trimmed) ? Number(trimmed) : null;
}

export function evaluateAnswer(challenge: Challenge, input: string | number): Evaluation {
  const value =
    typeof input === "number" ? (Number.isInteger(input) && input >= 0 ? input : null) : parseAnswer(input);
  if (value === null) return { correct: false, value: null, misconception: null };

  const correct = value === challenge.answer;
  return { correct, value, misconception: correct ? null : detectMisconception(challenge, value) };
}

export function isLikelyGuess(correct: boolean, responseMs: number): boolean {
  return !correct && responseMs < GUESS_WINDOW_MS;
}
