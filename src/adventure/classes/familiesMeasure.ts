// Task families for measurement, data and geometry: comparing and sorting objects, length, time, graphs,
// area and perimeter, conversions, angles, volume, shapes, lines, symmetry and the coordinate plane.
import type { Rng } from "../../engine/rng";
import { choose, decimalText, fmt, scrambled } from "./kit";
import type { NumberTask, Option, ShapeName, SolidName, Task, Visual } from "./tasks";

const num = (skill: string, prompt: string, answer: number | string, hint: string, explain: string, extra: Partial<NumberTask> = {}): Task => ({
  kind: "number", skill, prompt, answer: String(answer), format: "int", hint, explain, ...extra,
});

export const SHAPE_NAMES: Record<ShapeName, string> = {
  circle: "circle", oval: "oval", triangle: "triangle", square: "square", rectangle: "rectangle", rhombus: "rhombus", trapezoid: "trapezoid",
  parallelogram: "parallelogram", kite: "kite", pentagon: "pentagon", hexagon: "hexagon", octagon: "octagon", rightTriangle: "right triangle",
  acuteTriangle: "acute triangle", obtuseTriangle: "obtuse triangle", heart: "heart", openShape: "open shape",
};
const SOLID_NAMES: Record<SolidName, string> = { cube: "cube", sphere: "sphere", cone: "cone", cylinder: "cylinder", prism: "rectangular prism", pyramid: "pyramid" };
const ROTATIONS = [0, 20, 45, 90, 135, 160];

// ---------- Comparing and sorting objects (Kindergarten, Grade 1) ----------

const LONG_PAIRS = [["pencil", "crayon"], ["snake", "worm"], ["train", "car"], ["ribbon", "string"], ["bridge", "plank"]] as const;
const HEAVY_PAIRS = [["🍉", "watermelon", "🍒", "cherry"], ["🐘", "elephant", "🐭", "mouse"], ["📚", "stack of books", "🪶", "feather"], ["🎃", "pumpkin", "🍓", "strawberry"], ["🪨", "rock", "🍃", "leaf"]] as const;

export function compareAttribute(rng: Rng, skill: string, attribute: "length" | "weight"): Task {
  if (attribute === "length") {
    const [a, b] = rng.pick(LONG_PAIRS), la = rng.int(6, 12), lb = rng.int(2, la - 2), longer = rng.next() < 0.5;
    const items = rng.shuffle([{ label: a, length: la }, { label: b, length: lb }]);
    const answer = longer ? a : b;
    return { kind: "choice", skill, prompt: `Which one is ${longer ? "longer" : "shorter"}?`, visual: { type: "lengths", items }, ...choose(rng, answer, [a, b]), hint: "Line up the left ends. Look at where each one stops.", explain: `The ${a} reaches farther than the ${b}, so the ${a} is longer and the ${b} is shorter.` };
  }
  const [heavyEmoji, heavy, lightEmoji, light] = rng.pick(HEAVY_PAIRS), onLeft = rng.next() < 0.5, askHeavy = rng.next() < 0.5;
  return {
    kind: "choice", skill, prompt: `Which one is ${askHeavy ? "heavier" : "lighter"}?`,
    visual: { type: "scale", left: onLeft ? heavyEmoji : lightEmoji, right: onLeft ? lightEmoji : heavyEmoji, heavier: onLeft ? "left" : "right" },
    ...choose(rng, `${askHeavy ? heavyEmoji : lightEmoji} ${askHeavy ? heavy : light}`, [`${heavyEmoji} ${heavy}`, `${lightEmoji} ${light}`]),
    hint: "The heavier side of a balance goes down.", explain: `The side with the ${heavy} goes down, so the ${heavy} is heavier and the ${light} is lighter.`,
  };
}

const CATEGORY_SETS = [
  { bins: ["Animals", "Food"], items: [["🐶", "🐱", "🐸", "🐰", "🦊"], ["🍎", "🍌", "🥕", "🍪", "🧀"]] },
  { bins: ["Things that fly", "Things that swim"], items: [["🐦", "🦋", "🐝", "✈️", "🦉"], ["🐟", "🐬", "🐙", "🐳", "🦈"]] },
  { bins: ["Round", "Has corners"], items: [["⚽", "🍩", "🌕", "🔵", "🍊"], ["📦", "🟥", "🔺", "📐", "🧊"]] },
] as const;

export function sortCategories(rng: Rng, skill: string): Task {
  const set = rng.pick(CATEGORY_SETS);
  const picked = set.items.flatMap((group, bin) => rng.shuffle([...group]).slice(0, 3).map((label) => ({ label, bin: `b${bin}` })));
  return {
    kind: "sort", skill, prompt: `Sort each picture: ${set.bins[0]} or ${set.bins[1]}?`,
    bins: set.bins.map((label, i) => ({ id: `b${i}`, label })),
    items: rng.shuffle(picked).map((item, i) => ({ id: `s${i}`, ...item })),
    hint: "Look at one picture at a time and ask which group it belongs to.",
    explain: set.bins.map((label, i) => `${label}: ${picked.filter((p) => p.bin === `b${i}`).map((p) => p.label).join(" ")}`).join(". ") + ".",
  };
}

export function orderLengths(rng: Rng, skill: string): Task {
  const colors = rng.shuffle(["Red", "Blue", "Green", "Yellow", "Purple"]).slice(0, 4);
  const lengths = rng.shuffle([3, 5, 7, 9, 11, 12]).slice(0, 4);
  const ribbons = colors.map((c, i) => ({ id: `r${i}`, label: `${c} ribbon`, length: lengths[i]! }));
  const byLength = [...ribbons].sort((a, b) => a.length - b.length);
  const shown = scrambled(rng, ribbons, (list) => list.every((r, i) => r.id === byLength[i]!.id));
  return {
    kind: "order", skill, prompt: "Put the ribbons in order from shortest to longest.",
    items: shown.map((r) => ({ id: r.id, label: r.label, visual: { type: "lengths", items: [{ label: r.label, length: r.length }] } })),
    answer: byLength.map((r) => r.id), first: "shortest", last: "longest",
    hint: "Find the shortest one first. Then find the shortest of the ones left.", explain: `Shortest to longest: ${byLength.map((r) => r.label).join(", ")}.`,
  };
}

