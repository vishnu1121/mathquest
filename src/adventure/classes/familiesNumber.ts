// Task families for numbers: counting, comparing, the four operations, place value, decimals and expressions.
// Each family takes a seeded Rng plus the grade's limits and returns one Task with its answer.
import type { Rng } from "../../engine/rng";
import { arithmeticModel } from "./mathModels";
import { EMOJI, THINGS, choose, decimalText, fmt, near, scrambled, twoNames } from "./kit";
import type { NumberTask, Task } from "./tasks";

const num = (skill: string, prompt: string, answer: number | string, hint: string, explain: string, extra: Partial<NumberTask> = {}): Task => ({
  kind: "number", skill, prompt, answer: String(answer), format: "int", hint, explain, ...extra,
});
const show = (text: string): Partial<NumberTask> => ({ visual: arithmeticModel(text) || { type: "text", text } });

// ---------- Counting and comparing ----------

export function countObjects(rng: Rng, skill: string, min: number, max: number): Task {
  const count = rng.int(min, max), emoji = rng.pick(EMOJI);
  return num(skill, `How many ${emoji} are there? Write the number.`, count, "Touch each one as you count. Say one number for each.", `Counting one by one, there are ${count}.`, { visual: { type: "objects", groups: [{ emoji, count }] } });
}

export function countOnLine(rng: Rng, skill: string, maxStart: number): Task {
  const start = rng.int(1, maxStart), min = Math.max(0, start - 2), max = min + 12, hop = rng.int(2, Math.min(8, max - start));
  return {
    kind: "line", skill, min, max, ticks: 12, answer: start + hop,
    labels: Array.from({ length: 13 }, (_, i) => ({ at: min + i, text: String(min + i) })),
    prompt: `Start at ${start}. Hop forward ${hop}. Tap where you land.`,
    hint: `Put your finger on ${start}, then count ${hop} hops, one number for each hop.`,
    explain: `From ${start}, count on ${Array.from({ length: hop }, (_, i) => start + i + 1).join(", ")}. You land on ${start + hop}.`,
  };
}

export function nextInSequence(rng: Rng, skill: string, step: number, max: number, anyStart = false): Task {
  const lastStart = max - 4 * step;
  const start = anyStart ? rng.int(1, lastStart) : rng.int(0, Math.floor(lastStart / step)) * step;
  const shown = [0, 1, 2, 3].map((i) => start + i * step), answer = start + 4 * step;
  const by = step === 1 ? "ones" : `${step}s`;
  return num(skill, `What number comes next when you count by ${by}?`, answer, step === 1 ? "Say the numbers out loud and keep counting." : `Each number is ${step} more than the one before.`, `Counting by ${by}, after ${fmt(shown[3]!)} comes ${fmt(answer)}.`, show(`${shown.map(fmt).join(", ")}, ?`));
}

export function orderNumbers(rng: Rng, skill: string, values: number[], prompt: string, hint: string): Task {
  const sorted = [...new Set(values)].sort((a, b) => a - b);
  const items = sorted.map((v, i) => ({ id: `n${i}`, label: fmt(v) }));
  const shown = scrambled(rng, items, (list) => list.every((item, i) => item.id === items[i]!.id));
  return { kind: "order", skill, prompt, items: shown, answer: items.map((i) => i.id), first: "smallest", last: "greatest", hint, explain: `From smallest to greatest: ${sorted.map(fmt).join(", ")}.` };
}

export function tensInOrder(rng: Rng, skill: string): Task {
  const start = rng.int(0, 5) * 10;
  return orderNumbers(rng, skill, [1, 2, 3, 4, 5].map((i) => start + i * 10), "Put the tens in counting order.", "Count by tens: 10, 20, 30, 40…");
}

export function compareGroups(rng: Rng, skill: string, max: number, ask: "more" | "fewer"): Task {
  const [e1, e2] = rng.shuffle(EMOJI) as [string, string];
  const a = rng.int(1, max);
  let b = rng.next() < 0.2 ? a : rng.int(1, max);
  if (b === a && rng.next() < 0.5) b = a === max ? a - 1 : a + 1;
  const labelA = `The ${e1} group`, labelB = `The ${e2} group`, same = "They are the same";
  const answer = a === b ? same : (ask === "more") === (a > b) ? labelA : labelB;
  return {
    kind: "choice", skill, prompt: `Which group has ${ask}?`,
    visual: { type: "objects", groups: [{ emoji: e1, count: a }, { emoji: e2, count: b }], join: "vs" },
    ...choose(rng, answer, [labelA, labelB, same]),
    hint: `Match one ${e1} with one ${e2}. Look for a group with some left over.`,
    explain: a === b ? `There are ${a} of each, so the groups are the same.` : `There are ${a} ${e1} and ${b} ${e2}. ${ask === "more" ? `${Math.max(a, b)} is more than ${Math.min(a, b)}` : `${Math.min(a, b)} is fewer than ${Math.max(a, b)}`}.`,
  };
}

export function greaterNumber(rng: Rng, skill: string, max: number): Task {
  const a = rng.int(1, max);
  let b = rng.int(1, max);
  while (b === a) b = rng.int(1, max);
  const big = Math.max(a, b), small = Math.min(a, b);
  return { kind: "choice", skill, prompt: "Which number is greater?", ...choose(rng, String(big), [String(small)]), hint: "Count up from 1. The number you say later is greater.", explain: `${big} comes after ${small} when you count, so ${big} is greater.` };
}

export function compareSymbols(rng: Rng, skill: string, lo: number, hi: number): Task {
  const a = rng.int(lo, hi);
  let b = rng.int(lo, hi);
  const roll = rng.next();
  if (roll < 0.15) b = a;
  else if (roll < 0.6) {
    // Numbers that share a leading digit make the comparison worth thinking about.
    const place = 10 ** Math.max(0, String(a).length - 2);
    b = Math.min(hi, Math.max(lo, a + rng.pick([-1, 1]) * place * rng.int(1, 3)));
  }
  const sign = a < b ? "<" : a > b ? ">" : "=";
  const words: Record<string, string> = { "<": "is less than", ">": "is greater than", "=": "is equal to" };
  return {
    kind: "choice", skill, prompt: "Which sign makes this true?", visual: { type: "text", text: `${fmt(a)}   ?   ${fmt(b)}` },
    ...choose(rng, sign, ["<", ">", "="]),
    hint: "Compare the biggest place first. If those digits match, look at the next place.",
    explain: `${fmt(a)} ${words[sign]} ${fmt(b)}, so ${fmt(a)} ${sign} ${fmt(b)}.`,
  };
}

