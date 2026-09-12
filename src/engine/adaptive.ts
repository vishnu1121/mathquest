// The adaptive policy: decides what the child sees next and says why in plain English.
// Large changes need a clear pattern across several answers (spec §19, §46 risk 8).
import { setSkillLevel, type LearnerModel, type SkillState } from "./learnerModel";
import { MISCONCEPTIONS } from "./misconceptions";
import { clampLevel, SKILL_ORDER, SKILLS } from "./skills";
import type { Format, Level, MisconceptionId, SkillId } from "./types";

export type PlanKind =
  | "practice"
  | "stepUp"
  | "stepDown"
  | "probe"
  | "scaffold"
  | "return"
  | "pipPuzzle"
  | "review"
  | "boss";

export interface Plan {
  kind: PlanKind;
  skill: SkillId;
  level: Level;
  format: Format;
  /** Plain-English reason, shown in the grown-ups view. */
  reason: string;
  misconception?: MisconceptionId;
}

export interface ReturnItem {
  skill: SkillId;
  level: Level;
  format: Format;
}

export interface Session {
  itemsServed: number;
  /** Problems the policy promised to come back to after a scaffold, oldest first. */
  returnQueue: ReturnItem[];
  /** Mistakes that already got a Pip's Puzzle check. */
  pipChecked: MisconceptionId[];
  recentFormats: Format[];
  lastSkill: SkillId | null;
  /** The skill being learned right now. Review items and Pip's Puzzle don't change it. */
  focus: SkillId | null;
}

/** Plan kinds that work on (and so keep or set) the current focus skill. */
const FOCUS_KINDS: ReadonlySet<PlanKind> = new Set(["practice", "stepUp", "stepDown", "probe", "scaffold", "return"]);

export const POLICY = {
  /** A skill below this mastery is a focus candidate; at or above it counts as placed. */
  focusBelow: 0.5,
  prereqAtLeast: 0.5,
  /** Every Nth item mixes in a placed skill that is not mastered yet. */
  reviewEvery: 3,
  /** Independent successes after a mistake before Pip's Puzzle checks it. */
  pipAfterIndependent: 3,
} as const;

const PRACTICE_FORMATS: Readonly<Record<SkillId, readonly Format[]>> = {
  simple: ["visual", "equation", "multipleChoice", "missingAddend", "wordProblem"],
  twoDigit: ["equation", "visual", "multipleChoice", "missingAddend", "wordProblem"],
  regroup: ["equation", "visual", "missingAddend", "multipleChoice", "wordProblem"],
  wordProblems: ["wordProblem", "visual", "multipleChoice"],
};

export const createSession = (): Session => ({
  itemsServed: 0,
  returnQueue: [],
  pipChecked: [],
  recentFormats: [],
  lastSkill: null,
  focus: null,
});

const lastN = (state: SkillState, n: number) => state.recent.slice(-n);

export function focusSkill(model: LearnerModel, current: SkillId | null = null): SkillId | null {
  // Stay with the skill being learned until it is mastered, even once it passes the placement line.
  if (current && !model.skills[current].mastered) return current;
  for (const id of SKILL_ORDER) {
    const state = model.skills[id];
    if (state.mastered) continue;
    const ready = SKILLS[id].prerequisites.every(
      (p) => model.skills[p].mastered || model.skills[p].mastery >= POLICY.prereqAtLeast,
    );
    if (ready && state.mastery < POLICY.focusBelow) return id;
  }
  // Every unmastered skill is already placed: work on the most advanced computation skill,
  // while review items keep the others warm.
  const unmastered = SKILL_ORDER.filter((id) => !model.skills[id].mastered);
  return unmastered.filter((id) => SKILLS[id].kind === "computation").at(-1) ?? unmastered.at(-1) ?? null;
}

function chooseFormat(skill: SkillId, state: SkillState, session: Session): Format {
  const options = PRACTICE_FORMATS[skill];
  const lastTwo = session.recentFormats.slice(-2);
  const notThreeInARow = options.filter((f) => !(lastTwo.length === 2 && lastTwo.every((x) => x === f)));
  const uncovered = notThreeInARow.filter((f) => !state.independentFormats.includes(f));
  return uncovered[0] ?? notThreeInARow[session.itemsServed % notThreeInARow.length] ?? options[0] ?? "equation";
}

function repeatedMisconception(state: SkillState): MisconceptionId | null {
  const last = state.recent.at(-1);
  if (!last || last.correct || !last.misconception) return null;
  const count = lastN(state, 4).filter((r) => r.misconception === last.misconception).length;
  return count >= 2 ? last.misconception : null;
}

/** Independent successes since the mistake last appeared, or null if it never did. */
function independentSince(state: SkillState, misconception: MisconceptionId): number | null {
  const index = state.recent.map((r) => r.misconception).lastIndexOf(misconception);
  if (index === -1) return state.misconceptions[misconception] ? Number.POSITIVE_INFINITY : null;
  return state.recent.slice(index + 1).filter((r) => r.independent).length;
}

