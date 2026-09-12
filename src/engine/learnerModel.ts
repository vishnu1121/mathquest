// The learner model: per-skill evidence of what the child can do on their own.
// Mastery needs repeated, independent success across different kinds of problems (spec §21).
import { SKILL_ORDER } from "./skills";
import type { Format, Grade, HintLevel, Level, MisconceptionId, SkillId } from "./types";

export interface Observation {
  skill: SkillId;
  level: Level;
  format: Format;
  correct: boolean;
  /** 1 for the first try at this challenge. */
  attempt: number;
  /** Highest hint level shown before this answer; 0 means no hint. */
  hintLevel: HintLevel;
  responseMs: number;
  misconception: MisconceptionId | null;
  /** A too-fast wrong answer. Ignored as evidence. */
  guess: boolean;
  at: number;
}

export interface RecentResult {
  correct: boolean;
  independent: boolean;
  format: Format;
  level: Level;
  misconception: MisconceptionId | null;
}

export interface SkillState {
  /** Estimated mastery from 0 to 1. */
  mastery: number;
  /** Progress from answers solved without help (warm-up answers count). Hinted answers leave it unchanged. */
  soloMastery: number;
  /** Best mastery reached. The bridge follows these peaks, so it never takes a plank away. */
  peakMastery: number;
  peakSolo: number;
  /** Observations that counted as evidence. */
  evidence: number;
  level: Level;
  /** Newest last. */
  recent: RecentResult[];
  /** Formats solved correctly on the first try with no hint. */
  independentFormats: Format[];
  hintedCorrect: number;
  guesses: number;
  misconceptions: Partial<Record<MisconceptionId, number>>;
  mastered: boolean;
  masteredAt: number | null;
  lastPracticedAt: number | null;
}

export interface LearnerModel {
  version: 1;
  grade: Grade;
  skills: Record<SkillId, SkillState>;
}

export const MASTERY_RULES = {
  /** Weight of the newest observation in the running mastery estimate. */
  alpha: 0.25,
  /** Solo progress reacts a little faster, so one answer solved alone can firm up a wobbly plank. */
  soloAlpha: 0.35,
  threshold: 0.8,
  /** Once mastered, a skill is only lost if mastery falls below this. */
  keepThreshold: 0.6,
  minEvidence: 6,
  minIndependentFormats: 3,
  /** At least one independent success must be in a format that shows transfer. */
  transferFormats: ["visual", "wordProblem", "pipPuzzle"] as readonly Format[],
  recentWindow: 8,
} as const;

export function createSkillState(level: Level = 1): SkillState {
  return {
    mastery: 0,
    soloMastery: 0,
    peakMastery: 0,
    peakSolo: 0,
    evidence: 0,
    level,
    recent: [],
    independentFormats: [],
    hintedCorrect: 0,
    guesses: 0,
    misconceptions: {},
    mastered: false,
    masteredAt: null,
    lastPracticedAt: null,
  };
}

export function createLearnerModel(grade: Grade): LearnerModel {
  const skills = Object.fromEntries(SKILL_ORDER.map((id) => [id, createSkillState()])) as Record<SkillId, SkillState>;
  return { version: 1, grade, skills };
}

const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));

export const isIndependent = (o: Pick<Observation, "correct" | "hintLevel" | "attempt" | "guess">): boolean =>
  o.correct && o.hintLevel === 0 && o.attempt <= 1 && !o.guess;

/** Evidence weight of one answer, or null when it should not count at all. */
export function scoreObservation(o: Observation): number | null {
  if (o.guess) return null;
  if (!o.correct) return 0;
  if (o.hintLevel > 0) return Math.max(0.2, 0.6 - 0.1 * o.hintLevel);
  return o.attempt <= 1 ? 1 : 0.7;
}

export function meetsMastery(state: SkillState): boolean {
  const { threshold, minEvidence, minIndependentFormats, transferFormats } = MASTERY_RULES;
  const recentIndependent = state.recent.slice(-3).filter((r) => r.independent).length;
  return (
    state.mastery >= threshold &&
    state.evidence >= minEvidence &&
    state.independentFormats.length >= minIndependentFormats &&
    state.independentFormats.some((f) => transferFormats.includes(f)) &&
    recentIndependent >= 2
  );
}

function withSkill(model: LearnerModel, skill: SkillId, state: SkillState): LearnerModel {
  return { ...model, skills: { ...model.skills, [skill]: state } };
}

export function recordObservation(model: LearnerModel, o: Observation): LearnerModel {
  const prev = model.skills[o.skill];
  const score = scoreObservation(o);
  if (score === null) {
    return withSkill(model, o.skill, { ...prev, guesses: prev.guesses + 1, lastPracticedAt: o.at });
  }

  const independent = isIndependent(o);
  const mastery = clamp01(prev.mastery + MASTERY_RULES.alpha * (score - prev.mastery));
  const soloScore = independent ? 1 : o.correct ? null : 0;
  const soloMastery =
    soloScore === null ? prev.soloMastery : clamp01(prev.soloMastery + MASTERY_RULES.soloAlpha * (soloScore - prev.soloMastery));
  const next: SkillState = {
    ...prev,
    mastery,
    soloMastery,
    peakMastery: Math.max(prev.peakMastery, mastery),
    peakSolo: Math.max(prev.peakSolo, soloMastery),
    evidence: prev.evidence + 1,
    recent: [
      ...prev.recent,
      { correct: o.correct, independent, format: o.format, level: o.level, misconception: o.misconception },
    ].slice(-MASTERY_RULES.recentWindow),
    independentFormats:
      independent && !prev.independentFormats.includes(o.format)
        ? [...prev.independentFormats, o.format]
        : prev.independentFormats,
    hintedCorrect: prev.hintedCorrect + (o.correct && o.hintLevel > 0 ? 1 : 0),
    misconceptions: o.misconception
      ? { ...prev.misconceptions, [o.misconception]: (prev.misconceptions[o.misconception] ?? 0) + 1 }
      : prev.misconceptions,
    lastPracticedAt: o.at,
  };

  const mastered = prev.mastered ? mastery >= MASTERY_RULES.keepThreshold : meetsMastery(next);
  return withSkill(model, o.skill, { ...next, mastered, masteredAt: mastered ? (prev.masteredAt ?? o.at) : null });
}

export function setSkillLevel(model: LearnerModel, skill: SkillId, level: Level): LearnerModel {
  return withSkill(model, skill, { ...model.skills[skill], level });
}

/** A starting estimate from warm-up answers, which the child solved without help. */
export function withPrior(state: SkillState, mastery: number, level: Level): SkillState {
  return { ...state, mastery, level, soloMastery: mastery, peakMastery: mastery, peakSolo: mastery };
}

/** 0 to 5 stars for the child. Only a mastered skill can show more than 3. */
export function starsFor(state: SkillState): number {
  if (state.mastered) return state.mastery >= 0.9 ? 5 : 4;
  return Math.min(3, Math.floor(state.mastery / 0.25));
}
