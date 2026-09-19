import { createRng, type Rng } from "../engine/rng";

export type GardenPuzzle = { kind: "garden"; area: number; perimeter: number | null; width: 5 };
export function gardenMeasure(cells: readonly number[], width = 5) {
  const set = new Set(cells.filter((n) => Number.isInteger(n) && n >= 0 && n < width * width));
  const neighbors = (n: number) => [n % width ? n - 1 : -1, n % width < width - 1 ? n + 1 : -1, n - width, n + width].filter((m) => set.has(m));
  const visited = new Set<number>();
  const pending = [...set].slice(0, 1);
  while (pending.length) { const n = pending.pop()!; if (visited.has(n)) continue; visited.add(n); pending.push(...neighbors(n).filter((m) => !visited.has(m))); }
  return { area: set.size, perimeter: [...set].reduce((sum, n) => sum + 4 - neighbors(n).length, 0), connected: set.size > 0 && visited.size === set.size };
}
export function gardenReady(p: GardenPuzzle, cells: readonly number[]) {
  const m = gardenMeasure(cells);
  return m.connected && m.area === p.area && (p.perimeter === null || m.perimeter === p.perimeter);
}
export type WaterPuzzle = { kind: "water"; capacities: [number, number]; target: number };
export type WaterAction = "fill-a" | "fill-b" | "empty-a" | "empty-b" | "pour-a" | "pour-b";
export const WATER_ACTIONS: WaterAction[] = ["fill-a", "fill-b", "empty-a", "empty-b", "pour-a", "pour-b"];
export const WATER_LABELS: Record<WaterAction, string> = { "fill-a": "Fill A", "fill-b": "Fill B", "empty-a": "Empty A", "empty-b": "Empty B", "pour-a": "Pour A → B", "pour-b": "Pour B → A" };
export function waterMove(p: WaterPuzzle, state: readonly number[], action: WaterAction): [number, number] {
  const [a, b] = state, [ca, cb] = p.capacities;
  if (action === "fill-a") return [ca, b!];
  if (action === "fill-b") return [a!, cb];
  if (action === "empty-a") return [0, b!];
  if (action === "empty-b") return [a!, 0];
  const amount = action === "pour-a" ? Math.min(a!, cb - b!) : Math.min(b!, ca - a!);
  return action === "pour-a" ? [a! - amount, b! + amount] : [a! + amount, b! - amount];
}
export const waterReady = (p: WaterPuzzle, state: readonly number[]) => state.includes(p.target);
/** A shortest legal route from the child's current state; Hoot never invents a move. */
export function waterSolution(p: WaterPuzzle, start: [number, number] = [0, 0]): WaterAction[] | null {
  const queue = [{ state: start, path: [] as WaterAction[] }], seen = new Set([start.join()]);
  for (let i = 0; i < queue.length; i++) {
    const { state, path } = queue[i]!;
    if (waterReady(p, state)) return path;
    for (const action of WATER_ACTIONS) { const next = waterMove(p, state, action), key = next.join(); if (!seen.has(key)) { seen.add(key); queue.push({ state: next, path: [...path, action] }); } }
  }
  return null;
}
export function frontierPuzzle(id: "garden" | "water", seed: number, round: number): GardenPuzzle | WaterPuzzle {
  const rng = createRng((seed + round * 7919) >>> 0);
  if (id === "garden") {
    const width = rng.int(round >= 3 ? 3 : 2, round >= 3 ? 4 : 3), height = rng.int(round === 0 ? 1 : 2, round === 0 ? 1 : round === 1 ? 2 : 3);
    return { kind: "garden", width: 5, area: width * height, perimeter: round < 2 ? null : 2 * (width + height) };
  }
  const pairs: [number, number][][] = [[[2, 3], [3, 4]], [[2, 5], [3, 5]], [[3, 5], [3, 7]], [[3, 5], [4, 7]]];
  const capacities = rng.pick(pairs[round % 4]!);
  const possibilities = Array.from({ length: capacities[1] - 1 }, (_, i) => i + 1).filter((target) => !capacities.includes(target));
  return { kind: "water", capacities, target: rng.pick(possibilities) };
}

