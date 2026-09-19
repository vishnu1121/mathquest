// Class chapters: the task shapes every grade shares, and the code that parses, checks and validates answers.
// Every task carries its own correct answer (and, for build tasks, a solution). Nothing about correctness is
// decided by the page or by AI: the runtime only draws a task and asks checkTask.

import { worldSolved, type WorldSpec, type WorldMove } from "./worlds";
export type Coin = "penny" | "nickel" | "dime" | "quarter" | "dollar";
export const COIN_CENTS: Record<Coin, number> = { penny: 1, nickel: 5, dime: 10, quarter: 25, dollar: 100 };

export type ShapeName =
  | "circle" | "oval" | "triangle" | "square" | "rectangle" | "rhombus" | "trapezoid" | "parallelogram" | "kite"
  | "pentagon" | "hexagon" | "octagon" | "rightTriangle" | "acuteTriangle" | "obtuseTriangle" | "heart" | "openShape";
export type SolidName = "cube" | "sphere" | "cone" | "cylinder" | "prism" | "pyramid";
export type Relation = "above" | "below" | "beside";
export type LineKind = "line" | "ray" | "segment" | "parallel" | "perpendicular" | "intersecting";

/** Pictures a task can show. The runtime draws each one with original SVG or emoji. */
export type Visual =
  | { type: "arithmetic"; a: string; b: string; op: "+" | "−" | "×" | "÷" }
  | { type: "factors"; total: number }
  | { type: "objects"; groups: { emoji: string; count: number; crossed?: number }[]; join?: "+" | "−" | "vs" }
  | { type: "tenFrame"; count: number; frames?: number }
  | { type: "blocks"; thousands?: number; hundreds?: number; tens: number; ones: number }
  | { type: "clock"; hour: number; minute: number }
  | { type: "coins"; coins: Coin[] }
  | { type: "graph"; kind: "bar" | "picture"; title: string; categories: { label: string; value: number; emoji: string }[]; scale: number }
  | { type: "linePlot"; title: string; ticks: string[]; counts: number[] }
  | { type: "fraction"; model: "bar" | "circle" | "rect"; parts: number; shaded: number; unequal?: boolean; wholes?: number }
  | { type: "shape"; shape: ShapeName; rotate?: number; symmetry?: "vertical" | "horizontal" | "diagonal" }
  | { type: "solid"; solid: SolidName }
  | { type: "array"; rows: number; cols: number; emoji: string }
  | { type: "rect"; width: number; height: number; unit: string; grid: boolean; labels: boolean }
  | { type: "grid"; size: number; points: { x: number; y: number; label: string }[] }
  | { type: "angle"; degrees: number; protractor: boolean }
  | { type: "ruler"; length: number; unit: "cm" | "in"; object: string }
  | { type: "cubes"; length: number; width: number; height: number }
  | { type: "lengths"; items: { label: string; length: number }[]; unit?: string }
  | { type: "lines"; kind: LineKind }
  | { type: "position"; thing: string; reference: string; relation: Relation }
  | { type: "scale"; left: string; right: string; heavier: "left" | "right" }
  | { type: "story"; emoji: string }
  | { type: "text"; text: string };

export type AnswerFormat = "int" | "decimal" | "fraction" | "time" | "money" | "remainder" | "pair";

export interface Option {
  id: string;
  label: string;
  visual?: Visual;
}
export interface Dial {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  start: number;
}
export type BuildGoal =
  | { type: "sum"; weights: Record<string, number>; target: number }
  | { type: "each"; values: Record<string, number> }
  | { type: "product"; ids: string[]; target: number; fixed?: Record<string, number> };
/** What the runtime draws while the child turns the dials. */
export type Live =
  | { type: "blocks" }
  | { type: "coins" }
  | { type: "clock" }
  | { type: "array"; emoji: string }
  | { type: "fraction"; model: "bar" | "circle" | "rect"; parts: number }
  | { type: "tenFrame"; base: number }
  | { type: "grid"; size: number; label: string }
  | { type: "angle" }
  | { type: "cubes" };

