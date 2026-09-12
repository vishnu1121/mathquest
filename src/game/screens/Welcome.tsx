"use client";

import { useMemo } from "react";
import { createLearnerModel } from "@/engine/learnerModel";
import { deriveWorld } from "@/engine/world";
import { useGame } from "../GameProvider";
import { ForestScene } from "../scene/ForestScene";
import { HEROES } from "../state/types";
import { Button } from "../ui/Button";
import { SpeakButton } from "../ui/SpeakButton";
import styles from "./Welcome.module.css";

export function Welcome() {
  const { state, dispatch } = useGame();
  const { profile, model, bossPassed } = state;

  const world = useMemo(() => deriveWorld(model ?? createLearnerModel(2), bossPassed), [model, bossPassed]);
  const heroEmoji = HEROES.find((h) => h.id === profile?.hero)?.emoji ?? "🧙";
  const tagline = profile ? `Welcome back, ${profile.name}! The bridge is waiting.` : "The forest bridge is broken. Your math can fix it.";

  return (
    <div className={styles.welcome}>
      <ForestScene world={world} hero={heroEmoji} className={styles.scene} />
      <section className={styles.card} aria-labelledby="welcome-title">
        <h1 id="welcome-title" className={styles.wordmark}>
          MathQuest
        </h1>
        <div className={styles.planks} aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span className={styles.open} />
        </div>
        <p className={styles.tagline}>{tagline}</p>
        <div className={styles.actions}>
          <Button size="lg" onClick={() => dispatch({ type: "begin" })}>
            {profile ? "Keep going" : "Start the adventure"}
          </Button>
          <SpeakButton text={tagline} />
        </div>
      </section>
    </div>
  );
}