export type CourierBoard = { walls: number[]; goals: number[]; boxes: number[]; player: number; width: 6 };
export type Direction = "up" | "down" | "left" | "right";
export const DIRECTIONS: Direction[] = ["up", "down", "left", "right"];
const DEPOTS = [
  ["######", "# .  #", "# $  #", "# @$ #", "#  . #", "######"],
  ["######", "#  . #", "#  $ #", "# #@ #", "#.$  #", "######"],
  ["######", "# . .#", "# $  #", "#  $ #", "# @  #", "######"],
];
export function courierBoard(seed: number, round: number): CourierBoard {
  const rng = createRng(seed), turns = rng.int(0, 3), mirror = rng.next() < .5;
  const transform = (i: number) => { let x = i % 6, y = Math.floor(i / 6); if (mirror) x = 5 - x; for (let t = 0; t < turns; t++) [x, y] = [5 - y, x]; return y * 6 + x; };
  const board: CourierBoard = { width: 6, walls: [], goals: [], boxes: [], player: 0 };
  DEPOTS[round % DEPOTS.length]!.join("").split("").forEach((c, i) => { const n = transform(i); if (c === "#") board.walls.push(n); if (c === ".") board.goals.push(n); if (c === "$") board.boxes.push(n); if (c === "@") board.player = n; });
  return board;
}
export function courierMove(b: CourierBoard, direction: Direction): CourierBoard | null {
  const offset = { up: -6, down: 6, left: -1, right: 1 }[direction], to = b.player + offset;
  const adjacent = (a: number, c: number) => c >= 0 && c < 36 && Math.abs(a % 6 - c % 6) + Math.abs(Math.floor(a / 6) - Math.floor(c / 6)) === 1;
  if (!adjacent(b.player, to) || b.walls.includes(to)) return null;
  const boxes = [...b.boxes], index = boxes.indexOf(to);
  if (index >= 0) { const pushed = to + offset; if (!adjacent(to, pushed) || b.walls.includes(pushed) || boxes.includes(pushed)) return null; boxes[index] = pushed; }
  return { ...b, player: to, boxes };
}
export const courierReady = (b: CourierBoard) => b.boxes.every((n) => b.goals.includes(n));
export function courierSolution(start: CourierBoard): Direction[] | null {
  const key = (b: CourierBoard) => `${b.player}:${[...b.boxes].sort((a, c) => a - c).join()}`;
  const queue = [{ board: start, path: [] as Direction[] }], seen = new Set([key(start)]);
  for (let i = 0; i < queue.length && i < 40000; i++) {
    const { board, path } = queue[i]!; if (courierReady(board)) return path;
    for (const dir of DIRECTIONS) { const next = courierMove(board, dir); if (next && !seen.has(key(next))) { seen.add(key(next)); queue.push({ board: next, path: [...path, dir] }); } }
  }
  return null;
}

export function popGroup(board: readonly number[], index: number): number[] {
  if (!Number.isInteger(index) || index < 0 || index >= 36) return [];
  const group = new Set<number>(), pending = [index];
  while (pending.length) { const n = pending.pop()!; if (group.has(n) || board[n] !== board[index]) continue; group.add(n); pending.push(...[n % 6 ? n - 1 : -1, n % 6 < 5 ? n + 1 : -1, n - 6, n + 6].filter((m) => m >= 0 && m < 36 && !group.has(m))); }
  return [...group];
}
export function popBoard(rng: Rng) { const board = Array.from({ length: 36 }, () => rng.int(0, 3)); board[1] = board[0]!; return board; }
export function popMove(board: readonly number[], index: number, rng: Rng) {
  const group = popGroup(board, index); if (group.length < 2) return null;
  const next = [...board];
  for (let col = 0; col < 6; col++) { const kept = Array.from({ length: 6 }, (_, row) => row * 6 + col).filter((n) => !group.includes(n)).map((n) => board[n]!); const column = [...Array.from({ length: 6 - kept.length }, () => rng.int(0, 3)), ...kept]; column.forEach((value, row) => { next[row * 6 + col] = value; }); }
  const reshuffled = !next.some((_, i) => popGroup(next, i).length >= 2);
  return { board: reshuffled ? popBoard(rng) : next, points: group.length * (group.length - 1), count: group.length, reshuffled };
}
