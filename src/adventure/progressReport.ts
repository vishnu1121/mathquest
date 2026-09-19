import { restoreAdventureModel, describeLearning } from "./learning";
import { restoreCurriculum, TRAILS } from "./curriculum";
import { restoreVoyage, STORY_ORDER } from "./voyage";
import { CLASSES, SKILL_NAMES } from "./classes/catalog";
import { isGrade, restoreClassWork } from "./classes/progress";

export interface ProgressRow { id: string; name: string; attempts: number; independent: number; supported: number; retry: number; recent: number; marks: ("independent" | "supported" | "retry")[]; next: string; activity: string }
type Evidence = { correct: boolean; independent: boolean };
const marks = (recent: Evidence[]) => recent.map((r) => r.correct ? r.independent ? "independent" as const : "supported" as const : "retry" as const);
const activities: Record<string, string> = {
  simple: "Put out a small group of counters. Add a few more and ask how many there are altogether.",
  twoDigit: "Build a number with bundles of ten and loose counters. Add another bundle and describe what changes.",
  regroup: "Join two groups of counters. Trade ten loose counters for a bundle and explain the trade.",
  wordProblems: "Tell a short joining story with toys. Ask your learner to act it out before calculating.",
  subtraction: "Start with a few objects, cover some, and ask how many are still visible.",
  multiplication: "Make equal rows of buttons. Ask how counting by rows compares with counting every button.",
  division: "Share counters between toy animals. Ask how to check that every animal has an equal share.",
  fractions: "Fold two equal sheets differently. Compare a half with two quarters of the same whole.",
  patterns: "Start a repeating clap and tap pattern. Take turns predicting and explaining what comes next.",
  measurement: "Use two different cups to fill a container. Predict, pour, and compare the amounts.",
  geometry: "Draw a garden on squared paper. Count its squares, then count the edges around the outside.",
  sequences: "Start with a number and apply two changes in order. Say the new number after each change.",
  cc: "Count real things together: touch each one, say one number, and ask how many there are.",
  oa: "Tell a quick story with toys, then write the matching number sentence together.",
  nbt: "Build numbers with bundles or place-value cards and say what each digit is worth.",
  nf: "Fold, cut or share paper strips and name the equal parts together.",
  md: "Measure, weigh or time something at home together, then compare two results.",
  g: "Hunt for shapes around the house and talk about their sides, corners and parts.",
};
const CLASS_PREFIX: Record<string, string> = { K: "k.", 1: "g1.", 2: "g2.", 3: "g3.", 4: "g4.", 5: "g5." };

export function progressReport(raw: unknown) {
  const save = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  const learning = restoreAdventureModel(save.learning), curriculum = restoreCurriculum(save.curriculum), voyage = restoreVoyage(save.voyage);
  const chapters = save.chapters && typeof save.chapters === "object" ? save.chapters as Record<string, unknown> : {};
  const info = isGrade(save.grade) ? CLASSES[save.grade] : null;
  const makeRow = (id: string, name: string, attempts: number, recent: Evidence[], next: string, activity = activities[id]!): ProgressRow => ({ id, name, attempts, marks: marks(recent), independent: recent.filter((r) => r.correct && r.independent).length, supported: recent.filter((r) => r.correct && !r.independent).length, retry: recent.filter((r) => !r.correct).length, recent: recent.length, next, activity });
  const has = (id: string) => !info || info.chapters.some((c) => c.id === id);
  const rows: ProgressRow[] = [];
  if (info) {
    // The class's own skills, in syllabus order, including ones not practiced yet.
    const work = restoreClassWork(save.classWork);
    for (const [id, name] of Object.entries(SKILL_NAMES).filter(([id]) => id.startsWith(CLASS_PREFIX[info.id]!))) {
      const state = work.skills[id] ?? { attempts: 0, recent: [] };
      const next = state.recent.slice(-3).filter((r) => !r.independent).length >= 2 ? "Work one example together with objects or a drawing" : "Try a fresh question with a new picture";
      rows.push(makeRow(id, name, state.attempts, state.recent, next, activities[id.split(".")[1]!]!));
    }
  }
  // Other rows show when the class plays that game, or when this class's chapters recorded evidence there.
  const learningRows = describeLearning(learning);
  if (has("frog") || has("fireflies") || has("guardian") || learningRows.some((r) => r.evidence > 0)) rows.push(...learningRows.map((r) => makeRow(r.id, r.name, r.evidence, learning.skills[r.id].recent, r.next)));
  const trails = info ? TRAILS.filter((t) => info.practice.some((p) => p.kind === "trail" && p.trail === t.id) || curriculum.trails[t.id].recent.length > 0) : TRAILS;
  for (const t of trails) { const state = curriculum.trails[t.id]; rows.push(makeRow(t.id, t.subject, state.attempts, state.recent, state.recent.slice(-3).filter((r) => !r.independent).length >= 2 ? "Use objects and explain one step together" : "Try another representation of this idea")); }
  const sequences = voyage.recent.filter((r) => r.skill === "operation sequences").slice(-8);
  if (has("skyrail") || sequences.length) {
    rows.push(makeRow("sequences", "Operation sequences", sequences.length, sequences, "Say each intermediate number before the next switch"));
  }
  // Voyage also mirrors fraction/robot evidence in curriculum: count those exactly once.
  const observed = rows.filter((r) => r.recent > 0);
  const priority = [...observed].sort((a, b) => (b.supported + b.retry) / b.recent - (a.supported + a.retry) / a.recent)[0];
  const order: readonly string[] = info ? info.chapters.map((c) => c.id) : STORY_ORDER;
  return { rows, grade: info?.label ?? null, completed: order.filter((id) => chapters[id]).length, chapters: order.length, explored: observed.length, recent: observed.reduce((n, r) => n + r.recent, 0), independent: observed.reduce((n, r) => n + r.independent, 0), supported: observed.reduce((n, r) => n + r.supported, 0), retry: observed.reduce((n, r) => n + r.retry, 0), priority: priority || rows[0]!, hasEvidence: observed.length > 0 };
}
export function reportLines(report: ReturnType<typeof progressReport>): string[] {
  return [...(report.grade ? [`Class: ${report.grade}.`] : []), ...report.rows.filter((r) => r.recent).map((r) => `${r.name}: recent ${r.recent} attempts; ${r.independent} correct independently, ${r.supported} correct after support or retry, ${r.retry} not correct. Next: ${r.next}.`)];
}
