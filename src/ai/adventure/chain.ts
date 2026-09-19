// Every AI job has a first-choice account and an understudy.
//
// A free-tier key does not fail politely. It does not warn you; it runs out in the middle of a lesson and
// the feature it was carrying goes quiet until somebody notices. So each job here is a short chain rather
// than a single account: ask the first, and if it is out of credit, rate limited, timing out or answering
// with something the guard refuses, ask the second before giving up.
//
// Giving up is always safe. Every task in this game has built-in content behind it — a written hint, a
// written explanation, the question bank — so the end of a chain means the child sees the built-in thing,
// not an error.
import type { z } from "zod";
import { aiConfigured, writeJson, type Channel } from "../server/provider";

/** Who stands in for whom. A channel with no entry here simply has no understudy. */
const BACKUP: Partial<Record<Channel, Channel>> = {
  default: "default2",
  hint: "hint2",
  explain: "explain2",
  gen: "gen2",
};

/** A channel and its understudy, in the order they should be asked. */
export const chainFor = (channel: Channel): Channel[] => {
  const backup = BACKUP[channel];
  return backup ? [channel, backup] : [channel];
};

/** True when at least one account in this chain can answer. */
export const chainConfigured = (channel: Channel): boolean => chainFor(channel).some(aiConfigured);

/**
 * Hints have their own accounts when someone has set them up, and share the general ones when nobody has.
 *
 * The isolation is worth having — a class that leans on Hoot should not be able to spend the budget Story
 * Lab needs — but it must not be the reason hints stop working on an install that never knew about
 * HINT_AI_*. So it is a preference, not a requirement.
 */
export const hintChain = (): Channel[] => (chainConfigured("hint") ? chainFor("hint") : chainFor("default"));

/** Every account the game might use, for the "is any AI available at all" gate on the route. */
export const anyConfigured = (): boolean =>
  (["default", "default2", "hint", "hint2", "explain", "explain2", "gen", "gen2"] as Channel[]).some(aiConfigured);

/**
 * Ask a chain for one structured reply, and take the first that the caller's own guard accepts.
 *
 * `accept` is where the real checking lives — it is the task's existing validator, unchanged. A reply that
 * parses but fails the guard is treated exactly like a provider that did not answer: try the next account.
 * That matters, because "the model wrote something unusable" is far more common than "the key is dead",
 * and a second sample often fixes it.
 *
 * Errors are held, not swallowed: if every account throws, the last error is rethrown so the route can
 * still tell a dead key (turn this channel off for the session) from a busy one (try again later). If any
 * account merely answered badly, that is a plain null — a rejection, not a failure.
 */
export async function askChain<T extends z.ZodType, R>(
  system: string,
  message: string,
  schema: T,
  channels: Channel[],
  accept: (data: z.infer<T> | null) => R | null,
  options: { quiet?: boolean; now?: () => number; budgetMs?: number } = {},
): Promise<R | null> {
  const { quiet = false, now = Date.now, budgetMs } = options;
  const startedAt = now();
  let lastError: unknown;
  let asked = 0;

  for (const channel of channels) {
    if (!aiConfigured(channel)) continue;
    // A later attempt is only worth making if somebody is still waiting for it.
    if (asked > 0 && budgetMs !== undefined && now() - startedAt > budgetMs) break;
    asked += 1;
    try {
      const accepted = accept(await writeJson(system, message, schema, channel));
      if (accepted !== null && accepted !== undefined) return accepted;
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError && !quiet) throw lastError;
  return null;
}