export function indirectCompare(rng: Rng, skill: string): Task {
  const [a, b, c] = rng.shuffle(["pencil", "crayon", "straw", "spoon", "stick"]).slice(0, 3) as [string, string, string];
  const askLongest = rng.next() < 0.5;
  return {
    kind: "choice", skill, prompt: `The ${a} is longer than the ${b}. The ${b} is longer than the ${c}. Which is the ${askLongest ? "longest" : "shortest"}?`,
    visual: { type: "story", emoji: "📏" }, ...choose(rng, askLongest ? a : c, [a, b, c]),
    hint: `Put them in a row in your mind: which is longer, the ${a} or the ${c}?`,
    explain: `The ${a} is longer than the ${b}, and the ${b} is longer than the ${c}, so the ${a} is longest and the ${c} is shortest.`,
  };
}

// ---------- Data ----------

interface GraphSet { title: string; cats: [string, string][]; count: (l: string) => string; more: (x: string, y: string) => string; total: string }
const GRAPH_SETS: GraphSet[] = [
  { title: "Our favorite fruit", cats: [["Apples", "🍎"], ["Bananas", "🍌"], ["Grapes", "🍇"], ["Pears", "🍐"]], count: (l) => `How many children picked ${l}?`, more: (x, y) => `How many more children picked ${x} than ${y}?`, total: "How many children voted in all?" },
  { title: "Pets in our class", cats: [["Dogs", "🐶"], ["Cats", "🐱"], ["Fish", "🐟"], ["Birds", "🐦"]], count: (l) => `How many ${l} are there?`, more: (x, y) => `How many more ${x} than ${y} are there?`, total: "How many pets are there in all?" },
  { title: "Weather this month", cats: [["Sunny", "☀️"], ["Rainy", "🌧️"], ["Snowy", "❄️"], ["Windy", "💨"]], count: (l) => `How many days were ${l}?`, more: (x, y) => `How many more days were ${x} than ${y}?`, total: "How many days does the graph show in all?" },
];

export function readGraph(rng: Rng, skill: string, kind: "bar" | "picture", scale: number, count: 3 | 4): Task {
  const set = rng.pick(GRAPH_SETS), steps = scale === 1 ? 9 : 8;
  const cats = set.cats.slice(0, count).map(([label, emoji]) => ({ label, emoji, value: rng.int(1, steps) * scale }));
  if (new Set(cats.map((c) => c.value)).size < 2) cats[0]!.value = cats[0]!.value === scale ? scale * 3 : scale;
  const visual: Visual = { type: "graph", kind, title: set.title, categories: cats, scale };
  const key = scale > 1 ? ` Each ${kind === "picture" ? "picture" : "square"} stands for ${scale}.` : "";
  const question = rng.pick(["count", "more", "total"] as const);
  if (question === "count") {
    const c = rng.pick(cats);
    return num(skill, `${set.count(c.label.toLowerCase())}${key}`, c.value, scale > 1 ? `Count the ${kind === "picture" ? "pictures" : "squares"}, then count by ${scale}s.` : "Find the bar, then read how far it reaches.", `${c.label}: ${c.value}.`, { visual });
  }
  if (question === "more") {
    // Two categories with different amounts, so the answer is never zero.
    const sorted = [...cats].sort((p, q) => q.value - p.value), x = sorted[0]!, y = rng.pick(sorted.filter((c) => c.value < x.value));
    return num(skill, `${set.more(x.label.toLowerCase(), y.label.toLowerCase())}${key}`, x.value - y.value, "Find both amounts, then subtract the smaller from the bigger.", `${x.label}: ${x.value}. ${y.label}: ${y.value}. ${x.value} − ${y.value} = ${x.value - y.value}.`, { visual });
  }
  const total = cats.reduce((sum, c) => sum + c.value, 0);
  return num(skill, `${set.total}${key}`, total, "Read each amount, then add them together.", `${cats.map((c) => c.value).join(" + ")} = ${total}.`, { visual });
}

export function linePlotWhole(rng: Rng, skill: string): Task {
  const ticks = ["3", "4", "5", "6", "7", "8"], counts = ticks.map(() => rng.int(0, 4));
  counts[rng.int(1, 4)] = rng.int(2, 4);
  const visual: Visual = { type: "linePlot", title: "Length of our pencils (inches)", ticks, counts };
  if (rng.next() < 0.5) {
    const i = rng.int(0, 5);
    return num(skill, `How many pencils are ${ticks[i]} inches long?`, counts[i]!, `Count the X marks above ${ticks[i]}.`, `There are ${counts[i]} marks above ${ticks[i]}.`, { visual });
  }
  const over = counts.slice(3).reduce((a, b) => a + b, 0);
  return num(skill, "How many pencils are longer than 5 inches?", over, "Count the marks above 6, 7 and 8.", `${counts.slice(3).join(" + ")} = ${over} pencils are longer than 5 inches.`, { visual });
}

// ---------- Length ----------

export function rulerMeasure(rng: Rng, skill: string, unit: "cm" | "in"): Task {
  const length = rng.int(2, unit === "cm" ? 14 : 6), object = rng.pick(["pencil", "crayon", "key", "feather", "leaf"]);
  const name = unit === "cm" ? "centimeters" : "inches";
  return num(skill, `How long is the ${object}? Write the number of ${name}.`, length, "Check that the object starts at 0. Count the spaces, not the lines.", `The ${object} starts at 0 and ends at ${length}, so it is ${length} ${name} long.`, { unit, visual: { type: "ruler", length, unit, object } });
}

