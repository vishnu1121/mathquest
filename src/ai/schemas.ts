// Requests to the AI route carry structured game data only: numbers, enums and code-built text.
// No free text from the child is ever sent.
import { z } from "zod";
import { MISCONCEPTION_IDS, SKILL_IDS, STORY_THEMES } from "@/engine/types";

const whole = (max: number) => z.number().int().min(0).max(max);

export const hintRequestSchema = z.object({
  task: z.literal("hint"),
  level: z.number().int().min(1).max(5),
  a: whole(999),
  b: whole(999),
  unknown: z.enum(["total", "addend"]),
  misconception: z.enum(MISCONCEPTION_IDS).nullable(),
  wrongAnswer: whole(9999).nullable(),
  builtInHint: z.string().min(1).max(400),
});

export const storyRequestSchema = z.object({
  task: z.literal("story"),
  a: whole(999),
  b: whole(999),
  kind: z.enum(["addTo", "putTogether", "changeUnknown"]),
  theme: z.enum(STORY_THEMES),
});

export const tutorFactsSchema = z.object({
  name: z.string().min(1).max(20),
  strong: z.array(z.enum(SKILL_IDS)).max(4),
  growing: z.array(z.enum(SKILL_IDS)).max(4),
  pattern: z
    .object({
      misconception: z.enum(MISCONCEPTION_IDS),
      count: whole(999),
      examples: z.array(z.string().max(40)).max(2),
    })
    .nullable(),
  helped: z.string().max(80).nullable(),
  caughtInPuzzle: z.boolean(),
  nextFocus: z.enum(SKILL_IDS).nullable(),
});

export const tutorNoteRequestSchema = z.object({
  task: z.literal("tutorNote"),
  facts: tutorFactsSchema,
  template: z.string().min(1).max(800),
});

export const aiRequestSchema = z.discriminatedUnion("task", [hintRequestSchema, storyRequestSchema, tutorNoteRequestSchema]);

export type HintRequest = z.infer<typeof hintRequestSchema>;
export type StoryRequest = z.infer<typeof storyRequestSchema>;
export type TutorNoteRequest = z.infer<typeof tutorNoteRequestSchema>;
export type AiRequest = z.infer<typeof aiRequestSchema>;

// Output shapes for structured outputs. Length and content limits are enforced by the guards,
// not the schema, so a long answer is rejected rather than silently cut.
export const textOutputSchema = z.object({ text: z.string() });
export type TextOutput = z.infer<typeof textOutputSchema>;

export type AiResponse = { ok: true; text: string } | { ok: false; reason: "unavailable" | "rejected" | "invalid" | "busy" };
