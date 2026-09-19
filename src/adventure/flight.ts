// Lantern Flight rules: four legs of night flying, firefly lights that fill a ten-frame lantern, sky questions
// answered by flying through a ring, and a score that rewards lights, right answers and unbroken chains, never
// speed. Pure and seeded; runtime/mini-flight.js only draws, moves Hoot and asks these functions.
import type { Rng } from "../engine/rng";

export type GateKind = "nextTen" | "tenMore";
export type Medal = "gold" | "silver" | "bronze";

export interface Leg {
  id: string;
  name: string;
  emoji: string;
  /** Seconds of flying in this leg. */
  duration: number;
  /** Sky speed in pixels per second. Everyone flies at the same pace; points never depend on it. */
  speed: number;
  /** One sky question per entry, in order. */
  gates: readonly GateKind[];
  /** Average seconds between clouds. */
  cloudsEvery: number;
  gusts: number;
  stars: number;
  /** Golden fireflies worth 5 lights. */
  golden: number;
  /** The most lights an ordinary firefly carries. */
  maxLights: number;
  village: readonly string[];
}

export const LEGS: readonly Leg[] = [
  { id: "meadow", name: "Firefly Meadow", emoji: "🌾", duration: 44, speed: 150, gates: ["nextTen", "nextTen", "nextTen"], cloudsEvery: 4.2, gusts: 0, stars: 0, golden: 0, maxLights: 2, village: ["🏡", "🌳", "🏠", "🌻", "🏡", "🌳"] },
  { id: "clouds", name: "Cloud Pass", emoji: "☁️", duration: 46, speed: 160, gates: ["nextTen", "nextTen", "tenMore"], cloudsEvery: 2.9, gusts: 0, stars: 1, golden: 1, maxLights: 3, village: ["⛺", "🌲", "🏔️", "🌲", "⛺", "🌲"] },
  { id: "canyon", name: "Windy Canyon", emoji: "🌬️", duration: 46, speed: 170, gates: ["tenMore", "nextTen", "tenMore"], cloudsEvery: 2.6, gusts: 3, stars: 1, golden: 1, maxLights: 3, village: ["🛖", "🌵", "🏜️", "🌵", "🛖", "🌵"] },
  { id: "harbor", name: "Moon Harbor", emoji: "🌙", duration: 48, speed: 175, gates: ["nextTen", "tenMore", "nextTen"], cloudsEvery: 2.4, gusts: 2, stars: 3, golden: 2, maxLights: 3, village: ["⛵", "🏠", "🗼", "🏠", "⛵", "🏡"] },
];

/** Seconds at the start of each leg with nothing to catch. */
export const START_CALM = 2.5;
/** Seconds of open sky at the end of each leg. */
export const END_CALM = 2;
/** A sky question appears this many seconds before its rings reach Hoot. No lights arrive in that window. */
export const ASK_AHEAD = 5;
export const GUST_SECONDS = 3.5;

export const LIGHT_POINTS = 10;
export const TEN_POINTS = 50;
export const GATE_POINTS = 150;
export const STAR_POINTS = 200;
export const SMOOTH_LEG_POINTS = 300;

export const MEDALS: Record<Medal, { emoji: string; title: string }> = {
  gold: { emoji: "🥇", title: "Gold wings!" },
  silver: { emoji: "🥈", title: "Silver wings!" },
  bronze: { emoji: "🥉", title: "Bronze wings!" },
};

export type FlightEvent =
  | { kind: "cluster"; t: number; y: number; lights: number; golden: boolean }
  | { kind: "cloud"; t: number; y: number }
  | { kind: "star"; t: number; y: number }
  | { kind: "gate"; t: number; gate: GateKind }
  | { kind: "gust"; t: number; lift: 1 | -1 };