const ESTIMATES = [
  { thing: "a new pencil", answer: "about 15 centimeters", others: ["about 15 meters", "about 1 centimeter"] },
  { thing: "a classroom door (how tall)", answer: "about 2 meters", others: ["about 2 centimeters", "about 20 meters"] },
  { thing: "a school bus", answer: "about 12 meters", others: ["about 12 centimeters", "about 120 meters"] },
  { thing: "a paper clip", answer: "about 3 centimeters", others: ["about 3 meters", "about 30 centimeters"] },
  { thing: "your math book", answer: "about 11 inches", others: ["about 11 feet", "about 1 inch"] },
  { thing: "a car", answer: "about 15 feet", others: ["about 15 inches", "about 150 feet"] },
];

export function estimateLength(rng: Rng, skill: string): Task {
  const e = rng.pick(ESTIMATES);
  return { kind: "choice", skill, prompt: `About how long is ${e.thing}?`, visual: { type: "story", emoji: "📐" }, ...choose(rng, e.answer, e.others), hint: "A centimeter is about the width of your finger. A meter is about one big step. An inch is about a thumb width; a foot is about a sheet of paper.", explain: `${e.thing[0]!.toUpperCase()}${e.thing.slice(1)} is ${e.answer}.` };
}

export function lengthDifference(rng: Rng, skill: string, unit: "cm" | "in"): Task {
  const a = rng.int(8, unit === "cm" ? 30 : 20), b = rng.int(3, a - 1), name = unit === "cm" ? "centimeters" : "inches";
  return num(skill, `The red ribbon is ${a} ${name} long. The blue ribbon is ${b} ${name} long. How much longer is the red ribbon?`, a - b, "Compare the lengths: subtract the shorter from the longer.", `${a} − ${b} = ${a - b} ${name}.`, { unit, visual: { type: "lengths", items: [{ label: "Red ribbon", length: a }, { label: "Blue ribbon", length: b }], unit } });
}

export function numberLineJump(rng: Rng, skill: string): Task {
  const a = rng.int(1, 6) * 10, b = rng.int(1, (100 - a) / 10) * 10;
  return {
    kind: "line", skill, min: 0, max: 100, ticks: 10, answer: a + b,
    labels: Array.from({ length: 11 }, (_, i) => ({ at: i * 10, text: String(i * 10) })), marks: [{ at: a, text: "start" }],
    prompt: `Start at ${a} and jump ${b} more. Tap where you land.`, hint: `Each space is 10. Count ${b / 10} spaces.`, explain: `${a} + ${b} = ${a + b}.`,
  };
}

// ---------- Time ----------

const clockText = (hour: number, minute: number) => `${hour}:${String(minute).padStart(2, "0")}`;
function randomTime(rng: Rng, step: 60 | 30 | 5 | 1): [number, number] {
  let hour = rng.int(1, 12);
  const minute = step === 60 ? 0 : step === 30 ? rng.pick([0, 30]) : step === 5 ? rng.int(0, 11) * 5 : rng.int(0, 59);
  if (hour === 12 && minute === 0) hour = rng.int(1, 11);
  return [hour, minute];
}

export function clockSet(rng: Rng, skill: string, step: 60 | 30 | 5 | 1): Task {
  const [hour, minute] = randomTime(rng, step);
  const minuteStep = step === 60 ? 30 : step;
  const said = minute === 30 && step >= 30 ? `half past ${hour} (${clockText(hour, minute)})` : minute === 0 && step >= 30 ? `${hour} o'clock (${clockText(hour, 0)})` : clockText(hour, minute);
  return {
    kind: "build", skill, prompt: `Set the clock to ${said}.`,
    dials: [{ id: "hour", label: "Hour", min: 1, max: 12, step: 1, start: 12 }, { id: "minute", label: "Minutes", min: 0, max: 60 - minuteStep, step: minuteStep, start: 0 }],
    goal: { type: "each", values: { hour, minute } }, solution: { hour, minute }, live: { type: "clock" },
    hint: "The short hand shows the hour. The long hand shows the minutes; each number on the clock is 5 minutes.",
    explain: `At ${clockText(hour, minute)} the short hand is ${minute >= 30 ? `past the ${hour}` : `at the ${hour}`} and the long hand is at ${minute} minutes.`,
  };
}

export function clockRead(rng: Rng, skill: string, step: 60 | 30 | 5 | 1): Task {
  const [hour, minute] = randomTime(rng, step), answer = clockText(hour, minute);
  // Swapped hands are a real mix-up once minutes go past the half hour; hour and half-hour clocks keep to whole and half hours.
  const swapHour = step < 30 && minute % 5 === 0 && minute > 0 ? minute / 5 : null;
  const others = [
    clockText(hour === 12 ? 1 : hour + 1, minute),
    swapHour ? clockText(swapHour, (hour * 5) % 60) : clockText(hour, (minute + (step === 1 ? 10 : 30)) % 60),
    clockText(hour, (minute + (step >= 30 ? 30 : 5)) % 60),
  ];
  return { kind: "choice", skill, prompt: "What time does the clock show?", visual: { type: "clock", hour, minute }, ...choose(rng, answer, others), hint: "Read the short hand first for the hour, then the long hand for the minutes.", explain: `The short hand points to ${minute >= 30 ? `just past ${hour}` : hour} and the long hand to ${minute} minutes: ${answer}.` };
}

const EVENTS = [["eat breakfast", "7:30", "AM"], ["go to bed", "8:00", "PM"], ["eat lunch", "12:15", "PM"], ["watch the sunrise", "6:00", "AM"], ["look at the stars", "9:30", "PM"], ["start school", "8:15", "AM"], ["eat dinner", "6:15", "PM"]] as const;

