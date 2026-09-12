"use client";

import { useEffect, useRef, useState } from "react";
import { askAi } from "@/ai/client";
import { acceptHint } from "@/ai/guards";
import { hintFor, MAX_HINT_LEVEL } from "@/engine/hints";
import type { Challenge, HintLevel, MisconceptionId } from "@/engine/types";
import { SpeakButton } from "../ui/SpeakButton";
import { PlaceValue } from "./PlaceValue";
import styles from "./HootHint.module.css";

interface HootHintProps {
  challenge: Challenge;
  level: Exclude<HintLevel, 0>;
  misconception: MisconceptionId | null;
  wrongAnswer: number | null;
}

/** Levels whose words carry the teaching. The blocks and step-by-step levels keep their built-in text. */
const AI_LEVELS: ReadonlySet<number> = new Set([1, 2, 5]);

export function HootHint({ challenge, level, misconception, wrongAnswer }: HootHintProps) {
  const hint = hintFor(challenge, level, misconception);
  const builtIn = hint.text;
  const { a, b, total, answer, unknown } = challenge;
  const [reworded, setReworded] = useState<{ level: number; text: string } | null>(null);
  const ref = useRef<HTMLElement>(null);

  // Bring each new hint into view on smaller screens.
  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    ref.current?.scrollIntoView({ block: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
  }, [level]);

  // The built-in hint shows at once; Claude's rewording replaces it only if it passes the guard.
  useEffect(() => {
    if (!AI_LEVELS.has(level)) return;
    let cancelled = false;
    void askAi({ task: "hint", level, a, b, unknown, misconception, wrongAnswer, builtInHint: builtIn }).then((text) => {
      if (!cancelled && text && acceptHint(text, { a, b, total, answer, unknown, level, builtInHint: builtIn })) {
        setReworded({ level, text });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [level, builtIn, a, b, total, answer, unknown, misconception, wrongAnswer]);

  const text = reworded?.level === level ? reworded.text : builtIn;
  const spoken = [text, ...(hint.steps ?? [])].join(" ");

  return (
    <aside ref={ref} className={styles.hint} aria-live="polite">
      <div className={styles.header}>
        <span className={styles.owl} aria-hidden="true">
          🦉
        </span>
        <span className={styles.name}>Hoot</span>
        <span className={styles.ladder} role="img" aria-label={`Hint ${level} of ${MAX_HINT_LEVEL}`}>
          {Array.from({ length: MAX_HINT_LEVEL }, (_, i) => (
            <span key={i} className={styles.rung} data-on={i < level} />
          ))}
        </span>
        <SpeakButton text={spoken} label="Read Hoot's hint aloud" />
      </div>

      <p className={styles.text}>{text}</p>

      {hint.steps ? (
        <ol className={styles.steps}>
          {hint.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      ) : null}

      {hint.showBlocks ? (
        <div className={styles.blocks}>
          <PlaceValue a={a} b={unknown === "addend" ? undefined : b} mode="trade" />
        </div>
      ) : null}
    </aside>
  );
}
