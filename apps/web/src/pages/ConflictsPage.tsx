import { useAppState } from "../store/AppStateContext";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { EmptyState } from "../components/ui/Extras";
import { CONFLICT_SEVERITY_LABELS, CONFLICT_TYPE_LABELS } from "../domain/constants";
import styles from "./pages.module.css";

const toneForSeverity = (severity: string): "red" | "orange" | "blue" | "gray" =>
  severity === "CRITICAL" || severity === "ERROR" ? "red" : severity === "WARNING" ? "orange" : "blue";

export function ConflictsPage() {
  const { data } = useAppState();
  if (!data) return null;

  const conflicts = data.conflicts;

  return (
    <div>
      <p className="page-subtitle">
        Planning conflicts are detected after every plan change and after automatic generation. Types: project deadline,
        project budget, no available employee, dependency violation, employee overload and task deadline.
      </p>

      {conflicts.length === 0 ? (
        <Card>
          <EmptyState title="No conflicts" hint="Everything looks good. No planning conflicts detected." />
        </Card>
      ) : (
        <div className={styles.conflictList}>
          {conflicts.map((conflict) => (
            <Card key={conflict.id}>
              <div className="flex-between">
                <div className="flex">
                  <Badge tone={toneForSeverity(conflict.severity)}>{CONFLICT_SEVERITY_LABELS[conflict.severity]}</Badge>
                  <Badge tone="neutral">{CONFLICT_TYPE_LABELS[conflict.type] ?? conflict.type}</Badge>
                  <strong>{conflict.title}</strong>
                </div>
                <span className="muted" style={{ fontSize: 12 }}>
                  {[
                    conflict.projectName ? `Project: ${conflict.projectName}` : null,
                    conflict.taskCode ? `Task: ${conflict.taskCode}` : null,
                    conflict.employeeName ? `Employee: ${conflict.employeeName}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </div>
              <p className="muted mt-8">{conflict.description}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}