// Prompts and reply checks for the Muddle Monster Arena's two AI tasks: classifying a wrong answer into a
// fixed misconception code, and Hoot's companion question about what the child is doing right now. The problem,
// the correct answer, the allowed numbers and the moment come from code, and a reply is used only when code agrees it fits.
import {
  AI_MOMENTS, MISCONCEPTIONS, MISCONCEPTION_CODES, bossStepFits, classifyAnswer, correctText, leaksAnswer, parseAnswer, plausibleCode,
  problemText, socraticNumbers, validProblem,
  type AiMoment, type ArenaProblem, type BossStep, type MisconceptionCode,
} from "../../adventure/arenaMath";
import { cleanText, numbersIn } from "./validate";

export const DIAGNOSE_SYSTEM = `You classify one wrong answer from a math game for children aged 5 to 10 into exactly one misconception code.
Codes:
- ERR_ADD_CARRY: in addition, the ones made ten or more, but that ten was never added to the tens.
- ERR_ADD_CONCAT: in addition, the tens sum and the ones sum were written side by side.
- ERR_SUB_BORROW: in subtraction, the smaller digit was taken from the larger in a column, or a ten was traded without being taken from the tens.
- ERR_WRONG_OPERATION: added instead of subtracting, or subtracted instead of adding.
- ERR_ADD_DENOMINATOR: in fraction addition, the numerators were added and the denominators were added.
- ERR_FRAC_KEEP_DENOMINATOR: in fraction addition with different denominators, the numerators were added and one denominator was kept.
- ERR_OFF_BY_ONE: one more or one less than the right whole-number answer.
- ERR_UNKNOWN: nothing above clearly explains the answer, including random guesses.
An answer can combine a misconception with one small counting slip; choose the misconception only when it explains most of the answer. When unsure, choose ERR_UNKNOWN. Only choose from codesThatCanApply.
Examples: 45 + 17 answered 53 is ERR_ADD_CARRY. 71 - 38 answered 48 is ERR_SUB_BORROW. 1/2 + 1/4 answered 2/7 is ERR_ADD_DENOMINATOR. 36 + 25 answered 7 is ERR_UNKNOWN.
Never describe the child's ability or feelings. Return the structured object only.`;

export function diagnoseMessage(problem: ArenaProblem, answer: string): string {
  return JSON.stringify({
    problem: problemText(problem),
    correctAnswer: correctText(problem),
    studentAnswer: answer,
    codesThatCanApply: MISCONCEPTION_CODES.filter((code) => plausibleCode(problem, code)),
  });
}

/** What the game tells Hoot about the child's current work. Code builds every field. */
export interface CompanionRequest {
  moment: AiMoment;
  problem: ArenaProblem;
  wrongAnswers: readonly string[];
  code: MisconceptionCode | null;
  tier: number;
  bossStep: BossStep | null;
}

export const COMPANION_SYSTEM = `You are Hoot, a kind owl who stays beside a child aged 5 to 10 while they solve one math problem in a game.
You are told what the child is doing right now: the moment, the problem, their wrong answers so far, the diagnosed mix-up, the help level on screen, and the next move in a monster battle.
Ask exactly ONE leading question, one sentence of at most 22 words, that helps with that exact moment:
- hesitate: the child is pausing. Point gently to one place to look first, or to the next monster move if one is given.
- mistake: help the child notice the idea behind this specific mix-up.
- boss: the child is stuck on a monster move. Ask about that next move.
- ask: the child asked for help. Ask about one small next step that builds on everything given.
Never state, hint at or confirm the correct answer or any total. Never say the child is wrong. Ask; do not instruct or list steps.
helpLevel 0 or 1: a broad question. helpLevel 2: point to the blocks, bars or column. helpLevel 3: one very small next step.
Write numbers as digits and use only numbersYouMayUse. Simple, warm words. End with a question mark. Return the structured object only.`;

const MONSTER_MOVES: Record<BossStep, string> = {
  bundle: "bundle ten One-Blocks into one Ten-Block",
  shatter: "shatter one Ten-Block into ten One-Blocks to get more ones",
  takeOnes: "take away the ones of the second number",
  takeTens: "take away the tens of the second number",
  slice: "choose one slice size that both pizzas can be cut into",
  combine: "put every shaded slice on one plate",
  count: "count the blocks or slices that are there now and type the answer",
};

export function companionMessage(r: CompanionRequest): string {
  return JSON.stringify({
    moment: r.moment,
    problem: problemText(r.problem),
    wrongAnswers: r.wrongAnswers,
    misconception: r.code ? MISCONCEPTIONS[r.code].grownUp : "none yet",
    helpLevel: r.tier,
    nextMonsterMove: r.bossStep ? MONSTER_MOVES[r.bossStep] : "none",
    numbersYouMayUse: socraticNumbers(r.problem),
    neverMention: correctText(r.problem),
  });
}

/** A companion request must describe a real problem, answers that really are wrong, and a moment that fits them. */
export function validCompanionRequest(r: CompanionRequest): boolean {
  if (!validProblem(r.problem) || !(AI_MOMENTS as readonly string[]).includes(r.moment)) return false;
  if (!Number.isInteger(r.tier) || r.tier < 0 || r.tier > 3 || r.wrongAnswers.length > 3) return false;
  const wrongOnly = r.wrongAnswers.every((text) => {
    const answer = parseAnswer(r.problem, text);
    return answer !== null && classifyAnswer(r.problem, answer) !== null;
  });
  if (!wrongOnly || (r.code && !plausibleCode(r.problem, r.code))) return false;
  if (r.bossStep && !bossStepFits(r.problem, r.bossStep)) return false;
  if (r.moment === "mistake" && (!r.wrongAnswers.length || !r.code)) return false;
  return r.moment !== "boss" || Boolean(r.bossStep && r.code && r.wrongAnswers.length);
}

/** An AI classification must be a known code that can apply to this problem. ERR_UNKNOWN adds nothing. */
export function acceptDiagnosis(problem: ArenaProblem, code: unknown): MisconceptionCode | null {
  if (typeof code !== "string" || !(MISCONCEPTION_CODES as readonly string[]).includes(code)) return null;
  const known = code as MisconceptionCode;
  return known !== "ERR_UNKNOWN" && plausibleCode(problem, known) ? known : null;
}

/** One question, one sentence, allowed numbers only, and never the answer. */
export function acceptCompanion(problem: ArenaProblem, question: unknown): string | null {
  const t = cleanText(question, 24, 190);
  if (!t || !t.endsWith("?") || /[.!?]/.test(t.slice(0, -1))) return null;
  const allowed = socraticNumbers(problem);
  if (!numbersIn(t).every((n) => allowed.includes(n)) || leaksAnswer(problem, t)) return null;
  if (/\b(wrong|incorrect|careless|easy|obviously)\b/i.test(t)) return null;
  return t;
}
