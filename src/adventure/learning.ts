import { z } from "zod";
import { createSession, planNext } from "../engine/adaptive";
import { generateOperands } from "../engine/generators";
import { createLearnerModel, recordObservation, setSkillLevel, type LearnerModel, type Observation } from "../engine/learnerModel";
import type { Rng } from "../engine/rng";
import { clampLevel, SKILL_ORDER, SKILLS } from "../engine/skills";
import { FORMATS, MISCONCEPTION_IDS, type Level, type SkillId } from "../engine/types";

const probability = z.number().min(0).max(1);
const counter = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const levelSchema = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);
const skillSchema = z.object({
  mastery: probability, soloMastery: probability, peakMastery: probability, peakSolo: probability,
  evidence: counter, level: levelSchema,
  recent: z.array(z.object({ correct: z.boolean(), independent: z.boolean(), format: z.enum(FORMATS), level: levelSchema, misconception: z.enum(MISCONCEPTION_IDS).nullable() })).max(8),
  independentFormats: z.array(z.enum(FORMATS)).max(FORMATS.length),
  hintedCorrect: counter, guesses: counter,
  misconceptions: z.partialRecord(z.enum(MISCONCEPTION_IDS), counter),
  mastered: z.boolean(), masteredAt: counter.nullable(), lastPracticedAt: counter.nullable(),
});
const modelSchema = z.object({
  version: z.literal(1), grade: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  skills: z.object({ simple: skillSchema, twoDigit: skillSchema, regroup: skillSchema, wordProblems: skillSchema }),
});

export function freshAdventureModel(): LearnerModel {
  // The engine's grade field is unused here. No grade or age is collected or inferred.
  let model = createLearnerModel(0);
  for (const skill of SKILL_ORDER) model = setSkillLevel(model, skill, skill === "simple" ? 2 : 3);
  return model;
}

/** Old saves have no learning field. Damaged learning data must not break the saved adventure. */
export function restoreAdventureModel(raw: unknown): LearnerModel {
  const result = modelSchema.safeParse(raw);
  return result.success ? result.data : freshAdventureModel();
}

export type AdventureEvidence = Pick<Observation, "skill" | "level" | "format" | "correct" | "attempt" | "hintLevel">;
export function observeAdventure(model: LearnerModel, evidence: AdventureEvidence, at: number): LearnerModel {
  return recordObservation(model, { ...evidence, at, responseMs: 0, guess: false, misconception: null });
}

/** Use the existing tutor policy within a chapter's skill, keeping the adventure's interaction. */
export function adventurePlan(model: LearnerModel, skill: SkillId, maxLevel: Level = 3) {
  const session = { ...createSession(), focus: skill, lastSkill: skill };
  const plan = planNext(model, session);
  // A mastered focus can make the general policy choose another skill. A chapter cannot
  // change its math interaction, so keep its own level in that case.
  const requestedLevel = plan.skill === skill ? plan.level : model.skills[skill].level;
  const level = clampLevel(skill, Math.min(requestedLevel, maxLevel));
  const kind = plan.skill !== skill || (plan.kind === "stepUp" && level <= model.skills[skill].level) ? "practice" : plan.kind;
  return { kind, level, model: setSkillLevel(model, skill, level) };
}

export function describeLearning(model: LearnerModel) {
  return SKILL_ORDER.map((id) => {
    const state = model.skills[id];
    const independent = state.recent.filter((r) => r.independent).length;
    const supported = state.recent.filter((r) => r.correct && !r.independent).length;
    const plan = adventurePlan(model, id);
    return {
      id, name: SKILLS[id].kidName, evidence: state.evidence, independent, supported,
      recent: state.recent.length,
      status: !state.evidence ? "Not explored yet" : independent >= 3 ? "Building independence" : "Practicing",
      next: plan.kind === "stepDown" || plan.kind === "scaffold" ? "Simpler addition and visual support" : plan.kind === "stepUp" ? "Ready to explore more challenging numbers" : "More practice with these numbers",
    };
  });
}

export function additionSkill(a: number, b: number): { skill: SkillId; level: Level } {
  if (a + b <= 20) return { skill: "simple", level: a + b <= 10 ? 2 : 3 };
  if (a % 10 + b % 10 >= 10) return { skill: "regroup", level: a < 10 || b < 10 ? 1 : 3 };
  return { skill: "twoDigit", level: a < 10 || b < 10 ? 1 : a % 10 === 0 || b % 10 === 0 ? 2 : 3 };
}

export interface NumberShield { target: number; hand: number[]; skill: SkillId; level: Level }
export function makeNumberShield(level: Level, rng: Rng): NumberShield {
  const bounded = Math.min(level, 3) as Level;
  const { a, b } = generateOperands("regroup", bounded, rng);
  const target = a + b;
  const hand = [a, b];
  // Keep the intended regrouping solution: distractors must not form an easier bypass pair.
  for (const n of rng.shuffle(Array.from({ length: Math.min(99, target - 1) }, (_, i) => i + 1))) {
    if (!hand.includes(n) && !hand.some((m) => m + n === target)) hand.push(n);
    if (hand.length === 5) break;
  }
  return { target, hand: rng.shuffle(hand), skill: "regroup", level: bounded };
}
