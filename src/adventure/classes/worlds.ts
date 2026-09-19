import type { Rng } from "../../engine/rng";
import type { GradeId } from "./progress";
import type { WorldTask } from "./tasks";

export type Operation = "+" | "−" | "×" | "÷";
export interface Gate { op: Operation; amount: number }
export type WorldSpec =
  | { game: "patch"; start: number; target: number; capacity: number; units: number[]; emoji: string; operation: Operation; change: number }
  | { game: "gates"; start: number; target: number; capacity: number; gates: Gate[][]; emoji: string }
  | { game: "share"; total: number; groups: number; remainder: number; units: number[]; emoji: string }
  | { game: "bridge"; scale: number; target: number; initial: number[]; pieces: number[]; emoji: string; recipe: string; words: boolean; setting: "quilt" | "garden" | "beacon" | "falls" | "forge"; placeLabel?: string };
export type WorldMove = { action: "add" | "remove" | "gate" | "give" | "take" | "plank" | "undoPlank"; index: number; unit?: number };
export interface WorldState { value: number; step: number; bins: number[]; pieces: number[]; valid: boolean }
export const operate = (value: number, gate: Gate) => gate.op === "+" ? value + gate.amount : gate.op === "−" ? value - gate.amount : gate.op === "×" ? value * gate.amount : value / gate.amount;
export function initialWorld(w: WorldSpec): WorldState {
  return { value: w.game === "bridge" ? w.initial.reduce((a, b) => a + b, 0) : w.game === "share" ? w.total : w.start, step: 0, bins: w.game === "share" ? Array(w.groups).fill(0) : [], pieces: w.game === "bridge" ? [...w.initial] : [], valid: true };
}
/** Replay legal moves: correctness depends on the constructed world, not a client score. */
export function replayWorld(w: WorldSpec, moves: WorldMove[]): WorldState {
  const s = initialWorld(w);
  if (moves.length > 500) return { ...s, valid: false };
  for (const m of moves) {
    if (!Number.isInteger(m.index)) return { ...s, valid: false };
    if (w.game === "patch" && (m.action === "add" || m.action === "remove") && w.units.includes(m.unit!)) {
      const next = s.value + (m.action === "add" ? 1 : -1) * m.unit!;
      if (next < 0 || next > w.capacity) return { ...s, valid: false };
      s.value = next;
    } else if (w.game === "gates" && m.action === "gate" && w.gates[s.step]?.[m.index]) {
      const next = operate(s.value, w.gates[s.step]![m.index]!);
      if (!Number.isInteger(next) || next < 0 || next > w.capacity) return { ...s, valid: false };
      s.value = next; s.step++;
    } else if (w.game === "share" && (m.action === "give" || m.action === "take") && m.index >= 0 && m.index < w.groups && w.units.includes(m.unit!)) {
      const delta = (m.action === "give" ? 1 : -1) * m.unit!;
      if (s.bins[m.index]! + delta < 0 || s.value - delta < 0) return { ...s, valid: false };
      s.bins[m.index]! += delta; s.value -= delta;
    } else if (w.game === "bridge" && m.action === "plank" && w.pieces[m.index] && s.value + w.pieces[m.index]! <= w.scale * 2) {
      s.pieces.push(w.pieces[m.index]!); s.value += w.pieces[m.index]!;
    } else if (w.game === "bridge" && m.action === "undoPlank" && s.pieces.length) {
      s.value -= s.pieces.pop()!;
    } else return { ...s, valid: false };
  }
  return s;
}
export function worldSolved(w: WorldSpec, moves: WorldMove[]): boolean {
  const s = replayWorld(w, moves);
  if (!s.valid || !moves.length) return false;
  if (w.game === "share") return s.value === w.remainder && s.bins.every((n) => n === (w.total - w.remainder) / w.groups);
  return s.value === w.target && (w.game !== "gates" || s.step === w.gates.length);
}
const repeats = (action: WorldMove["action"], count: number, unit = 1, index = 0): WorldMove[] => Array.from({ length: count }, () => ({ action, index, unit }));
const base = (skill: string, prompt: string, hint: string, explain: string, world: WorldSpec, solution: WorldMove[]): WorldTask => ({ kind: "world", skill, prompt, hint, explain, world, solution });

export function patch(r: Rng, grade: GradeId, subtract: boolean, skill: string, ceiling?: number): WorldTask {
  const max = ceiling ?? (grade === "K" ? 10 : grade === "1" ? 20 : 1000);
  const start = r.int(subtract ? 4 : 1, subtract ? max : Math.floor(max / 2));
  const change = r.int(1, subtract ? start - 1 : Math.min(max - start, Math.floor(max / 2)));
  const target = start + (subtract ? -change : change), units = max <= 20 ? [1] : [100, 10, 1];
  let remaining = change;
  const solution = units.flatMap((unit) => { const n = Math.floor(remaining / unit); remaining %= unit; return repeats(subtract ? "remove" : "add", n, unit); });
  const bunnies = `${start} ${start === 1 ? "bunny is" : "bunnies are"} here. ${change} ${subtract ? (change === 1 ? "hops away" : "hop away") : (change === 1 ? "comes to play" : "come to play")}. Move the bunnies!`;
  return base(skill, grade === "K" ? bunnies : `The boat holds ${start} supplies. ${subtract ? "Unload" : "Load"} ${change} for Pip, then launch it.`,
    subtract ? "Move some out. Count what stays." : "Move some in. Watch the group grow.", `${start} ${subtract ? "−" : "+"} ${change} = ${target}.`,
    { game: "patch", start, target, capacity: max, units, emoji: grade === "K" ? "🐰" : "📦", operation: subtract ? "−" : "+", change }, solution);
}

