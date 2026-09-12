"use client";

import { GameProvider, useGame } from "./GameProvider";
import { Boss } from "./screens/Boss";
import { Complete } from "./screens/Complete";
import { Forest } from "./screens/Forest";
import { GrownUps } from "./screens/GrownUps";
import { Placement } from "./screens/Placement";
import { Profile } from "./screens/Profile";
import { Warmup } from "./screens/Warmup";
import { Welcome } from "./screens/Welcome";
import { WorldMap } from "./screens/WorldMap";
import styles from "./Game.module.css";

function CurrentScreen() {
  const { state } = useGame();
  switch (state.screen) {
    case "welcome":
      return <Welcome />;
    case "profile":
      return <Profile />;
    case "warmup":
      return <Warmup />;
    case "placement":
      return <Placement />;
    case "map":
      return <WorldMap />;
    case "forest":
      return <Forest />;
    case "boss":
      return <Boss />;
    case "complete":
      return <Complete />;
    case "grownups":
      return <GrownUps />;
    default:
      // Temporary while the remaining screens are built.
      return <p className={styles.pending}>This part of the adventure is still being built.</p>;
  }
}

export function Game() {
  return (
    <GameProvider>
      <main className={styles.app}>
        <CurrentScreen />
      </main>
    </GameProvider>
  );
}