export function amPm(rng: Rng, skill: string): Task {
  const [event, time, answer] = rng.pick(EVENTS);
  return { kind: "choice", skill, prompt: `You ${event} at ${time}. Is that AM or PM?`, visual: { type: "story", emoji: answer === "AM" ? "🌅" : "🌙" }, ...choose(rng, answer, ["AM", "PM"]), hint: "AM is from midnight to noon. PM is from noon to midnight.", explain: `${time} to ${event} is in the ${answer === "AM" ? "morning, so AM" : "afternoon or evening, so PM"}.` };
}

function addMinutes(hour: number, minute: number, add: number): [number, number] {
  const total = ((hour % 12) * 60 + minute + add) % 720;
  return [Math.floor(total / 60) || 12, total % 60];
}

export function elapsedMinutes(rng: Rng, skill: string): Task {
  const hour = rng.int(1, 11), minute = rng.int(0, 9) * 5, minutes = rng.int(2, 11) * 5, [eh, em] = addMinutes(hour, minute, minutes);
  return num(skill, `The show starts at ${clockText(hour, minute)} and ends at ${clockText(eh, em)}. How many minutes long is the show?`, minutes, "Count on from the start time in jumps of 5 or 10 minutes.", `From ${clockText(hour, minute)} to ${clockText(eh, em)} is ${minutes} minutes.`, { unit: "min", visual: { type: "clock", hour, minute } });
}

export function endTime(rng: Rng, skill: string): Task {
  const hour = rng.int(1, 11), minute = rng.int(0, 59), minutes = rng.int(12, 58), [eh, em] = addMinutes(hour, minute, minutes);
  return num(skill, `Soccer practice starts at ${clockText(hour, minute)} and lasts ${minutes} minutes. What time does it end? Write it like 3:45.`, clockText(eh, em), "Add the minutes. 60 minutes make one more hour.", `${clockText(hour, minute)} plus ${minutes} minutes is ${clockText(eh, em)}.`, { format: "time", visual: { type: "clock", hour, minute } });
}

// ---------- Mass, liquid volume, area, perimeter and conversions ----------

export function massVolumeWord(rng: Rng, skill: string): Task {
  const kind = rng.pick(["pour", "bags", "share"] as const);
  if (kind === "pour") {
    const a = rng.int(20, 60), b = rng.int(3, 15);
    return num(skill, `A water tank holds ${a} liters. You pour out ${b} liters. How many liters are left?`, a - b, "Pouring out makes the amount smaller.", `${a} − ${b} = ${a - b} liters.`, { unit: "L", visual: { type: "story", emoji: "🪣" } });
  }
  if (kind === "bags") {
    const k = rng.int(2, 9), each = rng.int(2, 9);
    return num(skill, `One bag of rice has a mass of ${each} kilograms. What is the mass of ${k} bags?`, k * each, "Equal bags: multiply.", `${k} × ${each} = ${k * each} kilograms.`, { unit: "kg", visual: { type: "story", emoji: "🌾" } });
  }
  const bottles = rng.int(2, 9), each = rng.int(2, 9);
  return num(skill, `A jug holds ${bottles * each} liters of juice. It is shared equally into ${bottles} bottles. How many liters go in each bottle?`, each, "Sharing equally: divide.", `${bottles * each} ÷ ${bottles} = ${each} liters.`, { unit: "L", visual: { type: "story", emoji: "🧃" } });
}

export function areaTiles(rng: Rng, skill: string): Task {
  const width = rng.int(2, 8), height = rng.int(2, 6);
  return num(skill, "How many square units cover this rectangle?", width * height, "Count one row of squares, then count the rows.", `${height} rows of ${width} squares: ${height} × ${width} = ${width * height} square units.`, { unit: "sq units", visual: { type: "rect", width, height, unit: "units", grid: true, labels: false } });
}

export function areaBuild(rng: Rng, skill: string): Task {
  const rows = rng.int(2, 5), cols = rng.int(2, 7);
  return {
    kind: "build", skill, prompt: `Build a rectangle with ${rows} rows and an area of ${rows * cols} square units.`,
    dials: [{ id: "rows", label: "Rows", min: 1, max: 6, step: 1, start: 1 }, { id: "cols", label: "Squares in each row", min: 1, max: 8, step: 1, start: 1 }],
    goal: { type: "product", ids: ["rows", "cols"], target: rows * cols, fixed: { rows } }, solution: { rows, cols }, live: { type: "array", emoji: "🟩" },
    hint: `Area = rows × squares in each row. Which number times ${rows} makes ${rows * cols}?`, explain: `${rows} × ${cols} = ${rows * cols}, so each row needs ${cols} squares.`,
  };
}

export function perimeterRect(rng: Rng, skill: string): Task {
  const width = rng.int(2, 12), height = rng.int(2, 9);
  return num(skill, "What is the perimeter of this rectangle?", 2 * (width + height), "Perimeter is the distance all the way around. Add all four sides.", `${width} + ${height} + ${width} + ${height} = ${2 * (width + height)} units.`, { unit: "units", visual: { type: "rect", width, height, unit: "units", grid: false, labels: true } });
}

export function missingSide(rng: Rng, skill: string): Task {
  const width = rng.int(3, 15), height = rng.int(2, 12), p = 2 * (width + height);
  return num(skill, `A rectangle has a perimeter of ${p} meters. One side is ${width} meters long. How long is the side next to it?`, height, "Two long sides and two short sides make the perimeter. Half the perimeter is one of each.", `Half of ${p} is ${p / 2}. ${p / 2} − ${width} = ${height} meters.`, { unit: "m", visual: { type: "story", emoji: "🧱" } });
}

export function areaFormula(rng: Rng, skill: string): Task {
  const length = rng.int(12, 48), width = rng.int(3, 15);
  return num(skill, `A garden is ${length} feet long and ${width} feet wide. What is its area in square feet?`, length * width, "Area of a rectangle = length × width.", `${length} × ${width} = ${fmt(length * width)} square feet.`, { unit: "sq ft", visual: { type: "rect", width: length, height: width, unit: "ft", grid: false, labels: true } });
}

