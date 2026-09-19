// Apex Mode: the same island, the same eight quests, at the hardest this grade goes.
//
// Three rules shape everything here.
//
// It is not another grade. A Grade 3 child in Apex is a Grade 3 child doing the hardest Grade 3 thinking:
// two steps instead of one, the unknown in the middle, working backwards, deciding which operation is
// even needed. The difficulty budget is spent on reasoning, not on longer numbers.
//
// It is only for Grades 3, 4 and 5, and only after the whole island is finished. Younger classes never see
// it — not locked, not greyed out, absent.
//
// And it is a treasure hunt. Rare gems are hidden behind the Apex quests; some need a really good run, one
// or two quests hold nothing at all, and finishing every quest opens the island's last secret. None of the
// rarity is random: it is computed from how the child actually played, so it can be earned by going back.
import { createRng } from "../../engine/rng";
import { z } from "zod";
import { CLASSES, chapterTask, type Chapter, type EngineChapter } from "./catalog";
import type { Task } from "./tasks";

/** Apex exists for these classes only. K, 1 and 2 must never be offered it. */
export const APEX_GRADES = ["3", "4", "5"] as const;
export type ApexGrade = (typeof APEX_GRADES)[number];
export const isApexGrade = (grade: unknown): grade is ApexGrade => typeof grade === "string" && (APEX_GRADES as readonly string[]).includes(grade);

/** Five questions, like every other quest — and no more, because a saved checkpoint only stores 0..5. */
export const APEX_ROUNDS = 5;

/** The level id for an Apex quest. Deliberately outside the catalog so nothing that counts chapters sees it. */
export const apexLevelId = (chapterId: string): string => `apex-${chapterId}`;

// ---------- Unlocking ----------

/**
 * Apex opens when every chapter of this class is finished. `chapters` is the save's own completed map, so a
 * child who finished the island in an older save unlocks it the moment they arrive.
 */
export function apexUnlocked(grade: unknown, chapters: Record<string, unknown> | undefined): boolean {
  if (!isApexGrade(grade)) return false;
  const list = CLASSES[grade].chapters;
  return list.length > 0 && list.every((chapter) => Boolean(chapters?.[chapter.id]));
}

/** How much of the island is done, for the "3 of 8 chapters to go" line on the locked card. */
export function chaptersLeft(grade: unknown, chapters: Record<string, unknown> | undefined): number {
  if (!isApexGrade(grade)) return 0;
  return CLASSES[grade].chapters.filter((chapter) => !chapters?.[chapter.id]).length;
}

// ---------- The gems ----------

export type GemTier = "common" | "rare" | "epic" | "ultimate";

export interface Gem {
  id: string;
  name: string;
  /** The real mineral or element behind the name, for the one-line fact on the card. */
  element: string;
  fact: string;
  emoji: string;
  tier: GemTier;
  /** Which Apex quest hides it, or 0 for the final treasure. */
  slot: number;
  /** First-try answers needed, out of five. Never shown before it is found. */
  needs: number;
}

/**
 * Seven gems across eight quests. Quest 4 hides nothing at all, and the rare and epic gems need a run good
 * enough that most children will not take them on the first pass — which is the point. A gem that arrives
 * for turning up is a participation sticker, and children can tell.
 */
export const GEMS: readonly Gem[] = [
  { id: "luna", name: "Luna Gem", element: "Lanthanum", fact: "Named after lanthanum. Its name means “hidden”.", emoji: "🌙", tier: "common", slot: 1, needs: 0 },
  { id: "cerium", name: "Cerium Sun Gem", element: "Cerium", fact: "Named after cerium, which sparks like a tiny sun.", emoji: "🔆", tier: "rare", slot: 2, needs: 3 },
  { id: "prism", name: "Prism Gem", element: "Praseodymium", fact: "Named after praseodymium, which turns glass green.", emoji: "🔷", tier: "common", slot: 3, needs: 0 },
  { id: "terra", name: "Terra Spark Gem", element: "Terbium", fact: "Named after terbium, which helps screens glow.", emoji: "🟩", tier: "rare", slot: 5, needs: 3 },
  { id: "yttrium", name: "Yttrium Crystal", element: "Yttrium", fact: "Named after yttrium, which makes screen red bright.", emoji: "❤️‍🔥", tier: "common", slot: 6, needs: 0 },
  { id: "europium", name: "Europium Glow Gem", element: "Europium", fact: "Named after europium, which glows under special light.", emoji: "💠", tier: "epic", slot: 7, needs: 4 },
  { id: "neostar", name: "Neo Star Gem", element: "Neodymium", fact: "Named after neodymium, used in the strongest magnets.", emoji: "⭐", tier: "epic", slot: 8, needs: 4 },
];

