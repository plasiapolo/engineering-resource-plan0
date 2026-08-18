import { useAppState } from "../store/AppStateContext";
import { Card, CardHeader } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { StatCard } from "../components/ui/Extras";
import { Table } from "../components/ui/Table";
import { Button } from "../components/ui/Button";
import { ALLOWED_TRANSITIONS, TASK_STATUS_LABELS } from "../domain/constants";
import styles from "./pages.module.css";

export function SpecialistDashboardPage() {
  const { user, data, updateTaskStatus, setView } = useAppState();
  if (!user || !data) return null;

  const myTasks = data.tasks.filter((t) => t.assignedUserIds.includes(user.id));
  const inProgress = myTasks.filter((t) => t.status === "WORK_IN_PROGRESS");
  const done = myTasks.filter((t) => t.status === "DONE");
  const onHold = myTasks.filter((t) => t.status === "ON_HOLD");
  const myHours = data.planEntries.filter((e) => e.userId === user.id).reduce((s, e) => s + e.hours, 0);
  const myConflicts = data.conflicts.filter((c) => c.employeeId === user.id);

  const statusTone = (status: string) =>
    status === "DONE" ? "green" : status === "ON_HOLD" ? "orange" : status === "WORK_IN_PROGRESS" ? "blue" : "neutral";

  return (
    <div>
      <div className={styles.statGrid}>
        <StatCard label="Assigned tasks" value={myTasks.length} tone="blue" />
        <StatCard label="In progress" value={inProgress.length} />
        <StatCard label="Done" value={done.length} tone="green" />
        <StatCard label="On hold" value={onHold.length} tone="orange" />
        <StatCard label="My planned hours" value={myHours} />
      </div>

      {myConflicts.length > 0 ? (
        <div className="mb-16">
          <Card>
            <CardHeader title="Conflicts involving you" />
            <ul className="mt-8">
              {myConflicts.map((c) => (
                <li key={c.id} className="mb-16">
                  <Badge tone="orange">{TASK_STATUS_LABELS[c.type as keyof typeof TASK_STATUS_LABELS] ?? "Conflict"}</Badge>{" "}
                  <strong>{c.title}</strong>
                  <p className="muted mt-8">{c.description}</p>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      ) : null}

      <div className="section">
        <Card>
          <CardHeader
            title="My tasks"
            subtitle="You can update the status of your assigned tasks."
            actions={
              <Button size="sm" variant="secondary" onClick={() => setView("myTasks")}>
                Open My Tasks
              </Button>
            }
          />
          <div className="mt-8">
            <Table
              rows={myTasks}
              rowKey={(t) => t.id}
              columns={[
                { key: "code", header: "Task code", render: (t) => <span className={styles.taskCode}>{t.codePart}</span> },
                { key: "name", header: "Project", render: (t) => t.projectName },
                { key: "hours", header: "Remaining", render: (t) => `${t.remainingHours}h` },
                { key: "status", header: "Status", render: (t) => <Badge tone={statusTone(t.status)}>{TASK_STATUS_LABELS[t.status]}</Badge> },
                {
                  key: "actions",
                  header: "Update",
                  render: (t) => (
                    <div className="flex">
                      {ALLOWED_TRANSITIONS[t.status].map((next) => (
                        <Button
                          key={next}
                          size="sm"
                          variant="ghost"
                          onClick={() => void updateTaskStatus(t.id, next)}
                        >
                          {TASK_STATUS_LABELS[next]}
                        </Button>
                      ))}
                    </div>
                  ),
                },
              ]}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}