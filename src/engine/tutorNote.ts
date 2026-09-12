// The tutor note for grown-ups. Code gathers the facts from the learner model and the decision
// log; the note is written from those facts only. An AI-worded note is accepted only if every
// number in it also appears in the facts, otherwise the template note is shown.
import type { LearnerModel } from "./learnerModel";
import { addendBugAnswers, MISCONCEPTIONS, totalBugAnswers } from "./misconceptions";
import { SKILL_ORDER, SKILLS } from "./skills";
import type { MisconceptionId, SkillId } from "./types";

/** The parts of a decision-log entry the note needs. */
export interface NoteEvent {
  kind: string;
  skill: SkillId;
  problem: string;
  wrongAnswer: number | null;
  outcome: "solved" | "helped" | "missed" | null;
}

export interface TutorFacts {
  name: string;
  strong: SkillId[];
  growing: SkillId[];
  pattern: { misconception: MisconceptionId; count: number; examples: string[] } | null;
  helped: string | null;
  caughtInPuzzle: boolean;
  nextFocus: SkillId | null;
}

function misconceptionFor(problem: string, wrong: number): MisconceptionId | null {
  const addend = problem.match(/^(\d+) \+ \? = (\d+)$/);
  if (addend) return addendBugAnswers(Number(addend[1]), Number(addend[2])).find((b) => b.value === wrong)?.id ?? null;
  const total = problem.match(/^(\d+) \+ (\d+)$/);
  if (total) return totalBugAnswers(Number(total[1]), Number(total[2])).find((b) => b.value === wrong)?.id ?? null;
  return null;
}

export function buildTutorFacts(
  model: LearnerModel,
  events: readonly NoteEvent[],
  name: string,
  nextFocus: SkillId | null,
): TutorFacts {
  const counts = new Map<MisconceptionId, number>();
  for (const id of SKILL_ORDER) {
    for (const [m, n] of Object.entries(model.skills[id].misconceptions) as [MisconceptionId, number][]) {
      counts.set(m, (counts.get(m) ?? 0) + n);
    }
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  const pattern = top
    ? {
        misconception: top[0],
        count: top[1],
        examples: events
          .filter((e) => e.wrongAnswer !== null && misconceptionFor(e.problem, e.wrongAnswer) === top[0])
          .slice(0, 2)
          .map((e) => `${e.problem} → ${e.wrongAnswer}`),
      }
    : null;

  const scaffoldIndex = events.findIndex((e) => e.kind === "scaffold");
  const recoveredAfterBlocks =
    scaffoldIndex >= 0 && events.slice(scaffoldIndex).some((e) => e.kind === "return" && e.outcome === "solved");
  const helped = recoveredAfterBlocks
    ? "Trading with base-ten blocks on easier numbers"
    : events.some((e) => e.outcome === "helped")
      ? "Hoot's step-by-step hints"
      : null;

  return {
    name,
    strong: SKILL_ORDER.filter((id) => model.skills[id].mastered),
    growing: SKILL_ORDER.filter((id) => !model.skills[id].mastered && (model.skills[id].evidence > 0 || model.skills[id].mastery >= 0.25)),
    pattern,
    helped,
    caughtInPuzzle: events.some((e) => e.kind === "pipPuzzle" && (e.outcome === "solved" || e.outcome === "helped")),
    nextFocus,
  };
}

function joinList(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);
const skillNames = (ids: SkillId[]) => joinList(ids.map((id) => SKILLS[id].name.toLowerCase()));

export function templateNote(facts: TutorFacts): string {
  const sentences: string[] = [];
  if (facts.strong.length > 0) sentences.push(`${facts.name} is strong at ${skillNames(facts.strong)}.`);
  else if (facts.growing.length > 0) sentences.push(`${facts.name} is building ${skillNames(facts.growing)}.`);
  else sentences.push(`${facts.name} is just getting started in Addition Forest.`);

  if (facts.pattern) {
    const example = facts.pattern.examples[0];
    let sentence = `Early on, ${facts.name} ${lowerFirst(MISCONCEPTIONS[facts.pattern.misconception].grownUp)}${example ? ` (${example})` : ""}`;
    if (facts.helped) sentence += `; ${lowerFirst(facts.helped)} helped`;
    if (facts.caughtInPuzzle) sentence += `, and ${facts.name} later caught the same mistake in a puzzle`;
    sentences.push(`${sentence}.`);
  }

  sentences.push(
    facts.nextFocus
      ? `Next session: 10 minutes on ${SKILLS[facts.nextFocus].name.toLowerCase()}.`
      : "Next session: 10 minutes of subtraction with regrouping, using the same trading idea.",
  );
  return sentences.join(" ");
}

const numbersIn = (text: string): string[] => text.match(/\d+/g) ?? [];

/** True when every number in the note also appears in the facts or the template note. */
export function noteUsesOnlyFactNumbers(note: string, facts: TutorFacts): boolean {
  const allowed = new Set(numbersIn(`${templateNote(facts)} ${JSON.stringify(facts)}`));
  return numbersIn(note).every((n) => allowed.has(n));
}