interface TaskBase {
  /** Which skill the answer is evidence for, e.g. "k.cc.count". */
  skill: string;
  prompt: string;
  visual?: Visual;
  /** A nudge that does not give the answer away. */
  hint: string;
  /** What the right answer is and why, shown after a second try or when the child asks to be shown. */
  explain: string;
  /** What the countable things are called on this board. Story Lab renames them to its own supplies. */
  supply?: { name: string; emoji: string };
}
export type ChoiceTask = TaskBase & { kind: "choice"; options: Option[]; answer: string };
export type NumberTask = TaskBase & { kind: "number"; answer: string; format: AnswerFormat; unit?: string; exact?: boolean };
export type LineTask = TaskBase & { kind: "line"; min: number; max: number; ticks: number; labels: { at: number; text: string }[]; marks?: { at: number; text: string }[]; answer: number };
export type SortTask = TaskBase & { kind: "sort"; bins: { id: string; label: string }[]; items: (Option & { bin: string })[] };
export type BuildTask = TaskBase & { kind: "build"; dials: Dial[]; goal: BuildGoal; solution: Record<string, number>; live: Live };
export type OrderTask = TaskBase & { kind: "order"; items: Option[]; answer: string[]; first: string; last: string };
/** Direct manipulation: selected objects, equal groups, fractional tiles or a map destination. */
export type SceneTask = TaskBase & {
  kind: "scene";
  mode: "collect" | "tenframe" | "balance" | "array" | "fraction" | "coordinate";
  emoji: string;
  size: number;
  columns: number;
  fixed: number;
  target: number;
  rows?: number;
  parts?: number;
  destination?: { x: number; y: number };
  /** Where the journey starts. The child works out the destination from here instead of reading a label. */
  origin?: { x: number; y: number; emoji: string };
};
export type WorldTask = TaskBase & { kind: "world"; world: WorldSpec; solution: WorldMove[] };
export type Task = ChoiceTask | NumberTask | LineTask | SortTask | BuildTask | OrderTask | SceneTask | WorldTask;

export type Response =
  | { kind: "choice"; id: string }
  | { kind: "number"; text: string }
  | { kind: "line"; value: number }
  | { kind: "sort"; placements: Record<string, string> }
  | { kind: "build"; values: Record<string, number> }
  | { kind: "order"; ids: string[] }
  | { kind: "scene"; selected: number[] }
  | { kind: "world"; moves: WorldMove[] };

// ---------- Answers ----------

const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));

function fractionParts(text: string): { whole: number; num: number; den: number } | null {
  const whole = /^(\d+)$/.exec(text);
  if (whole) return { whole: Number(whole[1]), num: 0, den: 1 };
  const m = /^(?:(\d+) )?(\d+) ?\/ ?(\d+)$/.exec(text);
  if (!m) return null;
  const den = Number(m[3]);
  return den > 0 ? { whole: m[1] ? Number(m[1]) : 0, num: Number(m[2]), den } : null;
}

/**
 * A canonical form of an answer, or null when the text is not an answer in that format.
 * Two answers are the same when their canonical forms match. Fractions compare by value unless exact.
 */
export function normalizeAnswer(raw: string, format: AnswerFormat, exact = false): string | null {
  const text = String(raw).trim().replace(/\s+/g, " ");
  switch (format) {
    case "int": {
      if (!/^\d{1,3}(,\d{3})+$|^\d+$/.test(text)) return null;
      return String(Number(text.replace(/,/g, "")));
    }
    case "decimal": {
      const m = /^(\d*)(?:\.(\d*))?$/.exec(text.replace(/,/g, ""));
      if (!m || (!m[1] && !m[2])) return null;
      const whole = String(Number(m[1] || "0"));
      const frac = (m[2] ?? "").replace(/0+$/, "");
      return frac ? `${whole}.${frac}` : whole;
    }
    case "fraction": {
      const f = fractionParts(text);
      if (!f) return null;
      if (exact) return f.num === 0 ? String(f.whole) : `${f.whole ? `${f.whole} ` : ""}${f.num}/${f.den}`;
      const num = f.whole * f.den + f.num, g = gcd(num, f.den) || 1;
      return f.den / g === 1 ? String(num / g) : `${num / g}/${f.den / g}`;
    }
    case "time": {
      const m = /^(\d{1,2}):(\d{2})$/.exec(text);
      if (!m) return null;
      const hour = Number(m[1]), minute = Number(m[2]);
      return hour >= 1 && hour <= 12 && minute < 60 ? `${hour}:${String(minute).padStart(2, "0")}` : null;
    }
    case "money": {
      const dollars = /^\$? ?(\d+)(?:\.(\d{1,2}))?$/.exec(text);
      if (dollars) return String(Number(dollars[1]) * 100 + Number((dollars[2] ?? "0").padEnd(2, "0")));
      const cents = /^(\d+) ?(?:¢|c|cents?)$/i.exec(text);
      return cents ? String(Number(cents[1])) : null;
    }
    case "remainder": {
      const m = /^(\d+)(?: ?(?:r|R|rem|remainder) ?(\d+))?$/.exec(text);
      return m ? `${Number(m[1])}R${Number(m[2] ?? "0")}` : null;
    }
    case "pair": {
      const m = /^\(? ?(\d+) ?, ?(\d+) ?\)?$/.exec(text);
      return m ? `${Number(m[1])},${Number(m[2])}` : null;
    }
  }
}

