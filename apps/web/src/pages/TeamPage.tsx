import { useState } from "react";
import { useAppState } from "../store/AppStateContext";
import type { ApiTeamMember } from "../domain/types";
import { Card } from "../components/ui/Card";
import { Table } from "../components/ui/Table";
import { Badge } from "../components/ui/Badge";
import { EmptyState } from "../components/ui/Extras";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";
import { SpecialistFormModal } from "../components/team/SpecialistFormModal";

export function TeamPage() {
  const { data, user, deleteSpecialist } = useAppState();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ApiTeamMember | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  if (!data) return null;

  const members = [...data.team].sort((a, b) =>
    a.role === "PROJECT_MANAGER" ? -1 : b.role === "PROJECT_MANAGER" ? 1 : 0,
  );

  return (
    <div>
      <div className="flex" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <p className="page-subtitle">
          Engineering team with competencies. Each specialist has a daily availability of 8h by default.
        </p>
        {user?.role === "PROJECT_MANAGER" ? (
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            Add specialist
          </Button>
        ) : null}
      </div>
      {deleteError ? <Alert tone="danger">{deleteError}</Alert> : null}
      <Card pad={false}>
        <Table
          rows={members}
          rowKey={(m) => m.id}
          empty={<EmptyState title="No team members" />}
          columns={[
            { key: "name", header: "Name", render: (m) => <strong>{m.displayName}</strong> },
            { key: "login", header: "Login", render: (m) => <span className="mono">{m.login}</span> },
            {
              key: "role",
              header: "Role",
              render: (m) =>
                m.role === "PROJECT_MANAGER" ? <Badge tone="blue">Project Manager</Badge> : <Badge tone="neutral">Specialist</Badge>,
            },
            { key: "skill", header: "Competence", render: (m) => (m.skill ? <Badge tone="blue">{m.skill}</Badge> : <span className="muted">—</span>) },
            { key: "planned", header: "Planned hours", render: (m) => `${m.plannedHours}h` },
            { key: "avail3mo", header: "Available hours (3 months)", render: (m) => `${m.availableHoursNext3Months}h` },
            ...(user?.role === "PROJECT_MANAGER"
              ? [
                  {
                    key: "actions",
                    header: "Actions",
                    render: (m: ApiTeamMember) =>
                      m.role === "SPECIALIST" ? (
                        <div className="flex">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setEditing(m);
                              setFormOpen(true);
                            }}
                          >
                            Modify
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => {
                              if (!window.confirm(`Delete specialist ${m.displayName} (${m.login})?`)) return;
                              setDeleteError(null);
                              void deleteSpecialist(m.id).catch((err) =>
                                setDeleteError(err instanceof Error ? err.message : "Delete failed"),
                              );
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      ) : null,
                  },
                ]
              : []),
          ]}
        />
      </Card>
      <SpecialistFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        specialist={editing}
      />
    </div>
  );
}