// ---------- Adding and subtracting ----------

export function addPictures(rng: Rng, skill: string, max: number): Task {
  const a = rng.int(1, max - 1), b = rng.int(1, max - a), emoji = rng.pick(EMOJI);
  return num(skill, `${a} ${emoji} and ${b} more ${emoji}. How many in all?`, a + b, "Count the first group, then keep counting the second group.", `${a} + ${b} = ${a + b}.`, { visual: { type: "objects", groups: [{ emoji, count: a }, { emoji, count: b }], join: "+" } });
}

export function subPictures(rng: Rng, skill: string, max: number): Task {
  const a = rng.int(3, max), b = rng.int(1, a - 1), emoji = rng.pick(EMOJI);
  return num(skill, `There are ${a} ${emoji}. ${b} ${b === 1 ? "goes" : "go"} away. How many are left?`, a - b, "Cover the ones that go away and count the rest.", `${a} − ${b} = ${a - b}.`, { visual: { type: "objects", groups: [{ emoji, count: a, crossed: b }] } });
}

export function decompose(rng: Rng, skill: string, max: number): Task {
  const total = rng.int(4, max), part = rng.int(1, total - 1);
  return num(skill, `Break ${total} into two parts. ${total} is ${part} and how many more?`, total - part, `Start at ${part} and count up to ${total}.`, `${part} and ${total - part} make ${total}.`, { visual: { type: "tenFrame", count: total, frames: total > 10 ? 2 : 1 } });
}

export function makeTenBuild(rng: Rng, skill: string): Task {
  const count = rng.int(1, 9);
  return {
    kind: "build", skill, prompt: `The ten frame has ${count}. Add dots until it has 10.`,
    dials: [{ id: "more", label: "Dots to add", min: 0, max: 10, step: 1, start: 0 }],
    goal: { type: "sum", weights: { more: 1 }, target: 10 - count }, solution: { more: 10 - count }, live: { type: "tenFrame", base: count },
    hint: "Count the empty boxes.", explain: `${count} and ${10 - count} make 10.`,
  };
}

export function fact(rng: Rng, skill: string, max: number, ops: ("+" | "−")[]): Task {
  if (rng.pick(ops) === "+") {
    const a = rng.int(0, max), b = rng.int(0, max - a);
    return num(skill, `Solve: ${a} + ${b}`, a + b, "Start with the bigger number and count on.", `${a} + ${b} = ${a + b}.`, show(`${a} + ${b} = ?`));
  }
  const a = rng.int(1, max), b = rng.int(0, a);
  return num(skill, `Solve: ${a} − ${b}`, a - b, "Think of the addition fact: what adds to the smaller number to make the bigger one?", `${a} − ${b} = ${a - b}, because ${b} + ${a - b} = ${a}.`, show(`${a} − ${b} = ?`));
}

export type WordKind = "join" | "separate" | "compare" | "partWhole" | "threeAddends" | "twoStep" | "equalGroups" | "shareEqually" | "groupsThenChange" | "timesAsMany" | "roundUpGroups";

export function wordProblem(rng: Rng, skill: string, kind: WordKind, max: number): Task {
  const [who, friend] = twoNames(rng), t = rng.pick(THINGS);
  const say = (prompt: string, answer: number, explain: string, hint: string) => num(skill, prompt, answer, hint, explain, { visual: { type: "story", emoji: t.emoji } });
  switch (kind) {
    case "join": {
      const a = rng.int(2, max - 1), b = rng.int(1, max - a);
      return say(`${who} has ${a} ${t.many}. ${friend} gives ${who} ${b} more. How many ${t.many} does ${who} have now?`, a + b, `${a} + ${b} = ${a + b}.`, "Is the group getting bigger or smaller?");
    }
    case "separate": {
      const a = rng.int(3, max), b = rng.int(1, a - 1);
      return say(`${who} has ${a} ${t.many} and gives ${b} to ${friend}. How many ${t.many} does ${who} have left?`, a - b, `${a} − ${b} = ${a - b}.`, "Some are given away. Is the group getting bigger or smaller?");
    }
    case "compare": {
      const a = rng.int(3, max);
      let b = rng.int(1, max);
      while (b === a) b = rng.int(1, max);
      const [more, fewer] = a > b ? [who, friend] : [friend, who];
      return say(`${who} has ${a} ${t.many}. ${friend} has ${b} ${t.many}. How many more ${t.many} does ${more} have than ${fewer}?`, Math.abs(a - b), `${Math.max(a, b)} − ${Math.min(a, b)} = ${Math.abs(a - b)}.`, "Line the two amounts up. How many extra does one have?");
    }
    case "partWhole": {
      const total = rng.int(5, max), part = rng.int(2, total - 2);
      return say(`${who} found ${total} ${t.many}. ${part} are big and the rest are small. How many small ${t.many} are there?`, total - part, `${total} − ${part} = ${total - part}, because ${part} + ${total - part} = ${total}.`, "You know the whole and one part. What is the other part?");
    }
    case "threeAddends": {
      const third = Math.max(1, Math.floor(max / 3));
      const a = rng.int(2, Math.max(2, third)), b = rng.int(2, Math.max(2, third)), c = rng.int(2, Math.max(2, max - a - b));
      return say(`${who} found ${a} ${t.many} in the morning, ${b} at lunch and ${c} after school. How many ${t.many} is that in all?`, a + b + c, `${a} + ${b} + ${c} = ${a + b + c}. Adding two numbers that make an easy total first can help.`, "Add two of the numbers first, then add the third.");
    }
    case "twoStep": {
      const a = rng.int(Math.floor(max / 4), Math.floor(max / 2)), b = rng.int(2, Math.floor(max / 3)), c = rng.int(1, a + b - 1);
      return say(`${who} had ${a} ${t.many}. ${who} got ${b} more, then gave ${c} to ${friend}. How many ${t.many} does ${who} have now?`, a + b - c, `First ${a} + ${b} = ${a + b}. Then ${a + b} − ${c} = ${a + b - c}.`, "Take it in two steps: what happened first, then what happened next?");
    }
    case "equalGroups": {
      const g = rng.int(2, 9), e = rng.int(2, 9);
      return say(`${who} has ${g} bags with ${e} ${t.many} in each bag. How many ${t.many} are there in all?`, g * e, `${g} groups of ${e} is ${g} × ${e} = ${g * e}.`, "How many groups are there, and how many are in each?");
    }
    case "shareEqually": {
      const g = rng.int(2, 9), e = rng.int(2, 9);
      return say(`${who} shares ${g * e} ${t.many} equally among ${g} friends. How many ${t.many} does each friend get?`, e, `${g * e} ÷ ${g} = ${e}, because ${g} × ${e} = ${g * e}.`, "Think of a multiplication fact that makes the total.");
    }
    case "groupsThenChange": {
      const g = rng.int(3, 9), e = rng.int(3, 9), x = rng.int(2, 9), add = rng.next() < 0.5;
      const total = g * e + (add ? x : -x);
      return say(`${who} packs ${g} boxes with ${e} ${t.many} in each box, then ${add ? `finds ${x} more` : `gives ${x} to ${friend}`}. How many ${t.many} does ${who} have now?`, total, `First ${g} × ${e} = ${g * e}. Then ${g * e} ${add ? "+" : "−"} ${x} = ${total}.`, "Find how many are in the boxes first, then make the change.");
    }
    case "timesAsMany": {
      const b = rng.int(3, 12), k = rng.int(2, 9);
      return say(`${friend} has ${b} ${t.many}. ${who} has ${k} times as many. How many ${t.many} does ${who} have?`, k * b, `${k} times as many as ${b} is ${k} × ${b} = ${k * b}.`, "“Times as many” means multiply.");
    }
    case "roundUpGroups": {
      const v = rng.int(4, 9), p = v * rng.int(3, 8) + rng.int(1, v - 1);
      return say(`${p} students go on a trip. Each van holds ${v} students. How many vans do they need so everyone can ride?`, Math.ceil(p / v), `${p} ÷ ${v} = ${Math.floor(p / v)} R ${p % v}. The ${p % v} extra students need one more van, so ${Math.ceil(p / v)} vans.`, "Divide, then think about the students left over.");
    }
  }
}