export const tickValue = (task: Pick<LineTask, "min" | "max" | "ticks">, index: number): number => task.min + (index * (task.max - task.min)) / task.ticks;
const same = (a: number, b: number) => Math.abs(a - b) < 1e-9;

export function buildSolved(goal: BuildGoal, values: Record<string, number>): boolean {
  const v = (id: string) => values[id] ?? NaN;
  if (goal.type === "sum") return Object.entries(goal.weights).reduce((total, [id, w]) => total + v(id) * w, 0) === goal.target;
  if (goal.type === "each") return Object.entries(goal.values).every(([id, want]) => v(id) === want);
  const fixedOk = Object.entries(goal.fixed ?? {}).every(([id, want]) => v(id) === want);
  return fixedOk && goal.ids.reduce((product, id) => product * v(id), 1) === goal.target;
}

export function checkTask(task: Task, response: Response): boolean {
  if (response.kind !== task.kind) return false;
  switch (task.kind) {
    case "world": return worldSolved(task.world, (response as Extract<Response, { kind: "world" }>).moves);
    case "scene": {
      const selected = (response as Extract<Response, { kind: "scene" }>).selected;
      if (new Set(selected).size !== selected.length || selected.some((n) => !Number.isInteger(n) || n < 0 || n >= task.size)) return false;
      if (task.mode === "coordinate") return selected.length === 1 && selected[0] === task.target;
      if (task.mode === "array") return selected.length === task.target && Array.from({ length: task.rows! }, (_, row) => selected.filter((n) => Math.floor(n / task.columns) === row).length).every((n) => n === task.target / task.rows!);
      return selected.length + task.fixed === task.target;
    }
    case "choice":
      return (response as Extract<Response, { kind: "choice" }>).id === task.answer;
    case "number": {
      const got = normalizeAnswer((response as Extract<Response, { kind: "number" }>).text, task.format, task.exact);
      return got !== null && got === normalizeAnswer(task.answer, task.format, task.exact);
    }
    case "line":
      return same((response as Extract<Response, { kind: "line" }>).value, task.answer);
    case "sort": {
      const placements = (response as Extract<Response, { kind: "sort" }>).placements;
      return task.items.every((item) => placements[item.id] === item.bin);
    }
    case "build":
      { const values = (response as Extract<Response, { kind: "build" }>).values;
        return task.dials.every((d) => Number.isFinite(values[d.id]) && values[d.id]! >= d.min && values[d.id]! <= d.max && same((values[d.id]! - d.min) / d.step, Math.round((values[d.id]! - d.min) / d.step))) && buildSolved(task.goal, values); }
    case "order": {
      const ids = (response as Extract<Response, { kind: "order" }>).ids;
      return ids.length === task.answer.length && ids.every((id, i) => id === task.answer[i]);
    }
  }
}

