// Small helpers shared by the task families: formatting, choice options, near-miss numbers and word-problem casts.
import type { Rng } from "../../engine/rng";
import type { Option, Visual } from "./tasks";

export const fmt = (n: number): string => n.toLocaleString("en-US");

export const EMOJI = ["🍎", "🐞", "⭐", "🐟", "🌸", "🍓", "🦋", "🐥", "🍪", "🎈"];
// Names only; word problems repeat the name instead of using pronouns.
export const NAMES = ["Mia", "Leo", "Ana", "Sam", "Kai", "Zoe", "Ravi", "Noor", "Eli", "Lina", "Omar", "June"];
export const THINGS = [
  { one: "shell", many: "shells", emoji: "🐚" },
  { one: "acorn", many: "acorns", emoji: "🌰" },
  { one: "sticker", many: "stickers", emoji: "⭐" },
  { one: "marble", many: "marbles", emoji: "🔮" },
  { one: "leaf", many: "leaves", emoji: "🍃" },
  { one: "berry", many: "berries", emoji: "🫐" },
  { one: "crayon", many: "crayons", emoji: "🖍️" },
  { one: "cookie", many: "cookies", emoji: "🍪" },
];

/** Choice options in a shuffled order and the id of the right one. Duplicate labels are dropped. */
export function choose(rng: Rng, answer: string, others: string[], visuals: Record<string, Visual> = {}): { options: Option[]; answer: string } {
  const labels = [answer, ...others.filter((label, i) => label !== answer && others.indexOf(label) === i)];
  const options: Option[] = rng.shuffle(labels).map((label, i) => (visuals[label] ? { id: `o${i}`, label, visual: visuals[label] } : { id: `o${i}`, label }));
  return { options, answer: options.find((o) => o.label === answer)!.id };
}

/** Wrong numbers close to the answer: never negative and never the answer itself. */
export function near(rng: Rng, answer: number, offsets: number[], count = 2): number[] {
  const pool = [...new Set(offsets.flatMap((d) => [answer + d, answer - d]))].filter((n) => n >= 0 && n !== answer);
  return rng.shuffle(pool).slice(0, count);
}

/** A shuffled copy that is not already in order. */
export function scrambled<T>(rng: Rng, items: T[], inOrder: (list: T[]) => boolean): T[] {
  let out = rng.shuffle(items);
  for (let i = 0; i < 8 && inOrder(out); i++) out = rng.shuffle(items);
  return inOrder(out) ? [...out.slice(1), out[0]!] : out;
}

export function twoNames(rng: Rng): [string, string] {
  const [a, b] = rng.shuffle(NAMES);
  return [a!, b!];
}

/** A decimal written from a whole number of small units: decimalText(347, 2) is "3.47". */
export function decimalText(units: number, places: number): string {
  if (places === 0) return String(units);
  const digits = String(units).padStart(places + 1, "0");
  const whole = digits.slice(0, -places), frac = digits.slice(-places).replace(/0+$/, "");
  return frac ? `${Number(whole)}.${frac}` : String(Number(whole));
}

export const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
export const lcm = (a: number, b: number): number => (a * b) / gcd(a, b);
export function fractionText(num: number, den: number): string {
  const g = gcd(num, den) || 1;
  return den / g === 1 ? String(num / g) : `${num / g}/${den / g}`;
}
