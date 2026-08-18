import { useState } from "react";
import type { ApiTask, DateString } from "../../domain/types";
import { isWorkingDay, parseDateString, warsawToday } from "../../utils/date";
import { useAppState } from "../../store/AppStateContext";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Badge } from "../ui/Badge";
import { Alert } from "../ui/Alert";
import styles from "./tasks.module.css";

interface PendingDay {
  date: DateString;
  hours: number;
}

export function AssignmentEditor({ task, onClose }: { task: ApiTask; onClose: () => void }) {
  const { data, assignTask, deletePlanEntry } = useAppState();
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [pending, setPending] = useState<Record<string, PendingDay[]>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const specialists = (data?.team ?? []).filter((m) => m.role === "SPECIALIST" && m.skill === task.requiredSkill);
  const existingEntries = (data?.planEntries ?? []).filter((e) => e.taskId === task.id);

  const toggle = (userId: string, value: boolean) => {
    setChecked((prev) => ({ ...prev, [userId]: value }));
    if (value && !pending[userId]) {
      setPending((prev) => ({ ...prev, [userId]: [{ date: warsawToday(), hours: 8 }] }));
    }
  };

  const updatePending = (userId: string, index: number, field: keyof PendingDay, value: string | number) => {
    setPending((prev) => {
      const list = prev[userId] ?? [];
      const next = list.map((item, i) => (i === index ? { ...item, [field]: value } : item));
      return { ...prev, [userId]: next };
    });
  };

  const addDay = (userId: string) => {
    setPending((prev) => ({ ...prev, [userId]: [...(prev[userId] ?? []), { date: warsawToday(), hours: 8 }] }));
  };

  const removeDay = (userId: string, index: number) => {
    setPending((prev) => ({ ...prev, [userId]: (prev[userId] ?? []).filter((_, i) => i !== index) }));
  };

  const submit = async () => {
    const assignments: Array<{ userId: string; date: DateString; hours: number }> = [];
    for (const userId of Object.keys(pending)) {
      if (!checked[userId]) continue;
      for (const item of pending[userId] ?? []) {
        if (!item.date || !item.hours) continue;
        if (!isWorkingDay(parseDateString(item.date))) {
          setError(`Assignments are only allowed on working days (${item.date} is not a working day).`);
          return;
        }
        assignments.push({ userId, date: item.date, hours: Math.min(8, Math.max(1, item.hours)) });
      }
    }
    if (assignments.length === 0) {
      setError("Tick at least one specialist and enter a date and hours.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await assignTask(task.id, assignments);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Assignment failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.editor}>
      <div className="flex-between mb-16">
        <div>
          <strong className={styles.editorTitle}>
            {task.codePart} <Badge tone="blue">{task.requiredSkill}</Badge>
          </strong>
          <p className="muted" style={{ margin: 0, fontSize: 12 }}>
            Remaining {task.remainingHours}h · Task number is internal and never displayed.
          </p>
        </div>
        <Button size="sm" variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>

      {specialists.length === 0 ? (
        <Alert tone="warning">No specialist has the required skill ({task.requiredSkill}).</Alert>
      ) : (
        <div className={styles.editorGrid}>
          {specialists.map((specialist) => (
            <div key={specialist.id} className={styles.specialistBlock}>
              <label className={styles.tickRow}>
                <input
                  type="checkbox"
                  checked={!!checked[specialist.id]}
                  onChange={(e) => toggle(specialist.id, e.target.checked)}
                />
                <span>
                  <strong>{specialist.displayName}</strong>
                  <span className="muted" style={{ fontSize: 12 }}>
                    {" "}
                    · {specialist.login}
                  </span>
                </span>
              </label>
              {checked[specialist.id] ? (
                <div className={styles.dayRows}>
                  {(pending[specialist.id] ?? []).map((item, index) => (
                    <div key={index} className={styles.dayRow}>
                      <Input
                        type="date"
                        value={item.date}
                        onChange={(e) => updatePending(specialist.id, index, "date", e.target.value)}
                      />
                      <Input
                        type="number"
                        min={1}
                        max={8}
                        value={item.hours}
                        onChange={(e) => updatePending(specialist.id, index, "hours", Number(e.target.value))}
                      />
                      <button className={styles.removeBtn} onClick={() => removeDay(specialist.id, index)}>
                        &times;
                      </button>
                    </div>
                  ))}
                  <Button size="sm" variant="ghost" onClick={() => addDay(specialist.id)}>
                    + Add day
                  </Button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {existingEntries.length > 0 ? (
        <div className="mt-16">
          <p className="muted" style={{ fontSize: 12, marginBottom: 6 }}>
            Currently planned
          </p>
          <div className={styles.existing}>
            {existingEntries.map((entry) => (
              <div key={entry.id} className={styles.existingRow}>
                <span>
                  {entry.date} · {entry.userName} · <strong>{entry.hours}h</strong>
                  {entry.locked ? <Badge tone="blue">locked</Badge> : <Badge tone="orange">auto</Badge>}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-danger"
                  onClick={() => void deletePlanEntry(entry.id)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="mt-16">
          <Alert tone="danger">{error}</Alert>
        </div>
      ) : null}

      <div className="mt-16 flex">
        <Button variant="accent" onClick={() => void submit()} disabled={busy}>
          {busy ? "Applying…" : "Apply assignment"}
        </Button>
      </div>
    </div>
  );
}