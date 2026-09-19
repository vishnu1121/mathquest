import { z } from "zod";
import { createRng, type Rng } from "../engine/rng";

export const CONCEPT_IDS = ["subtraction", "multiplication", "division", "fractions", "patterns", "measurement", "geometry"] as const;
export type Concept = typeof CONCEPT_IDS[number];
export type Band = 1 | 2 | 3;
export const TRAILS = [
  { id: "subtraction", name: "Starfall Station", subject: "Subtraction", icon: "🚀", color: "lilac", verb: "Rescue the stars", description: "Send stars home. Discover what stays and what changes.", builds: "Counting & addition", souvenir: "Comet compass" },
  { id: "multiplication", name: "Moonflower Garden", subject: "Multiplication", icon: "🌻", color: "peach", verb: "Grow an array", description: "Turn equal rows into a garden of surprising numbers.", builds: "Equal groups", souvenir: "Moonflower seed" },
  { id: "division", name: "Panda Picnic", subject: "Division", icon: "🐼", color: "mint", verb: "Share the feast", description: "A berry for everyone. Make the sharing fair.", builds: "Multiplication", souvenir: "Picnic pennant" },
  { id: "fractions", name: "Slice of the Sky", subject: "Fractions", icon: "🍕", color: "rose", verb: "Serve a fraction", description: "Little pieces, one whole. Run a cloud-top pizza café.", builds: "Equal sharing", souvenir: "Cloud café badge" },
  { id: "patterns", name: "Pattern Express", subject: "Patterns", icon: "🚂", color: "blue", verb: "Find the rhythm", description: "Repair a musical train by discovering its secret rule.", builds: "Counting & noticing", souvenir: "Rainbow ticket" },
  { id: "measurement", name: "Tiny Town Builders", subject: "Measurement", icon: "📏", color: "sand", verb: "Measure & build", description: "Line up a ruler. Fit a bridge. Fence a tiny garden.", builds: "Counting & subtraction", souvenir: "Golden ruler" },
  { id: "geometry", name: "Shape Observatory", subject: "Geometry", icon: "🔭", color: "indigo", verb: "Connect a constellation", description: "Stretch starlight between pegs to build real shapes.", builds: "Sides & corners", souvenir: "Constellation lens" },
] as const;

const band = z.union([z.literal(1), z.literal(2), z.literal(3)]);
const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const resultSchema = z.object({ correct: z.boolean(), independent: z.boolean(), level: band, mode: z.string().max(30) });
const trailSchema = z.object({ level: band, attempts: count, visits: count, completed: count, recent: z.array(resultSchema).max(8), lastKeys: z.array(z.string().max(140)).max(12) });
type TrailProgress = z.infer<typeof trailSchema>;
export interface Curriculum { version: 1; trails: Record<Concept, TrailProgress>; expeditions: number }
const freshTrail = (): TrailProgress => ({ level: 1, attempts: 0, visits: 0, completed: 0, recent: [], lastKeys: [] });
export function restoreCurriculum(raw: unknown): Curriculum {
  const envelope = z.object({ version: z.literal(1), trails: z.record(z.string(), z.unknown()), expeditions: count.optional() }).safeParse(raw);
  return { version: 1, expeditions: envelope.success ? envelope.data.expeditions ?? 0 : 0,
    trails: Object.fromEntries(CONCEPT_IDS.map((id) => [id, trailSchema.safeParse(envelope.success ? envelope.data.trails[id] : null).data ?? freshTrail()])) as Curriculum["trails"] };
}
export function recordPractice(model: Curriculum, concept: Concept, correct: boolean, attempt: number, helped: boolean, level: Band, mode: string): Curriculum {
  const prev = model.trails[concept];
  const recent = [...prev.recent, { correct, independent: correct && attempt === 1 && !helped, level, mode }].slice(-8);
  const atLevel = recent.slice(-3).filter((r) => r.level === prev.level);
  let nextLevel = prev.level;
  if (atLevel.length === 3 && atLevel.every((r) => r.independent)) nextLevel = Math.min(3, prev.level + 1) as Band;
  else if (atLevel.length === 3 && atLevel.filter((r) => !r.independent).length >= 2) nextLevel = Math.max(1, prev.level - 1) as Band;
  return { ...model, trails: { ...model.trails, [concept]: { ...prev, attempts: prev.attempts + 1, recent, level: nextLevel } } };
}
export function practiceStatus(state: TrailProgress) {
  if (!state.attempts) return "Ready to discover";
  const solo = state.recent.filter((r) => r.independent);
  return solo.length >= 4 && new Set(solo.map((r) => r.mode)).size >= 2 ? "Growing confidence" : "Finding your way";
}
export function recommendTrail(model: Curriculum): Concept {
  const needsSupport = CONCEPT_IDS.find((id) => {
    const last = model.trails[id].recent.slice(-3);
    return last.length >= 2 && last.filter((r) => !r.correct).length >= 2;
  });
  if (needsSupport) return needsSupport;
  return CONCEPT_IDS.find((id) => !model.trails[id].completed)
    ?? [...CONCEPT_IDS].sort((a, b) => model.trails[a].attempts - model.trails[b].attempts)[0]!;
}

