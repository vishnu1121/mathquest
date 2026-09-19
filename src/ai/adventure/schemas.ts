// Request and reply shapes for the story adventure's AI tasks (/api/adventure-ai).
// Requests carry only game data and short, capped child text; replies are structured outputs
// that the server validates again before anything reaches a child.
import { z } from "zod";
import { coachRequest } from "./coach";
import { explainRequest } from "./explain";
import { generateRequest } from "./generate";
import { AI_MOMENTS, BOSS_STEPS, MISCONCEPTION_CODES } from "../../adventure/arenaMath";

export const PALETTES = ["forest", "volcano", "space", "ocean", "candy"] as const;
export const HOPPERS = ["🐸", "🦖", "🐰", "🐢", "🦘", "🐱", "🐧", "🤖", "🦄", "🐙"] as const;
export const GLOWS = ["✨", "⭐", "🫧", "🍬", "💎", "🌟", "🐟", "🍓"] as const;
export const GUARDIANS = ["🌳", "🐉", "👾", "🌋", "🏰", "🦕", "🤖", "🐻"] as const;
export const MISTAKE_IDS = ["hopStart", "sixFive", "carry513"] as const;
export const VERDICTS = ["got_it", "partly", "not_yet", "off_topic"] as const;
export const STRATEGIES = ["make_ten", "tens_then_ones", "count_on", "big_hops", "known_fact", "guess", "other"] as const;

export type Palette = (typeof PALETTES)[number];
export type MistakeId = (typeof MISTAKE_IDS)[number];

const text = (max: number) => z.string().trim().min(1).max(max);
const whole = z.number().int().min(0).max(9999);

const themeSchema = z.object({
  world: text(40),
  hopperName: text(24),
  glowName: text(24),
  guardianName: text(40),
  npc: text(40),
});

// Arena problems come from the game's generator; the server checks their limits again before any use.
const operand = z.number().int().min(0).max(999);
const piece = z.number().int().min(1).max(12);
export const arenaProblemSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("add"), a: operand, b: operand }),
  z.object({ kind: z.literal("sub"), a: operand, b: operand }),
  z.object({ kind: z.literal("frac"), a: piece, b: piece, c: piece, d: piece }),
]);
/** A child's answer is only digits, optionally a fraction. No free text reaches these prompts. */
const arenaAnswer = z.string().trim().regex(/^\d{1,4}(\/\d{1,3})?$/);

export const adventureRequestSchema = z.discriminatedUnion("task", [
  coachRequest,
  explainRequest,
  generateRequest,
  z.object({
    task: z.literal("world"),
    idea: text(60),
    base: z.object({ hopper: text(16), glow: text(16), guardian: text(16), palette: z.enum(PALETTES) }),
  }),
  z.object({
    task: z.literal("hint"),
    game: text(320),
    goal: text(320),
    moves: z.array(text(140)).max(8),
    allowed: z.array(whole).max(24),
  }),
  z.object({ task: z.literal("riddle"), a: whole, b: whole, theme: themeSchema }),
  z.object({ task: z.literal("teach"), mistakeId: z.enum(MISTAKE_IDS), said: text(200) }),
  z.object({ task: z.literal("strategy"), a: whole, b: whole, answer: whole, said: text(200) }),
  z.object({
    task: z.literal("narrate"),
    moment: text(400),
    theme: themeSchema,
    did: z.array(text(160)).max(8),
    choice: z.string().max(160),
  }),
  z.object({ task: z.literal("journey"), lines: z.array(text(160)).min(1).max(12) }),
  z.object({ task: z.literal("diagnose"), problem: arenaProblemSchema, answer: arenaAnswer }),
  // Hoot's companion question: what the child is doing right now, described only with codes and digits.
  z.object({
    task: z.literal("companion"),
    moment: z.enum(AI_MOMENTS),
    problem: arenaProblemSchema,
    wrongAnswers: z.array(arenaAnswer).max(3),
    code: z.enum(MISCONCEPTION_CODES).nullable(),
    tier: z.number().int().min(0).max(3),
    bossStep: z.enum(BOSS_STEPS).nullable(),
  }),
]);

export type AdventureRequest = z.infer<typeof adventureRequestSchema>;
export type AdventureTask = AdventureRequest["task"];

// Structured outputs Claude is asked to produce, one per task.
export const worldOutput = z.object({
  safe: z.boolean(),
  world: z.string(),
  hopper: z.string(),
  hopperName: z.string(),
  glow: z.string(),
  glowOne: z.string(),
  glowName: z.string(),
  guardian: z.string(),
  guardianName: z.string(),
  palette: z.string(),
  intro: z.string(),
});
export const hintOutput = z.object({ hint: z.string() });
export const storyOutput = z.object({ story: z.string() });
export const teachOutput = z.object({ verdict: z.enum(VERDICTS), reply: z.string() });
export const strategyOutput = z.object({ strategy: z.enum(STRATEGIES), reply: z.string() });
export const journeyOutput = z.object({ note: z.string() });
export const diagnoseOutput = z.object({ code: z.enum(MISCONCEPTION_CODES) });
export const companionOutput = z.object({ question: z.string() });

export type WorldOutput = z.infer<typeof worldOutput>;

export type AdventureResponse =
  | { ok: true; data: unknown }
  | { ok: false; reason: "unavailable" | "rejected" | "invalid" | "busy" };