/** The last one. It is not hidden in a quest: it is what the island gives up when every quest is done. */
export const NOVA: Gem = { id: "nova", name: "The Nova Gem", element: "", fact: "The rarest treasure hidden on the island.", emoji: "🌟", tier: "ultimate", slot: 0, needs: 0 };

export const ALL_GEMS: readonly Gem[] = [...GEMS, NOVA];
export const gemById = (id: string): Gem | undefined => ALL_GEMS.find((gem) => gem.id === id);
export const gemForSlot = (slot: number): Gem | undefined => GEMS.find((gem) => gem.slot === slot);

/** Whether this run was good enough to turn up what that quest was hiding. */
export const gemEarnedBy = (gem: Gem, independent: number): boolean => independent >= gem.needs;

// ---------- Saved Apex progress ----------

const questRecord = z.object({
  stars: z.number().int().min(0).max(3),
  independent: z.number().int().min(0).max(APEX_ROUNDS),
  plays: z.number().int().min(0).max(100_000),
});
const apexSchema = z.object({
  version: z.literal(1),
  quests: z.record(z.string().max(40), questRecord),
  gems: z.array(z.string().max(30)).max(16),
  nova: z.boolean(),
});
export type ApexSave = z.infer<typeof apexSchema>;

const fresh = (): ApexSave => ({ version: 1, quests: {}, gems: [], nova: false });

/**
 * Apex progress belongs to one class (it is in CLASS_FIELDS), and switchClass deletes a field the incoming
 * class has never written — so this is routinely handed `undefined` and must simply start over.
 */
export function restoreApex(raw: unknown): ApexSave {
  const parsed = apexSchema.safeParse(raw);
  if (!parsed.success) return fresh();
  return { ...parsed.data, gems: [...new Set(parsed.data.gems.filter((id) => Boolean(gemById(id)) && id !== NOVA.id))] };
}

export const starsFor = (independent: number): number => (independent >= 4 ? 3 : independent >= 2 ? 2 : 1);

export interface ApexOutcome {
  save: ApexSave;
  /** A gem turned up by this run, if this quest was hiding one and the run was good enough. */
  found: Gem | null;
  /** Set on the run that finishes the last quest: the island's own treasure. */
  nova: Gem | null;
  /** A gem this quest hides that this run did not earn — the reason to come back, never named to the child. */
  missed: Gem | null;
}

/**
 * Records one finished Apex quest and decides what it turned up. Pure, so the whole treasure rule is
 * testable without a browser: the same run always yields the same gems.
 */
export function recordApexQuest(previous: ApexSave, grade: ApexGrade, slot: number, independent: number): ApexOutcome {
  const quests = CLASSES[grade].chapters;
  const chapter = quests[slot - 1];
  if (!chapter) return { save: previous, found: null, nova: null, missed: null };

  const id = apexLevelId(chapter.id);
  const stars = starsFor(independent);
  const before = previous.quests[id];
  const save: ApexSave = {
    ...previous,
    quests: {
      ...previous.quests,
      [id]: { stars: Math.max(before?.stars ?? 0, stars), independent: Math.max(before?.independent ?? 0, independent), plays: (before?.plays ?? 0) + 1 },
    },
  };

  const gem = gemForSlot(slot) ?? null;
  const already = gem ? previous.gems.includes(gem.id) : false;
  const earned = gem && !already && gemEarnedBy(gem, independent);
  if (earned) save.gems = [...save.gems, gem.id];

  // The island's own treasure waits until every quest is finished, however well each one went.
  const everyQuestDone = quests.every((c) => Boolean(save.quests[apexLevelId(c.id)]));
  const nova = everyQuestDone && !previous.nova ? NOVA : null;
  if (nova) save.nova = true;

  return { save, found: earned ? gem : null, nova, missed: gem && !already && !earned ? gem : null };
}