type Conversion = readonly [big: string, small: string, factor: number, places: number];
const CONVERSIONS: Record<"customary" | "metric", readonly Conversion[]> = {
  customary: [["feet", "inches", 12, 0], ["yards", "feet", 3, 0], ["pounds", "ounces", 16, 0], ["gallons", "quarts", 4, 0], ["hours", "minutes", 60, 0]],
  metric: [["meters", "centimeters", 100, 2], ["kilometers", "meters", 1000, 3], ["kilograms", "grams", 1000, 3], ["liters", "milliliters", 1000, 3], ["centimeters", "millimeters", 10, 1]],
};

export function convertUnits(rng: Rng, skill: string, decimals: boolean): Task {
  const system = decimals && rng.next() < 0.6 ? "metric" : rng.pick(["customary", "metric"] as const);
  const [big, small, factor, places] = rng.pick(CONVERSIONS[system]);
  if (decimals && system === "metric") {
    // Small units to big units makes a decimal: 250 centimeters = 2.5 meters.
    const smallCount = rng.int(factor + 1, factor * 9 - 1), answer = decimalText(smallCount, places);
    return num(skill, `${fmt(smallCount)} ${small} = how many ${big}?`, answer, `There are ${fmt(factor)} ${small} in 1 ${big.slice(0, -1)}. Dividing by ${fmt(factor)} moves each digit to the right.`, `${fmt(smallCount)} ÷ ${fmt(factor)} = ${answer}, so ${fmt(smallCount)} ${small} = ${answer} ${big}.`, { format: "decimal", visual: { type: "text", text: `${fmt(smallCount)} ${small} = ? ${big}` } });
  }
  const count = rng.int(2, 9);
  return num(skill, `${count} ${big} = how many ${small}?`, count * factor, `1 ${big.slice(0, -1)} is ${fmt(factor)} ${small}.`, `${count} × ${fmt(factor)} = ${fmt(count * factor)}, so ${count} ${big} = ${fmt(count * factor)} ${small}.`, { visual: { type: "text", text: `${count} ${big} = ? ${small}` } });
}

// ---------- Angles and volume ----------

export function angleBuild(rng: Rng, skill: string, step: number): Task {
  const target = rng.int(1, Math.floor(180 / step) - 1) * step;
  return {
    kind: "build", skill, prompt: `Turn the ray to make a ${target}° angle.`,
    dials: [{ id: "degrees", label: "Degrees", min: 0, max: 180, step, start: 0 }],
    goal: { type: "each", values: { degrees: target } }, solution: { degrees: target }, live: { type: "angle" },
    hint: "Start from the 0 line of the protractor and read the scale that starts at 0.", explain: `A ${target}° angle is ${target < 90 ? "smaller than a square corner (acute)" : target === 90 ? "a square corner (right)" : "wider than a square corner (obtuse)"}.`,
  };
}

export function angleRead(rng: Rng, skill: string): Task {
  const degrees = rng.int(1, 17) * 10;
  return num(skill, "How many degrees is this angle?", degrees, "Put the protractor’s center on the corner. Read the scale that starts at 0 on the first ray.", `The second ray passes ${degrees}°, so the angle measures ${degrees}°.`, { unit: "°", visual: { type: "angle", degrees, protractor: true } });
}

export function angleJoin(rng: Rng, skill: string): Task {
  const a = rng.int(2, 9) * 5, b = rng.int(2, 14) * 5;
  return num(skill, `Two angles of ${a}° and ${b}° sit side by side with no gap. How big is the angle they make together?`, a + b, "Angle measures add when angles are put together.", `${a}° + ${b}° = ${a + b}°.`, { unit: "°", visual: { type: "angle", degrees: a + b, protractor: false } });
}

export function volumeCount(rng: Rng, skill: string): Task {
  const length = rng.int(2, 4), width = rng.int(2, 3), height = rng.int(1, 3);
  return num(skill, "How many unit cubes make this box?", length * width * height, "Count the cubes in the bottom layer, then count the layers.", `The bottom layer has ${length} × ${width} = ${length * width} cubes. ${height} ${height === 1 ? "layer" : "layers"}: ${length * width} × ${height} = ${length * width * height} cubic units.`, { unit: "cubic units", visual: { type: "cubes", length, width, height } });
}

export function volumeBuild(rng: Rng, skill: string): Task {
  const length = rng.int(2, 5), width = rng.int(2, 4), height = rng.int(2, 4);
  return {
    kind: "build", skill, prompt: `Build a box with a ${length} by ${width} base and a volume of ${length * width * height} cubic units.`,
    dials: [{ id: "length", label: "Length", min: 1, max: 6, step: 1, start: 1 }, { id: "width", label: "Width", min: 1, max: 6, step: 1, start: 1 }, { id: "height", label: "Height", min: 1, max: 6, step: 1, start: 1 }],
    goal: { type: "product", ids: ["length", "width", "height"], target: length * width * height, fixed: { length, width } }, solution: { length, width, height }, live: { type: "cubes" },
    hint: "Volume = length × width × height. Set the base first, then find the height.", explain: `${length} × ${width} = ${length * width} cubes in each layer. ${length * width} × ${height} = ${length * width * height}.`,
  };
}

export function volumeFormula(rng: Rng, skill: string): Task {
  const length = rng.int(3, 6), width = rng.int(2, 4), height = rng.int(2, 4);
  return num(skill, `A shipping box is ${length} cm long, ${width} cm wide and ${height} cm tall. What is its volume in cubic centimeters?`, length * width * height, "V = length × width × height.", `${length} × ${width} × ${height} = ${fmt(length * width * height)} cubic centimeters.`, { unit: "cm³", visual: { type: "cubes", length, width, height } });
}

// ---------- Shapes (Kindergarten to Grade 3) ----------