/** Everything that happens in one leg, by seconds of flight. y is a fraction of the flying band, top to bottom. */
export function planLeg(index: number, rng: Rng): FlightEvent[] {
  const leg = LEGS[index];
  if (!leg) throw new RangeError(`Lantern Flight has no leg ${index}`);
  const end = leg.duration - END_CALM;
  const usable = end - START_CALM - ASK_AHEAD - 1;
  const gateTimes = leg.gates.map((_, i) => START_CALM + ASK_AHEAD + (usable * (i + 0.5)) / leg.gates.length);
  // The lantern must not change while a question is on screen, so no lights arrive then.
  const clearOfQuestions = (t: number) => gateTimes.every((g) => t <= g - ASK_AHEAD - 0.3 || t >= g + 0.6);
  const events: FlightEvent[] = leg.gates.map((gate, i) => ({ kind: "gate", t: gateTimes[i] ?? START_CALM, gate }));

  const clusters: Extract<FlightEvent, { kind: "cluster" }>[] = [];
  for (let t = START_CALM + 0.3; t < end; t += 1.05 + rng.next() * 0.4) {
    if (clearOfQuestions(t)) clusters.push({ kind: "cluster", t, y: 0.1 + rng.next() * 0.78, lights: rng.int(1, leg.maxLights), golden: false });
  }
  for (const cluster of rng.shuffle(clusters).slice(0, leg.golden)) {
    cluster.golden = true;
    cluster.lights = 5;
  }
  events.push(...clusters);

  for (let t = START_CALM + 1.5; t < end; t += leg.cloudsEvery * (0.8 + rng.next() * 0.4)) {
    if (gateTimes.every((g) => Math.abs(t - g) >= 1)) events.push({ kind: "cloud", t, y: 0.08 + rng.next() * 0.82 });
  }

  for (let i = 0; i < leg.stars; i++) {
    let t = START_CALM + ((end - START_CALM) * (i + 0.3 + rng.next() * 0.4)) / leg.stars;
    while (!clearOfQuestions(t) && t < end) t += 0.25;
    if (t >= end) t = START_CALM + 0.2 * (i + 1);
    events.push({ kind: "star", t, y: 0.1 + rng.next() * 0.7 });
  }

  // A gust never blows while Hoot is passing a question's rings.
  const gustBlocked = (t: number) => gateTimes.some((g) => g > t - 1 && g < t + GUST_SECONDS + 1);
  for (let i = 0; i < leg.gusts; i++) {
    let t = START_CALM + ((end - GUST_SECONDS - START_CALM) * (i + 0.5)) / leg.gusts;
    while (gustBlocked(t) && t + GUST_SECONDS < end) t += 0.5;
    if (!gustBlocked(t) && t + GUST_SECONDS <= end) events.push({ kind: "gust", t, lift: rng.next() < 0.5 ? 1 : -1 });
  }

  return events.sort((a, b) => a.t - b.t);
}

export interface Gate {
  kind: GateKind;
  from: number;
  /** Lights the right ring adds. */
  answer: number;
  target: number;
  /** Lights each ring adds; exactly one is the answer. */
  options: number[];
}

/** A sky question about the lantern right now: make the next ten, or find ten more. */
export function makeGate(kind: GateKind, lights: number, rng: Rng): Gate {
  const from = Math.max(0, Math.floor(lights));
  // A lantern already on a ten has no "next ten" to make, so it asks for ten more.
  const real: GateKind = kind === "nextTen" && from % 10 === 0 ? "tenMore" : kind;
  const answer = real === "nextTen" ? 10 - (from % 10) : 10;
  // Near misses a child might really pick: one off, the ones digit itself, one more instead of ten more.
  const pool = real === "nextTen" ? [answer - 1, answer + 1, from % 10, answer + 2, answer - 2] : [1, 11, 9, 20];
  const distractors = rng.shuffle([...new Set(pool)].filter((n) => n >= 1 && n <= 20 && n !== answer)).slice(0, 2);
  return { kind: real, from, answer, target: from + answer, options: [answer, ...distractors].sort((a, b) => a - b) };
}

