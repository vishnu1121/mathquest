"use client";

import { useState } from "react";
import { WARMUP_LENGTH } from "@/engine/diagnostic";
import { playCue } from "../audio/sound";
import { ChallengeCard } from "../challenge/ChallengeCard";
import { useGame } from "../GameProvider";
import { NumberPad } from "../ui/NumberPad";
import { SpeakButton } from "../ui/SpeakButton";
import styles from "./Warmup.module.css";

const HOOT_LINE = "Hi, I'm Hoot! Answer a few questions so I know where your trail starts.";

export function Warmup() {
  const { state, dispatch } = useGame();
  const [value, setValue] = useState("");
  const run = state.warmup;
  if (!run) return null;

  const submit = () => {
    if (value === "") return;
    playCue("tap");
    dispatch({ type: "answerWarmup", value, at: Date.now() });
    setValue("");
  };

  return (
    <div className={styles.warmup}>
      <header className={styles.header}>
        <div className={styles.hoot}>
          <span className={styles.owl} aria-hidden="true">
            🦉
          </span>
          <p className={styles.bubble}>{HOOT_LINE}</p>
          <SpeakButton text={HOOT_LINE} />
        </div>
        <ol className={styles.trail} aria-label={`Question ${run.index + 1} of ${WARMUP_LENGTH}`}>
          {Array.from({ length: WARMUP_LENGTH }, (_, i) => (
            <li key={i} className={styles.marker} data-state={i < run.index ? "done" : i === run.index ? "current" : "todo"} />
          ))}
        </ol>
      </header>

      <div className={styles.play}>
        <ChallengeCard key={run.item.challenge.id} challenge={run.item.challenge} value={value} />
        <NumberPad value={value} onChange={setValue} onSubmit={submit} />
      </div>
    </div>
  );
}
