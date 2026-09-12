"use client";

import dynamic from "next/dynamic";
import styles from "./GameRoot.module.css";

// The game uses browser-only features (saved progress, speech, sound), so it loads client-side.
const Game = dynamic(() => import("./Game").then((mod) => mod.Game), {
  ssr: false,
  loading: () => <div className={styles.splash} role="status" aria-label="Loading MathQuest" />,
});

export function GameRoot() {
  return <Game />;
}