export function nameShape(rng: Rng, skill: string, set: ShapeName[]): Task {
  const [shape, ...rest] = rng.shuffle(set) as [ShapeName, ...ShapeName[]];
  return {
    kind: "choice", skill, prompt: "What is the name of this shape?", visual: { type: "shape", shape, rotate: rng.pick(ROTATIONS) },
    ...choose(rng, SHAPE_NAMES[shape], rest.slice(0, 2).map((s) => SHAPE_NAMES[s])),
    hint: "Count the sides and corners. Turning a shape does not change its name.", explain: `It is a ${SHAPE_NAMES[shape]}, even when it is turned.`,
  };
}

export function solidName(rng: Rng, skill: string): Task {
  const [solid, ...rest] = rng.shuffle(["cube", "sphere", "cone", "cylinder"] as SolidName[]) as [SolidName, ...SolidName[]];
  return { kind: "choice", skill, prompt: "What is the name of this solid shape?", visual: { type: "solid", solid }, ...choose(rng, SOLID_NAMES[solid], rest.slice(0, 2).map((s) => SOLID_NAMES[s])), hint: "Does it roll? Does it have flat faces or a point?", explain: `This is a ${SOLID_NAMES[solid]}.` };
}

export function flatOrSolid(rng: Rng, skill: string): Task {
  const flats = rng.shuffle(["circle", "square", "triangle", "rectangle", "hexagon"] as ShapeName[]).slice(0, 3);
  const solids = rng.shuffle(["cube", "sphere", "cone", "cylinder"] as SolidName[]).slice(0, 3);
  const items = rng.shuffle([
    ...flats.map((shape) => ({ label: SHAPE_NAMES[shape], visual: { type: "shape" as const, shape }, bin: "flat" })),
    ...solids.map((solid) => ({ label: SOLID_NAMES[solid], visual: { type: "solid" as const, solid }, bin: "solid" })),
  ]).map((item, i) => ({ id: `s${i}`, ...item }));
  return { kind: "sort", skill, prompt: "Sort the shapes: flat (2D) or solid (3D)?", bins: [{ id: "flat", label: "Flat (2D)" }, { id: "solid", label: "Solid (3D)" }], items, hint: "Flat shapes lie flat on paper. Solid shapes can be picked up and have depth.", explain: `Flat: ${flats.map((s) => SHAPE_NAMES[s]).join(", ")}. Solid: ${solids.map((s) => SOLID_NAMES[s]).join(", ")}.` };
}

const POSITION_PAIRS = [["🐦", "bird", "🌳", "tree"], ["⭐", "star", "🏠", "house"], ["🐱", "cat", "📦", "box"], ["🎈", "balloon", "🐶", "dog"]] as const;

export function positionWord(rng: Rng, skill: string): Task {
  const [thing, thingName, reference, referenceName] = rng.pick(POSITION_PAIRS), relation = rng.pick(["above", "below", "beside"] as const);
  return { kind: "choice", skill, prompt: `Where is the ${thingName}?`, visual: { type: "position", thing, reference, relation }, ...choose(rng, `${relation} the ${referenceName}`, ["above", "below", "beside"].map((r) => `${r} the ${referenceName}`)), hint: `Look at the ${referenceName} first. Is the ${thingName} higher, lower or next to it?`, explain: `The ${thingName} is ${relation} the ${referenceName}.` };
}

export function sticksForShape(rng: Rng, skill: string): Task {
  const [shape, sides] = rng.pick([["triangle", 3], ["square", 4], ["rectangle", 4], ["pentagon", 5], ["hexagon", 6]] as [ShapeName, number][]);
  return num(skill, `How many straight sticks do you need to build a ${SHAPE_NAMES[shape]}?`, sides, "Each side needs one stick. Count the sides.", `A ${SHAPE_NAMES[shape]} has ${sides} sides, so it needs ${sides} sticks.`, { visual: { type: "shape", shape } });
}

export function triangleSort(rng: Rng, skill: string): Task {
  const yes = rng.shuffle(["triangle", "rightTriangle", "obtuseTriangle", "acuteTriangle"] as ShapeName[]).slice(0, 3);
  const no = rng.shuffle(["square", "circle", "openShape", "pentagon", "rectangle"] as ShapeName[]).slice(0, 3);
  const items = rng.shuffle([...yes.map((shape) => ({ shape, bin: "yes" })), ...no.map((shape) => ({ shape, bin: "no" }))]).map((item, i) => ({ id: `s${i}`, label: `Shape ${i + 1}`, visual: { type: "shape" as const, shape: item.shape, rotate: rng.pick(ROTATIONS) }, bin: item.bin }));
  return { kind: "sort", skill, prompt: "Sort the shapes: triangle or not a triangle?", bins: [{ id: "yes", label: "Triangle" }, { id: "no", label: "Not a triangle" }], items, hint: "A triangle is closed and has exactly 3 straight sides. Size, color and turning do not matter.", explain: "Triangles have 3 straight sides and 3 corners and are closed. The others have a different number of sides, a curve, or a gap." };
}

export function composeShapes(rng: Rng, skill: string): Task {
  const variant = rng.pick([
    { prompt: "Which two shapes can be put together to make a rectangle?", answer: "two squares", others: ["two circles", "a circle and a triangle"], explain: "Two squares side by side make a rectangle." },
    { prompt: "A square is cut from corner to corner. Put its two triangle pieces together. What shape is back?", answer: "a square", others: ["a circle", "a hexagon"], explain: "The two matching pieces fit along the cut to rebuild the square." },
    { prompt: "Six matching triangles, each with equal sides, meet at the center. What shape can they build?", answer: "a hexagon", others: ["a circle", "a rectangle"], explain: "Six equal-sided triangles fit around the center to make a hexagon." },
  ]);
  return { kind: "choice", skill, prompt: variant.prompt, visual: { type: "story", emoji: "🧩" }, ...choose(rng, variant.answer, variant.others), hint: "Picture sliding the pieces together. Do the edges match up?", explain: variant.explain };
}

