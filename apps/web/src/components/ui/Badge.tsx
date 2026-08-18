import styles from "./ui.module.css";

type BadgeTone = "neutral" | "blue" | "orange" | "green" | "red" | "gray";

export function Badge({ tone = "neutral", children, title }: { tone?: BadgeTone; children: React.ReactNode; title?: string }) {
  return (
    <span className={`${styles.badge} ${styles[`badge-${tone}`]}`} title={title}>
      {children}
    </span>
  );
}