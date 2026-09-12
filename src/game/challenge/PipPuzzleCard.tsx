"use client";

import { useState, type ReactNode } from "react";
import type { MistakePart, PipMistake } from "@/engine/pipPuzzle";
import type { PipTurn } from "../state/types";
import { Button } from "../ui/Button";
import { SpeakButton } from "../ui/SpeakButton";
import styles from "./PipPuzzleCard.module.css";

interface PipPuzzleCardProps {
  turn: PipTurn;
  onTap: (part: MistakePart) => void;
  onPick: (value: number) => void;
  onNext: () => void;
}

interface PartProps {
  part: MistakePart;
  turn: PipTurn;
  onTap: (part: MistakePart) => void;
  label: string;
  className?: string;
  children: ReactNode;
}

function Part({ part, turn, onTap, label, className, children }: PartProps) {
  const found = turn.status !== "finding" && part === turn.puzzle.mistakePart;
  const state = found ? "found" : turn.wrongTaps.includes(part) ? "checked" : "idle";
  return (
    <button
      type="button"
      className={[styles.part, className].filter(Boolean).join(" ")}
      data-state={state}
      onClick={() => onTap(part)}
      disabled={turn.status !== "finding"}
      aria-label={label}
    >
      {children}
    </button>
  );
}

/** Teach Pip: the child explains the mistake by picking a card. Checked by code; never changes score. */
function TeachPip({ turn, onTaught }: { turn: PipTurn; onTaught: () => void }) {
  const [tried, setTried] = useState<PipMistake[]>([]);
  const question = "Teach Pip: why was my answer wrong?";
  return (
    <div className={styles.teach}>
      <div className={styles.teachHeader}>
        <p className={styles.prompt}>{question}</p>
        <SpeakButton text={question} />
      </div>
      <ul className={styles.cards}>
        {turn.puzzle.teachCards.map((card) => {
          const checked = tried.includes(card.mistake);
          return (
            <li key={card.mistake} className={styles.cardRow}>
              <button
                type="button"
                className={styles.teachCard}
                data-state={checked ? "checked" : "idle"}
                disabled={checked}
                onClick={() => (card.mistake === turn.puzzle.mistake ? onTaught() : setTried((t) => [...t, card.mistake]))}
              >
                {card.text}
              </button>
              <SpeakButton text={card.text} label="Read this card aloud" />
            </li>
          );
        })}
      </ul>
      {tried.length > 0 ? (
        <p className={styles.feedback} data-tone="almost" role="status">
          Hmm, that&apos;s not what happened here. Look at Pip&apos;s work and try another card.
        </p>
      ) : null}
    </div>
  );
}

export function PipPuzzleCard({ turn, onTap, onPick, onNext }: PipPuzzleCardProps) {
  const { puzzle, status } = turn;
  const [taught, setTaught] = useState(false);
  const [onesCell = "", tensCell = ""] = puzzle.resultCells;
  const aTens = Math.floor(puzzle.a / 10);
  const aOnes = puzzle.a % 10;
  const bTens = puzzle.b >= 10 ? String(Math.floor(puzzle.b / 10)) : "";
  const bOnes = puzzle.b % 10;
  const pipSays = taught ? puzzle.thanks : puzzle.pipLine;

  return (
    <div className={styles.card}>
      <div className={styles.pip}>
        <span className={styles.avatar} aria-hidden="true">
          🧚
        </span>
        <p className={styles.bubble} aria-live="polite">
          {pipSays}
        </p>
        <SpeakButton text={pipSays} label="Read Pip's words aloud" />
      </div>

      <div className={styles.body}>
        <div className={styles.sheet} role="group" aria-label={`Pip's work for ${puzzle.a} plus ${puzzle.b}`}>
          <span />
          <span className={styles.digit}>{aTens}</span>
          <span className={styles.digit}>{aOnes}</span>

          <span className={styles.op}>+</span>
          <Part part="setup" turn={turn} onTap={onTap} label={`How Pip lined up ${puzzle.b}`} className={styles.row}>
            {puzzle.bottomShifted ? (
              <>
                <span className={styles.digit}>{puzzle.b}</span>
                <span className={styles.digit} />
              </>
            ) : (
              <>
                <span className={styles.digit}>{bTens}</span>
                <span className={styles.digit}>{bOnes}</span>
              </>
            )}
          </Part>

          <span className={styles.rule} />

          <span />
          {puzzle.resultCells.length > 0 ? (
            <>
              <Part part="tens" turn={turn} onTap={onTap} label={`Pip's tens: ${tensCell}`}>
                {tensCell}
              </Part>
              <Part part="ones" turn={turn} onTap={onTap} label={`Pip's ones: ${onesCell}`}>
                {onesCell}
              </Part>
            </>
          ) : (
            <Part part="whole" turn={turn} onTap={onTap} label={`Pip's answer: ${puzzle.pipAnswer}`} className={styles.row}>
              {puzzle.pipAnswer}
            </Part>
          )}
        </div>

        <div className={styles.steps}>
          {status === "finding" ? (
            <>
              <p className={styles.prompt}>Tap the part Pip got wrong.</p>
              {turn.wrongTaps.length > 0 ? (
                <p className={styles.feedback} data-tone="almost" role="status">
                  That part is right. Look again!
                </p>
              ) : null}
            </>
          ) : status === "fixing" && !taught ? (
            <>
              <p className={styles.feedback} data-tone="good" role="status">
                You found it!
              </p>
              <TeachPip turn={turn} onTaught={() => setTaught(true)} />
            </>
          ) : status === "fixing" ? (
            <>
              <p className={styles.prompt}>
                Help Pip fix it: {puzzle.a} + {puzzle.b} =
              </p>
              <div className={styles.choices}>
                {puzzle.choices.map((choice) => (
                  <button
                    key={choice}
                    type="button"
                    className={styles.choice}
                    data-state={turn.wrongPicks.includes(choice) ? "checked" : "idle"}
                    disabled={turn.wrongPicks.includes(choice)}
                    onClick={() => onPick(choice)}
                  >
                    {choice}
                  </button>
                ))}
              </div>
              {turn.wrongPicks.length > 0 ? (
                <p className={styles.feedback} data-tone="almost" role="status">
                  Not quite. Try another one.
                </p>
              ) : null}
            </>
          ) : (
            <>
              <p className={styles.solved}>
                {puzzle.a} + {puzzle.b} = {puzzle.correct}. {puzzle.explanation}
              </p>
              <Button size="lg" onClick={onNext}>
                Next
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
