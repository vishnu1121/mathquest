import { acceptHint, acceptStory, acceptTutorNote } from "@/ai/guards";
import { HINT_SYSTEM, STORY_SYSTEM, TUTOR_NOTE_SYSTEM } from "@/ai/prompts";
import { aiRequestSchema, type AiRequest, type AiResponse } from "@/ai/schemas";
import { aiConfigured, classifyProviderError, writeText } from "@/ai/server/provider";
import { takeToken } from "@/ai/server/rateLimit";

const reply = (body: AiResponse, status = 200) => Response.json(body, { status });

async function runTask(request: AiRequest): Promise<string | null> {
  switch (request.task) {
    case "hint": {
      const total = request.a + request.b;
      // For a missing-number problem the hidden addend is the answer, so it is never sent.
      const problem = request.unknown === "addend" ? { a: request.a, total } : { a: request.a, b: request.b };
      const text = await writeText(
        HINT_SYSTEM,
        JSON.stringify({
          level: request.level,
          ...problem,
          unknown: request.unknown,
          misconception: request.misconception,
          wrongAnswer: request.wrongAnswer,
          builtInHint: request.builtInHint,
        }),
      );
      const answer = request.unknown === "addend" ? request.b : total;
      return text &&
        acceptHint(text, { a: request.a, b: request.b, total, answer, unknown: request.unknown, level: request.level, builtInHint: request.builtInHint })
        ? text
        : null;
    }
    case "story": {
      const numbers =
        request.kind === "changeUnknown" ? { a: request.a, total: request.a + request.b } : { a: request.a, b: request.b };
      const text = await writeText(STORY_SYSTEM, JSON.stringify({ ...numbers, kind: request.kind, theme: request.theme }));
      return text && acceptStory(text, request.a, request.b, request.kind) ? text : null;
    }
    case "tutorNote": {
      const text = await writeText(TUTOR_NOTE_SYSTEM, JSON.stringify({ facts: request.facts, draft: request.template }));
      return text && acceptTutorNote(text, request.facts) ? text : null;
    }
  }
}

export async function POST(request: Request) {
  if (!aiConfigured()) return reply({ ok: false, reason: "unavailable" }, 503);

  const client = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!takeToken(client, Date.now())) return reply({ ok: false, reason: "busy" }, 429);

  let parsed: AiRequest;
  try {
    const result = aiRequestSchema.safeParse(await request.json());
    if (!result.success) return reply({ ok: false, reason: "invalid" }, 400);
    parsed = result.data;
  } catch {
    return reply({ ok: false, reason: "invalid" }, 400);
  }

  try {
    const text = await runTask(parsed);
    return text ? reply({ ok: true, text }) : reply({ ok: false, reason: "rejected" });
  } catch (error) {
    // A rejected key turns AI off for the session; a rate limit or anything else is treated as temporary.
    const failure = classifyProviderError(error);
    if (failure === "unauthorized") return reply({ ok: false, reason: "unavailable" }, 503);
    return reply({ ok: false, reason: "busy" }, failure === "busy" ? 429 : 502);
  }
}