const DESCRIPTIONS = [
  { text: "5 sides and 5 corners", shape: "pentagon" }, { text: "6 sides and 6 corners", shape: "hexagon" },
  { text: "3 sides and 3 corners", shape: "triangle" }, { text: "4 equal sides and 4 square corners", shape: "square" },
  { text: "no sides and no corners", shape: "circle" }, { text: "8 sides and 8 corners", shape: "octagon" },
] as const;

export function attributeShape(rng: Rng, skill: string): Task {
  const [d, ...rest] = rng.shuffle([...DESCRIPTIONS]);
  const visuals = Object.fromEntries([d!, ...rest.slice(0, 2)].map((x) => [SHAPE_NAMES[x.shape], { type: "shape" as const, shape: x.shape }]));
  return { kind: "choice", skill, prompt: `Which shape has ${d!.text}?`, ...choose(rng, SHAPE_NAMES[d!.shape], rest.slice(0, 2).map((x) => SHAPE_NAMES[x.shape]), visuals), hint: "Count the sides and corners of each shape.", explain: `A ${SHAPE_NAMES[d!.shape]} has ${d!.text}.` };
}

export function rowsColumnsBuild(rng: Rng, skill: string): Task {
  const rows = rng.int(2, 4), cols = rng.int(2, 5);
  return {
    kind: "build", skill, prompt: `Split the rectangle into ${rows} rows and ${cols} columns of equal squares.`,
    dials: [{ id: "rows", label: "Rows", min: 1, max: 5, step: 1, start: 1 }, { id: "cols", label: "Columns", min: 1, max: 6, step: 1, start: 1 }],
    goal: { type: "each", values: { rows, cols } }, solution: { rows, cols }, live: { type: "array", emoji: "🟦" },
    hint: "Rows go across. Columns go up and down.", explain: `${rows} rows and ${cols} columns make ${rows * cols} equal squares.`,
  };
}

export function quadrilateralSort(rng: Rng, skill: string): Task {
  const quads = rng.shuffle(["square", "rectangle", "rhombus", "trapezoid", "parallelogram", "kite"] as ShapeName[]).slice(0, 3);
  const others = rng.shuffle(["triangle", "pentagon", "hexagon", "circle", "octagon"] as ShapeName[]).slice(0, 3);
  const items = rng.shuffle([...quads.map((shape) => ({ shape, bin: "quad" })), ...others.map((shape) => ({ shape, bin: "other" }))]).map((item, i) => ({ id: `s${i}`, label: SHAPE_NAMES[item.shape], visual: { type: "shape" as const, shape: item.shape }, bin: item.bin }));
  return { kind: "sort", skill, prompt: "Sort the shapes: quadrilateral or not?", bins: [{ id: "quad", label: "Quadrilateral (4 sides)" }, { id: "other", label: "Not a quadrilateral" }], items, hint: "A quadrilateral is any closed shape with exactly 4 straight sides.", explain: `Quadrilaterals here: ${quads.map((s) => SHAPE_NAMES[s]).join(", ")}. Each has 4 straight sides.` };
}

export function equalAreaFraction(rng: Rng, skill: string): Task {
  const parts = rng.pick([2, 3, 4, 6, 8]);
  return { kind: "number", skill, format: "fraction", answer: `1/${parts}`, prompt: "Each part has the same area. What fraction of the whole shape is one part?", visual: { type: "fraction", model: "rect", parts, shaded: 1 }, hint: "Count how many equal parts make the whole.", explain: `The shape has ${parts} equal parts, so each part is 1/${parts} of the area.` };
}

// ---------- Lines, triangles, symmetry and the coordinate plane (Grades 4 and 5) ----------

export function lineKind(rng: Rng, skill: string): Task {
  if (rng.next() < 0.5) {
    const kinds = [["line", "a line"], ["ray", "a ray"], ["segment", "a line segment"]] as const, [kind, answer] = rng.pick(kinds);
    return { kind: "choice", skill, prompt: "What is this?", visual: { type: "lines", kind }, ...choose(rng, answer, kinds.map((k) => k[1])), hint: "Look at the ends: an arrow means it keeps going; a dot means it stops.", explain: "A line goes on forever both ways, a ray has one endpoint, and a line segment has two endpoints." };
  }
  const kinds = [["parallel", "parallel lines"], ["perpendicular", "perpendicular lines"], ["intersecting", "intersecting lines (not perpendicular)"]] as const, [kind, answer] = rng.pick(kinds);
  return { kind: "choice", skill, prompt: "Which words describe these lines?", visual: { type: "lines", kind }, ...choose(rng, answer, kinds.map((k) => k[1])), hint: "Do the lines ever meet? If they do, do they make a square corner?", explain: "Parallel lines never meet. Perpendicular lines meet at a right angle. Other intersecting lines cross without a square corner." };
}

export function triangleClassSort(rng: Rng, skill: string): Task {
  const kinds: [ShapeName, string][] = [["rightTriangle", "right"], ["acuteTriangle", "acute"], ["obtuseTriangle", "obtuse"]];
  const items = rng.shuffle(kinds.flatMap(([shape, bin]) => [0, 1].map(() => ({ shape, bin })))).map((item, i) => ({ id: `t${i}`, label: `Triangle ${i + 1}`, visual: { type: "shape" as const, shape: item.shape, rotate: rng.pick(ROTATIONS) }, bin: item.bin }));
  return { kind: "sort", skill, prompt: "Sort the triangles by their biggest angle.", bins: [{ id: "right", label: "Right (a square corner)" }, { id: "acute", label: "Acute (all angles small)" }, { id: "obtuse", label: "Obtuse (one wide angle)" }], items, hint: "Find the biggest corner. Compare it with the corner of a sheet of paper.", explain: "A right triangle has a 90° angle, an obtuse triangle has one angle bigger than 90°, and an acute triangle has all angles smaller than 90°." };
}