export function unknownNumber(rng: Rng, skill: string, op: "+" | "−" | "×" | "÷", max: number): Task {
  let text: string, answer: number, explain: string, hint: string;
  if (op === "+") {
    const a = rng.int(1, max - 1), b = rng.int(1, max - a), left = rng.next() < 0.5;
    text = left ? `${a} + ? = ${a + b}` : `? + ${b} = ${a + b}`;
    answer = left ? b : a;
    explain = `${a} + ${b} = ${a + b}, so the missing number is ${answer}.`;
    hint = "Start at the number you know and count up to the total.";
  } else if (op === "−") {
    const a = rng.int(3, max), b = rng.int(1, a - 1);
    text = `${a} − ? = ${a - b}`;
    answer = b;
    explain = `${a} − ${b} = ${a - b}, so the missing number is ${b}.`;
    hint = `How far is it from ${a - b} up to ${a}?`;
  } else if (op === "×") {
    const a = rng.int(2, 10), b = rng.int(2, 10);
    text = `? × ${b} = ${a * b}`;
    answer = a;
    explain = `${a} × ${b} = ${a * b}, so the missing factor is ${a}.`;
    hint = `Skip count by ${b} until you reach ${a * b}. How many jumps?`;
  } else {
    const a = rng.int(2, 10), b = rng.int(2, 10);
    text = `${a * b} ÷ ? = ${a}`;
    answer = b;
    explain = `${a * b} ÷ ${b} = ${a}, because ${a} × ${b} = ${a * b}.`;
    hint = `Which number times ${a} makes ${a * b}?`;
  }
  return num(skill, "Which number makes this true?", answer, hint, explain, show(text));
}

export function equalSignSort(rng: Rng, skill: string, max: number): Task {
  const a = rng.int(2, Math.floor(max / 2)), b = rng.int(1, Math.floor(max / 2)), s = a + b;
  const alternatives = Array.from({ length: s + 1 }, (_, i) => i).filter((i) => i !== a && i !== b);
  const c = rng.pick(alternatives);
  const trues = rng.shuffle([`${a} + ${b} = ${b} + ${a}`, `${s} = ${a} + ${b}`, `${a} + ${b} = ${c} + ${s - c}`]).slice(0, 2);
  const falses = rng.shuffle([`${a} + ${b} = ${s + 1}`, `${s} = ${a} + ${b + 2}`, `${a} + ${b} = ${a} + ${b + 1}`]).slice(0, 2);
  const items = rng.shuffle([...trues.map((label) => ({ label, bin: "true" })), ...falses.map((label) => ({ label, bin: "false" }))]).map((item, i) => ({ id: `e${i}`, ...item }));
  return {
    kind: "sort", skill, prompt: "The equal sign means both sides have the same value. Sort each equation.",
    bins: [{ id: "true", label: "True" }, { id: "false", label: "False" }], items,
    hint: "Work out each side on its own. Do the two sides match?",
    explain: `True: ${trues.join("; ")}. False: ${falses.join("; ")}.`,
  };
}

export function propertyBlank(rng: Rng, skill: string, max: number): Task {
  if (rng.next() < 0.5) {
    const a = rng.int(2, max - 2), b = rng.int(1, max - a);
    return num(skill, "Fill in the blank.", a, "Adding in a different order gives the same total.", `${a} + ${b} and ${b} + ${a} are both ${a + b}, so the blank is ${a}.`, show(`${a} + ${b} = ${b} + ?`));
  }
  const a = rng.int(1, 9), b = 10 - a, c = rng.int(1, 9);
  return num(skill, "Fill in the blank.", c, `You can add in any order. Look for two numbers that make 10.`, `${a} + ${c} + ${b} = ${a} + ${b} + ${c}, because ${a} + ${b} = 10 and then you add ${c}.`, show(`${a} + ${c} + ${b} = ${a} + ${b} + ?`));
}

export function moreOrLess(rng: Rng, skill: string, place: 10 | 100, max: number): Task {
  const more = rng.next() < 0.5, n = more ? rng.int(1, max - place) : rng.int(place, max), answer = more ? n + place : n - place;
  return num(skill, `What is ${place} ${more ? "more" : "less"} than ${fmt(n)}?`, answer, place === 10 ? "Only the tens change. Count up or down one ten." : "Only the hundreds change.", `${fmt(n)} ${more ? "+" : "−"} ${place} = ${fmt(answer)}.`, { visual: { type: "blocks", hundreds: Math.floor(n / 100), tens: Math.floor(n / 10) % 10, ones: n % 10 } });
}