export const apexQuestsDone = (save: ApexSave, grade: ApexGrade): number => CLASSES[grade].chapters.filter((c) => Boolean(save.quests[apexLevelId(c.id)])).length;
export const gemsFound = (save: ApexSave): number => save.gems.length + (save.nova ? 1 : 0);

// ---------- The quests ----------

export interface ApexQuest {
  id: string;
  slot: number;
  chapterId: string;
  title: string;
  place: string;
  emoji: string;
  quest: string;
  skills: string;
  chapter: Chapter;
}

/** The eight Apex quests: the class's own eight chapters, in the same order, with the same topics. */
export function apexQuests(grade: ApexGrade): ApexQuest[] {
  return CLASSES[grade].chapters.map((chapter, i) => ({
    id: apexLevelId(chapter.id),
    slot: i + 1,
    chapterId: chapter.id,
    title: chapter.title,
    place: chapter.place,
    emoji: chapter.emoji,
    quest: chapter.quest,
    skills: chapter.skills,
    chapter,
  }));
}

/** An Apex quest opens when the one before it is done. The first opens as soon as Apex itself does. */
export function apexQuestOpen(save: ApexSave, grade: ApexGrade, slot: number): boolean {
  if (slot <= 1) return true;
  const previousChapter = CLASSES[grade].chapters[slot - 2];
  return Boolean(previousChapter && save.quests[apexLevelId(previousChapter.id)]);
}

/**
 * Which rounds may reach one grade up.
 *
 * The owner asked for 5-15% stretch questions, and asking a model to hit a percentage is how you end up
 * with 40%. So the ratio is decided here, by position, and the model is only ever told which mode the one
 * question in front of it is in. Grades 3 and 4 get 4 of their 40 rounds (10%); Grade 5 gets 3 (7.5%),
 * because one grade up from Grade 5 is middle school and that edge deserves more care.
 */
export function isStretchRound(grade: ApexGrade, slot: number, round: number): boolean {
  const index = (slot - 1) * APEX_ROUNDS + round;
  return grade === "5" ? index % 13 === 6 : index % 9 === 4;
}

const isEngine = (chapter: Chapter): chapter is EngineChapter => chapter.kind === "engine";

/**
 * The built-in question for an Apex round — what plays when no question writer is configured or both
 * refuse. Apex must be playable with the AI switched off, so this is a real fallback and not a stub.
 *
 * It is harder than the normal chapter in the two ways the bank allows: it always draws that chapter's
 * hardest generators rather than its gentlest, and the last two rounds bring in a different chapter from
 * the same class, so the quest ends by combining topics instead of repeating one.
 */
export function apexTask(grade: ApexGrade, slot: number, seed: number, round: number): Task {
  const rng = createRng((seed + slot * 0x9e3779b1 + round * 40_503) >>> 0);
  const list = CLASSES[grade].chapters;
  const own = list[slot - 1];
  const engines = list.filter(isEngine);
  const mine = own && isEngine(own) ? own : rng.pick(engines);
  // Rounds 4 and 5 combine: a different topic from the same class, at its hardest.
  const others = engines.filter((c) => c.id !== mine.id);
  const chapter = round >= 3 && others.length ? rng.pick(others) : mine;
  const hardest = chapter.rounds.length - 1;
  const index = round === 1 ? Math.max(0, hardest - 1) : hardest;
  return chapterTask(chapter, rng.int(0, 0xffffff), index);
}