/** The response a child would give to be right. Used by "Show me" and by tests. */
export function correctResponse(task: Task): Response {
  switch (task.kind) {
    case "world": return { kind: "world", moves: task.solution.map((m) => ({ ...m })) };
    case "scene": return { kind: "scene", selected: task.mode === "coordinate" ? [task.target] : task.mode === "array" ? Array.from({ length: task.rows! }, (_, row) => Array.from({ length: task.target / task.rows! }, (_, col) => row * task.columns + col)).flat() : Array.from({ length: task.target - task.fixed }, (_, i) => i) };
    case "choice": return { kind: "choice", id: task.answer };
    case "number": return { kind: "number", text: task.answer };
    case "line": return { kind: "line", value: task.answer };
    case "sort": return { kind: "sort", placements: Object.fromEntries(task.items.map((item) => [item.id, item.bin])) };
    case "build": return { kind: "build", values: { ...task.solution } };
    case "order": return { kind: "order", ids: [...task.answer] };
  }
}

/** Every problem with a generated task. An empty list means the task is sound and has exactly one right answer path. */
export function validateTask(task: Task): string[] {
  const problems: string[] = [];
  if (!task.prompt.trim() || !task.hint.trim() || !task.explain.trim() || !task.skill.trim()) problems.push("missing text");
  const unique = (list: string[]) => new Set(list).size === list.length;
  switch (task.kind) {
    case "world":
      if (!worldSolved(task.world, task.solution)) problems.push("world has no legal solution");
      if (worldSolved(task.world, [])) problems.push("world starts solved");
      break;
    case "scene":
      if (!Number.isInteger(task.size) || task.size < 1 || task.size > 121 || task.columns < 1 || task.columns > 11) problems.push("invalid scene size");
      if (!checkTask(task, correctResponse(task))) problems.push("scene has no valid solution");
      if (checkTask(task, { kind: "scene", selected: [] })) problems.push("scene starts solved");
      if (task.mode === "array" && (!task.rows || task.target % task.rows || task.size !== task.rows * task.columns)) problems.push("invalid equal groups");
      break;
    case "choice":
      if (task.options.length < 2 || task.options.length > 4) problems.push("choice needs 2 to 4 options");
      if (!unique(task.options.map((o) => o.id)) || !unique(task.options.map((o) => o.label))) problems.push("duplicate options");
      if (!task.options.some((o) => o.id === task.answer)) problems.push("answer is not an option");
      break;
    case "number":
      if (normalizeAnswer(task.answer, task.format, task.exact) === null) problems.push(`answer ${task.answer} is not a ${task.format}`);
      break;
    case "line": {
      if (task.ticks < 2 || task.ticks > 24 || task.max <= task.min) problems.push("bad number line");
      const onTick = Array.from({ length: task.ticks + 1 }, (_, i) => tickValue(task, i)).some((t) => same(t, task.answer));
      if (!onTick) problems.push("answer is not on a tick");
      break;
    }
    case "sort":
      if (task.bins.length < 2 || !unique(task.bins.map((b) => b.id))) problems.push("sort needs distinct bins");
      if (task.items.length < 3 || !unique(task.items.map((i) => i.id))) problems.push("sort needs distinct items");
      if (!task.items.every((i) => task.bins.some((b) => b.id === i.bin))) problems.push("item in a missing bin");
      if (new Set(task.items.map((i) => i.bin)).size < 2) problems.push("every item belongs in one bin");
      break;
    case "build": {
      if (task.dials.length < 1 || task.dials.length > 4 || !unique(task.dials.map((d) => d.id))) problems.push("bad dials");
      for (const dial of task.dials) {
        const value = task.solution[dial.id];
        if (value === undefined || value < dial.min || value > dial.max || !same(((value - dial.min) / dial.step) % 1, 0)) problems.push(`solution for ${dial.id} is off the dial`);
        if (dial.start < dial.min || dial.start > dial.max) problems.push(`start for ${dial.id} is off the dial`);
      }
      if (!buildSolved(task.goal, task.solution)) problems.push("solution does not meet the goal");
      if (buildSolved(task.goal, Object.fromEntries(task.dials.map((d) => [d.id, d.start])))) problems.push("already solved at the start");
      break;
    }
    case "order":
      if (task.items.length < 3 || !unique(task.items.map((i) => i.id))) problems.push("order needs 3 or more items");
      if (task.answer.length !== task.items.length || !task.items.every((i) => task.answer.includes(i.id))) problems.push("answer is not a full order");
      if (task.items.every((item, i) => item.id === task.answer[i])) problems.push("items start in the right order");
      break;
  }
  return problems;
}
