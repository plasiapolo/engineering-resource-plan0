import { useState } from "react";
import { useAppState } from "../store/AppStateContext";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";
import { WeeklyCalendar } from "../components/planner/WeeklyCalendar";
import { parseDateString, startOfWeek, toDateString, addDays } from "../utils/date";

export function PlannerPage() {
  const { user, data, generatePlan, planNotice, selectedWeekStart } = useAppState();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!data) return null;

  const isPM = user?.role === "PROJECT_MANAGER";

  const weekStart = startOfWeek(parseDateString(selectedWeekStart));
  const weekEnd = toDateString(addDays(weekStart, 6));
  const weekEntries = data.planEntries.filter((e) => e.date >= toDateString(weekStart) && e.date <= weekEnd);
  const weekHours = weekEntries.reduce((s, e) => s + e.hours, 0);

  const runGenerate = async () => {
    setBusy(true);
    setError(null);
    try {
      await generatePlan();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setBusy(false);
    }
  };

  const notice = planNotice
    ? planNotice.failures.length > 0
      ? `Plan generated: ${planNotice.entriesCreated} entries created. ${planNotice.failures.length} task(s) could not be fully scheduled.`
      : `Plan generated successfully: ${planNotice.entriesCreated} entries created.`
    : null;

  return (
    <div>
      {isPM ? (
        <div className="flex-between mb-16">
          <p className="page-subtitle" style={{ margin: 0 }}>
            The automatic plan is created or refreshed only when you press the button. Manual (locked) entries are never
            modified by the planner.
          </p>
          <Button variant="accent" onClick={() => void runGenerate()} disabled={busy}>
            {busy ? "Generating…" : "Create automatic task plan for employees"}
          </Button>
        </div>
      ) : (
        <p className="page-subtitle">Your tasks appear here. This is a read-only view for specialists.</p>
      )}

      {notice ? (
        <div className="mb-16">
          <Alert tone={notice.includes("could not") ? "warning" : "success"} title="Plan updated">
            {notice}
          </Alert>
        </div>
      ) : null}
      {error ? (
        <div className="mb-16">
          <Alert tone="danger">{error}</Alert>
        </div>
      ) : null}

      <div className="mb-16">
        <Card>
          <div className="flex-between">
            <strong>This week: {weekEntries.length} entries · {weekHours}h planned</strong>
          </div>
        </Card>
      </div>

      <WeeklyCalendar isPM={isPM} />
    </div>
  );
}