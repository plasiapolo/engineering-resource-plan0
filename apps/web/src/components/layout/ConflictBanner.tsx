import { CONFLICT_SEVERITY_LABELS, CONFLICT_TYPE_LABELS } from "../../domain/constants";
import { useAppState } from "../../store/AppStateContext";
import { Badge } from "../ui/Badge";
import styles from "./layout.module.css";

const toneForSeverity = (severity: string): "red" | "orange" | "blue" | "gray" => {
  switch (severity) {
    case "CRITICAL":
    case "ERROR":
      return "red";
    case "WARNING":
      return "orange";
    default:
      return "blue";
  }
};

export function ConflictBanner() {
  const { data, setView } = useAppState();
  const conflicts = data?.conflicts ?? [];
  if (conflicts.length === 0) return null;
  const critical = conflicts.filter((c) => c.severity === "CRITICAL" || c.severity === "ERROR").length;

  return (
    <div className={styles.conflictBanner}>
      <span className={styles.conflictBannerText}>
        <strong>{conflicts.length} planning conflict{conflicts.length === 1 ? "" : "s"}</strong>
        {critical > 0 ? ` · ${critical} critical` : ""}
      </span>
      <button className={styles.conflictBannerLink} onClick={() => setView("conflicts")}>
        View conflicts
      </button>
    </div>
  );
}

export function ConflictChips({ limit = 4 }: { limit?: number }) {
  const { data } = useAppState();
  const conflicts = data?.conflicts ?? [];
  if (conflicts.length === 0) return null;
  return (
    <div className={styles.chips}>
      {conflicts.slice(0, limit).map((conflict) => (
        <Badge key={conflict.id} tone={toneForSeverity(conflict.severity)} title={conflict.description}>
          {CONFLICT_TYPE_LABELS[conflict.type] ?? conflict.type} · {CONFLICT_SEVERITY_LABELS[conflict.severity]}
        </Badge>
      ))}
      {conflicts.length > limit ? <Badge tone="neutral">+{conflicts.length - limit} more</Badge> : null}
    </div>
  );
}