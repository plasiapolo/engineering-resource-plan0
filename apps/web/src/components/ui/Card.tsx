import type { ReactNode } from "react";
import styles from "./ui.module.css";

export function Card({ children, className, pad = true }: { children: ReactNode; className?: string; pad?: boolean }) {
  return <div className={`${styles.card} ${pad ? styles.pad : ""} ${className ?? ""}`}>{children}</div>;
}

export function CardHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className={styles.cardHeader}>
      <div>
        <h3 className={styles.cardTitle}>{title}</h3>
        {subtitle ? <p className={styles.cardSubtitle}>{subtitle}</p> : null}
      </div>
      {actions ? <div className={styles.cardActions}>{actions}</div> : null}
    </div>
  );
}