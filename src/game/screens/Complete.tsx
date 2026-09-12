"use client";

import { useMemo } from "react";
import { starsFor } from "@/engine/learnerModel";
import { SKILL_ORDER, SKILLS } from "@/engine/skills";
import { deriveWorld } from "@/engine/world";
import { useGame } from "../GameProvider";
import { ForestScene } from "../scene/ForestScene";
import { HEROES } from "../state/types";
import { Button } from "../ui/Button";
import { LeafIcon } from "../ui/Hud";
import { SpeakButton } from "../ui/SpeakButton";
import { Stars } from "../ui/Stars";
import styles from "./Complete.module.css";

export function Complete() {
  const { state, dispatch } = useGame();
  const { model, profile, xp, bossPassed } = state;
  const world = useMemo(() => (model ? deriveWorld(model, bossPassed) : null), [model, bossPassed]);
  if (!model || !profile || !world) return null;

  const heroEmoji = HEROES.find((h) => h.id === profile.hero)?.emoji ?? "🧙";
  const title = `You did it, ${profile.name}! The forest is glowing.`;

  return (
    <div className={styles.complete}>
      <ForestScene world={world} hero={heroEmoji} heroAt="across" className={styles.scene} />

      <section className={styles.card} aria-labelledby="complete-title">
        <div className={styles.titleRow}>
          <h1 id="complete-title" className={styles.title}>
            {title}
          </h1>
          <SpeakButton text={`${title} You earned the Guardian's Acorn, and Subtraction Desert is unlocked.`} />
        </div>

        <div className={styles.grid}>
          <div className={styles.award}>
            <span className={styles.trophy} aria-hidden="true">
              🏆
            </span>
            <div>
              <p className={styles.awardName}>Guardian&apos;s Acorn</p>
              <p className={styles.awardNote}>
                <LeafIcon size={18} /> {xp} leaves collected
              </p>
            </div>
          </div>

          <ul className={styles.skills} aria-label="Forest skills">
            {SKILL_ORDER.map((id) => (
              <li key={id} className={styles.skill}>
                <span className={styles.skillName}>{SKILLS[id].kidName}</span>
                <Stars count={starsFor(model.skills[id])} />
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.footer}>
          <div className={styles.unlock}>
            <span className={styles.unlockIcon} aria-hidden="true">
              🏜️
            </span>
            <div>
              <p className={styles.unlockTitle}>Subtraction Desert unlocked</p>
              <p className={styles.unlockNote}>A new adventure is coming soon.</p>
            </div>
          </div>
          <div className={styles.buttons}>
            <Button variant="secondary" size="lg" onClick={() => dispatch({ type: "goTo", screen: "grownups" })}>
              Grown-ups view
            </Button>
            <Button size="lg" onClick={() => dispatch({ type: "goTo", screen: "map" })}>
              Back to the map
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
