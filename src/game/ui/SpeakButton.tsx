"use client";

import { speak } from "../audio/speech";
import styles from "./SpeakButton.module.css";

interface SpeakButtonProps {
  text: string;
  label?: string;
}

export function SpeakButton({ text, label = "Read aloud" }: SpeakButtonProps) {
  return (
    <button type="button" className={styles.speak} onClick={() => speak(text)} aria-label={label} title={label}>
      <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
        <path d="M3.5 9.5h3.8L12 5.6v12.8l-4.7-3.9H3.5z" fill="currentColor" />
        <path
          d="M15.4 8.6a4.8 4.8 0 0 1 0 6.8M18 6a8.4 8.4 0 0 1 0 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}
