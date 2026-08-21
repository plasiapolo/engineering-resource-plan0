import { useEffect, useState } from "react";
import type { ApiTeamMember, SkillType } from "../../domain/types";
import { useAppState } from "../../store/AppStateContext";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { Field, Input, Select } from "../ui/Input";
import { Modal } from "../ui/Modal";

const SKILLS: SkillType[] = ["A", "B", "C", "E", "P", "S"];

export function SpecialistFormModal({
  open,
  onClose,
  specialist,
}: {
  open: boolean;
  onClose: () => void;
  specialist: ApiTeamMember | null;
}) {
  const { createSpecialist, updateSpecialist } = useAppState();
  const [displayName, setDisplayName] = useState("");
  const [skill, setSkill] = useState<SkillType>("A");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDisplayName(specialist?.displayName ?? "");
    setSkill(specialist?.skill ?? "A");
    setError(null);
  }, [specialist, open]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (specialist) {
        await updateSpecialist(specialist.id, { displayName, skill });
      } else {
        await createSpecialist({ displayName, skill });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={specialist ? "Modify specialist" : "Add specialist"}>
      <form onSubmit={(event) => void submit(event)}>
        <Field label="Name">
          <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} required autoFocus />
        </Field>
        <Field label="Competence">
          <Select value={skill} onChange={(event) => setSkill(event.target.value as SkillType)}>
            {SKILLS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        </Field>
        <p className="muted" style={{ fontSize: 12 }}>
          {specialist
            ? `Login: ${specialist.login}`
            : "The next available login for this competence will be generated automatically."}
        </p>
        {error ? (
          <div className="mt-8">
            <Alert tone="danger">{error}</Alert>
          </div>
        ) : null}
        <div className="mt-16 flex">
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : specialist ? "Save changes" : "Add specialist"}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
