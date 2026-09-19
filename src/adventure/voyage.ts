// Rules for the Skybound story. Randomness is injected; progress and answers never depend on AI or time.
import { z } from "zod";
import { createRng, type Rng } from "../engine/rng";

export const VOYAGE_IDS = ["skyrail", "robotworks", "cloudbridge", "garden", "water"] as const;
export type VoyageId = typeof VOYAGE_IDS[number];
export const STORY_ORDER = ["frog", "fireflies", "guardian", ...VOYAGE_IDS] as const;
export const MISSIONS = [
  { id: "skyrail", name: "The Runaway Skyrail", place: "Whistlewood Station", emoji: "🚂", number: 4, math: "Add · subtract · multiply", reward: "A compass for Nimbus", bonus: "courier", quest: "Deliver the lost parcels. Find out who sent the mist.", color: "rail" },
  { id: "robotworks", name: "The Moonbeam Workshop", place: "Tinker Hollow", emoji: "🤖", number: 5, math: "Multiply · divide · plan", reward: "A crew of little helpers", bonus: "bowls", quest: "Build a rescue crew to lift Nimbus above the clouds.", color: "forge" },
  { id: "cloudbridge", name: "A Bridge Back Home", place: "The Sleeping Sky", emoji: "🌈", number: 6, math: "Fractions · equivalence", reward: "A place for everyone", bonus: "starmatch", quest: "Patch the sky bridge. Bring a lost friend home.", color: "bridge" },
  { id: "garden", name: "The Garden That Belongs to Everyone", place: "Moonseed Meadow", emoji: "🌻", number: 7, math: "Area · perimeter · spatial reasoning", reward: "A welcome garden for Nimbus", bonus: "prismpop", quest: "Design a garden where even a little storm can put down roots.", color: "garden" },
  { id: "water", name: "The Last Little Tidepool", place: "Tideglass Cove", emoji: "🐢", number: 8, math: "Capacity · subtraction · planning", reward: "A home for the tidepool crew", bonus: "orchestra", quest: "Measure the water, rescue the tidepools, and help Nimbus discover a new gift.", color: "water" },
] as const;

