import styles from "./Stars.module.css";

export function Stars({ count, max = 5 }: { count: number; max?: number }) {
  return (
    <span className={styles.stars} role="img" aria-label={`${count} of ${max} stars`}>
      {Array.from({ length: max }, (_, i) => (
        <svg key={i} viewBox="0 0 24 24" width="24" height="24" data-on={i < count} aria-hidden="true">
          <path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9z" />
        </svg>
      ))}
    </span>
  );
}
