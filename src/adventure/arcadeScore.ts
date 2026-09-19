/** Arcade scoring for the adventure's games. Points reward correct thinking and runs of it, never speed:
 * a streak counts consecutive successes, and a miss only resets the streak. No time input exists here. */

export interface StreakRule {
  /** Successes needed to raise the multiplier by one. */
  step: number;
  /** Streak length that turns on power mode, which doubles points. */
  power: number;
  /** Highest multiplier before power mode. */
  cap: number;
}

export const MAX_SCORE = 9_999_999;

const RULES: Record<string, StreakRule> = {
  // Hops are small steps, so the river needs more of them for each multiplier step.
  frog: { step: 4, power: 8, cap: 5 },
  fireflies: { step: 1, power: 3, cap: 5 },
  guardian: { step: 1, power: 3, cap: 5 },
};
const DEFAULT_RULE: StreakRule = { step: 1, power: 3, cap: 5 };

export function ruleFor(id: string): StreakRule {
  return RULES[id] ?? DEFAULT_RULE;
}

export function nextStreak(streak: number, correct: boolean): number {
  return correct ? Math.max(0, Math.floor(streak)) + 1 : 0;
}

export function multiplier(streak: number, rule: StreakRule): number {
  if (streak < 1) return 1;
  return Math.min(rule.cap, 1 + Math.floor((streak - 1) / rule.step));
}

export function inPowerMode(streak: number, rule: StreakRule): boolean {
  return streak >= rule.power;
}

/** Fill of the power meter, from 0 to 1. */
export function powerFill(streak: number, rule: StreakRule): number {
  return Math.max(0, Math.min(1, streak / rule.power));
}

export function award(base: number, streak: number, rule: StreakRule) {
  const mult = multiplier(streak, rule);
  const power = inPowerMode(streak, rule);
  const points = Math.min(MAX_SCORE, Math.max(0, Math.round(base * mult * (power ? 2 : 1))));
  return { points, mult, power };
}

export interface Cheer {
  word: string;
  tier: 1 | 2 | 3;
}

export function praise(streak: number): Cheer | null {
  if (streak < 2) return null;
  if (streak === 2) return { word: "Nice!", tier: 1 };
  if (streak === 3) return { word: "Great!", tier: 2 };
  if (streak === 4) return { word: "Awesome!", tier: 2 };
  if (streak === 5) return { word: "Amazing!", tier: 3 };
  return { word: "Unstoppable!", tier: 3 };
}

const LEVEL_ID = /^[a-z][a-z0-9-]{0,39}$/;

/** Saved best scores come from browser storage; anything malformed is dropped, never trusted. */
export function restoreBest(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const best: Record<string, number> = {};
  for (const [id, value] of Object.entries(raw)) {
    if (!LEVEL_ID.test(id) || typeof value !== "number" || !Number.isFinite(value) || value <= 0) continue;
    best[id] = Math.min(MAX_SCORE, Math.floor(value));
  }
  return best;
}

export function recordBest(best: Record<string, number>, id: string, score: number) {
  const previous = best[id] ?? 0;
  const clean = Number.isFinite(score) ? Math.min(MAX_SCORE, Math.max(0, Math.floor(score))) : 0;
  const newBest = clean > previous;
  return { best: newBest ? { ...best, [id]: clean } : { ...best }, previous, newBest };
}

export function formatScore(score: number): string {
  const clean = Number.isFinite(score) ? Math.min(MAX_SCORE, Math.max(0, Math.floor(score))) : 0;
  return clean.toLocaleString("en-US");
}
