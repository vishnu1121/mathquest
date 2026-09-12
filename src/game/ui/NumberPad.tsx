"use client";

import { useEffect, useEffectEvent } from "react";
import { playCue } from "../audio/sound";
import styles from "./NumberPad.module.css";

interface NumberPadProps {
  value: string;
  onChange: (next: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  maxDigits?: number;
}

const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

export function NumberPad({ value, onChange, onSubmit, disabled = false, maxDigits = 4 }: NumberPadProps) {
  const press = (digit: string) => {
    if (disabled || value.length >= maxDigits) return;
    playCue("tap");
    onChange(value + digit);
  };
  const erase = () => {
    if (!disabled && value.length > 0) onChange(value.slice(0, -1));
  };
  const submit = () => {
    if (!disabled && value.length > 0) onSubmit();
  };

  // Keyboard support for laptops and grown-up testers.
  const onKey = useEffectEvent((event: KeyboardEvent) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (/^\d$/.test(event.key)) {
      event.preventDefault();
      press(event.key);
    } else if (event.key === "Backspace") {
      event.preventDefault();
      erase();
    } else if (event.key === "Enter" && !(event.target instanceof HTMLButtonElement)) {
      event.preventDefault();
      submit();
    }
  });

  useEffect(() => {
    if (disabled) return;
    const handler = (event: KeyboardEvent) => onKey(event);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [disabled]);

  return (
    <div className={styles.pad} role="group" aria-label="Number pad">
      {DIGITS.map((digit) => (
        <button key={digit} type="button" className={styles.key} onClick={() => press(digit)} disabled={disabled}>
          {digit}
        </button>
      ))}
      <button type="button" className={`${styles.key} ${styles.erase}`} onClick={erase} disabled={disabled} aria-label="Delete">
        <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">
          <path d="M8.5 5h11A1.5 1.5 0 0 1 21 6.5v11a1.5 1.5 0 0 1-1.5 1.5h-11L3 12z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="m11 9.5 5 5m0-5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      <button type="button" className={styles.key} onClick={() => press("0")} disabled={disabled}>
        0
      </button>
      <button
        type="button"
        className={`${styles.key} ${styles.check}`}
        onClick={submit}
        disabled={disabled || value.length === 0}
        aria-label="Check my answer"
      >
        <svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true">
          <path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
