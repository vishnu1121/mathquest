// Classes and saved progress. Each class keeps its own chapters, stars, learning records and checkpoints;
// coins, badges, cosmetics and the camp are shared; bonus-game records stay per class. Switching class swaps the
// per-class fields in and out of the save, so every existing game keeps reading the same top-level fields.
import { z } from "zod";

export const GRADE_IDS = ["K", "1", "2", "3", "4", "5"] as const;
export type GradeId = (typeof GRADE_IDS)[number];
export const isGrade = (value: unknown): value is GradeId => typeof value === "string" && (GRADE_IDS as readonly string[]).includes(value);

/** Save fields that belong to one class. */
// `apex` belongs here rather than at the top level: Apex Mode is unlocked by finishing one class's island,
// so its quests and its gems are that class's. A Grade 5 child must not inherit the Grade 3 treasure.
export const CLASS_FIELDS = ["chapters", "stars", "learning", "curriculum", "voyage", "dreamProgress", "facts", "choice", "classWork", "classRuns", "minis", "best", "playRecords", "flight", "orchestra", "storyShelf", "storyLevel", "apex"] as const;
/** Fields inside `voyage` that stay shared across classes: the camp you decorated and keepsakes you found. */
const SHARED_VOYAGE = ["camp", "keepsakes"] as const;

type Save = Record<string, unknown>;
const isObject = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === "object" && !Array.isArray(v);

/** The level id each existing story chapter now belongs to, by class. */
export const CLASSIC_HOME: Record<string, GradeId> = {
  fireflies: "K",
  frog: "1",
  guardian: "2",
  skyrail: "2",
  robotworks: "3",
  garden: "3",
  water: "3",
  cloudbridge: "4",
};

function emptyClass(): Save {
  return { chapters: {}, stars: {}, facts: { frog: [], fireflies: [], guardian: [] }, choice: null, classWork: { skills: {} }, classRuns: {} };
}

function snapshot(save: Save): Save {
  const out: Save = {};
  for (const field of CLASS_FIELDS) if (save[field] !== undefined) out[field] = structuredClone(save[field]);
  return out;
}

/**
 * Switches the active class. The current class's fields are stored under `classes[current]`, and the next
 * class's stored fields (or a fresh start) become the top-level fields. Shared data is untouched.
 */
export function switchClass(save: Save, next: GradeId): Save {
  const out: Save = { ...save };
  const classes: Record<string, Save> = isObject(save.classes) ? { ...(save.classes as Record<string, Save>) } : {};
  const current = isGrade(save.grade) ? save.grade : null;
  if (current === next) return out;
  if (current) classes[current] = snapshot(save);
  const incoming = isObject(classes[next]) ? classes[next]! : emptyClass();
  const sharedVoyage = isObject(save.voyage) ? Object.fromEntries(SHARED_VOYAGE.filter((k) => (save.voyage as Save)[k] !== undefined).map((k) => [k, (save.voyage as Save)[k]])) : {};
  for (const field of CLASS_FIELDS) {
    if (incoming[field] === undefined) delete out[field];
    else out[field] = structuredClone(incoming[field]);
  }
  if (Object.keys(sharedVoyage).length) out.voyage = { ...(isObject(out.voyage) ? out.voyage : { version: 1 }), ...sharedVoyage };
  delete classes[next];
  out.classes = classes;
  out.grade = next;
  return out;
}

/**
 * The first time a save from before classes picks a class: chapters and stars earned in the old single story
 * move to the class each chapter now belongs to, and everything else stays with the chosen class.
 */
export function assignFirstClass(save: Save, grade: GradeId): Save {
  if (isGrade(save.grade)) return switchClass(save, grade);
  const chapters = isObject(save.chapters) ? (save.chapters as Record<string, unknown>) : {};
  const stars = isObject(save.stars) ? (save.stars as Record<string, unknown>) : {};
  const classes: Record<string, Save> = {};
  const keepChapters: Record<string, unknown> = {}, keepStars: Record<string, unknown> = {};
  for (const [id, done] of Object.entries(chapters)) {
    const home = CLASSIC_HOME[id];
    if (!home || home === grade) { keepChapters[id] = done; if (stars[id] !== undefined) keepStars[id] = stars[id]; continue; }
    const target = (classes[home] ??= emptyClass());
    (target.chapters as Record<string, unknown>)[id] = done;
    if (stars[id] !== undefined) (target.stars as Record<string, unknown>)[id] = stars[id];
  }
  return { ...save, chapters: keepChapters, stars: keepStars, classes, grade };
}

// ---------- Evidence from class chapters and practice ----------

const attempt = z.object({ correct: z.boolean(), independent: z.boolean() });
const skillState = z.object({ attempts: z.number().int().min(0).max(1_000_000), recent: z.array(attempt).max(8) });
const classWorkSchema = z.object({ skills: z.record(z.string().max(40), skillState) });
export type ClassWork = z.infer<typeof classWorkSchema>;

export function restoreClassWork(raw: unknown): ClassWork {
  const parsed = classWorkSchema.safeParse(raw);
  if (!parsed.success) return { skills: {} };
  return parsed.data;
}

/** One answer attempt. Independent means right on the first try with no hint, retry or "show me". */
export function recordClassWork(work: ClassWork, skill: string, correct: boolean, independent: boolean): ClassWork {
  const prev = work.skills[skill] ?? { attempts: 0, recent: [] };
  return { skills: { ...work.skills, [skill]: { attempts: prev.attempts + 1, recent: [...prev.recent, { correct, independent: correct && independent }].slice(-8) } } };
}

// ---------- Chapter checkpoints ----------

const runSchema = z.object({ seed: z.number().int().min(0).max(0xffffffff), round: z.number().int().min(0).max(5), independent: z.number().int().min(0).max(5), supported: z.boolean().default(false) });
export type ClassRun = z.infer<typeof runSchema>;
export function restoreRun(raw: unknown): ClassRun | null {
  const parsed = runSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}
