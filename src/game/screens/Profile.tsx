"use client";

import { useState } from "react";
import type { Grade, StoryTheme } from "@/engine/types";
import { useGame } from "../GameProvider";
import { HERO_NAMES, HEROES, INTERESTS, type HeroId, type HeroName } from "../state/types";
import { Button } from "../ui/Button";
import { SpeakButton } from "../ui/SpeakButton";
import styles from "./Profile.module.css";

const GRADES: readonly { value: Grade; label: string; name: string }[] = [
  { value: 0, label: "K", name: "Kindergarten" },
  { value: 1, label: "1", name: "Grade 1" },
  { value: 2, label: "2", name: "Grade 2" },
  { value: 3, label: "3", name: "Grade 3" },
  { value: 4, label: "4", name: "Grade 4" },
  { value: 5, label: "5", name: "Grade 5" },
];

export function Profile() {
  const { dispatch } = useGame();
  const [hero, setHero] = useState<HeroId>("wizard");
  const [name, setName] = useState<HeroName>("Nova");
  const [grade, setGrade] = useState<Grade | null>(null);
  const [interest, setInterest] = useState<StoryTheme>("forest");
  const heroEmoji = HEROES.find((h) => h.id === hero)?.emoji ?? "🧙";

  const start = () => {
    if (grade === null) return;
    dispatch({ type: "createProfile", profile: { hero, name, grade, interest }, at: Date.now() });
  };

  return (
    <div className={styles.profile}>
      <div className={styles.stage} aria-hidden="true">
        <div className={styles.heroWrap}>
          <span className={styles.heroEmoji}>{heroEmoji}</span>
          <span className={styles.nameTag}>{name}</span>
        </div>
        <svg className={styles.hills} viewBox="0 0 400 140" preserveAspectRatio="none">
          <ellipse cx="110" cy="150" rx="260" ry="100" />
          <ellipse cx="330" cy="172" rx="250" ry="110" />
        </svg>
      </div>

      <section className={styles.panel} aria-labelledby="profile-title">
        <div className={styles.titleRow}>
          <h1 id="profile-title" className={styles.title}>
            Who&apos;s going on the adventure?
          </h1>
          <SpeakButton text="Who's going on the adventure? Choose your hero, pick a name, pick what you love, and tap your grade." />
        </div>

        <fieldset className={styles.field}>
          <legend className={styles.legend}>Choose your hero</legend>
          <div className={styles.heroes}>
            {HEROES.map((h) => (
              <button
                key={h.id}
                type="button"
                className={styles.heroTile}
                aria-pressed={h.id === hero}
                onClick={() => setHero(h.id)}
              >
                <span className={styles.tileEmoji} aria-hidden="true">
                  {h.emoji}
                </span>
                {h.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className={styles.field}>
          <legend className={styles.legend}>Pick a name</legend>
          <div className={styles.chips}>
            {HERO_NAMES.map((n) => (
              <button key={n} type="button" className={styles.chip} aria-pressed={n === name} onClick={() => setName(n)}>
                {n}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className={styles.field}>
          <legend className={styles.legend}>What do you love?</legend>
          <div className={styles.chips}>
            {INTERESTS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={styles.chip}
                aria-pressed={option.id === interest}
                onClick={() => setInterest(option.id)}
              >
                <span aria-hidden="true">{option.emoji}</span> {option.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className={styles.field}>
          <legend className={styles.legend}>What grade are you in?</legend>
          <div className={styles.chips}>
            {GRADES.map((g) => (
              <button
                key={g.value}
                type="button"
                className={`${styles.chip} ${styles.gradeChip}`}
                aria-pressed={g.value === grade}
                aria-label={g.name}
                onClick={() => setGrade(g.value)}
              >
                {g.label}
              </button>
            ))}
          </div>
        </fieldset>

        <div className={styles.footer}>
          <Button size="lg" onClick={start} disabled={grade === null}>
            Start the warm-up
          </Button>
          <p className={styles.helper} aria-live="polite">
            {grade === null ? "Tap your grade to start." : "8 quick questions to find your trail."}
          </p>
        </div>
      </section>
    </div>
  );
}