export function addTwoDigit(rng: Rng, skill: string, mode: "plusOnes" | "plusTens" | "regroup"): Task {
  let a: number, b: number;
  if (mode === "plusOnes") { a = rng.int(11, 89); b = rng.int(1, Math.min(9, 100 - a)); }
  else if (mode === "plusTens") { a = rng.int(11, 79); b = rng.int(1, Math.floor((100 - a) / 10)) * 10; }
  else {
    a = rng.int(15, 69);
    b = rng.int(11, 99 - a);
    for (let i = 0; i < 20 && (a % 10) + (b % 10) < 10; i++) b = rng.int(11, 99 - a);
  }
  return num(skill, `Solve: ${a} + ${b}`, a + b, mode === "plusTens" ? "Add the tens. The ones stay the same." : "Add the ones, then the tens. Ten ones make a new ten.", `${a} + ${b} = ${a + b}.`, { visual: { type: "blocks", tens: Math.floor(a / 10), ones: a % 10 } });
}

export function subtractTens(rng: Rng, skill: string): Task {
  const a = rng.int(2, 9) * 10, b = rng.int(1, a / 10 - 1) * 10, tens = (n: number) => `${n} ${n === 1 ? "ten" : "tens"}`;
  return num(skill, `Solve: ${a} − ${b}`, a - b, `Think in tens: ${tens(a / 10)} take away ${tens(b / 10)}.`, `${tens(a / 10)} − ${tens(b / 10)} = ${tens((a - b) / 10)}, so ${a} − ${b} = ${a - b}.`, show(`${a} − ${b} = ?`));
}

export function threeDigit(rng: Rng, skill: string, op: "+" | "−"): Task {
  if (op === "+") {
    const a = rng.int(100, 799), b = rng.int(100, 999 - a);
    return num(skill, `Solve: ${a} + ${b}`, a + b, "Add hundreds, tens and ones. Trade 10 ones for a ten, or 10 tens for a hundred.", `${a} + ${b} = ${a + b}.`, show(`${a} + ${b} = ?`));
  }
  const a = rng.int(210, 999), b = rng.int(100, a - 1);
  return num(skill, `Solve: ${a} − ${b}`, a - b, "Subtract ones, tens, then hundreds. Break a ten or a hundred when a digit on top is too small.", `${a} − ${b} = ${a - b}. Check: ${a - b} + ${b} = ${a}.`, show(`${a} − ${b} = ?`));
}

export function bigAddSub(rng: Rng, skill: string, op: "+" | "−", digits: number): Task {
  const lo = 10 ** (digits - 1), hi = 10 ** digits - 1;
  if (op === "+") {
    const a = rng.int(lo, hi), b = rng.int(lo, hi);
    return num(skill, `Add with the standard algorithm: ${fmt(a)} + ${fmt(b)}`, a + b, "Line up the places. Start with the ones and carry when a place reaches 10.", `${fmt(a)} + ${fmt(b)} = ${fmt(a + b)}.`, show(`${fmt(a)} + ${fmt(b)} = ?`));
  }
  const a = rng.int(lo + 1, hi), b = rng.int(lo, a - 1);
  return num(skill, `Subtract with the standard algorithm: ${fmt(a)} − ${fmt(b)}`, a - b, "Line up the places. Start with the ones and regroup when the top digit is too small.", `${fmt(a)} − ${fmt(b)} = ${fmt(a - b)}. Check by adding: ${fmt(a - b)} + ${fmt(b)} = ${fmt(a)}.`, show(`${fmt(a)} − ${fmt(b)} = ?`));
}

// ---------- Multiplying and dividing ----------

export function arrayTotal(rng: Rng, skill: string, maxRows: number, maxCols: number): Task {
  const rows = rng.int(2, maxRows), cols = rng.int(2, maxCols), emoji = rng.pick(EMOJI);
  return num(skill, `How many ${emoji} are in this array?`, rows * cols, "Count one row, then add the rows together.", `${Array(rows).fill(cols).join(" + ")} = ${rows * cols}.`, { visual: { type: "array", rows, cols, emoji } });
}

export function arrayEquation(rng: Rng, skill: string, maxRows: number, maxCols: number): Task {
  const rows = rng.int(2, maxRows);
  let cols = rng.int(2, maxCols);
  while (cols === rows) cols = cols === maxCols ? 2 : cols + 1;
  const emoji = rng.pick(EMOJI), answer = Array(rows).fill(cols).join(" + ");
  return {
    kind: "choice", skill, prompt: "Which addition matches the rows of this array?", visual: { type: "array", rows, cols, emoji },
    ...choose(rng, answer, [`${rows} + ${cols}`, Array(cols).fill(cols).join(" + ")]),
    hint: "Count how many are in one row, then how many rows there are.",
    explain: `There are ${rows} rows with ${cols} in each, so ${answer} = ${rows * cols}.`,
  };
}

export function oddEvenSort(rng: Rng, skill: string, max: number): Task {
  let values: number[] = [];
  for (let tries = 0; tries < 30; tries++) {
    values = [...new Set(Array.from({ length: 10 }, () => rng.int(1, max)))].slice(0, 6);
    const odd = values.filter((v) => v % 2).length;
    if (values.length === 6 && odd >= 2 && odd <= 4) break;
  }
  return {
    kind: "sort", skill, prompt: "Sort the numbers: odd or even?",
    bins: [{ id: "even", label: "Even" }, { id: "odd", label: "Odd" }],
    items: values.map((v, i) => ({ id: `n${i}`, label: String(v), bin: v % 2 ? "odd" : "even" })),
    hint: "Even numbers split into pairs with none left over. A ones digit of 0, 2, 4, 6 or 8 means even.",
    explain: `Even: ${values.filter((v) => v % 2 === 0).join(", ")}. Odd: ${values.filter((v) => v % 2).join(", ")}.`,
  };
}

export function multiplyFact(rng: Rng, skill: string, maxFactor: number): Task {
  const a = rng.int(2, maxFactor), b = rng.int(2, maxFactor);
  const visual = a <= 5 && b <= 8 ? { visual: { type: "array" as const, rows: a, cols: b, emoji: "🔩" } } : show(`${a} × ${b} = ?`);
  return num(skill, `Solve: ${a} × ${b}`, a * b, `Think of ${a} groups of ${b}. Skip count by ${b}.`, `${a} × ${b} = ${a * b}.`, visual);
}

export function divideFact(rng: Rng, skill: string, maxFactor: number): Task {
  const a = rng.int(2, maxFactor), b = rng.int(2, maxFactor);
  return num(skill, `Solve: ${a * b} ÷ ${a}`, b, `Which number times ${a} makes ${a * b}?`, `${a * b} ÷ ${a} = ${b}, because ${a} × ${b} = ${a * b}.`, show(`${a * b} ÷ ${a} = ?`));
}