/** The integers are the source of truth. Visuals and optional AI hints only describe them. */
export interface TrailPuzzle {
  concept: Concept; level: Band; mode: string; key: string;
  a: number; b: number; target: number; parts: number;
  sequence: number[]; options: number[]; solution: number[]; shape: string;
  prompt: string; hint: string; explanation: string; flavor: string;
}
export interface TrailAnswer { picks: number[]; rows: number; columns: number; bowls: number[]; value: number; offset: number; sequence: number[] }
export const blankAnswer = (): TrailAnswer => ({ picks: [], rows: 1, columns: 1, bowls: [], value: 0, offset: 0, sequence: [] });
const FLAVORS = ["A curious comet brought a new challenge.", "Pip found a mysterious blueprint!", "A little detour. A fresh discovery.", "Hoot saved this one for you.", "Something wonderful is waiting to be built."];

export function generateTrailPuzzle(concept: Concept, level: Band, round: number, rng: Rng): TrailPuzzle {
  const p: TrailPuzzle = { concept, level, mode: "", key: "", a: 0, b: 0, target: 0, parts: 0, sequence: [], options: [], solution: [], shape: "", prompt: "", hint: "", explanation: "", flavor: rng.pick(FLAVORS) };
  if (concept === "subtraction") {
    p.a = rng.int(level === 1 ? 5 : 11, level === 1 ? 10 : level === 2 ? 18 : 24);
    p.b = rng.int(1, p.a - 2); p.target = p.a - p.b;
    p.mode = round % 2 ? "keep" : "send";
    p.prompt = p.mode === "send" ? `There are ${p.a} stars. Send ${p.b} home. How many will stay?` : `Keep ${p.target} of these ${p.a} stars at the station. Send the others home.`;
    p.hint = p.mode === "send" ? "Tap a star to send it home. Count the stars that stay; those are the difference." : "Start with the stars you want to keep. The extra stars are the ones to send home.";
    p.explanation = `${p.a} − ${p.b} = ${p.target}. Subtraction tells us what is left. And ${p.target} + ${p.b} brings all ${p.a} back!`;
    p.solution = Array.from({ length: p.b }, (_, i) => i);
  } else if (concept === "multiplication") {
    p.a = rng.int(2, level === 1 ? 3 : 5); p.b = rng.int(2, level === 1 ? 4 : level === 2 ? 6 : 8);
    p.target = p.a * p.b; p.mode = round % 2 ? "rows" : "columns";
    p.prompt = p.mode === "columns" ? `Grow ${p.target} moonflowers in ${p.a} equal rows. How many flowers belong in each row?` : `Each row holds ${p.b} flowers. How many rows will grow ${p.target} flowers?`;
    p.hint = "Every row must be equal. Add one row's flowers at a time and watch the whole garden grow.";
    p.explanation = `${p.a} rows × ${p.b} flowers = ${p.target} flowers. ${Array.from({ length: p.a }, () => p.b).join(" + ")} is the same amount.`;
  } else if (concept === "division") {
    p.a = rng.int(2, level === 1 ? 3 : 5); p.b = rng.int(2, level === 1 ? 4 : 6);
    const remainder = level === 3 && round % 2 ? rng.int(1, p.a - 1) : 0;
    p.target = p.a * p.b + remainder; p.mode = remainder ? "remainder" : "equal";
    p.prompt = `Share ${p.target} berries fairly between ${p.a} pandas.${remainder ? " Share as many as you can; keep any leftovers in the basket." : " Use every berry."}`;
    p.hint = "Give each panda one berry, then go around again. Everyone should have the same amount.";
    p.explanation = `${p.target} ÷ ${p.a} = ${p.b}${remainder ? ` with ${remainder} left over` : ""}. ${p.a} groups of ${p.b} make ${p.a * p.b}.`;
  } else if (concept === "fractions") {
    p.b = rng.pick(level === 1 ? [2, 4] : [2, 3, 4, 6]); p.a = rng.int(1, p.b - 1);
    p.parts = level >= 2 && round % 2 ? p.b * 2 : p.b;
    p.target = p.a * p.parts / p.b; p.mode = p.parts !== p.b ? "equivalent" : round % 2 ? "bar" : "pizza";
    p.prompt = `Serve ${p.a}/${p.b} of ${p.mode === "bar" ? "the sky cake" : "this pizza"}. It is cut into ${p.parts} equal pieces.`;
    p.hint = p.mode === "equivalent" ? "Each original part has been split in two. You need two little pieces for each big part." : "The bottom number counts all the equal parts. The top number tells how many parts to serve.";
    p.explanation = p.parts === p.b ? `${p.a} out of ${p.b} equal parts is ${p.a}/${p.b} of one whole.` : `${p.target}/${p.parts} and ${p.a}/${p.b} cover exactly the same amount. Smaller pieces mean we need more pieces, not more pizza!`;
    p.solution = Array.from({ length: p.target }, (_, i) => i);
  } else if (concept === "patterns") {
    p.mode = round % 2 ? "rhythm" : "numbers";
    if (p.mode === "rhythm") {
      const motif = rng.pick(level === 1 ? [[0, 1], [1, 2]] : level === 2 ? [[0, 1, 2], [0, 0, 1]] : [[0, 1, 1, 2], [0, 1, 0, 2]]);
      p.sequence = Array.from({ length: motif.length * 2 }, (_, i) => motif[i % motif.length]!);
      p.solution = [motif[0]!, motif[1]!]; p.options = [0, 1, 2]; p.a = motif.length;
      p.prompt = "Listen with your eyes. Which two carriages keep this repeating pattern going?";
      p.hint = "Look for a little group that repeats exactly. Start that group again after the last carriage.";
      p.explanation = `The same group of ${motif.length} shapes repeats. A pattern keeps its rule even when the train gets longer.`;
    } else {
      p.a = rng.pick(level === 1 ? [2, 5, 10] : [2, 3, 4, 5, 10]); p.b = rng.int(0, 6);
      const descending = level >= 2 && round % 4 === 2;
      const step = descending ? -p.a : p.a;
      const start = descending ? p.a * 8 + p.b : p.b;
      p.sequence = Array.from({ length: 5 }, (_, i) => start + step * i);
      p.solution = [start + step * 5, start + step * 6];
      p.options = rng.shuffle([...new Set([...p.solution, p.solution[0]! + 1, Math.max(0, p.solution[1]! - 1), p.solution[1]! + p.a])]);
      p.prompt = "The train is missing its next two numbers. Tap tickets in the order they belong.";
      p.hint = "Compare two neighbors. Check that the same jump works again, then continue it.";
      p.explanation = `The rule is ${descending ? "subtract" : "add"} ${p.a} each time. Next come ${p.solution.join(" and ")}.`;
    }
  } else if (concept === "measurement") {
    p.mode = level >= 2 && round % 2 ? "perimeter" : "ruler";
    if (p.mode === "ruler") {
      p.a = rng.int(1, level === 1 ? 2 : 4); p.b = rng.int(2, level === 1 ? 5 : 7); p.target = p.b;
      p.prompt = "Slide the ruler so zero meets the bridge's left edge. How many centimeters long is the bridge?";
      p.hint = "Start measuring at zero, not at the edge of the screen. Read the mark where the bridge ends.";
      p.explanation = `The bridge starts at 0 and ends at ${p.b} on the ruler. Its length is ${p.b} cm, wherever we move it.`;
    } else {
      p.a = rng.int(2, 6); p.b = rng.int(2, 4); p.target = 2 * (p.a + p.b);
      p.prompt = `Fence all the way around a garden ${p.a} meters long and ${p.b} meters wide. How many meters of fence?`;
      p.hint = "A fence goes around all four sides. Add the long side, short side, long side, and short side.";
      p.explanation = `${p.a} + ${p.b} + ${p.a} + ${p.b} = ${p.target} meters. Perimeter measures the distance around a shape.`;
    }
  } else {
    const shapes = level === 1 ? ["triangle", "square"] : level === 2 ? ["rectangle", "triangle", "square"] : ["pentagon", "hexagon", "rectangle"];
    p.shape = shapes[(round + rng.int(0, shapes.length - 1)) % shapes.length]!; p.mode = p.shape;
    const examples: Record<string, number[]> = { triangle: [1, 11, 12], square: [0, 3, 15, 12], rectangle: [0, 2, 14, 12], pentagon: [1, 7, 15, 12, 4], hexagon: [1, 2, 11, 14, 13, 8] };
    const rotations = rng.int(0, 3), mirror = rng.next() < .5;
    p.solution = examples[p.shape]!.map((i) => {
      let x = i % 4, y = Math.floor(i / 4);
      if (mirror) x = 3 - x;
      for (let r = 0; r < rotations; r++) [x, y] = [3 - y, x];
      return y * 4 + x;
    });
    p.a = p.solution.length; p.target = p.a; p.b = p.solution[0]!;
    p.prompt = `Start at the glowing star. Build a ${p.shape} by tapping ${p.a} corners in order, then check your constellation.`;
    p.hint = p.shape === "square" ? "A square has four equal sides and four square corners. Try the four outside corner stars." : p.shape === "rectangle" ? "A rectangle has four square corners. Opposite sides match. Trace around the outside, not across the middle." : `A ${p.shape} has ${p.a} sides and ${p.a} corners. Go around the shape; don't cross your lines.`;
    p.explanation = `You built a ${p.shape}: ${p.a} straight sides and ${p.a} corners.${p.shape === "square" ? " All its sides are equal, and all its corners are right angles." : p.shape === "rectangle" ? " Each corner is a right angle." : " A shape stays the same kind when we turn it."}`;
  }
  p.key = [concept, p.mode, p.a, p.b, p.parts, p.target, p.sequence.join(".")].join(":");
  return p;
}

