// AI helpers for the story adventure. Everything here is optional: with no ANTHROPIC_API_KEY (or
// AI_ENABLED=false) the game uses its built-in text. Every reply is checked by code before returning.
import { classifyAnswer, diagnosis, parseAnswer, validProblem, type ArenaProblem } from "@/adventure/arenaMath";
import * as arena from "@/ai/adventure/arena";
import { EXPLAIN_SYSTEM, acceptExplain, explainMessage, explainOutput } from "@/ai/adventure/explain";
import { COACH_SYSTEM, acceptCoach, coachMessage, coachOutput, trustedCoachContext } from "@/ai/adventure/coach";
import { generationConfigured, writeQuestion } from "@/ai/adventure/generateChain";
import { anyConfigured, askChain, chainConfigured, chainFor, hintChain } from "@/ai/adventure/chain";
import * as prompts from "@/ai/adventure/prompts";
import {
  adventureRequestSchema,
  companionOutput,
  diagnoseOutput,
  hintOutput,
  journeyOutput,
  storyOutput,
  strategyOutput,
  teachOutput,
  worldOutput,
  type AdventureRequest,
  type AdventureResponse,
} from "@/ai/adventure/schemas";
import { acceptHint, acceptNote, acceptReply, acceptRiddle, acceptStory, acceptWorld, numbersFromLines } from "@/ai/adventure/validate";
import { classifyProviderError, providerInfo } from "@/ai/server/provider";
import { takeToken } from "@/ai/server/rateLimit";

export const dynamic = "force-dynamic";

const reply = (body: AdventureResponse, status = 200) => Response.json(body, { status });

/** The general accounts, behind every task that is not a hint, an explanation or a fresh question. */
const GENERAL = chainFor("default");
/**
 * The explainer's accounts, then its first one again.
 *
 * The third attempt is not padding. The closing-line guard is strict on purpose, and measured over a real
 * chapter about one reply in ten closes on a paraphrase ("7 tens") instead of the answer it was handed
 * ("70") and is correctly dropped. Sampling again fixes most of those. It is only ever paid on a
 * rejection, and it keeps that second chance on an install that has only one explainer account.
 */
const EXPLAIN = [...chainFor("explain"), "explain" as const];

/** Arena requests must describe a real problem and a wrong answer to it. */
function arenaRequestOk(problem: ArenaProblem, answerText: string): boolean {
  if (!validProblem(problem)) return false;
  const answer = parseAnswer(problem, answerText);
  return Boolean(answer) && classifyAnswer(problem, answer!) !== null;
}

async function runTask(r: AdventureRequest): Promise<unknown> {
  switch (r.task) {
    case "coach": {
      const context = trustedCoachContext(r);
      if (!context) return null;
      return askChain(COACH_SYSTEM, coachMessage(context), coachOutput, GENERAL, (d) => acceptCoach(d, context));
    }
    case "world":
      return askChain(prompts.WORLD_SYSTEM, prompts.worldMessage(r.idea), worldOutput, GENERAL, (d) => acceptWorld(d, r.base));
    case "hint":
      // Hints have their own accounts when someone has set them up. They are the helper a stuck child
      // reaches for most, and the one whose silence is felt soonest.
      return askChain(prompts.HINT_SYSTEM, prompts.hintMessage(r), hintOutput, hintChain(), (d) => acceptHint(d?.hint, r.allowed));
    case "riddle":
      return askChain(prompts.RIDDLE_SYSTEM, prompts.riddleMessage(r), storyOutput, GENERAL, (d) => acceptRiddle(d?.story, r.a, r.b));
    case "teach":
      return askChain(prompts.TEACH_SYSTEM, prompts.teachMessage(r.mistakeId, r.said), teachOutput, GENERAL, (d) => {
        const text = acceptReply(d?.reply, prompts.MISTAKES[r.mistakeId].numbers);
        return d && text ? { verdict: d.verdict, reply: text } : null;
      });
    case "strategy":
      return askChain(prompts.STRATEGY_SYSTEM, prompts.strategyMessage(r), strategyOutput, GENERAL, (d) => {
        const text = acceptReply(d?.reply, prompts.strategyNumbers(r.a, r.b, r.answer));
        return d && text ? { strategy: d.strategy, reply: text } : null;
      });
    case "narrate": {
      const numbers = numbersFromLines(r.did);
      return askChain(prompts.NARRATE_SYSTEM, prompts.narrateMessage(r, numbers), storyOutput, GENERAL, (d) => acceptStory(d?.story, numbers));
    }
    case "journey": {
      const numbers = numbersFromLines(r.lines);
      return askChain(prompts.JOURNEY_SYSTEM, prompts.journeyMessage(r.lines, numbers), journeyOutput, GENERAL, (d) => acceptNote(d?.note, numbers));
    }
    case "diagnose": {
      // Known mix-ups are classified instantly by code with no model call; the model only sees the rest.
      const rule = classifyAnswer(r.problem, parseAnswer(r.problem, r.answer)!);
      if (rule && rule !== "ERR_UNKNOWN") return diagnosis(rule, "rules");
      return askChain(arena.DIAGNOSE_SYSTEM, arena.diagnoseMessage(r.problem, r.answer), diagnoseOutput, GENERAL, (d) => {
        const code = arena.acceptDiagnosis(r.problem, d?.code);
        return code ? diagnosis(code, "ai") : null;
      });
    }
    case "explain": {
      // Runs only after the question is already marked and scored, so nothing here can change a result.
      // The "explain" channel is a separate provider account: see ai/server/provider.ts.
      //
      // One retry, because the guard that matters is strict on purpose. Measured over a real chapter,
      // roughly one reply in ten closes on a paraphrase ("7 tens") instead of the answer it was given
      // ("70") and is correctly dropped. Sampling again fixes most of those, and the child sees one
      // slightly slower answer rather than a button that failed for no reason they can see. The retry
      // is only ever paid on a rejection, never on the happy path.
      return askChain(EXPLAIN_SYSTEM, explainMessage(r), explainOutput, EXPLAIN, (d) => acceptExplain(d, r));
    }
    case "generate": {
      // A fresh question for a round whose built-in question the browser is ALREADY holding. Two writers are
      // tried in turn (ai/adventure/generate.ts); null here simply means the built-in question stands, which
      // is why this case never throws and never reports an error to the child.
      return writeQuestion(r);
    }
    case "companion": {
      // The moment, problem and answers were checked before this point; the model only words Hoot's question.
      return askChain(arena.COMPANION_SYSTEM, arena.companionMessage(r), companionOutput, GENERAL, (d) => {
        const question = arena.acceptCompanion(r.problem, d?.question);
        return question ? { question } : null;
      });
    }
  }
}

