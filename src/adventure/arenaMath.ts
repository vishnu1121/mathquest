// Problems, answers, misconception diagnosis and boss mechanics for the Muddle Monster Arena.
// Code classifies known mix-ups instantly. An AI classification is accepted only when this module finds its
// label plausible for the problem, and every boss mechanic step is checked here, never by a model.
import type { Rng } from "../engine/rng";
import type { CategoryId } from "./elo";

export type ArenaProblem =
  | { kind: "add"; a: number; b: number }
  | { kind: "sub"; a: number; b: number }
  | { kind: "frac"; a: number; b: number; c: number; d: number };
export type AddProblem = Extract<ArenaProblem, { kind: "add" }>;
export type SubProblem = Extract<ArenaProblem, { kind: "sub" }>;
export type FracProblem = Extract<ArenaProblem, { kind: "frac" }>;

export interface ArenaAnswer {
  whole?: number;
  num?: number;
  den?: number;
}

export const MISCONCEPTION_CODES = [
  "ERR_ADD_CARRY",
  "ERR_ADD_CONCAT",
  "ERR_SUB_BORROW",
  "ERR_WRONG_OPERATION",
  "ERR_ADD_DENOMINATOR",
  "ERR_FRAC_KEEP_DENOMINATOR",
  "ERR_OFF_BY_ONE",
  "ERR_UNKNOWN",
] as const;
export type MisconceptionCode = (typeof MISCONCEPTION_CODES)[number];

export const MISCONCEPTIONS: Record<MisconceptionCode, { label: string; grownUp: string }> = {
  ERR_ADD_CARRY: { label: "Forgot to carry the ten", grownUp: "Added the ones, but the ten made from them never reached the tens column." },
  ERR_ADD_CONCAT: { label: "Wrote both column sums side by side", grownUp: "Wrote the ones sum next to the tens sum instead of trading ten ones for a ten." },
  ERR_SUB_BORROW: { label: "Took the smaller digit from the larger", grownUp: "Subtracted the smaller digit from the larger in a column, or traded a ten without taking it from the tens." },
  ERR_WRONG_OPERATION: { label: "Used the other operation", grownUp: "Added instead of subtracting, or subtracted instead of adding." },
  ERR_ADD_DENOMINATOR: { label: "Added the denominators too", grownUp: "Added the numerators and the denominators straight across." },
  ERR_FRAC_KEEP_DENOMINATOR: { label: "Added pieces of different sizes", grownUp: "Added the numerators but kept one denominator, without first making equal-sized pieces." },
  ERR_OFF_BY_ONE: { label: "Off by one", grownUp: "Counted one too many or one too few." },
  ERR_UNKNOWN: { label: "A new kind of mix-up", grownUp: "The answer did not match a known pattern." },
};

export const BOSSES = {
  "carry-colossus": {
    name: "Carry Colossus",
    emoji: "🗿",
    mechanic: "bundle-ten",
    event: "SPAWN_CARRY_COLOSSUS",
    codes: ["ERR_ADD_CARRY", "ERR_ADD_CONCAT"],
    taunt: "My armor is a pile of loose ones. You can't bundle them!",
    power: "Bundle ten One-Blocks into one Ten-Block to crack its armor.",
  },
  "borrowing-behemoth": {
    name: "Borrowing Behemoth",
    emoji: "🦣",
    mechanic: "shatter-ten",
    event: "SPAWN_BORROWING_BEHEMOTH",
    codes: ["ERR_SUB_BORROW"],
    taunt: "Not enough ones to take away! Unless you dare to break a ten…",
    power: "Shatter one Ten-Block into ten One-Blocks, then take away what the problem asks.",
  },
  "denominator-demon": {
    name: "Denominator Demon",
    emoji: "😈",
    mechanic: "slice-pizza",
    event: "SPAWN_DENOMINATOR_DEMON",
    codes: ["ERR_ADD_DENOMINATOR", "ERR_FRAC_KEEP_DENOMINATOR"],
    taunt: "My pizza slices are all different sizes. You can't add them now!",
    power: "Slice both pizzas into the same size of piece, then count every shaded slice together.",
  },
} as const;
export type BossId = keyof typeof BOSSES;
export const BOSS_IDS = Object.keys(BOSSES) as BossId[];

