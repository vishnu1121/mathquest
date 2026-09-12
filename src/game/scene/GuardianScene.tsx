import styles from "./GuardianScene.module.css";

export type GuardianMood = "ready" | "hit" | "sleepy" | "proud";

interface GuardianSceneProps {
  shieldsLeft: number;
  total: number;
  mood: GuardianMood;
  hero: string;
  className?: string;
}

// Composed for a short, wide band: the shields sit in a flat arc across the middle of the scene
// so they stay visible when the band crops the top and bottom.
const ARC = { cx: 600, cy: 250, rx: 250, ry: 125, from: 205, to: 335 } as const;

function shieldPosition(index: number, total: number): { x: number; y: number } {
  const t = total === 1 ? 0.5 : index / (total - 1);
  const angle = ((ARC.from + (ARC.to - ARC.from) * t) * Math.PI) / 180;
  return { x: Math.round(ARC.cx + ARC.rx * Math.cos(angle)), y: Math.round(ARC.cy + ARC.ry * Math.sin(angle)) };
}

export function GuardianScene({ shieldsLeft, total, mood, hero, className }: GuardianSceneProps) {
  return (
    <div
      className={[styles.scene, className].filter(Boolean).join(" ")}
      role="img"
      aria-label={`The Forest Guardian has ${shieldsLeft} of ${total} leaf shields left`}
    >
      <svg className={styles.svg} viewBox="0 0 1200 520" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <ellipse className={styles.hillFar} cx={240} cy={470} rx={560} ry={180} />
        <ellipse className={styles.hillFar} cx={1000} cy={480} rx={560} ry={190} />
        <rect className={styles.ground} x={0} y={430} width={1200} height={90} />

        <g className={styles.guardian} data-mood={mood}>
          <rect className={styles.trunk} x={548} y={300} width={104} height={150} rx={32} />
          <circle className={styles.canopy} cx={600} cy={250} r={105} />
          <circle className={styles.canopyLight} cx={515} cy={288} r={68} />
          <circle className={styles.canopyLight} cx={685} cy={284} r={70} />
          {mood === "sleepy" ? (
            <>
              <path className={styles.line} d="M560 352q18 12 36 0" />
              <path className={styles.line} d="M604 352q18 12 36 0" />
            </>
          ) : (
            <>
              <circle className={styles.eye} cx={578} cy={350} r={19} />
              <circle className={styles.eye} cx={622} cy={350} r={19} />
              <circle className={styles.pupil} cx={582} cy={354} r={8} />
              <circle className={styles.pupil} cx={626} cy={354} r={8} />
            </>
          )}
          <path
            className={styles.line}
            d={mood === "proud" ? "M574 394q26 24 52 0" : mood === "hit" ? "M586 402q14 -10 28 0" : "M580 398q20 12 40 0"}
          />
        </g>

        {Array.from({ length: total }, (_, i) => {
          const { x, y } = shieldPosition(i, total);
          return (
            <g key={i} transform={`translate(${x} ${y})`}>
              <g className={styles.leaf} data-fallen={i >= shieldsLeft}>
                <path d="M0 -30C20 -15 20 15 0 30C-20 15 -20 -15 0 -30Z" />
                <path className={styles.vein} d="M0 -24V24" />
              </g>
            </g>
          );
        })}

        <text className={styles.hero} x={300} y={432} textAnchor="middle">
          {hero}
        </text>
      </svg>
    </div>
  );
}
