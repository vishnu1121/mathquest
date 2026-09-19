// The two question writers, tried in order. Split from generate.ts so the pure validator and the request
// shape can also be imported by the browser runtime, which must not pull the server SDK into its bundle.
import { askChain, chainConfigured, chainFor } from "./chain";
import { GENERATE_SYSTEM, acceptGenerated, generateMessage, generatedOutput, type GenerateRequest, type GeneratedQuestion } from "./generate";

/** True when at least one question writer is configured. With none, the bank answers every question. */
export const generationConfigured = (): boolean => chainConfigured("gen");

/**
 * How long the whole chain may take. The browser gives up at 12s and draws the built-in question, so a
 * second attempt started after this point can only ever spend a provider's quota on an answer nobody is
 * still waiting for.
 */
export const CHAIN_BUDGET_MS = 9000;

/**
 * Ask each configured writer in turn for one question, and return the first that survives acceptGenerated.
 *
 * Every failure is the same failure here: a dead key, a rate limit, a timeout, a malformed reply and a
 * reply whose arithmetic did not check out all mean "try the next one, then use the bank". Errors are
 * swallowed rather than rethrown (`quiet`), because the caller is already holding the built-in question
 * and a generation outage is not something a child should ever be told about.
 */
export async function writeQuestion(request: GenerateRequest, now: () => number = Date.now): Promise<GeneratedQuestion | null> {
  return askChain(
    GENERATE_SYSTEM,
    generateMessage(request),
    generatedOutput,
    chainFor("gen"),
    (data) => acceptGenerated(data, request),
    { quiet: true, now, budgetMs: CHAIN_BUDGET_MS },
  );
}