export function patternNext(rng: Rng, skill: string, maxStep: number): Task {
  const step = rng.int(2, maxStep), start = rng.int(1, 15), seq = [0, 1, 2, 3].map((i) => start + i * step);
  return num(skill, "Find the rule, then write the next number.", start + 4 * step, "How much does the pattern change each time?", `The rule is add ${step}: ${seq.join(", ")}, ${start + 4 * step}.`, show(`${seq.join(", ")}, ?`));
}

export function multiplyByTens(rng: Rng, skill: string): Task {
  const a = rng.int(2, 9), t = rng.int(1, 9) * 10;
  return num(skill, `Solve: ${a} × ${t}`, a * t, `Find ${a} × ${t / 10} first. Then make it ten times as big.`, `${a} × ${t / 10} = ${(a * t) / 10}, so ${a} × ${t} = ${a * t}.`, show(`${a} × ${t} = ?`));
}

export function roundOnLine(rng: Rng, skill: string, place: 10 | 100): Task {
  const lower = rng.int(1, 9) * place, n = lower + rng.int(1, place - 1), half = lower + place / 2;
  const answer = n >= half ? lower + place : lower, name = place === 10 ? "ten" : "hundred";
  return {
    kind: "line", skill, min: lower, max: lower + place, ticks: 10, answer,
    labels: [{ at: lower, text: fmt(lower) }, { at: half, text: fmt(half) }, { at: lower + place, text: fmt(lower + place) }],
    marks: [{ at: n, text: fmt(n) }],
    prompt: `Round ${fmt(n)} to the nearest ${name}. Tap the ${name} it rounds to.`,
    hint: `Is ${fmt(n)} before or after the halfway point, ${fmt(half)}?`,
    explain: `${fmt(n)} is ${n >= half ? "at or past" : "before"} the halfway point ${fmt(half)}, so it rounds to ${fmt(answer)}.`,
  };
}

export function multiplyMulti(rng: Rng, skill: string, aDigits: number, bDigits: number): Task {
  const a = rng.int(10 ** (aDigits - 1) + (aDigits === 1 ? 1 : 0), 10 ** aDigits - 1), b = rng.int(bDigits === 1 ? 2 : 10 ** (bDigits - 1) + 1, 10 ** bDigits - 1);
  const tens = b - (b % 10), ones = b % 10;
  const explain = bDigits >= 2 && ones ? `${fmt(a)} × ${fmt(tens)} = ${fmt(a * tens)} and ${fmt(a)} × ${ones} = ${fmt(a * ones)}. Together: ${fmt(a * b)}.` : `${fmt(a)} × ${fmt(b)} = ${fmt(a * b)}.`;
  return num(skill, `Multiply: ${fmt(a)} × ${fmt(b)}`, a * b, bDigits >= 2 ? `Break ${b} into ${tens} + ${ones}. Multiply by each part, then add.` : "Multiply each place, starting with the ones. Carry into the next place.", explain, show(`${fmt(a)} × ${fmt(b)} = ?`));
}

export function divideRemainder(rng: Rng, skill: string, dividendDigits: number, divisorDigits: number): Task {
  const divisor = divisorDigits === 1 ? rng.int(3, 9) : rng.int(12, 49);
  const lo = 10 ** (dividendDigits - 1), hi = 10 ** dividendDigits - 1;
  const quotient = rng.int(Math.ceil(lo / divisor), Math.floor((hi - divisor) / divisor)), remainder = rng.int(0, divisor - 1);
  const dividend = quotient * divisor + remainder;
  return num(skill, `Divide: ${fmt(dividend)} ÷ ${divisor}. If something is left over, write it like 12 R 3.`, `${quotient} R ${remainder}`, "Estimate how many groups fit, multiply to check, then see what is left.", `${divisor} × ${fmt(quotient)} = ${fmt(quotient * divisor)}, and ${fmt(dividend)} − ${fmt(quotient * divisor)} = ${remainder}. So ${fmt(dividend)} ÷ ${divisor} = ${fmt(quotient)} R ${remainder}.`, { format: "remainder", visual: { type: "text", text: `${fmt(dividend)} ÷ ${divisor} = ?` } });
}

export function timesAsManyUnknown(rng: Rng, skill: string): Task {
  const b = rng.int(2, 12), k = rng.int(2, 9);
  return num(skill, `${k * b} is ${k} times as many as what number?`, b, `Which number times ${k} makes ${k * b}?`, `${k} × ${b} = ${k * b}, so ${k * b} is ${k} times as many as ${b}.`, show(`${k * b} = ${k} × ?`));
}

export function factorChoice(rng: Rng, skill: string): Task {
  const n = rng.pick([12, 16, 18, 20, 24, 28, 30, 32, 36, 40, 42, 45, 48]);
  const factors = Array.from({ length: n }, (_, i) => i + 1).filter((d) => n % d === 0 && d > 1 && d < n);
  const answer = rng.pick(factors), others = rng.shuffle(Array.from({ length: 12 }, (_, i) => i + 2).filter((d) => n % d !== 0)).slice(0, 3);
  return { kind: "choice", skill, prompt: `Which number is a factor of ${n}?`, visual: {type:"factors",total:n}, ...choose(rng, String(answer), others.map(String)), hint: `A factor divides ${n} with nothing left over.`, explain: `${answer} × ${n / answer} = ${n}, so ${answer} is a factor of ${n}.` };
}

export function multipleChoice(rng: Rng, skill: string): Task {
  const k = rng.int(3, 9), m = k * rng.int(3, 11);
  const others = [m + 1, m - 1, m + k - 1, m + 2].filter((v) => v % k !== 0).slice(0, 3);
  return { kind: "choice", skill, prompt: `Which number is a multiple of ${k}?`, ...choose(rng, String(m), others.map(String)), hint: `Skip count by ${k}. Which number do you land on?`, explain: `${k} × ${m / k} = ${m}, so ${m} is a multiple of ${k}.` };
}

export function primeSort(rng: Rng, skill: string): Task {
  const primes = rng.shuffle([2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47]).slice(0, 3);
  const composites = rng.shuffle([4, 6, 8, 9, 10, 12, 14, 15, 16, 18, 21, 22, 25, 27, 33, 35, 39, 49]).slice(0, 3);
  const pairOf = (n: number) => { const d = Array.from({ length: n }, (_, i) => i + 2).find((f) => n % f === 0)!; return `${d} × ${n / d}`; };
  return {
    kind: "sort", skill, prompt: "Sort the numbers: prime or composite?",
    bins: [{ id: "prime", label: "Prime" }, { id: "composite", label: "Composite" }],
    items: rng.shuffle([...primes.map((v) => ({ label: String(v), bin: "prime" })), ...composites.map((v) => ({ label: String(v), bin: "composite" }))]).map((item, i) => ({ id: `n${i}`, ...item })),
    hint: "A prime number has exactly two factors: 1 and itself.",
    explain: `Prime: ${primes.sort((a, b) => a - b).join(", ")}. Composite: ${composites.sort((a, b) => a - b).map((n) => `${n} = ${pairOf(n)}`).join(", ")}.`,
  };
}

