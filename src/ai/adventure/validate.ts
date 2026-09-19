// Code checks on every AI reply before it reaches a child: safe words, word caps, approved emoji,
// and only the numbers the game already knows. Anything that fails returns null and the game keeps
// its built-in text.
import { GLOWS, GUARDIANS, HOPPERS, PALETTES, type Palette, type WorldOutput } from "./schemas";

const BLOCKED = /\b(kill|kills|killing|blood|bloody|gun|guns|knife|die|dies|dead|death|hate|stupid|dumb|idiot|sexy|drug|drugs|beer|wine|war|bomb)\b/i;
const TAKE_AWAY = /\b(left|lose|lost|loses|away|eats|ate|gave|gives|fewer|less|minus)\b/i;

/** Normalises whitespace and rejects unsafe, linked, over-long or over-wordy text. */
export function cleanText(value: unknown, maxWords: number, maxChars: number): string | null {
  if (typeof value !== "string") return null;
  const t = value.replace(/\s+/g, " ").trim();
  if (!t || t.length > maxChars || BLOCKED.test(t) || /https?:|www\.|@|[<>]/i.test(t)) return null;
  return t.split(" ").length <= maxWords ? t : null;
}

export const numbersIn = (t: string): number[] => (t.match(/\d+/g) ?? []).map(Number);
export const onlyNumbers = (t: string, allowed: readonly number[]): boolean => numbersIn(t).every((n) => allowed.includes(n));
export const numbersFromLines = (lines: readonly string[]): number[] => [...new Set(lines.flatMap(numbersIn))];

/** Child text goes into prompts only inside << >>; strip anything that could break out of that. */
export const childText = (s: string, max: number): string => s.replace(/[<>{}[\]`"\\]/g, "").replace(/\s+/g, " ").trim().slice(0, max);

export interface WorldBase {
  hopper: string;
  glow: string;
  guardian: string;
  palette: Palette;
}

export interface World {
  world: string;
  hopper: string;
  hopperName: string;
  glow: string;
  glowOne: string;
  glowName: string;
  guardian: string;
  guardianName: string;
  palette: Palette;
  intro: string;
  byAI: true;
}

const pick = <T extends string>(value: string, allowed: readonly T[], fallback: T): T =>
  (allowed as readonly string[]).includes(value) ? (value as T) : fallback;

export function acceptWorld(d: WorldOutput | null, base: WorldBase): World | null {
  if (!d || d.safe !== true) return null;
  const world = cleanText(d.world, 4, 32);
  const hopperName = cleanText(d.hopperName, 2, 16);
  const glowOne = cleanText(d.glowOne, 2, 16);
  const glowName = cleanText(d.glowName, 2, 18);
  const guardianName = cleanText(d.guardianName, 3, 28);
  const intro = cleanText(d.intro, 30, 220);
  if (!world || !hopperName || !glowOne || !glowName || !guardianName || !intro) return null;
  if (/\d/.test(world + hopperName + glowOne + glowName + guardianName)) return null;
  return {
    world,
    hopperName,
    guardianName,
    intro,
    glowOne: glowOne.toLowerCase(),
    glowName: glowName.toLowerCase(),
    hopper: pick(d.hopper, HOPPERS, pick(base.hopper, HOPPERS, "🐸")),
    glow: pick(d.glow, GLOWS, pick(base.glow, GLOWS, "✨")),
    guardian: pick(d.guardian, GUARDIANS, pick(base.guardian, GUARDIANS, "🌳")),
    palette: pick(d.palette, PALETTES, base.palette),
    byAI: true,
  };
}

export function acceptHint(hint: string | undefined, allowed: readonly number[]): string | null {
  const t = cleanText(hint, 24, 180);
  return t && onlyNumbers(t, allowed) ? t : null;
}

/** A riddle must use exactly the two numbers, adding words only, and end with a question. */
export function acceptRiddle(story: string | undefined, a: number, b: number): string | null {
  const t = cleanText(story, 32, 240);
  if (!t || !t.endsWith("?") || TAKE_AWAY.test(t)) return null;
  const got = numbersIn(t).sort((x, y) => x - y).join(",");
  return got === [a, b].sort((x, y) => x - y).join(",") ? t : null;
}

export function acceptReply(reply: string | undefined, allowed: readonly number[], maxWords = 28): string | null {
  const t = cleanText(reply, maxWords, 220);
  return t && onlyNumbers(t, allowed) ? t : null;
}

export function acceptStory(story: string | undefined, allowed: readonly number[]): string | null {
  const t = cleanText(story, 50, 340);
  return t && onlyNumbers(t, allowed) ? t : null;
}

export function acceptNote(note: string | undefined, allowed: readonly number[]): string | null {
  const t = cleanText(note, 70, 480);
  return t && onlyNumbers(t, allowed) && !/\b(diagnos\w*|disorder|ADHD|dyscalculia|IQ|percentile|mastered|gifted|lazy)\b/i.test(t) ? t : null;
}