/** Tells the game whether AI helpers are switched on, and which provider answers. Never reveals key material. */
export function GET() {
  // `explain` is reported separately because it runs on its own key: it can be on while the rest is off,
  // or off while the rest is on. The game hides the "You wanna know how?" button when it is off rather
  // than showing a control that cannot answer.
  // `generate` is reported separately for the same reason as `explain`: its own pair of accounts, so it can
  // be on while the rest is off. The game keeps playing either way — with AI questions when it is on, and
  // with the built-in bank when it is not.
  return Response.json({ enabled: chainConfigured("default") || chainConfigured("hint"), explain: chainConfigured("explain"), generate: generationConfigured(), ...(providerInfo() ?? {}) });
}

export async function POST(request: Request) {
  // Any channel being configured is enough to accept a request; which one this particular task needs
  // is decided below, once we know what it is.
  if (!anyConfigured()) return reply({ ok: false, reason: "unavailable" }, 503);

  const client = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";

  let parsed: AdventureRequest;
  try {
    const result = adventureRequestSchema.safeParse(await request.json());
    if (!result.success) return reply({ ok: false, reason: "invalid" }, 400);
    parsed = result.data;
  } catch {
    return reply({ ok: false, reason: "invalid" }, 400);
  }
  // The explainer keeps its own bucket as well as its own key. Sharing one would mean a child asking
  // "how?" a few times could spend the allowance that hints and coaching need in the same session.
  //
  // Generation has both as well, and needs them more than anything else here: it is the only task asked for
  // once per question answered, so sharing the default bucket would starve hints within a single chapter.
  //
  // Hints get the same treatment for the same reason, whenever they have accounts of their own: a class
  // leaning on Hoot should not be able to spend what Story Lab and the Arena need.
  const lane = parsed.task === "generate" ? "gen"
    : parsed.task === "explain" ? "explain"
    : parsed.task === "hint" && chainConfigured("hint") ? "hint"
    : "default";
  if (!chainConfigured(lane)) return reply({ ok: false, reason: "unavailable" }, 503);
  if (!takeToken(lane === "default" ? client : `${client}|${lane}`, Date.now())) return reply({ ok: false, reason: "busy" }, 429);
  if (parsed.task === "diagnose" && !arenaRequestOk(parsed.problem, parsed.answer)) return reply({ ok: false, reason: "invalid" }, 400);
  if (parsed.task === "companion" && !arena.validCompanionRequest(parsed)) return reply({ ok: false, reason: "invalid" }, 400);

  try {
    const data = await runTask(parsed);
    return data ? reply({ ok: true, data }) : reply({ ok: false, reason: "rejected" });
  } catch (error) {
    // A rejected key turns AI off for the session; a rate limit or anything else is treated as temporary.
    const failure = classifyProviderError(error);
    if (failure === "unauthorized") return reply({ ok: false, reason: "unavailable" }, 503);
    return reply({ ok: false, reason: "busy" }, failure === "busy" ? 429 : 502);
  }
}