// ---------- Place value ----------

export function teenBuild(rng: Rng, skill: string): Task {
  const n = rng.int(11, 19);
  return {
    kind: "build", skill, prompt: `Build ${n} with a ten and some ones.`,
    dials: [{ id: "tens", label: "Ten sticks", min: 0, max: 2, step: 1, start: 0 }, { id: "ones", label: "Ones", min: 0, max: 9, step: 1, start: 0 }],
    goal: { type: "sum", weights: { tens: 10, ones: 1 }, target: n }, solution: { tens: 1, ones: n - 10 }, live: { type: "blocks" },
    hint: "A ten stick is ten ones. How many more ones make the number?", explain: `${n} is 1 ten and ${n - 10} ones.`,
  };
}

export function teenSentence(rng: Rng, skill: string): Task {
  const ones = rng.int(1, 9);
  return num(skill, `10 and ${ones} more make how many?`, 10 + ones, "Start at 10 and count on.", `10 and ${ones} make ${10 + ones}: 1 ten and ${ones} ones.`, { visual: { type: "blocks", tens: 1, ones } });
}

export function teenChoice(rng: Rng, skill: string): Task {
  const n = rng.int(12, 19), ones = n - 10;
  const answer = `1 ten and ${ones} ones`, wrong1 = `1 ten and ${ones - 1} ${ones - 1 === 1 ? "one" : "ones"}`, wrong2 = `1 ten and ${ones === 9 ? 1 : ones + 1} ones`;
  return {
    kind: "choice", skill, prompt: `Which one shows ${n}?`,
    ...choose(rng, answer, [wrong1, wrong2], { [answer]: { type: "blocks", tens: 1, ones }, [wrong1]: { type: "blocks", tens: 1, ones: ones - 1 }, [wrong2]: { type: "blocks", tens: 1, ones: ones === 9 ? 1 : ones + 1 } }),
    hint: "Teen numbers have one ten. Count the loose ones.", explain: `${n} is 1 ten and ${ones} ones.`,
  };
}

export function buildNumber(rng: Rng, skill: string, max: number): Task {
  const n = rng.int(max <= 120 ? 21 : max <= 999 ? 101 : 1001, max);
  const places = [
    ...(max > 999 ? [{ id: "thousands", label: "Thousand cubes", weight: 1000 }] : []),
    ...(max > 99 ? [{ id: "hundreds", label: "Hundred flats", weight: 100 }] : []),
    { id: "tens", label: "Ten sticks", weight: 10 },
    { id: "ones", label: "Ones", weight: 1 },
  ];
  const solution = Object.fromEntries(places.map((p) => [p.id, Math.floor(n / p.weight) % 10]));
  return {
    kind: "build", skill, prompt: `Build ${fmt(n)} with place-value blocks.`,
    dials: places.map((p) => ({ id: p.id, label: p.label, min: 0, max: max <= 120 && p.id === "hundreds" ? 1 : 9, step: 1, start: 0 })),
    goal: { type: "sum", weights: Object.fromEntries(places.map((p) => [p.id, p.weight])), target: n }, solution, live: { type: "blocks" },
    hint: "Start with the biggest place. Each digit tells you how many of that block.",
    explain: `${fmt(n)} is ${places.map((p) => `${solution[p.id]} ${p.label.toLowerCase()}`).join(", ")}.`,
  };
}

function distinctDigits(rng: Rng, count: number): number[] {
  return rng.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, count);
}

export function digitValue(rng: Rng, skill: string, digits: number): Task {
  const ds = distinctDigits(rng, digits), n = ds.reduce((acc, d) => acc * 10 + d, 0);
  const position = rng.int(0, digits - 1), digit = ds[digits - 1 - position]!, value = digit * 10 ** position;
  const others = rng.shuffle(Array.from({ length: Math.min(digits + 1, 6) }, (_, p) => digit * 10 ** p).filter((v) => v !== value)).slice(0, 3);
  return { kind: "choice", skill, prompt: `What is the value of the ${digit} in ${fmt(n)}?`, visual: { type: "text", text: fmt(n) }, ...choose(rng, fmt(value), others.map(fmt)), hint: "Name the place of the digit: ones, tens, hundreds, thousands…", explain: `The ${digit} is in the ${["ones", "tens", "hundreds", "thousands", "ten thousands", "hundred thousands"][position]} place, so it is worth ${fmt(value)}.` };
}

export function expandedForm(rng: Rng, skill: string, digits: number): Task {
  const ds = distinctDigits(rng, digits);
  ds[rng.int(1, digits - 2)] = 0;
  const n = ds.reduce((acc, d) => acc * 10 + d, 0);
  const parts = (shift: (p: number) => number) => ds.map((d, i) => d * 10 ** shift(digits - 1 - i)).filter((v) => v > 0).map(fmt).join(" + ");
  const answer = parts((p) => p), wrong1 = parts((p) => Math.max(0, p - 1)), top = ds[0]! * 10 ** (digits - 1);
  const wrong2 = [fmt(top / 10), ...answer.split(" + ").slice(1)].join(" + ");
  return { kind: "choice", skill, prompt: `Which shows ${fmt(n)} in expanded form?`, ...choose(rng, answer, [wrong1, wrong2]), hint: "Write each digit times the value of its place. A zero adds nothing.", explain: `${fmt(n)} = ${answer}.` };
}

export function roundBig(rng: Rng, skill: string, place: number): Task {
  const n = rng.int(100_001, 989_999), round = (value: number, p: number) => Math.round(value / p) * p;
  const answer = round(n, place), others = [Math.floor(n / place) * place === answer ? answer + place : answer - place, round(n, place * 10), round(n, place / 10)].filter((v) => v !== answer);
  return { kind: "choice", skill, prompt: `Round ${fmt(n)} to the nearest ${fmt(place)}.`, ...choose(rng, fmt(answer), others.map(fmt)), hint: `Look at the digit to the right of the ${fmt(place)}s place. 5 or more rounds up.`, explain: `${fmt(n)} is closer to ${fmt(answer)} than to ${fmt(near(rng, answer, [place], 1)[0] ?? answer + place)}, so it rounds to ${fmt(answer)}.` };
}

