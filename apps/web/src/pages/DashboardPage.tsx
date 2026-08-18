import { useAppState } from "../store/AppStateContext";
import { Card, CardHeader } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { StatCard } from "../components/ui/Extras";
import { Table } from "../components/ui/Table";
import { Button } from "../components/ui/Button";
import { CONFLICT_SEVERITY_LABELS, CONFLICT_TYPE_LABELS } from "../domain/constants";
import { formatDateShort } from "../utils/date";
import styles from "./pages.module.css";

export function DashboardPage() {
  const { data, setView, generatePlan } = useAppState();
  if (!data) return null;

  const runGenerate = async () => {
    try {
      await generatePlan();
    } finally {
      setView("planner");
    }
  };

  const totalProjects = data.projects.length;
  const openTasks = data.tasks.filter((t) => t.status !== "DONE").length;
  const doneTasks = data.tasks.filter((t) => t.status === "DONE").length;
  const activeConflicts = data.conflicts.filter((c) => c.severity === "ERROR" || c.severity === "CRITICAL").length;
  const plannedHours = data.planEntries.reduce((sum, e) => sum + e.hours, 0);
  const teamLoad = data.team.filter((m) => m.role === "SPECIALIST");

  const criticalConflicts = data.conflicts.slice(0, 6);

  return (
    <div>
      <div className={styles.statGrid}>
        <StatCard label="Projects" value={totalProjects} tone="blue" />
        <StatCard label="Open tasks" value={openTasks} />
        <StatCard label="Done tasks" value={doneTasks} tone="green" />
        <StatCard label="Planned hours" value={plannedHours} />
        <StatCard label="Critical conflicts" value={activeConflicts} tone={activeConflicts > 0 ? "red" : "green"} />
      </div>

      <div className="flex mb-16">
        <Button variant="accent" onClick={() => void runGenerate()}>
          Create automatic task plan for employees
        </Button>
        <Button variant="secondary" onClick={() => setView("projects")}>
          Manage projects
        </Button>
      </div>

      <div className={styles.pageGrid}>
        <Card>
          <CardHeader
            title="Projects overview"
            actions={
              <Button size="sm" variant="ghost" onClick={() => setView("projects")}>
                View all
              </Button>
            }
          />
          <div className="mt-8">
            <Table
              rows={data.projects}
              rowKey={(p) => p.id}
              columns={[
                { key: "code", header: "Code", render: (p) => <span className={styles.taskCode}>{p.code}</span> },
                { key: "name", header: "Name", render: (p) => p.name },
                { key: "deadline", header: "Deadline", render: (p) => formatDateShort(p.deadline) },
                {
                  key: "tasks",
                  header: "Tasks",
                  render: (p) => (
                    <Badge tone="neutral">
                      {p.doneTasksCount}/{p.tasksCount} done
                    </Badge>
                  ),
                },
                {
                  key: "budget",
                  header: "Budget",
                  render: (p) => `${p.totalEstimatedHours}h / ${p.budgetHours}h`,
                },
              ]}
            />
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Latest conflicts"
            actions={
              <Button size="sm" variant="ghost" onClick={() => setView("conflicts")}>
                All conflicts
              </Button>
            }
          />
          <div className="mt-8">
            {criticalConflicts.length === 0 ? (
              <p className="muted">No conflicts to display.</p>
            ) : (
              <ul className={styles.conflictList}>
                {criticalConflicts.map((c) => (
                  <li key={c.id}>
                    <div className="flex">
                      <Badge tone={c.severity === "CRITICAL" ? "red" : c.severity === "ERROR" ? "red" : "orange"}>
                        {CONFLICT_SEVERITY_LABELS[c.severity]}
                      </Badge>
                      <span>
                        <strong>{CONFLICT_TYPE_LABELS[c.type] ?? c.type}</strong> — {c.title}
                      </span>
                    </div>
                    <p className="muted mt-8">{c.description}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>

      <div className="section">
        <Card>
          <CardHeader title="Team load" subtitle="Scheduled vs available hours for specialists" />
          <div className="mt-8">
            <Table
              rows={teamLoad}
              rowKey={(m) => m.id}
              columns={[
                { key: "name", header: "Specialist", render: (m) => m.displayName },
                { key: "skill", header: "Skill", render: (m) => <Badge tone="blue">{m.skill ?? "—"}</Badge> },
                { key: "planned", header: "Planned", render: (m) => `${m.plannedHours}h` },
                { key: "avail", header: "Availability", render: (m) => `${m.availableHours}h / day` },
              ]}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}