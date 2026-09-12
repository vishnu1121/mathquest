"use client";

import type { Challenge } from "@/engine/types";
import { challengeSpeech } from "../audio/speech";
import { SpeakButton } from "../ui/SpeakButton";
import { PlaceValue } from "./PlaceValue";
import styles from "./ChallengeCard.module.css";

export type AnswerTone = "neutral" | "good" | "almost";

interface ChallengeCardProps {
  challenge: Challenge;
  value: string;
  tone?: AnswerTone;
  onChoose?: (value: number) => void;
  disabled?: boolean;
  /** Shrinks the card while a hint is open so the hint stays on screen. */
  compact?: boolean;
  /** A story Hoot wrote for this problem, shown instead of the built-in one. */
  storyText?: string;
  /** True while Hoot is still writing the story. */
  storyPending?: boolean;
}

function Op({ children }: { children: string }) {
  return <span className={styles.op}>{children}</span>;
}

export function ChallengeCard({
  challenge,
  value,
  tone = "neutral",
  onChoose,
  disabled = false,
  compact = false,
  storyText,
  storyPending = false,
}: ChallengeCardProps) {
  const { a, b, total, unknown, story, choices, format } = challenge;
  const storyShown = storyText ?? story?.text;
  const prompt = story
    ? storyPending
      ? "Hoot is thinking of a story…"
      : storyShown
    : unknown === "addend"
      ? "What number is missing?"
      : "Add them together.";
  const slot = (
    <span className={styles.slot} data-tone={tone} data-empty={value === ""}>
      {value === "" ? "?" : value}
    </span>
  );

  return (
    <div className={styles.card} data-compact={compact}>
      <div className={styles.promptRow}>
        <p className={styles.prompt} data-pending={storyPending}>
          {prompt}
        </p>
        <SpeakButton text={story && storyShown && !storyPending ? storyShown : challengeSpeech(challenge)} />
      </div>

      {format === "visual" ? (
        <div className={styles.visual}>
          <PlaceValue a={a} b={unknown === "addend" ? undefined : b} />
        </div>
      ) : null}

      <p className={styles.equation}>
        {unknown === "addend" ? (
          <>
            {a} <Op>+</Op> {slot} <Op>=</Op> {total}
          </>
        ) : (
          <>
            {a} <Op>+</Op> {b} <Op>=</Op> {slot}
          </>
        )}
      </p>

      {choices && onChoose ? (
        <div className={styles.choices} role="group" aria-label="Choose an answer">
          {choices.map((choice) => (
            <button
              key={choice}
              type="button"
              className={styles.choice}
              aria-pressed={value === String(choice)}
              onClick={() => onChoose(choice)}
              disabled={disabled}
            >
              {choice}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
