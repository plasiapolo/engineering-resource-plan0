import { useAppState } from "../store/AppStateContext";
import { Card } from "../components/ui/Card";
import { Table } from "../components/ui/Table";
import { Badge } from "../components/ui/Badge";
import { EmptyState } from "../components/ui/Extras";

export function TeamPage() {
  const { data } = useAppState();
  if (!data) return null;

  const members = [...data.team].sort((a, b) =>
    a.role === "PROJECT_MANAGER" ? -1 : b.role === "PROJECT_MANAGER" ? 1 : 0,
  );

  return (
    <div>
      <p className="page-subtitle">
        Engineering team with competencies. Each specialist has a daily availability of 8h by default.
      </p>
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
          ]}
        />
      </Card>
    </div>
  );
}