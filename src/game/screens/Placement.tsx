"use client";

import { focusSkill } from "@/engine/adaptive";
import { SKILL_ORDER, SKILLS } from "@/engine/skills";
import { useGame } from "../GameProvider";
import { HEROES } from "../state/types";
import { Button } from "../ui/Button";
import { SpeakButton } from "../ui/SpeakButton";
import styles from "./Placement.module.css";

export function Placement() {
  const { state, dispatch } = useGame();
  const { model, profile } = state;
  if (!model || !profile) return null;

  const start = focusSkill(model, state.session.focus) ?? "simple";
  const heroEmoji = HEROES.find((h) => h.id === profile.hero)?.emoji ?? "🧙";
  const line = `Great warm-up, ${profile.name}! Your trail starts at ${SKILLS[start].kidName}.`;

  return (
    <div className={styles.placement}>
      <section className={styles.panel} aria-labelledby="placement-title">
        <div className={styles.hoot}>
          <span className={styles.owl} aria-hidden="true">
            🦉
          </span>
          <h1 id="placement-title" className={styles.bubble}>
            {line}
          </h1>
          <SpeakButton text={line} />
        </div>

        <ol className={styles.trail} aria-label="Addition Forest trail">
          {SKILL_ORDER.map((id, index) => {
            const status = id === start ? "start" : model.skills[id].mastery >= 0.5 ? "ready" : "later";
            return (
              <li key={id} className={styles.stop} data-status={status}>
                <span className={styles.dot} aria-hidden="true">
                  {status === "start" ? heroEmoji : status === "ready" ? "✓" : index + 1}
                </span>
                <span className={styles.stopName}>{SKILLS[id].kidName}</span>
                <span className={styles.stopNote}>
                  {status === "start" ? "Start here" : status === "ready" ? "Warmed up" : "Coming up"}
                </span>
              </li>
            );
          })}
        </ol>

        <Button size="lg" className={styles.cta} onClick={() => dispatch({ type: "enterForest", at: Date.now() })}>
          Enter Addition Forest
        </Button>
      </section>
    </div>
  );
}
