import type { ReactNode } from "react";
import styles from "./Toast.module.css";

export function Toast({ children }: { children: ReactNode }) {
  return (
    <div className={styles.toast} role="status">
      {children}
    </div>
  );
}