export const gcd = (x: number, y: number): number => (y === 0 ? Math.abs(x) : gcd(y, x % y));
export const lcm = (x: number, y: number): number => (x * y) / gcd(x, y);
export const tensOf = (n: number): number => Math.floor(n / 10);
export const onesOf = (n: number): number => n % 10;
export const needsCarry = (a: number, b: number): boolean => onesOf(a) + onesOf(b) >= 10;
export const needsBorrow = (a: number, b: number): boolean => onesOf(a) < onesOf(b);
const sameFraction = (n1: number, d1: number, n2: number, d2: number): boolean => n1 * d2 === n2 * d1;

// ---------- Problems ----------

const UNLIKE_PAIRS: readonly (readonly [number, number])[] = [[2, 3], [2, 4], [2, 6], [3, 4], [3, 6], [4, 6]];

export function generateProblem(category: CategoryId, rng: Rng): ArenaProblem {
  switch (category) {
    case "add_small":
      return { kind: "add", a: rng.int(2, 9), b: rng.int(2, 9) };
    case "add_no_carry": {
      const ta = rng.int(1, 8), tb = rng.int(1, 9 - ta), oa = rng.int(0, 9), ob = rng.int(0, 9 - oa);
      return { kind: "add", a: ta * 10 + oa, b: tb * 10 + ob };
    }
    case "add_carry": {
      const ta = rng.int(1, 7), tb = rng.int(1, 8 - ta), oa = rng.int(1, 9), ob = rng.int(10 - oa, 9);
      return { kind: "add", a: ta * 10 + oa, b: tb * 10 + ob };
    }
    case "sub_no_borrow": {
      const ta = rng.int(2, 9), tb = rng.int(1, ta - 1), oa = rng.int(0, 9), ob = rng.int(0, oa);
      return { kind: "sub", a: ta * 10 + oa, b: tb * 10 + ob };
    }
    case "sub_borrow": {
      const ta = rng.int(2, 9), tb = rng.int(1, ta - 1), oa = rng.int(0, 8), ob = rng.int(oa + 1, 9);
      return { kind: "sub", a: ta * 10 + oa, b: tb * 10 + ob };
    }
    case "frac_like": {
      const d = rng.pick([3, 4, 5, 6, 8]), a = rng.int(1, d - 2), c = rng.int(1, d - 1 - a);
      return { kind: "frac", a, b: d, c, d };
    }
    case "frac_unlike": {
      for (let tries = 0; tries < 60; tries++) {
        const [x, y] = rng.pick(UNLIKE_PAIRS);
        const [b, d] = rng.next() < 0.5 ? [x, y] : [y, x];
        const a = rng.int(1, b - 1), c = rng.int(1, d - 1);
        if (a * d + c * b < b * d) return { kind: "frac", a, b, c, d };
      }
      return { kind: "frac", a: 1, b: 2, c: 1, d: 3 };
    }
  }
}

/** Sanity limits for problems arriving from a browser. */
export function validProblem(p: ArenaProblem): boolean {
  if (p.kind === "frac") {
    const parts = [p.a, p.b, p.c, p.d];
    return parts.every((n) => Number.isInteger(n) && n >= 1 && n <= 12) && p.a < p.b && p.c < p.d && lcm(p.b, p.d) <= 24;
  }
  const inRange = [p.a, p.b].every((n) => Number.isInteger(n) && n >= 0 && n <= 999);
  return inRange && (p.kind === "add" || p.a >= p.b);
}

export function correctAnswer(p: ArenaProblem): ArenaAnswer {
  if (p.kind === "add") return { whole: p.a + p.b };
  if (p.kind === "sub") return { whole: p.a - p.b };
  const den = lcm(p.b, p.d), num = p.a * (den / p.b) + p.c * (den / p.d), g = gcd(num, den);
  return { num: num / g, den: den / g };
}

