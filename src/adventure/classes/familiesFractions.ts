// Task families for fractions: partitions, unit fractions, the number line, equivalence, comparing, adding,
// multiplying, dividing and line plots with fractional data.
import type { Rng } from "../../engine/rng";
import { choose, fractionText, lcm } from "./kit";
import type { NumberTask, Option, Task, Visual } from "./tasks";

const fractionNum = (skill: string, prompt: string, answer: string, hint: string, explain: string, visual?: Visual): Task => {
  const task: NumberTask = { kind: "number", skill, prompt, answer, format: "fraction", hint, explain };
  return visual ? { ...task, visual } : task;
};
const PART_WORDS: Record<number, [string, string]> = { 2: ["halves", "one half"], 3: ["thirds", "one third"], 4: ["fourths", "one fourth"], 6: ["sixths", "one sixth"], 8: ["eighths", "one eighth"] };

export function partitionChoice(rng: Rng, skill: string, parts: number[]): Task {
  const target = rng.pick(parts);
  const other = rng.pick(parts.filter((p) => p !== target));
  const visuals: { visual: Visual; right: boolean }[] = rng.shuffle([
    { visual: { type: "fraction", model: "rect", parts: target, shaded: 0 }, right: true },
    { visual: { type: "fraction", model: "rect", parts: target, shaded: 0, unequal: true }, right: false },
    { visual: { type: "fraction", model: "rect", parts: other, shaded: 0 }, right: false },
  ]);
  const options: Option[] = visuals.map((v, i) => ({ id: `o${i}`, label: `Shape ${"ABC"[i]}`, visual: v.visual }));
  const answer = options[visuals.findIndex((v) => v.right)]!.id;
  const [word] = PART_WORDS[target]!;
  return { kind: "choice", skill, prompt: `Which shape is cut into ${word}?`, options, answer, hint: `${word[0]!.toUpperCase()}${word.slice(1)} means ${target} parts that are all the same size.`, explain: `${word[0]!.toUpperCase()}${word.slice(1)} are ${target} equal parts. A shape with ${target} unequal parts is not cut into ${word}.` };
}

export function partName(rng: Rng, skill: string, parts: number[]): Task {
  const d = rng.pick(parts), answer = PART_WORDS[d]![1];
  return {
    kind: "choice", skill, prompt: "The shape is cut into equal parts. What is the shaded part called?",
    visual: { type: "fraction", model: rng.next() < 0.5 ? "rect" : "circle", parts: d, shaded: 1 },
    ...choose(rng, answer, parts.filter((p) => p !== d).map((p) => PART_WORDS[p]![1])),
    hint: "Count how many equal parts make the whole shape.", explain: `The whole has ${d} equal parts, so one part is ${answer}.`,
  };
}

export function shadeFraction(rng: Rng, skill: string, dens: number[], unitOnly = false): Task {
  const d = rng.pick(dens), n = unitOnly ? 1 : rng.int(1, d - 1), model = rng.pick(["bar", "circle", "rect"] as const);
  return {
    kind: "build", skill, prompt: `Shade ${n}/${d} of the ${model === "circle" ? "pizza" : "bar"}.`,
    dials: [{ id: "shaded", label: "Shaded parts", min: 0, max: d, step: 1, start: 0 }],
    goal: { type: "each", values: { shaded: n } }, solution: { shaded: n }, live: { type: "fraction", model, parts: d },
    hint: `The bottom number, ${d}, is how many equal parts. The top number is how many to shade.`, explain: `${n}/${d} means ${n} of ${d} equal parts.`,
  };
}

export function fractionOnLine(rng: Rng, skill: string, dens: number[], wholes: number): Task {
  const d = rng.pick(dens);
  let n = rng.int(1, d * wholes - 1);
  if (n % d === 0) n += 1;
  return {
    kind: "line", skill, min: 0, max: wholes, ticks: d * wholes, answer: n / d,
    labels: Array.from({ length: wholes + 1 }, (_, w) => ({ at: w, text: String(w) })),
    prompt: `Tap ${n}/${d} on the number line.`, hint: `Each whole is cut into ${d} equal jumps. Count ${n} ${n === 1 ? "jump" : "jumps"} from 0.`, explain: `${n}/${d} is ${n} ${n === 1 ? "jump" : "jumps"} of 1/${d} from 0.`,
  };
}

export function equivalentNumerator(rng: Rng, skill: string, dens: number[], maxFactor: number, allowedDenominators?: number[]): Task {
  const pairs = dens.flatMap((b) => Array.from({ length: maxFactor - 1 }, (_, i) => [b, i + 2] as const)).filter(([b, k]) => !allowedDenominators || allowedDenominators.includes(b * k));
  const [b, k] = rng.pick(pairs), a = rng.int(1, b - 1);
  return {
    kind: "number", skill, format: "int", answer: String(a * k), prompt: `Fill in the missing number: ${a}/${b} = ?/${b * k}`,
    visual: { type: "fraction", model: "bar", parts: b, shaded: a },
    hint: `The bottom number was multiplied by ${k}. Do the same to the top.`, explain: `${a} × ${k} = ${a * k}, so ${a}/${b} = ${a * k}/${b * k}. Cutting each part into ${k} pieces does not change the amount.`,
  };
}

