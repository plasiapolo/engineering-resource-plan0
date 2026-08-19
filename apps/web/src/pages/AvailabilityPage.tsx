import { useMemo, useState } from "react";
import { useAppState } from "../store/AppStateContext";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { Input, Field } from "../components/ui/Input";
import { Alert } from "../components/ui/Alert";
import { Badge } from "../components/ui/Badge";
import { addDays, isWorkingDay, parseDateString, startOfWeek, toDateString, weekDates, warsawToday } from "../utils/date";
import { DEFAULT_WORKING_HOURS } from "../domain/constants";
import styles from "./pages.module.css";

interface CellEditor {
  userId: string;
  userName: string;
  date: string;
  currentHours: number;
}

export function AvailabilityPage() {
  const { data, user, selectedWeekStart, setSelectedWeekStart, upsertAvailability, deleteAvailability } = useAppState();
  const [editor, setEditor] = useState<CellEditor | null>(null);
  const [hoursInput, setHoursInput] = useState("8");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const specialists = useMemo(
    () => (data?.team ?? []).filter((m) => m.role === "SPECIALIST"),
    [data],
  );
  const availability = data?.availability ?? [];

  if (!data) return null;

  const weekStart = startOfWeek(parseDateString(selectedWeekStart));
  const days = weekDates(weekStart);
  const today = warsawToday();
  const canEdit = (userId: string) => (user?.role === "PROJECT_MANAGER" ? true : user?.id === userId);

  const hoursFor = (userId: string, date: string): number => {
    const record = availability.find((a) => a.userId === userId && a.date === date);
    return record ? record.availableHours : DEFAULT_WORKING_HOURS;
  };

  const plannedFor = (userId: string, date: string): number => {
    return (data.planEntries ?? []).filter((e) => e.userId === userId && e.date === date).reduce((s, e) => s + e.hours, 0);
  };

  const openEditor = (member: { id: string; displayName: string }, date: string) => {
    setHoursInput(String(hoursFor(member.id, date)));
    setEditor({ userId: member.id, userName: member.displayName, date, currentHours: hoursFor(member.id, date) });
    setError(null);
  };

  const saveHours = async () => {
    if (!editor) return;
    setBusy(true);
    setError(null);
    try {
      const hours = Number(hoursInput);
      if (hours === DEFAULT_WORKING_HOURS) {
        await deleteAvailability(editor.userId, editor.date);
      } else {
        await upsertAvailability(editor.userId, editor.date, editor.date, hours);
      }
      setEditor(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const prevWeek = () => setSelectedWeekStart(toDateString(addDays(weekStart, -7)));
  const nextWeek = () => setSelectedWeekStart(toDateString(addDays(weekStart, 7)));
  const thisWeek = () => setSelectedWeekStart(today);

  return (
    <div>
      <div className={styles.weekNav}>
        <Button variant="secondary" size="sm" onClick={prevWeek}>
          ‹
        </Button>
        <strong>
          {weekStart.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} —{" "}
          {addDays(weekStart, 6).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
        </strong>
        <Button variant="secondary" size="sm" onClick={nextWeek}>
          ›
        </Button>
        <Button variant="ghost" size="sm" onClick={thisWeek}>
          This week
        </Button>
        <span className="muted" style={{ fontSize: 12 }}>
          {user?.role === "PROJECT_MANAGER" ? "Click a day to set availability for a specialist." : "Click a day to set your availability."}
        </span>
      </div>

      <Card pad={false}>
        <div className={styles.calendarScroll}>
          <div className={styles.calendar}>
            <div className={styles.calendarHeader}>
            <div className={styles.calendarCorner} />
            {days.map((day) => {
              const working = isWorkingDay(day);
              const isToday = toDateString(day) === today;
              return (
                <div key={toDateString(day)} className={`${styles.calendarHeaderCell} ${isToday ? styles.calendarHeaderCellToday : ""}`}>
                  {day.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" })}
                  {!working ? <div style={{ fontSize: 10, color: "var(--color-text-muted)" }}>non-working</div> : null}
                </div>
              );
            })}

            {specialists.map((member) => (
              <AvailabilityRow
                key={member.id}
                member={member}
                days={days}
                today={today}
                hoursFor={hoursFor}
                plannedFor={plannedFor}
                editable={canEdit(member.id)}
                onEdit={(date) => openEditor(member, date)}
              />
            ))}
            </div>
          </div>
        </div>
      </Card>

      <Modal open={editor !== null} onClose={() => setEditor(null)} title={`Availability — ${editor?.userName}`}>
        {editor ? (
          <div>
            <p className="muted">
              {editor.date} · current: {editor.currentHours}h
            </p>
            <Field label="Available hours (0 = not available, 8 = full day)" hint="Missing records mean 8h by default.">
              <Input
                type="number"
                min={0}
                max={8}
                value={hoursInput}
                onChange={(e) => setHoursInput(e.target.value)}
              />
            </Field>
            {error ? (
              <div className="mt-8">
                <Alert tone="danger">{error}</Alert>
              </div>
            ) : null}
            <div className="mt-16 flex">
              <Button onClick={() => void saveHours()} disabled={busy}>
                {busy ? "Saving…" : "Save"}
              </Button>
              <Button variant="ghost" onClick={() => setEditor(null)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function AvailabilityRow({
  member,
  days,
  today,
  hoursFor,
  plannedFor,
  editable,
  onEdit,
}: {
  member: { id: string; displayName: string; skill: string | null };
  days: Date[];
  today: string;
  hoursFor: (userId: string, date: string) => number;
  plannedFor: (userId: string, date: string) => number;
  editable: boolean;
  onEdit: (date: string) => void;
}) {
  return (
    <>
      <div className={styles.calendarUser}>
        <strong>{member.displayName}</strong>
        <span className={styles.calendarUserSkill}>skill {member.skill ?? "—"}</span>
      </div>
      {days.map((day) => {
        const date = toDateString(day);
        const working = isWorkingDay(day);
        const hours = hoursFor(member.id, date);
        const planned = plannedFor(member.id, date);
        const unavailable = hours === 0;
        const isToday = date === today;
        return (
<div
        key={date}
        className={`${styles.calendarCell} ${working ? styles.calendarCellWorking : styles.calendarCellNonWorking} ${
          unavailable ? styles.calendarCellUnavailable : ""
        } ${isToday ? styles.calendarCellToday : ""}`}
        onClick={() => working && editable && onEdit(date)}
        style={editable && working ? { cursor: "pointer" } : undefined}
        title={working ? (unavailable ? "Not available" : `${hours}h available`) : undefined}
      >
        {working ? (
          <div className={styles.calendarCellLabel}>
            <span className={unavailable ? styles.availBadgeZero : styles.availBadge}>
              {unavailable ? "not available" : `${hours}h`}
            </span>
            {planned > 0 ? <Badge tone={planned > hours ? "red" : "neutral"}>{planned}h planned</Badge> : null}
          </div>
        ) : null}
      </div>
        );
      })}
    </>
  );
}