export const answerText = (x: ArenaAnswer): string => (x.den !== undefined ? `${x.num}/${x.den}` : String(x.whole));
export const correctText = (p: ArenaProblem): string => answerText(correctAnswer(p));

export function problemText(p: ArenaProblem): string {
  return p.kind === "frac" ? `${p.a}/${p.b} + ${p.c}/${p.d}` : `${p.a} ${p.kind === "add" ? "+" : "−"} ${p.b}`;
}

export function problemSpeech(p: ArenaProblem): string {
  return p.kind === "frac" ? `${p.a} over ${p.b} plus ${p.c} over ${p.d}` : `${p.a} ${p.kind === "add" ? "plus" : "minus"} ${p.b}`;
}

/** Whole numbers for addition and subtraction; a/b for fractions. Anything else is not an answer. */
export function parseAnswer(p: ArenaProblem, input: string): ArenaAnswer | null {
  const t = String(input).replace(/\s+/g, "");
  if (p.kind === "frac") {
    const m = /^(\d{1,3})\/(\d{1,3})$/.exec(t);
    if (!m) return null;
    const num = Number(m[1]), den = Number(m[2]);
    return den > 0 ? { num, den } : null;
  }
  return /^\d{1,4}$/.test(t) ? { whole: Number(t) } : null;
}

/** Equivalent fractions count as correct. */
export function isCorrect(p: ArenaProblem, x: ArenaAnswer): boolean {
  const right = correctAnswer(p);
  if (p.kind === "frac") {
    return x.num !== undefined && x.den !== undefined && x.den > 0 && sameFraction(x.num, x.den, right.num ?? 0, right.den ?? 1);
  }
  return x.whole === right.whole;
}

// ---------- Diagnosis ----------

/** Instant rule-based classification. Null when the answer is correct. */
export function classifyAnswer(p: ArenaProblem, x: ArenaAnswer): MisconceptionCode | null {
  if (isCorrect(p, x)) return null;
  if (p.kind === "frac") {
    if (x.num === undefined || x.den === undefined) return "ERR_UNKNOWN";
    if (sameFraction(x.num, x.den, p.a + p.c, p.b + p.d)) return "ERR_ADD_DENOMINATOR";
    if (p.b !== p.d && x.num === p.a + p.c && (x.den === p.b || x.den === p.d)) return "ERR_FRAC_KEEP_DENOMINATOR";
    return "ERR_UNKNOWN";
  }
  const given = x.whole;
  if (given === undefined) return "ERR_UNKNOWN";
  const { a, b } = p;
  if (p.kind === "add") {
    const total = a + b, singleDigits = a < 10 && b < 10;
    // With two single digits, "3" for 8 + 5 more likely means 8 − 5 than a missing ten.
    if (singleDigits && given === Math.abs(a - b)) return "ERR_WRONG_OPERATION";
    if (needsCarry(a, b)) {
      const tensSum = tensOf(a) + tensOf(b);
      if (tensSum > 0 && given === Number(`${tensSum}${onesOf(a) + onesOf(b)}`)) return "ERR_ADD_CONCAT";
      if (given === total - 10) return "ERR_ADD_CARRY";
    }
    if (given === Math.abs(a - b)) return "ERR_WRONG_OPERATION";
    if (Math.abs(given - total) === 1) return "ERR_OFF_BY_ONE";
    return "ERR_UNKNOWN";
  }
  const diff = a - b;
  const smallerFromLarger = (tensOf(a) - tensOf(b)) * 10 + (onesOf(b) - onesOf(a));
  if (needsBorrow(a, b) && (given === smallerFromLarger || given === diff + 10)) return "ERR_SUB_BORROW";
  if (given === a + b) return "ERR_WRONG_OPERATION";
  if (Math.abs(given - diff) === 1) return "ERR_OFF_BY_ONE";
  return "ERR_UNKNOWN";
}