export function compareFractions(rng: Rng, skill: string, mode: "sameDen" | "sameNum" | "unlike"): Task {
  let a: number, b: number, c: number, d: number, reason: string;
  if (mode === "sameDen") {
    // Grade 3 keeps to halves, thirds, fourths, sixths and eighths.
    b = d = rng.pick([3, 4, 6, 8]); a = rng.int(1, b - 1); c = rng.int(1, b - 1);
    reason = "The pieces are the same size, so more pieces is more.";
  } else if (mode === "sameNum") {
    a = c = rng.int(1, 3); const dens = rng.shuffle([2, 3, 4, 6, 8].filter((x) => x > a)); b = dens[0]!; d = dens[1]!;
    reason = "The same number of pieces, but more pieces in a whole means each piece is smaller.";
  } else {
    const pair = rng.shuffle([2, 3, 4, 5, 6, 8, 10, 12]); b = pair[0]!; d = pair[1]!; a = rng.int(1, b - 1); c = rng.int(1, d - 1);
    if (rng.next() < 0.2 && d % b === 0) c = (a * d) / b;
    reason = `Rename both with a common denominator of ${lcm(b, d)}: ${a * (lcm(b, d) / b)}/${lcm(b, d)} and ${c * (lcm(b, d) / d)}/${lcm(b, d)}.`;
  }
  const left = a * d, right = c * b, sign = left < right ? "<" : left > right ? ">" : "=";
  return { kind: "choice", skill, prompt: "Which sign makes this true?", visual: { type: "text", text: `${a}/${b}   ?   ${c}/${d}` }, ...choose(rng, sign, ["<", ">", "="]), hint: mode === "sameDen" ? "Same size pieces: who has more of them?" : mode === "sameNum" ? "Same number of pieces: which pieces are bigger?" : "Make the pieces the same size first.", explain: `${a}/${b} ${sign} ${c}/${d}. ${reason}` };
}

export function addLikeFractions(rng: Rng, skill: string, op: "+" | "−"): Task {
  const d = rng.pick([3, 4, 5, 6, 8, 10, 12]);
  let a = rng.int(1, d - 1), c = rng.int(1, d - 1);
  if (op === "−" && a <= c) [a, c] = c === a ? [a, Math.max(1, a - 1)] : [c, a];
  if (op === "−" && a === c) a = Math.min(d - 1, a + 1);
  const n = op === "+" ? a + c : a - c;
  return fractionNum(skill, `Solve: ${a}/${d} ${op} ${c}/${d}`, `${n}/${d}`, "The pieces are the same size. Add or subtract how many pieces; the denominator stays the same.", `${a}/${d} ${op} ${c}/${d} = ${n}/${d}${fractionText(n, d) !== `${n}/${d}` ? ` = ${fractionText(n, d)}` : ""}.`, { type: "text", text: `${a}/${d} ${op} ${c}/${d} = ?` });
}

export function mixedNumberChoice(rng: Rng, skill: string): Task {
  const d = rng.int(3, 8), w = rng.int(1, 4), n = rng.int(1, d - 1), improper = w * d + n;
  const answer = `${w} ${n}/${d}`;
  const others = [`${w + 1} ${n}/${d}`, n * 2 < d ? `${w} ${n + 1}/${d}` : `${w} ${n - 1}/${d}`].filter((o) => o !== answer && !o.includes(" 0/"));
  return { kind: "choice", skill, prompt: `Which mixed number equals ${improper}/${d}?`, ...choose(rng, answer, others), hint: `How many whole groups of ${d}/${d} fit in ${improper}/${d}?`, explain: `${improper}/${d} is ${w} ${w === 1 ? "whole" : "wholes"} (${w * d}/${d}) and ${n}/${d} more, so ${answer}.` };
}

export function addMixed(rng: Rng, skill: string): Task {
  const d = rng.int(3, 8), w1 = rng.int(1, 3), w2 = rng.int(1, 3), n1 = rng.int(1, d - 1), n2 = rng.int(1, d - 1), total = (w1 + w2) * d + n1 + n2;
  return fractionNum(skill, `Solve: ${w1} ${n1}/${d} + ${w2} ${n2}/${d}. You can write a mixed number like 3 1/4.`, `${total}/${d}`, "Add the wholes, then add the pieces. Extra pieces can make another whole.", `Wholes: ${w1} + ${w2} = ${w1 + w2}. Pieces: ${n1}/${d} + ${n2}/${d} = ${n1 + n2}/${d}. Total: ${Math.floor(total / d)}${total % d ? ` ${total % d}/${d}` : ""}.`, { type: "text", text: `${w1} ${n1}/${d} + ${w2} ${n2}/${d} = ?` });
}

