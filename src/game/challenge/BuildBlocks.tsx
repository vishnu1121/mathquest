"use client";

import { useState } from "react";
import { playCue } from "../audio/sound";
import { Button } from "../ui/Button";
import { blocksReducer, blocksValue, emptyBlocks, type BlocksAction } from "./blocksState";
import styles from "./BuildBlocks.module.css";

interface BuildBlocksProps {
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}

export function BuildBlocks({ onChange, onSubmit, disabled = false }: BuildBlocksProps) {
  const [blocks, setBlocks] = useState(emptyBlocks);
  const empty = blocks.tens + blocks.ones === 0;
  const canBundle = blocks.ones >= 10;

  const act = (action: BlocksAction) => {
    const next = blocksReducer(blocks, action);
    if (next === blocks) return;
    playCue("tap");
    setBlocks(next);
    onChange(next.tens + next.ones === 0 ? "" : String(blocksValue(next)));
  };

  return (
    <div className={styles.builder}>
      <p className={styles.title}>Build your answer</p>

      <div className={styles.mat} role="img" aria-label={`${blocks.tens} tens and ${blocks.ones} ones`}>
        <div className={styles.column}>
          <p className={styles.label}>
            Tens <span className={styles.count}>{blocks.tens}</span>
          </p>
          <div className={styles.rods}>
            {Array.from({ length: blocks.tens }, (_, i) => (
              <span key={i} className={styles.rod} />
            ))}
          </div>
        </div>
        <div className={styles.column}>
          <p className={styles.label}>
            Ones <span className={styles.count}>{blocks.ones}</span>
          </p>
          <div className={styles.cubes} data-full={canBundle}>
            {Array.from({ length: blocks.ones }, (_, i) => (
              <span key={i} className={styles.cube} />
            ))}
          </div>
        </div>
      </div>

      <div className={styles.controls}>
        <button type="button" className={styles.add} onClick={() => act({ type: "addTen" })} disabled={disabled} aria-label="Add a ten">
          <span className={styles.rodIcon} aria-hidden="true" />+10
        </button>
        <button type="button" className={styles.add} onClick={() => act({ type: "addOne" })} disabled={disabled} aria-label="Add a one">
          <span className={styles.cubeIcon} aria-hidden="true" />+1
        </button>
        <button
          type="button"
          className={styles.bundle}
          data-ready={canBundle}
          onClick={() => act({ type: "bundle" })}
          disabled={disabled || !canBundle}
        >
          Bundle 10 ones
        </button>
        <button
          type="button"
          className={styles.undo}
          onClick={() => act({ type: "undo" })}
          disabled={disabled || blocks.history.length === 0}
          aria-label="Undo"
        >
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
            <path d="M9 7 4 12l5 5M4.5 12H14a6 6 0 0 1 0 12h-2" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" transform="translate(0 -4)" />
          </svg>
        </button>
      </div>

      <Button size="lg" onClick={onSubmit} disabled={disabled || empty} className={styles.check}>
        Check my answer
      </Button>
    </div>
  );
}