/** Whether a classification (for example, one proposed by AI) can apply to this problem at all. */
export function plausibleCode(p: ArenaProblem, code: MisconceptionCode): boolean {
  switch (code) {
    case "ERR_ADD_CARRY":
      return p.kind === "add" && needsCarry(p.a, p.b);
    case "ERR_ADD_CONCAT":
      return p.kind === "add" && needsCarry(p.a, p.b) && (p.a >= 10 || p.b >= 10);
    case "ERR_SUB_BORROW":
      return p.kind === "sub" && p.a >= 10 && needsBorrow(p.a, p.b);
    case "ERR_WRONG_OPERATION":
    case "ERR_OFF_BY_ONE":
      return p.kind !== "frac";
    case "ERR_ADD_DENOMINATOR":
      return p.kind === "frac";
    case "ERR_FRAC_KEEP_DENOMINATOR":
      return p.kind === "frac" && p.b !== p.d;
    case "ERR_UNKNOWN":
      return true;
  }
}

export function bossFor(code: MisconceptionCode): BossId | null {
  return BOSS_IDS.find((id) => (BOSSES[id].codes as readonly MisconceptionCode[]).includes(code)) ?? null;
}

export interface Diagnosis {
  code: MisconceptionCode;
  label: string;
  boss: BossId | null;
  mechanic: string | null;
  event: string | null;
  source: "rules" | "ai";
}

/** The payload the game engine uses to decide which boss encounter to start. */
export function diagnosis(code: MisconceptionCode, source: "rules" | "ai"): Diagnosis {
  const boss = bossFor(code);
  return { code, label: MISCONCEPTIONS[code].label, boss, mechanic: boss ? BOSSES[boss].mechanic : null, event: boss ? BOSSES[boss].event : null, source };
}

// ---------- Socratic questions ----------

/** Numbers a companion question may mention. The answer itself is never on the list. */
export function socraticNumbers(p: ArenaProblem): number[] {
  if (p.kind === "frac") return [...new Set([p.a, p.b, p.c, p.d, lcm(p.b, p.d), 1])];
  const answer = correctAnswer(p).whole;
  const extra = p.kind === "add" ? onesOf(p.a) + onesOf(p.b) : onesOf(p.a) + 10;
  const list = [p.a, p.b, tensOf(p.a), onesOf(p.a), tensOf(p.b), onesOf(p.b), tensOf(p.a) * 10, tensOf(p.b) * 10, 10, 1, extra];
  return [...new Set(list)].filter((n) => n !== answer);
}

/** True when text states the answer: the total, or any fraction equivalent to the sum. */
export function leaksAnswer(p: ArenaProblem, text: string): boolean {
  const right = correctAnswer(p);
  if (p.kind !== "frac") return (text.match(/\d+/g) ?? []).map(Number).includes(right.whole ?? -1);
  for (const m of text.matchAll(/(\d+)\s*(?:\/|over|out of)\s*(\d+)/gi)) {
    const num = Number(m[1]), den = Number(m[2]);
    if (den > 0 && sameFraction(num, den, right.num ?? 0, right.den ?? 1)) return true;
  }
  return false;
}

/** Built-in Socratic question: one sentence, a question, and never the answer. */
export function socraticFallback(p: ArenaProblem, code: MisconceptionCode): string {
  if (p.kind === "frac") {
    if (code === "ERR_ADD_DENOMINATOR") return `When a pizza cut into ${p.b} slices joins one cut into ${p.d} slices, do the slices get smaller or stay the same size?`;
    if (code === "ERR_FRAC_KEEP_DENOMINATOR") return `Is one slice from a pizza cut into ${p.b} pieces the same size as one slice from a pizza cut into ${p.d} pieces?`;
    return p.b === p.d
      ? `If both pizzas are already cut into ${p.b} equal slices, which number changes when you count all the shaded slices?`
      : "What slice size could both pizzas be cut into so every piece matches?";
  }
  const answer = correctAnswer(p).whole;
  const say = (n: number) => (n === answer ? "that number" : String(n));
  const ones = (n: number) => `${say(n)} ${n === 1 ? "one" : "ones"}`;
  const oa = onesOf(p.a), ob = onesOf(p.b);
  switch (code) {
    case "ERR_ADD_CARRY":
      return `When ${ones(oa)} and ${ones(ob)} make ten or more, where does that new ten need to go?`;
    case "ERR_ADD_CONCAT":
      return "Can the ones column hold a two-digit number, or should ten of those ones become a ten?";
    case "ERR_SUB_BORROW":
      return `The top number has only ${ones(oa)}, so how could you get enough ones to take away ${say(ob)}?`;
    case "ERR_WRONG_OPERATION":
      return p.kind === "add"
        ? `Does this problem ask you to put ${say(p.a)} and ${say(p.b)} together or to take one away?`
        : `Are you taking ${say(p.b)} away from ${say(p.a)}, or putting them together?`;
    case "ERR_OFF_BY_ONE":
      return "If you count that last step again slowly, did you land one too far or one too short?";
    default:
      return p.kind === "add"
        ? `What do you get when you add just the ones, ${say(oa)} and ${say(ob)}, first?`
        : `Which column will you start with, and are there enough ones on top to take away ${say(ob)}?`;
  }
}

