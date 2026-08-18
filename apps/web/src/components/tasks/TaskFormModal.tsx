import { useState } from "react";
import type { DateString, SkillType } from "../../domain/types";
import { SKILL_LABELS } from "../../domain/constants";
import { Button } from "../ui/Button";
import { Input, Field, Select } from "../ui/Input";
import { Alert } from "../ui/Alert";
import { Modal } from "../ui/Modal";
import { useAppState } from "../../store/AppStateContext";

export function TaskFormModal({
  open,
  onClose,
  projectId,
  task,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
  task: { id: string; estimatedHours: number; taskDeadline: DateString | null; requiredSkill: SkillType; projectId: string } | null;
}) {
  const { data, createTask, updateTask } = useAppState();
  const [selectedProject, setSelectedProject] = useState(projectId ?? data?.projects[0]?.id ?? "");
  const [requiredSkill, setRequiredSkill] = useState<SkillType>(task?.requiredSkill ?? "A");
  const [estimatedHours, setEstimatedHours] = useState(String(task?.estimatedHours ?? 40));
  const [taskDeadline, setTaskDeadline] = useState<DateString>(task?.taskDeadline ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (task) {
        await updateTask(task.id, {
          estimatedHours: Number(estimatedHours),
          requiredSkill,
          taskDeadline: taskDeadline || null,
        });
      } else {
        if (!selectedProject) {
          throw new Error("Select a project first.");
        }
        await createTask({
          projectId: selectedProject,
          requiredSkill,
          estimatedHours: Number(estimatedHours),
          taskDeadline: taskDeadline || null,
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={task ? "Edit task" : "New task"}>
      <form onSubmit={(e) => void submit(e)}>
        {!task ? (
          <Field label="Project">
            <Select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)} required>
              {(data?.projects ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} — {p.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
        <Field label="Required skill (competence)">
          <Select value={requiredSkill} onChange={(e) => setRequiredSkill(e.target.value as SkillType)}>
            {Object.entries(SKILL_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <div className="form-row">
          <div className="flex-1">
            <Field label="Estimated hours">
              <Input type="number" min={1} value={estimatedHours} onChange={(e) => setEstimatedHours(e.target.value)} required />
            </Field>
          </div>
          <div className="flex-1">
            <Field label="Task deadline (informational)" hint="Used for conflict checks only.">
              <Input type="date" value={taskDeadline} onChange={(e) => setTaskDeadline(e.target.value)} />
            </Field>
          </div>
        </div>
        {error ? (
          <div className="mt-8">
            <Alert tone="danger">{error}</Alert>
          </div>
        ) : null}
        <div className="mt-16 flex">
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : task ? "Save changes" : "Create task"}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}