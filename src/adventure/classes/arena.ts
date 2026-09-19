import { createRng } from "../../engine/rng";
import { expectedScore, updateRating } from "../elo";
import { CLASSES, chapterTask, type EngineChapter } from "./catalog";
import type { GradeId } from "./progress";

export interface ClassArenaSession { version: 1; grade: GradeId; rating: number; encounters: number; recent: string[] }
export const ARENA_NAMES: Record<GradeId, { title: string; friend: string; description: string }> = {
  K: { title: "Little Muddle Meadow", friend: "The mixed-up puffling", description: "Help a little puffling count, fill homes and find shapes. Touch pictures. Take all the time you need." },
  1: { title: "River Rescue Arena", friend: "The wobbly bridge keeper", description: "Balance numbers, build tens and ones, and set the river clocks." },
  2: { title: "Whistlewood Repair Crew", friend: "The muddled station keeper", description: "Restore arrays, place-value blocks, rulers, coins and clocks." },
  3: { title: "Tinker’s Power Trials", friend: "The scrambled gear golem", description: "Power equal groups, repair fraction windows and plan measurements." },
  4: { title: "Crystal Logic Arena", friend: "The crystal shapeshifter", description: "Untangle factors, mixed numbers, multi-digit work and angles." },
  5: { title: "Star Harbor Command", friend: "The lost signal keeper", description: "Navigate coordinates, decimal cargo, fraction scaling and expressions." },
};
export function restoreClassArena(grade: GradeId, raw?: unknown): ClassArenaSession {
  const fresh: ClassArenaSession = { version: 1, grade, rating: 1000, encounters: 0, recent: [] };
  if (!raw || typeof raw !== "object") return fresh;
  const s = raw as Partial<ClassArenaSession>;
  if (s.version !== 1 || s.grade !== grade || !Number.isFinite(s.rating) || s.rating! < 400 || s.rating! > 2000 || !Number.isInteger(s.encounters) || s.encounters! < 0 || !Array.isArray(s.recent)) return fresh;
  return { ...fresh, rating: Math.round(s.rating!), encounters: s.encounters!, recent: s.recent.filter((id) => typeof id === "string" && CLASSES[grade].chapters.some((c) => c.id === id)).slice(-5) };
}
/** Ratings choose challenge rounds only inside this grade; no rating can cross a grade boundary. */
export function classArenaTask(grade: GradeId, seed: number, session: ClassArenaSession) {
  const rng = createRng((seed + session.encounters * 104729) >>> 0);
  const chapters = CLASSES[grade].chapters.filter((c): c is EngineChapter => c.kind === "engine");
  const eligible = chapters.filter((c) => c.id !== session.recent.at(-1));
  const chapter = rng.pick(eligible.length ? eligible : chapters);
  const round = Math.max(0, Math.min(4, Math.floor((session.rating - 800) / 100)));
  const taskSeed = rng.int(0, 0xffffff), rating = 800 + round * 100;
  return { task: chapterTask(chapter, taskSeed, round), chapter: chapter.id, seed: taskSeed, round, rating, expected: expectedScore(session.rating, rating) };
}
export function recordClassArena(session: ClassArenaSession, chapter: string, rating: number, correct: boolean): ClassArenaSession {
  return { ...session, rating: updateRating(session.rating, rating, correct), encounters: session.encounters + 1, recent: [...session.recent, chapter].slice(-5) };
}
