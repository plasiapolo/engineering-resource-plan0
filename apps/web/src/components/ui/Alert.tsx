import type { ReactNode } from "react";
import styles from "./ui.module.css";

type AlertTone = "info" | "warning" | "danger" | "success";

const toneClass: Record<AlertTone, string> = {
  info: styles["alert-info"],
  warning: styles["alert-warning"],
  danger: styles["alert-danger"],
  success: styles["alert-success"],
};

export function Alert({ tone = "info", title, children, onDismiss }: { tone?: AlertTone; title?: ReactNode; children?: ReactNode; onDismiss?: () => void }) {
  return (
    <div className={`${styles.alert} ${toneClass[tone]}`}>
      <div className={styles.alertBody}>
        {title ? <strong className={styles.alertTitle}>{title}</strong> : null}
        {children ? <div>{children}</div> : null}
      </div>
      {onDismiss ? (
        <button className={styles.alertDismiss} onClick={onDismiss} aria-label="Dismiss">
          &times;
        </button>
      ) : null}
    </div>
  );
}