export function fractionTimesWhole(rng: Rng, skill: string): Task {
  const k = rng.int(2, 6), b = rng.pick([3, 4, 5, 6, 8]), a = rng.int(1, b - 1);
  return fractionNum(skill, `Solve: ${k} × ${a}/${b}`, `${k * a}/${b}`, `${k} × ${a}/${b} is ${k} groups of ${a}/${b}.`, `${k} × ${a}/${b} = ${k * a}/${b}${fractionText(k * a, b) !== `${k * a}/${b}` ? ` = ${fractionText(k * a, b)}` : ""}.`, { type: "text", text: `${k} × ${a}/${b} = ?` });
}

export function addUnlikeFractions(rng: Rng, skill: string, op: "+" | "−"): Task {
  let a = 1, b = 2, c = 1, d = 3;
  for (let tries = 0; tries < 40; tries++) {
    [b, d] = rng.shuffle([2, 3, 4, 5, 6, 8, 10, 12]) as [number, number];
    a = rng.int(1, b - 1); c = rng.int(1, d - 1);
    if (lcm(b, d) <= 24 && (op === "+" || a * d > c * b)) break;
  }
  if (op === "−" && a * d <= c * b) { [a, b, c, d] = [c, d, a, b]; }
  const L = lcm(b, d), n = op === "+" ? a * (L / b) + c * (L / d) : a * (L / b) - c * (L / d);
  return fractionNum(skill, `Solve: ${a}/${b} ${op} ${c}/${d}`, `${n}/${L}`, "Rename both fractions so the pieces are the same size.", `${a}/${b} = ${a * (L / b)}/${L} and ${c}/${d} = ${c * (L / d)}/${L}. ${a * (L / b)}/${L} ${op} ${c * (L / d)}/${L} = ${n}/${L}${fractionText(n, L) !== `${n}/${L}` ? ` = ${fractionText(n, L)}` : ""}.`, { type: "text", text: `${a}/${b} ${op} ${c}/${d} = ?` });
}

export function shareAsFraction(rng: Rng, skill: string): Task {
  const friends = rng.int(2, 8);
  let pizzas = rng.int(1, friends + 3);
  if (pizzas === friends) pizzas += 1;
  return fractionNum(skill, `${friends} friends share ${pizzas} ${pizzas === 1 ? "pizza" : "pizzas"} equally. How much pizza does each friend get?`, `${pizzas}/${friends}`, "Sharing is dividing: pizzas ÷ friends.", `${pizzas} ÷ ${friends} = ${pizzas}/${friends}${pizzas > friends ? ` = ${Math.floor(pizzas / friends)} ${pizzas % friends}/${friends}` : ""} of a pizza each.`, { type: "story", emoji: "🍕" });
}

export function multiplyFractions(rng: Rng, skill: string, ofWhole: boolean): Task {
  if (ofWhole) {
    const b = rng.pick([2, 3, 4, 5, 6, 8]), a = rng.int(1, b - 1), n = b * rng.int(2, 6);
    return fractionNum(skill, `What is ${a}/${b} of ${n}?`, String((a * n) / b), `Find 1/${b} of ${n} first, then take ${a} of those.`, `1/${b} of ${n} is ${n / b}, so ${a}/${b} of ${n} is ${a} × ${n / b} = ${(a * n) / b}.`, { type: "text", text: `${a}/${b} × ${n} = ?` });
  }
  const b = rng.pick([2, 3, 4, 5, 6]), d = rng.pick([2, 3, 4, 5, 6]), a = rng.int(1, b - 1), c = rng.int(1, d - 1);
  return fractionNum(skill, `Solve: ${a}/${b} × ${c}/${d}`, `${a * c}/${b * d}`, "Multiply the tops, then multiply the bottoms.", `${a} × ${c} = ${a * c} and ${b} × ${d} = ${b * d}, so the answer is ${a * c}/${b * d}${fractionText(a * c, b * d) !== `${a * c}/${b * d}` ? `, which is the same as ${fractionText(a * c, b * d)}` : ""}.`, { type: "text", text: `${a}/${b} × ${c}/${d} = ?` });
}

