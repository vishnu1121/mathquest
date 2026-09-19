"use client";

// Mounts the story adventure: renders the static shell, loads the runtime modules in the browser and
// starts the game once (guarded, because React StrictMode runs effects twice in development).
import { useEffect } from "react";
import "./styles/base.css";
import "./styles/frog.css";
import "./styles/fireflies.css";
import "./styles/guardian.css";
import "./styles/ai.css";
import "./styles/story.css";
import "./styles/scenery.css";
import "./styles/meta.css";
import "./styles/ux.css";
import "./styles/modern.css";
import "./styles/minigames.css";
import "./styles/storybook.css";
import "./styles/pathway.css";
import "./styles/arcade.css";
import "./styles/voyage.css";
import "./styles/frontier.css";
import "./styles/arena.css";
import "./styles/companion.css";
import "./styles/classes.css";
import "./styles/grade-play.css";
import "./styles/meaningful-play.css";
import "./styles/chute.css";
// After arena.css, whose nav rule sizes the bottom bar.
import "./styles/apex.css";
import "./styles/reference.css";
// Last, so the grade tokens win over every screen's own colours.
import "./styles/theme.css";
import "./styles/natural-world.css";
// After natural-world.css: blends the chrome edges (top bar, chapter-tab rule, nav rule).
import "./styles/chrome-blend.css";
import { Shell } from "./Shell";

declare global {
  interface Window {
    MQ?: { start(): void };
    __mathquestStarted?: boolean;
  }
}

export function AdventureRoot() {
  useEffect(() => {
    if (window.__mathquestStarted) return;
    window.__mathquestStarted = true;
    import("./runtime/index.js").then(() => window.MQ?.start());
  }, []);

  return <Shell />;
}