export function sharing(r: Rng, grade: "3" | "4" | "5", skill: string): WorldTask {
  const groups = r.int(2, grade === "3" ? 5 : 6), each = r.int(2, grade === "3" ? 9 : grade === "4" ? 24 : 49);
  const remainder = grade === "3" ? 0 : r.int(1, groups - 1), total = groups * each + remainder, units = grade === "3" ? [1] : [10, 1];
  const solution = Array.from({ length: groups }, (_, index) => { let left = each; return units.flatMap((unit) => { const count = Math.floor(left / unit); left %= unit; return repeats("give", count, unit, index); }); }).flat();
  return base(skill, `Share ${total} power cells equally among ${groups} robots.${remainder ? " Leave only the cells that cannot be shared equally." : " Use every cell."}`,
    "Give the robots matching groups. You can take cells back and try again.", `${total} ÷ ${groups} = ${each}${remainder ? ` remainder ${remainder}` : ""}. Every robot gets ${each}.`,
    { game: "share", total, groups, remainder, units, emoji: "🔋" }, solution);
}

/** Whole tens stay whole tens: Grade 1 never has to unpack hundreds. */
export function tensCargo(r: Rng, subtract: boolean, skill: string, singleTen = false): WorldTask {
  const start = r.int(subtract ? 3 : 1, subtract ? 9 : 5) * 10;
  const change = (singleTen ? 1 : r.int(1, subtract ? start / 10 - 1 : Math.min(4, (100 - start) / 10))) * 10;
  const target = start + (subtract ? -change : change);
  return base(skill, `Pip’s boat has ${start} logs. ${subtract ? "Unload" : "Load"} ${change} logs in bundles of ten.`, "Each bundle holds ten. Watch how the tens change.", `${start} ${subtract ? "−" : "+"} ${change} = ${target}.`,
    {game:"patch", start, target, capacity:100, units:[10], emoji:"🪵",operation:subtract?"−":"+",change}, repeats(subtract?"remove":"add",change/10,10));
}

export function gateRun(r: Rng, grade: GradeId, skill: string): WorldTask {
  const older = Number(grade) >= 3, start = older ? r.int(2, 6) * 2 : r.int(3, 6), capacity = grade === "K" ? 10 : grade === "1" ? 20 : 100;
  const correct: Gate[] = older ? [{ op: "×", amount: r.int(2, 4) }, r.pick([{ op: "÷", amount: 2 }, { op: "−", amount: 1 }] as Gate[])] : [{ op: "+", amount: r.int(1, 3) }, { op: "−", amount: r.int(1, 2) }];
  let value = start;
  const solution: WorldMove[] = [];
  const gates = correct.map((gate) => {
    const alternate: Gate = { op: gate.op === "×" ? "+" : gate.op === "÷" ? "−" : gate.op === "+" ? "−" : "+", amount: gate.amount };
    const pair = r.shuffle([gate, alternate]); solution.push({ action: "gate", index: pair.indexOf(gate) }); value = operate(value, gate); return pair;
  });
  return base(skill, `Pilot Pip’s cart through the gates. Arrive with exactly ${value} crystals.`, "Look ahead at the next gates. Undo a move if your route needs changing.", `Your route takes ${start} crystals to ${value}. Different routes are welcome if they reach the same destination.`,
    { game: "gates", start, target: value, capacity, gates, emoji: "🚃" }, solution);
}

export function fractionBridge(r: Rng, grade: "1" | "2" | "3" | "4" | "5", skill: string, subtract = false): WorldTask {
  const scale = grade === "1" ? 4 : grade === "2" ? r.pick([3, 4]) : grade === "3" ? r.pick([4, 6, 8]) : grade === "4" ? 8 : 12;
  const a = grade === "5" ? r.pick([3, 6]) : r.int(2, scale - 1), b = grade === "5" ? (subtract ? 2 : 4) : 1;
  const target = Number(grade) < 4 ? scale : subtract ? a - b : a + b;
  const initial = subtract ? Array(a).fill(1) : [], pieces = [...new Set([scale / (grade === "2" && scale === 3 ? 3 : 2), scale / 4, 1].filter(Number.isInteger))].sort((x, y) => y - x);
  const fraction = (n: number) => { let x = n, y = scale; while (y) [x, y] = [y, x % y]; return `${n / x}/${scale / x}`; };
  const recipe = Number(grade) < 3 ? `Make a whole path from ${scale === 3 ? "thirds" : "halves and fourths"}.` : Number(grade) === 3 ? "Build one whole from equal fractional pieces." : `${grade === "5" ? fraction(a) : `${a}/${scale}`} ${subtract ? "−" : "+"} ${grade === "5" ? fraction(b) : `${b}/${scale}`}`;
  const solution = subtract ? repeats("undoPlank", a - target) : repeats("plank", target, 1, pieces.indexOf(1));
  const setting = ({1:"quilt",2:"garden",3:"beacon",4:"falls",5:"forge"} as const)[grade];
  const mission = {quilt:"Sew Pip’s friendship patch.",garden:"Join boards for the garden walkway.",beacon:"Repair a strip of lighthouse glass.",falls:"Build a water channel for the canyon village.",forge:"Forge a copper strip for the harbor bell."}[setting];
  return base(skill, `${mission} ${recipe}`, "The ruler shows one whole. Each piece is a part of that same whole.", `${target}/${scale} of a whole is ready. The pieces fit your plan.`,
    { game: "bridge", scale, target, initial, pieces, emoji: grade === "1" ? "🧚" : "☁️", recipe, words: Number(grade) < 3, setting }, solution);
}