type Point = [number, number];
const point = (i: number): Point => [i % 4, Math.floor(i / 4)];
const cross = (a: Point, b: Point, c: Point) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
function intersects(a: Point, b: Point, c: Point, d: Point) {
  const on = (u: Point, v: Point, p: Point) => cross(u, v, p) === 0 && p[0] >= Math.min(u[0], v[0]) && p[0] <= Math.max(u[0], v[0]) && p[1] >= Math.min(u[1], v[1]) && p[1] <= Math.max(u[1], v[1]);
  return (cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0) || on(a, b, c) || on(a, b, d) || on(c, d, a) || on(c, d, b);
}
export function validShape(indices: number[], shape: string): boolean {
  const count = shape === "triangle" ? 3 : shape === "pentagon" ? 5 : shape === "hexagon" ? 6 : 4;
  if (indices.length !== count || new Set(indices).size !== count || indices.some((i) => !Number.isInteger(i) || i < 0 || i > 15)) return false;
  const pts = indices.map(point);
  for (let i = 0; i < count; i++) {
    if (cross(pts[i]!, pts[(i + 1) % count]!, pts[(i + 2) % count]!) === 0) return false;
    for (let j = i + 2; j < count; j++) {
      if ((j + 1) % count !== i && intersects(pts[i]!, pts[(i + 1) % count]!, pts[j]!, pts[(j + 1) % count]!)) return false;
    }
  }
  if (shape === "square" || shape === "rectangle") {
    const lengths: number[] = [];
    for (let i = 0; i < 4; i++) {
      const a = pts[i]!, b = pts[(i + 1) % 4]!, c = pts[(i + 2) % 4]!;
      if ((b[0] - a[0]) * (c[0] - b[0]) + (b[1] - a[1]) * (c[1] - b[1]) !== 0) return false;
      lengths.push((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2);
    }
    if (shape === "square" && !lengths.every((n) => n === lengths[0])) return false;
  }
  return true;
}

export function checkTrailAnswer(p: TrailPuzzle, a: TrailAnswer): { correct: boolean; message: string } {
  let correct = false, message = "Have another look. You can change your model and try again.";
  switch (p.concept) {
    case "subtraction":
      correct = new Set(a.picks).size === p.b && a.picks.every((i) => Number.isInteger(i) && i >= 0 && i < p.a) && (p.mode === "keep" || a.value === p.target);
      message = a.picks.length !== p.b ? `${a.picks.length} stars have gone home. Check how many should stay.` : "Your stars are ready. Count the ones that stayed and set your answer."; break;
    case "multiplication":
      correct = a.rows === p.a && a.columns === p.b;
      message = `${a.rows} rows of ${a.columns} make ${a.rows * a.columns}. Check the order: ${p.mode === "columns" ? `${p.a} equal rows` : `${p.b} flowers in each row`}.`; break;
    case "division": {
      correct = a.bowls.length === p.a && a.bowls.every((n) => n === p.b);
      const left = p.target - a.bowls.reduce((sum, n) => sum + n, 0);
      message = new Set(a.bowls).size > 1 ? "Some pandas have more than others. Fair shares must be equal." : left >= p.a ? "Everyone has an equal share. There are enough berries for another round!" : "Check the shares and the berries left in the basket."; break;
    }
    case "fractions":
      correct = new Set(a.picks).size * p.b === p.a * p.parts && a.picks.every((i) => Number.isInteger(i) && i >= 0 && i < p.parts);
      message = `You served ${a.picks.length} of ${p.parts} equal pieces. Compare that amount with ${p.a}/${p.b} of the whole.`; break;
    case "patterns":
      correct = a.sequence.length === 2 && a.sequence.every((n, i) => n === p.solution[i]);
      message = "Check the rule from the beginning. Your two tickets need to continue it in the same order."; break;
    case "measurement":
      correct = a.value === p.target && (p.mode === "perimeter" || a.offset === p.a);
      message = p.mode === "ruler" && a.offset !== p.a ? "Slide zero to the left edge of the bridge first." : p.mode === "ruler" ? "Count the spaces from zero to the end of the bridge, not the tick marks." : "Walk around all four sides of the fence. Each side needs to be counted once."; break;
    case "geometry":
      correct = a.picks[0] === p.b && validShape(a.picks, p.shape);
      message = a.picks.length !== p.a ? `Your constellation needs ${p.a} corners. You have ${a.picks.length}.` : a.picks[0] !== p.b ? "Begin with the star in the golden ring. Then trace your shape around it." : "Trace around the outside without crossing lines. Check the corners and side lengths for your shape."; break;
  }
  return { correct, message: correct ? p.explanation : message };
}

/** Mixed practice revisits explored ideas and introduces at most one new trail. */
export function expeditionRoute(model: Curriculum, seed: number): Concept[] {
  const rng = createRng(seed);
  const seen = CONCEPT_IDS.filter((id) => model.trails[id].attempts > 0);
  if (!seen.length) return ["subtraction", "patterns", "geometry", "subtraction", "patterns"];
  const pool = rng.shuffle(seen);
  const next = CONCEPT_IDS.find((id) => !seen.includes(id));
  return Array.from({ length: 5 }, (_, i) => i === 4 && next ? next : pool[i % pool.length]!);
}
