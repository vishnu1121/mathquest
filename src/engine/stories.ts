// Built-in story problems. These are the always-available fallback; AI-written stories must pass
// the same number checks before a child sees them. Each theme has its own cast, so a child's
// interest shows up in stories even when AI is off.
import type { Rng } from "./rng";
import type { Story, StoryKind, StoryTheme } from "./types";

interface Cast {
  group: string;
  one: string;
  many: string;
}

const CASTS: Readonly<Record<StoryTheme, readonly Cast[]>> = {
  forest: [
    { group: "The beavers", one: "log", many: "logs" },
    { group: "The squirrels", one: "acorn", many: "acorns" },
    { group: "The rabbits", one: "carrot", many: "carrots" },
    { group: "The bears", one: "berry", many: "berries" },
    { group: "The hedgehogs", one: "mushroom", many: "mushrooms" },
    { group: "The ducks", one: "pebble", many: "pebbles" },
  ],
  dinosaurs: [
    { group: "The baby dinosaurs", one: "egg", many: "eggs" },
    { group: "The dino explorers", one: "fossil", many: "fossils" },
    { group: "The stegosauruses", one: "footprint", many: "footprints" },
  ],
  space: [
    { group: "The space squirrels", one: "moon rock", many: "moon rocks" },
    { group: "The robot owls", one: "star sticker", many: "star stickers" },
    { group: "The comet foxes", one: "rocket part", many: "rocket parts" },
  ],
  sports: [
    { group: "The rabbit players", one: "soccer ball", many: "soccer balls" },
    { group: "The fox runners", one: "tennis ball", many: "tennis balls" },
    { group: "The bear players", one: "sports card", many: "sports cards" },
  ],
  animals: [
    { group: "The puppies", one: "bone", many: "bones" },
    { group: "The kittens", one: "yarn ball", many: "yarn balls" },
    { group: "The ponies", one: "apple", many: "apples" },
  ],
};

export const STORY_KINDS: readonly StoryKind[] = ["addTo", "putTogether", "changeUnknown"];

export function templateStory(kind: StoryKind, a: number, b: number, rng: Rng, theme: StoryTheme = "forest"): Story {
  const { group, one, many } = rng.pick(CASTS[theme]);
  const count = (n: number) => `${n} ${n === 1 ? one : many}`;

  const text =
    kind === "addTo"
      ? `${group} have ${count(a)}. They find ${b} more. How many ${many} do they have now?`
      : kind === "putTogether"
        ? `${group} gather ${count(a)} in the morning and ${count(b)} after lunch. How many ${many} did they gather in all?`
        : `${group} have ${count(a)}. They find some more. Now they have ${count(a + b)}. How many ${many} did they find?`;

  return { kind, text, source: "template" };
}