// ---------- Hoot, the always-present companion ----------

/** When Hoot speaks. Code picks the moment from what the child is doing; AI may only reword AI_MOMENTS. */
export const COMPANION_MOMENTS = ["start", "hesitate", "mistake", "boss", "ask", "solved"] as const;
export type CompanionMoment = (typeof COMPANION_MOMENTS)[number];
export const AI_MOMENTS = ["hesitate", "mistake", "boss", "ask"] as const;
export type AiMoment = (typeof AI_MOMENTS)[number];

/** The next move in a boss encounter, read by code from the encounter state. */
export const BOSS_STEPS = ["bundle", "shatter", "takeOnes", "takeTens", "slice", "combine", "count"] as const;
export type BossStep = (typeof BOSS_STEPS)[number];

export function bossStepFits(p: ArenaProblem, step: BossStep): boolean {
  switch (step) {
    case "bundle":
      return p.kind === "add";
    case "shatter":
    case "takeOnes":
    case "takeTens":
      return p.kind === "sub";
    case "slice":
    case "combine":
      return p.kind === "frac";
    case "count":
      return true;
  }
}

/** What the child is working on right now. */
export interface CompanionContext {
  moment: CompanionMoment;
  problem: ArenaProblem;
  /** Wrong answers to this problem so far, oldest first. */
  wrongAnswers: readonly string[];
  /** The latest diagnosis, or null before any mistake. */
  code: MisconceptionCode | null;
  /** The scaffold tier on screen (0–3). */
  tier: number;
  /** The next boss move while an encounter is on. */
  bossStep: BossStep | null;
}

/** Number words that never name the answer. */
function sayer(p: ArenaProblem) {
  const answer = correctAnswer(p).whole;
  const say = (n: number) => (n === answer ? "that number" : String(n));
  const ones = (n: number) => `${say(n)} ${n === 1 ? "one" : "ones"}`;
  return { say, ones };
}

function startQuestion(p: ArenaProblem): string {
  if (p.kind === "frac") {
    return p.b === p.d ? `Both pizzas are cut into ${p.b} equal slices, so which numbers will you count?` : "Before you add, are the pieces in these two fractions the same size?";
  }
  if (p.kind === "add") return p.a < 10 && p.b < 10 ? "Which number will you start from, and how many will you count on?" : "Which column will you add first, the ones or the tens?";
  return "Before you take away, are there enough ones on top?";
}

/** For a child who is pausing before a first answer: where to look. */
function lookQuestion(p: ArenaProblem): string {
  const { say } = sayer(p);
  if (p.kind === "frac") {
    return p.b === p.d ? "Which number tells how many equal slices make one whole pizza?" : `Look at the glowing bottom numbers: is a slice from ${p.b} pieces the same size as a slice from ${p.d} pieces?`;
  }
  if (p.kind === "add") {
    if (p.a < 10 && p.b < 10) return `Could you start at ${say(Math.max(p.a, p.b))} and count on ${say(Math.min(p.a, p.b))} more?`;
    return `What do the glowing ones digits, ${say(onesOf(p.a))} and ${say(onesOf(p.b))}, make together?`;
  }
  return `In the glowing ones column, is ${say(onesOf(p.a))} on top enough to take away ${say(onesOf(p.b))}?`;
}

