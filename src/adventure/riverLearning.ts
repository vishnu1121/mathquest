import { generateOperands } from "../engine/generators";
import type { Rng } from "../engine/rng";
import type { Level } from "../engine/types";

export interface RiverEvidence {
  round: number;
  replay: boolean;
  overshoots: number;
  usedBig: boolean;
  learningLevel?: Level;
  maxTotal?: number;
}

/** Keep the first story approachable; vary replay numbers using the existing math engine.
 * Repeated overshoots offer a shorter, non-regrouping path. No timing signal is used. */
export function riverRound(evidence: RiverEvidence, rng: Rng) {
  const { round, replay, overshoots, usedBig } = evidence;
  const support = overshoots >= 2 || (round === 2 && !usedBig);
  if (round === 1 && support) return { start: 11, hop: 12, predict: false, support: true };
  if (round === 2 && support) return { start: 21, hop: 16, predict: true, support: true };
  if (!replay) {
    const paths = [{ start: 8, hop: 5 }, { start: 23, hop: 14 }, { start: 28, hop: 17 }];
    return { ...paths[round]!, predict: round === 2, support: false };
  }
  const level = evidence.learningLevel ?? 3;
  const skill = round === 0 ? "simple" : round === 1 ? "twoDigit" : "regroup";
  const { a, b } = generateOperands(skill, level, rng);
  // Keep a replay within the river's interaction budget: at most one big hop plus nine ones.
  const hop = round === 0 || level < 3 ? (skill === "twoDigit" && level === 2 ? 10 : b) : 10 + b % 10;
  const start = evidence.maxTotal ? Math.min(a, evidence.maxTotal - hop) : a;
  return { start, hop, predict: round === 2, support: false, skill, level };
}
