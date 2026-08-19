import { useState } from "react";
import type { DateString } from "../../domain/types";
import { Button } from "../ui/Button";
import { Input, Field } from "../ui/Input";
import { Alert } from "../ui/Alert";
import { Modal } from "../ui/Modal";
import { useAppState } from "../../store/AppStateContext";
import { addDays, formatDDMMYYYY, parseDDMMYYYY, toDateString } from "../../utils/date";

export function ProjectFormModal({
  open,
  onClose,
  project,
}: {
  open: boolean;
  onClose: () => void;
  project: { id: string; name: string; deadline: DateString; budgetHours: number } | null;
}) {
  const { createProject, updateProject } = useAppState();
  const [name, setName] = useState(project?.name ?? "");
  const [deadline, setDeadline] = useState(
    project?.deadline ? formatDDMMYYYY(project.deadline) : formatDDMMYYYY(toDateString(addDays(new Date(), 90))),
  );
  const [budgetHours, setBudgetHours] = useState(String(project?.budgetHours ?? 200));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseDDMMYYYY(deadline);
    if (!parsed) {
      setError("Deadline must be in dd/mm/yyyy format.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (project) {
        await updateProject(project.id, {
          name,
          deadline: parsed,
          budgetHours: Number(budgetHours),
        });
      } else {
        await createProject({ name, deadline: parsed, budgetHours: Number(budgetHours) });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={project ? "Edit project" : "New project"}>
      <form onSubmit={(e) => void submit(e)}>
        <Field label="Project name">
          <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Z4 Refinery Upgrade" />
        </Field>
        <div className="form-row">
          <div className="flex-1">
            <Field label="Deadline (dd/mm/yyyy)">
              <Input value={deadline} onChange={(e) => setDeadline(e.target.value)} placeholder="dd/mm/yyyy" required />
            </Field>
          </div>
          <div className="flex-1">
            <Field label="Budget (hours)">
              <Input
                type="number"
                min={1}
                value={budgetHours}
                onChange={(e) => setBudgetHours(e.target.value)}
                required
              />
            </Field>
          </div>
        </div>
        <p className="muted" style={{ fontSize: 12 }}>
          The planner targets finishing the project one working day before the deadline.
        </p>
        {error ? (
          <div className="mt-8">
            <Alert tone="danger">{error}</Alert>
          </div>
        ) : null}
        <div className="mt-16 flex">
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : project ? "Save changes" : "Create project"}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}