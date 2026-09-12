import styles from "./Hud.module.css";

interface HudProps {
  title: string;
  xp: number;
  heroEmoji: string;
  heroName: string;
  onMap?: () => void;
}

export function LeafIcon({ size = 22 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path d="M20 4C10 4 4 9.5 4 16c0 1.6.4 3 1 4 1-4 4-7.5 9-9-4 2.2-6.6 5.4-7.6 9 1 .6 2.3 1 3.6 1C16.5 21 20 14 20 4z" fill="var(--leaf)" />
    </svg>
  );
}

export function Hud({ title, xp, heroEmoji, heroName, onMap }: HudProps) {
  return (
    <header className={styles.hud}>
      <div className={styles.group}>
        {onMap ? (
          <button type="button" className={styles.round} onClick={onMap} aria-label="Back to the map">
            <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
              <path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              <path d="M9 4v14M15 6v14" stroke="currentColor" strokeWidth="2" />
            </svg>
          </button>
        ) : null}
        <span className={`${styles.pill} ${styles.title}`}>{title}</span>
      </div>
      <div className={styles.group}>
        <span className={styles.pill}>
          <LeafIcon />
          <span className={styles.number}>{xp}</span>
          <span className="visually-hidden">leaves</span>
        </span>
        <span className={`${styles.pill} ${styles.heroPill}`}>
          <span className={styles.emoji} aria-hidden="true">
            {heroEmoji}
          </span>
          {heroName}
        </span>
      </div>
    </header>
  );
}