const evidence = z.object({ skill: z.string().max(30), correct: z.boolean(), independent: z.boolean() });
const checkpoint = z.object({ seed: z.number().int().min(0).max(0xffffffff), round: z.number().int().min(0).max(4), independent: z.number().int().min(0).max(4), helped: z.boolean().default(false) });
const schema = z.object({
  version: z.literal(1), promise: z.enum(["listen", "together"]).nullable(),
  keepsakes: z.array(z.enum(["feather", "bell", "shell"])).max(3),
  camp: z.array(z.enum(["flower", "mushroom", "lantern", "empty"])).length(9),
  runs: z.partialRecord(z.enum(VOYAGE_IDS), checkpoint),
  visits: z.number().int().min(0).max(100000),
  recent: z.array(evidence).max(24),
  records: z.record(z.enum(["rally", "bowls", "starmatch"]), z.number().int().min(0).max(10000).optional()),
});
export type VoyageSave = z.infer<typeof schema>;
export function restoreVoyage(raw: unknown): VoyageSave {
  const base: VoyageSave = { version: 1, promise: null, keepsakes: [], camp: Array(9).fill("empty"), runs: {}, visits: 0, recent: [], records: { rally: undefined, bowls: undefined, starmatch: undefined } };
  if (!raw || typeof raw !== "object") return base;
  // Recover fields independently: one corrupt checkpoint must not erase choices or a garden.
  for (const key of Object.keys(schema.shape) as (keyof VoyageSave)[]) {
    const parsed = schema.shape[key].safeParse((raw as Record<string, unknown>)[key]);
    if (parsed.success) Object.assign(base, { [key]: parsed.data });
  }
  base.keepsakes = [...new Set(base.keepsakes)];
  return base;
}
export function chapterOpen(id: string, chapters: Record<string, unknown>): boolean {
  const index = STORY_ORDER.findIndex((key) => key === id);
  return index === 0 || (index > 0 && Boolean(chapters[STORY_ORDER[index - 1]!]));
}
export function nextChapter(chapters: Record<string, unknown>): string {
  return STORY_ORDER.find((id) => !chapters[id]) || "water";
}
export type RailOp = { sign: "+" | "−" | "×"; amount: number };
export function operate(value: number, op: RailOp): number {
  return op.sign === "+" ? value + op.amount : op.sign === "−" ? value - op.amount : value * op.amount;
}
export interface RailPuzzle { kind: "rail"; start: number; target: number; gates: RailOp[][]; parcel: string }
export function railValue(p: RailPuzzle, picks: number[]): number | null {
  if (picks.length !== p.gates.length) return null;
  let value = p.start;
  for (let i = 0; i < p.gates.length; i++) {
    const op = p.gates[i]?.[picks[i]!];
    if (!op) return null;
    value = operate(value, op);
  }
  return value;
}
export function makeRail(rng: Rng, round: number): RailPuzzle {
  const start = rng.int(round >= 3 ? 10 : 8, 16);
  const gates: RailOp[][] = Array.from({ length: 2 }, () => rng.shuffle([
    { sign: "+" as const, amount: rng.int(2, 8) },
    { sign: "−" as const, amount: rng.int(1, 3) },
    { sign: "+" as const, amount: rng.int(9, 12) },
  ]));
  const p: RailPuzzle = { kind: "rail", start, gates, target: 0, parcel: ["a very squeaky bell", "Pip’s slightly squashed picnic", "a tiny cloud’s scarf", "Nimbus’s missing compass"][round % 4]! };
  p.target = railValue(p, gates.map(() => rng.int(0, 2)))!;
  return p;
}
export interface RobotPuzzle { kind: "robot"; robots: number; cells: number; gears: number; cellPack: number; gearPack: number }
export function makeRobot(rng: Rng, round: number): RobotPuzzle {
  const robots = 2 + round, cells = rng.int(1, 3), gears = rng.int(2, 4);
  const pack = (total: number) => { const choices = [2, 3].filter((n) => total % n === 0); return round === 0 || !choices.length ? 1 : rng.pick(choices); };
  return { kind: "robot", robots, cells, gears, cellPack: pack(robots * cells), gearPack: pack(robots * gears) };
}
export function robotReady(p: RobotPuzzle, cells: number, gears: number): boolean {
  return Number.isInteger(cells) && Number.isInteger(gears) && cells >= 0 && gears >= 0 && cells * p.cellPack === p.robots * p.cells && gears * p.gearPack === p.robots * p.gears;
}
export interface BridgePuzzle { kind: "bridge"; target: number; pieces: number[]; minimum: number; friend: string }
export const fractionName = (units: number): string => ({ 2: "1/6", 3: "1/4", 4: "1/3", 6: "1/2", 8: "2/3", 9: "3/4", 12: "1 whole" })[units] || `${units}/12`;
export function makeBridge(rng: Rng, round: number): BridgePuzzle {
  const targets = [6, 9, 8, 12];
  return { kind: "bridge", target: targets[round % 4]!, pieces: rng.shuffle(round === 2 ? [2, 4, 6] : [3, 4, 6]), minimum: round === 0 ? 1 : 2, friend: ["Pip", "the rescue robots", "Hoot", "Nimbus"][round % 4]! };
}
export function bridgeReady(p: BridgePuzzle, pieces: number[]): boolean {
  return pieces.length >= p.minimum && pieces.length <= 6 && pieces.every((n) => p.pieces.includes(n)) && pieces.reduce((a, b) => a + b, 0) === p.target;
}
export function voyagePuzzle(id: "skyrail" | "robotworks" | "cloudbridge", seed: number, round: number) {
  const rng = createRng((seed + round * 7919) >>> 0);
  return id === "skyrail" ? makeRail(rng, round) : id === "robotworks" ? makeRobot(rng, round) : makeBridge(rng, round);
}
export function rallyCourse(seed: number) {
  const rng = createRng(seed);
  return Array.from({ length: 6 }, () => ({ wind: rng.int(-1, 1), lanes: [rng.int(3, 6), rng.int(3, 6), rng.int(3, 6)], pip: rng.int(5, 7) }));
}
export function rallyMove(lanes: number[], wind: number, lane: number, boost: boolean): number {
  if (!Number.isInteger(lane) || lane < 0 || lane > 2) return 0;
  return Math.max(1, lanes[lane]! + (lane === wind + 1 ? 2 : 0) + (boost ? 3 : 0));
}
export function bowlLanding(aim: number, power: number, wind: number) {
  return { x: Math.max(5, Math.min(95, 50 + aim * 0.85 + wind * 3)), y: Math.max(8, Math.min(92, 92 - power * 8)) };
}
export function bowlPoints(landing: { x: number; y: number }, target: { x: number; y: number }): number {
  const d = Math.hypot(landing.x - target.x, landing.y - target.y);
  return d <= 5 ? 100 : d <= 12 ? 60 : d <= 22 ? 30 : 10;
}
