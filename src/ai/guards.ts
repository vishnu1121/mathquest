// Deterministic checks on everything the AI writes. If a check fails, the game shows its own
// built-in text instead. The AI never decides an answer, a score or what comes next.
import { noteUsesOnlyFactNumbers, type TutorFacts } from "@/engine/tutorNote";
import type { StoryKind } from "@/engine/types";

const words = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;
const sentences = (text: string) => (text.match(/[.!?](\s|$)/g) ?? []).length;
const numbersIn = (text: string) => (text.match(/\d+/g) ?? []).map(Number);

const LINK = /https?:|www\.|@|\.com\b/i;
const UNSAFE = /\b(kill|killed|dead|die|died|blood|gun|guns|weapon|hate|stupid|dumb|idiot|shut up|scary|monster)\b/i;
const SHAMING = /\b(wrong|incorrect|easy|obviously|failed|bad at)\b/i;
const TAKE_AWAY = /\b(left|gave away|give away|lost|lose|ate|eaten|fewer|less|minus|take away|took away|flew away|ran away|broke)\b/i;

const baseCheck = (text: string, maxWords: number) =>
  text.trim().length > 0 && words(text) <= maxWords && !LINK.test(text) && !UNSAFE.test(text);

export interface HintCase {
  a: number;
  b: number;
  total: number;
  answer: number;
  unknown: "total" | "addend";
  level: number;
  builtInHint: string;
}

/** Hoot's reworded hint: short, kind, and it must not give away more than the built-in hint. */
export function acceptHint(text: string, c: HintCase): boolean {
  if (!baseCheck(text, 30) || SHAMING.test(text) || sentences(text) > 3) return false;
  const shown = c.unknown === "total" ? [c.a, c.b] : [c.a, c.total];
  const digits = [c.a % 10, c.b % 10, Math.floor(c.a / 10), Math.floor(c.b / 10)];
  const allowed = new Set([...numbersIn(c.builtInHint), ...shown, ...digits, 1, 10]);
  const used = numbersIn(text);
  if (c.level < 5 && !shown.includes(c.answer) && used.includes(c.answer)) return false;
  return used.every((n) => allowed.has(n));
}

/** A themed story problem: exactly the game's numbers, read as addition, ending in the question. */
export function acceptStory(text: string, a: number, b: number, kind: StoryKind): boolean {
  // "Found some more" stories need one extra sentence: had some, found more, now have, how many found.
  const maxSentences = kind === "changeUnknown" ? 4 : 3;
  if (!baseCheck(text, 40) || sentences(text) > maxSentences || !text.trim().endsWith("?") || TAKE_AWAY.test(text)) return false;
  const expected = (kind === "changeUnknown" ? [a, a + b] : [a, b]).sort((x, y) => x - y);
  const used = numbersIn(text).sort((x, y) => x - y);
  return used.length === expected.length && used.every((n, i) => n === expected[i]);
}

/** The tutor note: brief, names the child, and uses no number that isn't in the facts. */
export function acceptTutorNote(note: string, facts: TutorFacts): boolean {
  return baseCheck(note, 80) && sentences(note) <= 4 && note.includes(facts.name) && noteUsesOnlyFactNumbers(note, facts);
}