export function planNext(model: LearnerModel, session: Session): Plan {
  const focus = focusSkill(model, session.focus);
  if (!focus) {
    const regroup = model.skills.regroup;
    return {
      kind: "boss",
      skill: "regroup",
      level: regroup.level,
      format: "equation",
      reason: "All four forest skills are mastered, so the Guardian gate opens",
    };
  }

  const recentSkill = session.lastSkill ?? focus;
  const recent = model.skills[recentSkill];

  const repeated = repeatedMisconception(recent);
  if (repeated) {
    return {
      kind: "scaffold",
      skill: recentSkill,
      level: clampLevel(recentSkill, recent.level - 1),
      format: "visual",
      misconception: repeated,
      reason: `Same mistake twice (${MISCONCEPTIONS[repeated].grownUp.toLowerCase()}), so blocks with easier numbers`,
    };
  }

  const pending = session.returnQueue[0];
  if (pending) {
    const lastTwo = lastN(model.skills[pending.skill], 2);
    if (lastTwo.length === 2 && lastTwo.every((r) => r.independent)) {
      return {
        kind: "return",
        ...pending,
        reason: "Solved 2 easier ones without help, so back to the original kind of problem",
      };
    }
  }

  if (session.returnQueue.length === 0) {
    for (const id of SKILL_ORDER) {
      const state = model.skills[id];
      for (const m of Object.keys(state.misconceptions) as MisconceptionId[]) {
        if (session.pipChecked.includes(m) || !MISCONCEPTIONS[m].placeValue) continue;
        const since = independentSince(state, m);
        if (since !== null && since >= POLICY.pipAfterIndependent) {
          return {
            kind: "pipPuzzle",
            skill: id,
            level: state.level,
            format: "pipPuzzle",
            misconception: m,
            reason: "The mistake is fixed, so Pip's Puzzle checks that the fix really stuck",
          };
        }
      }
    }
  }

  const focusState = model.skills[focus];
  if (session.itemsServed % POLICY.reviewEvery === POLICY.reviewEvery - 1) {
    const placed = SKILL_ORDER.find(
      (id) => id !== focus && !model.skills[id].mastered && model.skills[id].mastery >= POLICY.focusBelow,
    );
    if (placed) {
      const state = model.skills[placed];
      return {
        kind: "review",
        skill: placed,
        level: state.level,
        format: chooseFormat(placed, state, session),
        reason: "Mixing in a skill that is nearly there so it gets enough practice",
      };
    }
  }

  const atLevel = lastN(focusState, 3).filter((r) => r.level === focusState.level);
  if (atLevel.length === 3 && atLevel.every((r) => r.independent) && focusState.level < SKILLS[focus].maxLevel) {
    return {
      kind: "stepUp",
      skill: focus,
      level: (focusState.level + 1) as Level,
      format: chooseFormat(focus, focusState, session),
      reason: "3 right in a row with no hints, so a bit harder",
    };
  }

  const lastFour = lastN(focusState, 4);
  const alternating = lastFour.length === 4 && lastFour.every((r, i) => i === 0 || r.correct !== lastFour[i - 1]?.correct);
  if (alternating) {
    return {
      kind: "probe",
      skill: focus,
      level: focusState.level,
      format: "equation",
      reason: "Mixed results, so one more at the same level before changing anything",
    };
  }

  const wrong = atLevel.filter((r) => !r.correct).length;
  const helped = atLevel.filter((r) => r.correct && !r.independent).length;
  if (atLevel.length === 3 && (wrong >= 2 || helped >= 2) && focusState.level > 1) {
    return {
      kind: "stepDown",
      skill: focus,
      level: (focusState.level - 1) as Level,
      format: chooseFormat(focus, focusState, session),
      reason: "Two of the last three needed help, so a slightly easier one",
    };
  }

  return {
    kind: "practice",
    skill: focus,
    level: focusState.level,
    format: chooseFormat(focus, focusState, session),
    reason: "Practice at the current level in a new kind of problem",
  };
}

/** Applies a served plan: level changes, the return queue and format history. */
export function commitPlan(model: LearnerModel, session: Session, plan: Plan): { model: LearnerModel; session: Session } {
  const nextModel = plan.kind === "stepUp" || plan.kind === "stepDown" ? setSkillLevel(model, plan.skill, plan.level) : model;

  let returnQueue = session.returnQueue;
  if (plan.kind === "scaffold" && !returnQueue.some((item) => item.skill === plan.skill)) {
    const state = model.skills[plan.skill];
    const lastFormat = state.recent.at(-1)?.format ?? "equation";
    returnQueue = [
      ...returnQueue,
      { skill: plan.skill, level: state.level, format: lastFormat === "pipPuzzle" ? "equation" : lastFormat },
    ];
  }
  if (plan.kind === "return") returnQueue = returnQueue.slice(1);

  return {
    model: nextModel,
    session: {
      itemsServed: session.itemsServed + 1,
      returnQueue,
      pipChecked:
        plan.kind === "pipPuzzle" && plan.misconception ? [...session.pipChecked, plan.misconception] : session.pipChecked,
      recentFormats: [...session.recentFormats, plan.format].slice(-6),
      lastSkill: plan.skill,
      focus: FOCUS_KINDS.has(plan.kind) ? plan.skill : session.focus,
    },
  };
}