const SYMMETRY = [
  { shape: "square", line: "vertical", yes: true }, { shape: "rectangle", line: "diagonal", yes: false }, { shape: "heart", line: "vertical", yes: true },
  { shape: "parallelogram", line: "vertical", yes: false }, { shape: "hexagon", line: "horizontal", yes: true }, { shape: "rightTriangle", line: "vertical", yes: false },
  { shape: "trapezoid", line: "vertical", yes: true }, { shape: "kite", line: "vertical", yes: true },
] as const;

export function symmetryChoice(rng: Rng, skill: string): Task {
  const s = rng.pick(SYMMETRY), yes = "Yes, both halves match", no = "No, the halves do not match";
  return { kind: "choice", skill, prompt: "Is the dashed line a line of symmetry?", visual: { type: "shape", shape: s.shape, symmetry: s.line }, ...choose(rng, s.yes ? yes : no, [yes, no]), hint: "Imagine folding the shape on the dashed line. Would the two halves land exactly on each other?", explain: s.yes ? `Folding the ${SHAPE_NAMES[s.shape]} on that line makes the halves match exactly.` : `Folding the ${SHAPE_NAMES[s.shape]} on that line leaves parts that do not match.` };
}

export function coordinatePlot(rng: Rng, skill: string, size: number): Task {
  const x = rng.int(1, size), y = rng.int(1, size);
  return {
    kind: "build", skill, prompt: `Plot the treasure at (${x}, ${y}).`,
    dials: [{ id: "x", label: "x (across)", min: 0, max: size, step: 1, start: 0 }, { id: "y", label: "y (up)", min: 0, max: size, step: 1, start: 0 }],
    goal: { type: "each", values: { x, y } }, solution: { x, y }, live: { type: "grid", size, label: "★" },
    hint: "Start at (0, 0). Go across the x-axis first, then up the y-axis.", explain: `(${x}, ${y}) means ${x} across and ${y} up.`,
  };
}

export function coordinateRead(rng: Rng, skill: string, size: number): Task {
  const x = rng.int(1, size);
  let y = rng.int(1, size);
  if (y === x) y = x === size ? x - 1 : x + 1;
  const answer = `(${x}, ${y})`;
  return { kind: "choice", skill, prompt: "What are the coordinates of point A?", visual: { type: "grid", size, points: [{ x, y, label: "A" }] }, ...choose(rng, answer, [`(${y}, ${x})`, `(${x}, ${y === size ? y - 1 : y + 1})`]), hint: "Read across first (x), then up (y).", explain: `Point A is ${x} across and ${y} up, so it is at ${answer}.` };
}

export function axisDistance(rng: Rng, skill: string, size: number): Task {
  const x = rng.int(1, size), y1 = rng.int(0, size - 2), y2 = rng.int(y1 + 2, size);
  return num(skill, `Point A is at (${x}, ${y1}) and point B is at (${x}, ${y2}). How many units apart are they?`, y2 - y1, "They are on the same vertical line. Subtract the y-coordinates.", `${y2} − ${y1} = ${y2 - y1} units.`, { visual: { type: "grid", size, points: [{ x, y: y1, label: "A" }, { x, y: y2, label: "B" }] } });
}

const HIERARCHY = [
  ["Every square is a rectangle.", true, "A square has 4 right angles, so it is a rectangle too."],
  ["Every square is a rhombus.", true, "A square has 4 equal sides, so it is a rhombus too."],
  ["Every rectangle is a parallelogram.", true, "A rectangle has two pairs of parallel sides, so it is a parallelogram."],
  ["Every rhombus is a quadrilateral.", true, "A rhombus has 4 straight sides, so it is a quadrilateral."],
  ["Every rectangle is a square.", false, "A long, thin rectangle does not have 4 equal sides, so it is not a square."],
  ["Every parallelogram is a rectangle.", false, "A slanted parallelogram has no right angles, so it is not a rectangle."],
  ["Every rhombus is a square.", false, "A tilted rhombus has equal sides but no right angles, so it is not a square."],
  ["Every quadrilateral is a parallelogram.", false, "A kite has 4 sides but no parallel sides, so not every quadrilateral is a parallelogram."],
] as const;

export function hierarchyChoice(rng: Rng, skill: string): Task {
  const [statement, truth, reason] = rng.pick(HIERARCHY);
  return { kind: "choice", skill, prompt: `True or false? ${statement}`, visual: { type: "story", emoji: "🔷" }, ...choose(rng, truth ? "True" : "False", ["True", "False"]), hint: "What does a shape need to belong to the second family? Does every shape in the first family have that?", explain: `${truth ? "True" : "False"}. ${reason}` };
}

export function parallelogramSort(rng: Rng, skill: string): Task {
  const yes = rng.shuffle(["square", "rectangle", "rhombus", "parallelogram"] as ShapeName[]).slice(0, 3), no = rng.shuffle(["trapezoid", "kite", "triangle", "pentagon"] as ShapeName[]).slice(0, 3);
  const items: (Option & { bin: string })[] = rng.shuffle([...yes.map((shape) => ({ shape, bin: "yes" })), ...no.map((shape) => ({ shape, bin: "no" }))]).map((item, i) => ({ id: `s${i}`, label: SHAPE_NAMES[item.shape], visual: { type: "shape", shape: item.shape }, bin: item.bin }));
  return { kind: "sort", skill, prompt: "Sort the shapes: is it a parallelogram (two pairs of parallel sides)?", bins: [{ id: "yes", label: "Parallelogram" }, { id: "no", label: "Not a parallelogram" }], items, hint: "Check for two pairs of parallel sides. Squares, rectangles and rhombuses all have them.", explain: `Parallelograms here: ${yes.map((s) => SHAPE_NAMES[s]).join(", ")}. Squares, rectangles and rhombuses are special parallelograms.` };
}