export function scalingChoice(rng: Rng, skill: string): Task {
  const n = rng.int(3, 20), kind = rng.pick(["less", "more", "same"] as const);
  const d = rng.pick([3, 4, 5, 6, 8]);
  const factor = kind === "less" ? `${rng.int(1, d - 1)}/${d}` : kind === "more" ? `${d + rng.int(1, d - 1)}/${d}` : `${d}/${d}`;
  const labels = { less: `Less than ${n}`, more: `Greater than ${n}`, same: `Equal to ${n}` };
  return { kind: "choice", skill, prompt: `Without multiplying: is ${n} × ${factor} greater than, less than, or equal to ${n}?`, ...choose(rng, labels[kind], Object.values(labels)), hint: `Is ${factor} less than 1, equal to 1, or more than 1?`, explain: `${factor} is ${kind === "less" ? "less than 1, so the product is less than" : kind === "more" ? "more than 1, so the product is greater than" : "equal to 1, so the product equals"} ${n}.` };
}

export function divideUnitFraction(rng: Rng, skill: string): Task {
  const b = rng.int(2, 9), n = rng.int(2, 9);
  if (rng.next() < 0.5) return fractionNum(skill, `Solve: 1/${b} ÷ ${n}`, `1/${b * n}`, `Share 1/${b} into ${n} equal parts. How big is each part?`, `1/${b} split into ${n} equal parts makes pieces of 1/${b * n}. Check: ${n} × 1/${b * n} = 1/${b}.`, { type: "text", text: `1/${b} ÷ ${n} = ?` });
  return fractionNum(skill, `Solve: ${n} ÷ 1/${b}`, String(n * b), `How many 1/${b} pieces fit in ${n} wholes?`, `Each whole has ${b} pieces of 1/${b}, so ${n} wholes have ${n * b}. Check: ${n * b} × 1/${b} = ${n}.`, { type: "text", text: `${n} ÷ 1/${b} = ?` });
}

export function linePlotFractions(rng: Rng, skill: string, grade: 4 | 5): Task {
  const ticks = ["1/8", "2/8", "3/8", "4/8", "5/8"];
  const kind = grade === 4 ? rng.pick(["count", "difference"] as const) : rng.pick(["total", "share"] as const);
  // Data spans a random stretch of the plot, so the shortest and longest seedlings change from task to task.
  const makeCounts = () => {
    const lo = rng.int(0, 2), hi = rng.int(Math.max(lo + 2, 2), 4);
    const out = ticks.map((_, i) => (i < lo || i > hi ? 0 : rng.int(0, 3)));
    out[lo] = rng.int(1, 3); out[hi] = rng.int(1, 3);
    return out;
  };
  let counts = makeCounts();
  // Sharing equally gives a friendly answer: the total length divides evenly among the seedlings.
  const eighthsOf = (c: number[]) => c.reduce((sum, n, i) => sum + (i + 1) * n, 0), plantsOf = (c: number[]) => c.reduce((a, b) => a + b, 0);
  for (let tries = 0; kind === "share" && tries < 60 && eighthsOf(counts) % plantsOf(counts) !== 0; tries++) counts = makeCounts();
  const visual: Visual = { type: "linePlot", title: "Length of our seedlings (inches)", ticks, counts };
  const withCount = ticks.map((t, i) => ({ t, i, c: counts[i]! })).filter((x) => x.c > 0);
  if (kind === "count") {
    const pickTick = rng.pick(withCount);
    return { kind: "number", skill, format: "int", answer: String(pickTick.c), prompt: `How many seedlings are ${pickTick.t} inch long?`, visual, hint: `Count the marks above ${pickTick.t}.`, explain: `There are ${pickTick.c} marks above ${pickTick.t}.` };
  }
  const longest = withCount[withCount.length - 1]!, shortest = withCount[0]!;
  if (kind === "difference") return fractionNum(skill, "How much longer is the longest seedling than the shortest one?", `${longest.i - shortest.i}/8`, "Find the longest and the shortest marks, then subtract.", `${longest.t} − ${shortest.t} = ${fractionText(longest.i - shortest.i, 8)} inch.`, visual);
  const eighths = withCount.reduce((sum, x) => sum + (x.i + 1) * x.c, 0), plants = withCount.reduce((sum, x) => sum + x.c, 0);
  const mixed = eighths % 8 === 0 ? String(eighths / 8) : `${Math.floor(eighths / 8) ? `${Math.floor(eighths / 8)} ` : ""}${fractionText(eighths % 8, 8)}`;
  if (kind === "total") return fractionNum(skill, "Put all the seedlings end to end. How long is that in inches?", `${eighths}/8`, "Multiply each length by how many seedlings have it, then add.", `The lengths add up to ${eighths}/8${mixed !== `${eighths}/8` ? `, which is ${mixed}` : ""} inches.`, visual);
  return fractionNum(skill, `If the total length were shared equally by all ${plants} seedlings, how long would each one be?`, `${eighths}/${8 * plants}`, "Find the total length, then divide by the number of seedlings.", `The total is ${eighths}/8 inches. ${eighths}/8 ÷ ${plants} = ${fractionText(eighths, 8 * plants)} inch each.`, visual);
}