export function moneyCount(rng: Rng, skill: string): Task {
  const kinds = ["quarter", "dime", "nickel", "penny"] as const;
  const coins = Array.from({ length: rng.int(3, 7) }, () => rng.pick(kinds)).sort((a, b) => kinds.indexOf(a) - kinds.indexOf(b));
  const cents = coins.reduce((t, c) => t + { quarter: 25, dime: 10, nickel: 5, penny: 1 }[c], 0);
  return num(skill, "How much money is this? Write the number of cents.", cents, "Start with the coins worth the most, then count on.", `Counting from the biggest coin: ${cents}¢.`, { unit: "¢", visual: { type: "coins", coins } });
}

export function moneyPay(rng: Rng, skill: string): Task {
  const target = rng.int(11, 99);
  const quarters = Math.floor(target / 25), dimes = Math.floor((target % 25) / 10), nickels = Math.floor(((target % 25) % 10) / 5), pennies = target % 5;
  return {
    kind: "build", skill, prompt: `Pay exactly ${target}¢.`,
    dials: [
      { id: "quarter", label: "Quarters · 25¢", min: 0, max: 4, step: 1, start: 0 },
      { id: "dime", label: "Dimes · 10¢", min: 0, max: 9, step: 1, start: 0 },
      { id: "nickel", label: "Nickels · 5¢", min: 0, max: 9, step: 1, start: 0 },
      { id: "penny", label: "Pennies · 1¢", min: 0, max: 9, step: 1, start: 0 },
    ],
    goal: { type: "sum", weights: { quarter: 25, dime: 10, nickel: 5, penny: 1 }, target }, solution: { quarter: quarters, dime: dimes, nickel: nickels, penny: pennies }, live: { type: "coins" },
    hint: "Use big coins first, then fill in with smaller ones.",
    explain: `One way: ${(() => {
      const said = ([[quarters, "quarter", "quarters"], [dimes, "dime", "dimes"], [nickels, "nickel", "nickels"], [pennies, "penny", "pennies"]] as const).filter(([n]) => n > 0).map(([n, one, many]) => `${n} ${n === 1 ? one : many}`);
      return said.length > 1 ? `${said.slice(0, -1).join(", ")} and ${said[said.length - 1]}` : said[0];
    })()} make ${target}¢.`,
  };
}

export function moneyWord(rng: Rng, skill: string): Task {
  const [who] = twoNames(rng), a = rng.int(15, 60), b = rng.int(5, 99 - a), total = a + b;
  const dollars = (c: number) => `${c}¢`;
  return num(skill, `${who} buys a book for ${dollars(a)} and a pen for ${dollars(b)}. How much is that altogether? Write the number of cents.`, total, "Both prices are in cents. Add the two amounts.", `${dollars(a)} + ${dollars(b)} = ${dollars(total)}.`, { unit: "¢", visual: { type: "story", emoji: "🛍️" } });
}

// ---------- Decimals and powers of ten ----------

export function decimalOnLine(rng: Rng, skill: string): Task {
  const k = rng.int(1, 9);
  return {
    kind: "line", skill, min: 0, max: 1, ticks: 10, answer: k / 10,
    labels: [{ at: 0, text: "0" }, { at: 0.5, text: "0.5" }, { at: 1, text: "1" }],
    prompt: `Tap 0.${k} on the number line.`, hint: "The whole is split into 10 equal jumps. Each jump is one tenth.", explain: `0.${k} is ${k} tenths: ${k} jumps from 0.`,
  };
}

export function fractionToDecimal(rng: Rng, skill: string): Task {
  const hundredths = rng.next() < 0.5, n = hundredths ? rng.int(1, 99) : rng.int(1, 9), den = hundredths ? 100 : 10;
  const answer = decimalText(n, hundredths ? 2 : 1);
  return num(skill, `Write ${n}/${den} as a decimal.`, answer, hundredths ? "Hundredths use two places after the decimal point." : "Tenths use one place after the decimal point.", `${n}/${den} = ${answer}.`, { format: "decimal", visual: { type: "text", text: `${n}/${den} = ?` } });
}

export function compareDecimals(rng: Rng, skill: string, places: 2 | 3): Task {
  const small = places === 2 ? 100 : 1000, a = rng.int(small / 10 + 1, small - 1);
  let b: number;
  const roll = rng.next();
  if (roll < 0.35) b = (Math.floor(a / (small / 10)) + 1) * (small / 10);
  else if (roll < 0.5) b = a;
  else b = Math.max(1, a + rng.pick([-1, 1]) * rng.int(1, small / 10));
  const at = decimalText(a, places), bt = decimalText(b, places);
  const sign = a < b ? "<" : a > b ? ">" : "=";
  return { kind: "choice", skill, prompt: "Which sign makes this true?", visual: { type: "text", text: `${at}   ?   ${bt}` }, ...choose(rng, sign, ["<", ">", "="]), hint: "Line up the decimal points. Compare tenths first, then hundredths.", explain: `${at} ${sign === "<" ? "is less than" : sign === ">" ? "is greater than" : "is equal to"} ${bt}. More digits do not mean a bigger number.` };
}

export function decimalDigitValue(rng: Rng, skill: string, places: 2 | 3): Task {
  const ds = distinctDigits(rng, places + 1), text = `${ds[0]}.${ds.slice(1).join("")}`;
  const k = rng.int(1, places), digit = ds[k]!;
  const names = ["ones", "tenths", "hundredths", "thousandths"];
  const answer = `${digit} ${names[k]}`, others = names.slice(0, places + 1).filter((_, i) => i !== k).map((name) => `${digit} ${name}`);
  return { kind: "choice", skill, prompt: `In ${text}, what is the ${digit} worth?`, visual: { type: "text", text }, ...choose(rng, answer, others), hint: "After the decimal point come tenths, then hundredths, then thousandths.", explain: `In ${text}, the ${digit} is in the ${names[k]} place.` };
}

export function roundDecimal(rng: Rng, skill: string): Task {
  const n = rng.int(1001, 9989), toTenth = rng.next() < 0.6;
  const text = decimalText(n, 3), answer = toTenth ? decimalText(Math.round(n / 100), 1) : decimalText(Math.round(n / 10), 2);
  return num(skill, `Round ${text} to the nearest ${toTenth ? "tenth" : "hundredth"}.`, answer, `Look at the digit just after the ${toTenth ? "tenths" : "hundredths"} place. 5 or more rounds up.`, `${text} rounds to ${answer}.`, { format: "decimal", visual: { type: "text", text } });
}

