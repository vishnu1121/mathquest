"use client";

import { useState } from "react";
import { Button } from "../ui/Button";
import styles from "./PlaceValue.module.css";

interface PlaceValueProps {
  a: number;
  /** Leave out to show only the first number, e.g. when b is the hidden answer. */
  b?: number;
  /** "trade" shows a place-value mat where the child trades 10 ones for a ten. */
  mode?: "addends" | "trade";
}

function BlockNumber({ n }: { n: number }) {
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return (
    <div className={styles.number} role="img" aria-label={`${n}: ${tens} tens and ${ones} ones`}>
      <div className={styles.rods}>
        {Array.from({ length: tens }, (_, i) => (
          <span key={i} className={styles.rod} />
        ))}
      </div>
      <div className={styles.cubes}>
        {Array.from({ length: ones }, (_, i) => (
          <span key={i} className={styles.cube} />
        ))}
      </div>
      <span className={styles.caption}>{n}</span>
    </div>
  );
}

function TenFrames({ a, b }: { a: number; b: number }) {
  const cells = Array.from({ length: 20 }, (_, i) => (i < a ? "a" : i < a + b ? "b" : "empty"));
  const frames = a + b > 10 ? [cells.slice(0, 10), cells.slice(10)] : [cells.slice(0, 10)];
  return (
    <div className={styles.frames} role="img" aria-label={`${a} green circles and ${b} blue squares`}>
      {frames.map((frame, f) => (
        <div key={f} className={styles.frame}>
          {frame.map((fill, i) => (
            <span key={i} className={styles.cell} data-fill={fill} />
          ))}
        </div>
      ))}
    </div>
  );
}

function TradeMat({ a, b }: { a: number; b: number }) {
  const [traded, setTraded] = useState(false);
  const onesTotal = (a % 10) + (b % 10);
  const tens = Math.floor(a / 10) + Math.floor(b / 10) + (traded ? 1 : 0);
  const ones = traded ? onesTotal - 10 : onesTotal;

  return (
    <div className={styles.mat}>
      <div className={styles.column}>
        <p className={styles.columnLabel}>
          Tens <span className={styles.count}>{tens}</span>
        </p>
        <div className={styles.rods}>
          {Array.from({ length: tens }, (_, i) => (
            <span key={i} className={styles.rod} data-new={traded && i === tens - 1} />
          ))}
        </div>
      </div>
      <div className={styles.column}>
        <p className={styles.columnLabel}>
          Ones <span className={styles.count}>{ones}</span>
        </p>
        <div className={styles.cubes}>
          {Array.from({ length: ones }, (_, i) => (
            <span key={i} className={styles.cube} />
          ))}
        </div>
      </div>
      <div className={styles.matFooter}>
        {!traded && onesTotal >= 10 ? (
          <Button variant="secondary" onClick={() => setTraded(true)}>
            Trade 10 ones for 1 ten
          </Button>
        ) : traded ? (
          <p className={styles.traded} role="status">
            You traded 10 ones for 1 ten!
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function PlaceValue({ a, b, mode = "addends" }: PlaceValueProps) {
  const small = a < 10 && (b ?? 0) < 10;
  if (small) return <TenFrames a={a} b={b ?? 0} />;
  if (mode === "trade" && b !== undefined) return <TradeMat a={a} b={b} />;
  return (
    <div className={styles.addends}>
      <BlockNumber n={a} />
      {b !== undefined ? (
        <>
          <span className={styles.plus} aria-hidden="true">
            +
          </span>
          <BlockNumber n={b} />
        </>
      ) : null}
    </div>
  );
}
