import { describe, expect, it } from "vitest";
import { acceptStory } from "@/ai/guards";
import { createRng } from "./rng";
import { STORY_KINDS, templateStory } from "./stories";
import { STORY_THEMES } from "./types";

describe("templateStory", () => {
  it("writes stories in every theme that pass the same checks as AI stories", () => {
    const rng = createRng(12);
    for (const theme of STORY_THEMES) {
      for (const kind of STORY_KINDS) {
        for (let i = 0; i < 20; i++) {
          const a = rng.int(1, 60);
          const b = rng.int(1, 39);
          const story = templateStory(kind, a, b, rng, theme);
          expect(acceptStory(story.text, a, b, kind), `${theme} ${kind}: ${story.text}`).toBe(true);
        }
      }
    }
  });

  it("uses the child's theme", () => {
    const story = templateStory("addTo", 12, 5, createRng(3), "dinosaurs");
    expect(story.text).toMatch(/dino|stegosaurus/i);
  });

  it("uses the singular for one thing", () => {
    const story = templateStory("addTo", 1, 4, createRng(1), "animals");
    expect(story.text).toMatch(/have 1 (bone|yarn ball|apple)\./);
  });
});