export function powersOfTen(rng: Rng, skill: string): Task {
  const kind = rng.pick(["times", "divide", "power"] as const), p = rng.int(1, 3), factor = 10 ** p;
  if (kind === "times") {
    const hundredths = rng.int(101, 999), text = decimalText(hundredths, 2);
    return num(skill, `Solve: ${text} × ${fmt(factor)}`, decimalText(hundredths * factor, 2), `Multiplying by ${fmt(factor)} moves every digit ${p} ${p === 1 ? "place" : "places"} to the left.`, `${text} × ${fmt(factor)} = ${fmt(Number(decimalText(hundredths * factor, 2)))}.`, { format: "decimal", visual: { type: "text", text: `${text} × ${fmt(factor)} = ?` } });
  }
  if (kind === "divide") {
    const whole = rng.int(12, 999);
    return num(skill, `Solve: ${whole} ÷ ${fmt(factor)}`, decimalText(whole, p), `Dividing by ${fmt(factor)} moves every digit ${p} ${p === 1 ? "place" : "places"} to the right.`, `${whole} ÷ ${fmt(factor)} = ${decimalText(whole, p)}.`, { format: "decimal", visual: { type: "text", text: `${whole} ÷ ${fmt(factor)} = ?` } });
  }
  const power = rng.int(2, 5), superscript = ["⁰", "¹", "²", "³", "⁴", "⁵"][power];
  return num(skill, `What is 10${superscript}? Write the whole number.`, 10 ** power, `10${superscript} means ${power} tens multiplied together.`, `10${superscript} = ${Array(power).fill(10).join(" × ")} = ${fmt(10 ** power)}.`, show(`10${superscript} = ?`));
}

export function decimalOps(rng: Rng, skill: string, op: "+" | "−" | "×" | "÷"): Task {
  let text: string, answer: string, hint: string;
  if (op === "+") { const a = rng.int(101, 899), b = rng.int(11, 99); text = `${decimalText(a, 2)} + ${decimalText(b, 1)}`; answer = decimalText(a + b * 10, 2); hint = "Line up the decimal points. Write a zero in empty places if it helps."; }
  else if (op === "−") { const a = rng.int(300, 999), b = rng.int(101, a - 1); text = `${decimalText(a, 2)} − ${decimalText(b, 2)}`; answer = decimalText(a - b, 2); hint = "Line up the decimal points and subtract place by place."; }
  else if (op === "×") { const a = rng.int(11, 49), b = rng.int(2, 9); text = `${decimalText(a, 1)} × ${decimalText(b, 1)}`; answer = decimalText(a * b, 2); hint = "Use an area model: tenths times tenths make hundredths."; }
  else { const q = rng.int(11, 49), k = rng.int(2, 9); text = `${decimalText(q * k, 2)} ÷ ${decimalText(k, 1)}`; answer = decimalText(q, 1); hint = "Scale both numbers by the same power of ten to make the divisor a whole number."; }
  return num(skill, `Solve: ${text}`, answer, hint, `${text} = ${answer}.`, { format: "decimal", ...show(`${text} = ?`) });
}

// ---------- Expressions and patterns ----------

export function evaluateExpression(rng: Rng, skill: string, level: 1 | 2 | 3): Task {
  const a = rng.int(2, 9), b = rng.int(2, 9), c = rng.int(2, 6), d = rng.int(1, 9);
  let text: string, answer: number, explain: string;
  if (level === 1) { text = `${a} + ${b} × ${c}`; answer = a + b * c; explain = `Multiply first: ${b} × ${c} = ${b * c}. Then ${a} + ${b * c} = ${answer}.`; }
  else if (level === 2) { text = `(${a} + ${b}) × ${c}`; answer = (a + b) * c; explain = `Parentheses first: ${a} + ${b} = ${a + b}. Then ${a + b} × ${c} = ${answer}.`; }
  else { text = `${c} × [${a} + (${b + d} − ${d})]`; answer = c * (a + b); explain = `Inside out: ${b + d} − ${d} = ${b}, then ${a} + ${b} = ${a + b}, then ${c} × ${a + b} = ${answer}.`; }
  return num(skill, `Evaluate: ${text}`, answer, "Work inside parentheses and brackets first, then multiply and divide, then add and subtract.", explain, show(`${text} = ?`));
}

export function matchExpression(rng: Rng, skill: string): Task {
  const a = rng.int(2, 9), b = rng.int(2, 9), c = rng.int(2, 9);
  if (rng.next() < 0.5) {
    const answer = `(${a} + ${b}) × ${c}`;
    return { kind: "choice", skill, prompt: `Which expression means: add ${a} and ${b}, then multiply by ${c}?`, ...choose(rng, answer, [`${a} + ${b} × ${c}`, `${a} × ${c} + ${b}`]), hint: "Which part has to happen first? Parentheses show that.", explain: `The adding happens first, so it goes in parentheses: ${answer}.` };
  }
  const answer = `${a} × ${b} − ${c}`;
  return { kind: "choice", skill, prompt: `Which expression means: multiply ${a} by ${b}, then subtract ${c}?`, ...choose(rng, answer, [`${a} × (${b} − ${c})`, `${c} − ${a} × ${b}`]), hint: "Multiplication already happens before subtraction, so no parentheses are needed.", explain: `${answer} multiplies first, then subtracts ${c}.` };
}

export function interpretExpression(rng: Rng, skill: string): Task {
  const k = rng.int(2, 9), x = rng.int(1200, 9800), y = rng.int(120, 980);
  return num(skill, `Without calculating: ${k} × (${fmt(x)} + ${y}) is how many times as large as ${fmt(x)} + ${y}?`, k, "Look at what is being multiplied.", `The same sum is multiplied by ${k}, so it is ${k} times as large.`, show(`${k} × (${fmt(x)} + ${y})`));
}

export function twoRules(rng: Rng, skill: string): Task {
  const x = rng.int(2, 5), k = rng.int(2, 4), y = x * k, steps = rng.int(3, 6);
  return num(skill, `Rule A starts at 0 and adds ${x}. Rule B starts at 0 and adds ${y}. When Rule A reaches ${x * steps}, what number has Rule B reached?`, y * steps, "Count how many steps Rule A took, then take the same number of steps with Rule B.", `After ${steps} steps, A is at ${x * steps} and B is at ${y * steps}. Every B number is ${k} times the A number: (${x * steps}, ${y * steps}).`, { visual: { type: "text", text: `A: 0, ${x}, ${2 * x}, …   B: 0, ${y}, ${2 * y}, …` } });
}