/** One small next step, matched to the help already on screen. */
function stepQuestion(p: ArenaProblem, tier: number): string {
  const { say, ones } = sayer(p);
  if (p.kind === "frac") {
    if (tier >= 3) return `Now that both bars have ${lcm(p.b, p.d)} equal pieces, how many pieces are shaded altogether?`;
    if (tier === 2) return "Are the shaded pieces on the two fraction bars the same size?";
    return p.b === p.d ? "When every slice is the same size, which number stays the same?" : "What slice size could both pizzas be cut into so every piece matches?";
  }
  if (p.kind === "add") {
    if (p.a < 10 && p.b < 10) return tier >= 2 ? "Can you count all the One-Blocks, starting from the bigger number?" : `Could you start at ${say(Math.max(p.a, p.b))} and count on one at a time?`;
    if (tier >= 3 && needsCarry(p.a, p.b)) return "How many full groups of ten can you make from the loose ones?";
    if (tier === 2 || tier >= 3) return "Can you count the Ten-Blocks first and then the One-Blocks?";
    return needsCarry(p.a, p.b) ? "If the ones make ten or more, where will that new ten go?" : `After the ones, what do the tens, ${say(tensOf(p.a) * 10)} and ${say(tensOf(p.b) * 10)}, make together?`;
  }
  const short = needsBorrow(p.a, p.b);
  if (tier >= 3 && short) return `Now that one ten is open, are there enough ones to take away ${ones(onesOf(p.b))}?`;
  if (tier >= 2) return "Can you take away the One-Blocks first and then the Ten-Blocks?";
  return short ? "If there are not enough ones on top, what could you open up to get more?" : `After taking away the ones, how many tens will you take away from ${say(p.a)}?`;
}

function bossQuestion(p: ArenaProblem, step: BossStep): string {
  const { say, ones } = sayer(p);
  switch (step) {
    case "bundle":
      return "Which ten One-Blocks could you bundle together into one Ten-Block?";
    case "shatter":
      return p.kind === "sub" ? `With only ${ones(onesOf(p.a))} on the table, what could you break open to get more ones?` : "What could you break open to get more ones?";
    case "takeOnes":
      return p.kind === "sub" ? `Now that there are enough ones, can you take away ${ones(onesOf(p.b))}?` : "Can you take away the ones now?";
    case "takeTens":
      return p.kind === "sub" ? `How many Ten-Blocks does ${say(p.b)} take away?` : "How many Ten-Blocks will you take away?";
    case "slice":
      return "Which slice size can both pizzas be cut into with no leftover pieces?";
    case "combine":
      return "What happens if you put every shaded slice onto one plate?";
    case "count":
      if (p.kind === "frac") return "How many slices are shaded, and how many slices make one whole pizza?";
      return p.kind === "add" ? "How many Ten-Blocks and One-Blocks are there now?" : "How many Ten-Blocks and One-Blocks are left on the table?";
  }
}

/**
 * Hoot's built-in line for what the child is doing right now. Questions are one sentence, never state the
 * answer and use only the numbers a companion may mention; the solved line is one short cheer.
 */
export function companionLine(ctx: CompanionContext): string {
  const p = ctx.problem;
  switch (ctx.moment) {
    case "start":
      return startQuestion(p);
    case "solved":
      return ctx.wrongAnswers.length ? "You found the mix-up and fixed it, and that is how real mathematicians learn!" : "You solved it on your first try, so your plan really worked!";
    case "mistake":
      return socraticFallback(p, ctx.code ?? "ERR_UNKNOWN");
    case "boss":
      return bossQuestion(p, ctx.bossStep ?? "count");
    case "hesitate":
      if (ctx.bossStep) return bossQuestion(p, ctx.bossStep);
      return ctx.wrongAnswers.length ? stepQuestion(p, ctx.tier) : lookQuestion(p);
    case "ask":
      return ctx.bossStep ? bossQuestion(p, ctx.bossStep) : stepQuestion(p, ctx.tier);
  }
}