/** What a ring says: the lights it adds ("+3"), or for ten more, the total it would make ("58"). */
export const gateLabel = (g: Gate, add: number): string => (g.kind === "nextTen" ? `+${add}` : String(g.from + add));

export function gatePrompt(g: Gate): string {
  return g.kind === "nextTen" ? `Your lantern has ${g.from} lights. Which ring makes ${g.target}?` : `Your lantern has ${g.from} lights. Which ring shows 10 more?`;
}

const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
const word = (n: number) => WORDS[n] ?? String(n);

export function gateResult(g: Gate, add: number): { correct: boolean; total: number; text: string } {
  const total = g.from + add, correct = add === g.answer;
  if (g.kind === "tenMore") {
    return { correct, total, text: correct ? `${g.from} + 10 = ${total}. Ten more!` : `${g.from} + ${add} = ${total}. Ten more than ${g.from} is ${g.target}.` };
  }
  if (correct) return { correct, total, text: `${g.from} + ${add} = ${total}. Perfect ten!` };
  const off = total - g.target;
  return { correct, total, text: `${g.from} + ${add} = ${total}, ${word(Math.abs(off))} ${off > 0 ? "past" : "short of"} ${g.target}.` };
}

export function missedGateText(g: Gate): string {
  return g.kind === "nextTen" ? `The rings floated past. ${g.from} and ${g.answer} more make ${g.target}.` : `The rings floated past. Ten more than ${g.from} is ${g.target}.`;
}

/** Adds lights to the lantern and counts how many new tens were filled. */
export function addLights(lights: number, add: number): { lights: number; tens: number } {
  const next = lights + add;
  return { lights: next, tens: Math.floor(next / 10) - Math.floor(lights / 10) };
}

/** Every 8 catches or right answers in a row grow the multiplier, up to ×4. A cloud or a wrong ring resets the chain. */
export const multiplier = (chain: number): number => Math.min(4, 1 + Math.floor(Math.max(0, chain) / 8));

/** Points available without any multiplier: the yardstick for medals and for Pip's score. */
export function basePossible(plans: readonly (readonly FlightEvent[])[]): number {
  let points = 0, lights = 0;
  for (const plan of plans) {
    points += SMOOTH_LEG_POINTS;
    for (const event of plan) {
      if (event.kind === "cluster") { points += event.lights * LIGHT_POINTS; lights += event.lights; }
      else if (event.kind === "gate") { points += GATE_POINTS; lights += 5; }
      else if (event.kind === "star") points += STAR_POINTS;
    }
  }
  return points + Math.floor(lights / 10) * TEN_POINTS;
}

export function medalFor(score: number, base: number): Medal {
  if (score >= base) return "gold";
  return score >= base * 0.6 ? "silver" : "bronze";
}

/** Pip's friendly target: most of the base points, so beating Pip takes a good flight with some chains. */
export const rivalScore = (base: number): number => Math.round((base * 0.75) / 10) * 10;

export interface FlightRecord {
  best: number;
  runs: number;
  medals: Record<Medal, number>;
}

export function restoreFlight(raw: unknown): FlightRecord {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const m = (r.medals && typeof r.medals === "object" ? r.medals : {}) as Record<string, unknown>;
  const count = (v: unknown) => (typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 10_000_000 ? v : 0);
  return { best: count(r.best), runs: count(r.runs), medals: { gold: count(m.gold), silver: count(m.silver), bronze: count(m.bronze) } };
}

export function recordRun(record: FlightRecord, score: number, medal: Medal): { record: FlightRecord; newBest: boolean } {
  const points = Math.max(0, Math.round(score));
  return {
    record: { best: Math.max(record.best, points), runs: record.runs + 1, medals: { ...record.medals, [medal]: record.medals[medal] + 1 } },
    newBest: points > record.best,
  };
}