/** A note about an answer the child has typed but not checked. It never says whether a new answer is right. */
export function draftNote(p: ArenaProblem, draft: string, wrongAnswers: readonly string[]): string | null {
  const t = String(draft).replace(/\s+/g, "");
  if (!t) return null;
  if (p.kind === "frac" && !t.includes("/") && t.length >= 2) return "A fraction answer needs a top number, a slash and a bottom number.";
  if (p.kind !== "frac" && t.includes("/")) return "This answer is a whole number, so it does not need a slash.";
  const x = parseAnswer(p, t);
  if (!x) return null;
  for (const prior of wrongAnswers) {
    const y = parseAnswer(p, prior);
    if (!y) continue;
    if (answerText(y) === answerText(x)) return `You already tried ${answerText(x)}, so what could you check before trying it again?`;
    if (p.kind === "frac" && sameFraction(x.num ?? 0, x.den ?? 1, y.num ?? 0, y.den ?? 1)) {
      return `${answerText(x)} is the same amount as ${answerText(y)}, which you tried already, so what could you check first?`;
    }
  }
  return null;
}

// ---------- Boss mechanics ----------

export interface BlockCount {
  tens: number;
  ones: number;
}
export const blockValue = (s: BlockCount): number => s.tens * 10 + s.ones;

export interface BundleState extends BlockCount {
  bundled: boolean;
}
export function bundleStart(p: AddProblem): BundleState {
  return { tens: tensOf(p.a) + tensOf(p.b), ones: onesOf(p.a) + onesOf(p.b), bundled: false };
}
/** Ten loose ones become one Ten-Block. */
export function bundleTen(s: BundleState): BundleState | null {
  return s.ones >= 10 ? { tens: s.tens + 1, ones: s.ones - 10, bundled: true } : null;
}

export interface ShatterState extends BlockCount {
  shattered: boolean;
  tookOnes: boolean;
  tookTens: boolean;
}
export function shatterStart(p: SubProblem): ShatterState {
  return { tens: tensOf(p.a), ones: onesOf(p.a), shattered: false, tookOnes: false, tookTens: false };
}
/** One Ten-Block becomes ten One-Blocks. */
export function shatterTen(s: ShatterState): ShatterState | null {
  return s.tens > 0 && !s.shattered ? { ...s, tens: s.tens - 1, ones: s.ones + 10, shattered: true } : null;
}
/** Take away the ones of the second number; only possible when enough ones are on the table. */
export function takeOnes(p: SubProblem, s: ShatterState): ShatterState | null {
  return !s.tookOnes && s.ones >= onesOf(p.b) ? { ...s, ones: s.ones - onesOf(p.b), tookOnes: true } : null;
}
export function takeTens(p: SubProblem, s: ShatterState): ShatterState | null {
  return s.tookOnes && !s.tookTens && s.tens >= tensOf(p.b) ? { ...s, tens: s.tens - tensOf(p.b), tookTens: true } : null;
}

/** Slice sizes offered against the Denominator Demon, including sizes that do not work for both pizzas. */
export function sliceOptions(p: FracProblem): number[] {
  const common = lcm(p.b, p.d), big = Math.max(p.b, p.d);
  const sizes = [big, p.b + p.d, common, big + 1, common * 2 <= 12 ? common * 2 : 0];
  return [...new Set(sizes)].filter((n) => n >= 2 && n <= 24).sort((x, y) => x - y);
}
export const sliceWorks = (p: FracProblem, size: number): boolean =>
  Number.isInteger(size) && size >= 2 && size <= 24 && size % p.b === 0 && size % p.d === 0;
export const sliceCounts = (p: FracProblem, size: number): [number, number] => [p.a * (size / p.b), p.c * (size / p.d)];
export function sliceHint(p: FracProblem, size: number): string {
  const stuck = size % p.b !== 0 ? p.b : p.d;
  return `A pizza cut into ${stuck} equal slices can’t be re-cut into ${size} matching pieces without leftovers.`;
}
