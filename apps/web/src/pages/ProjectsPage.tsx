import { useState } from "react";
import { useAppState } from "../store/AppStateContext";
import { Card } from "../components/ui/Card";
import { Table } from "../components/ui/Table";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { ConfirmDialog, EmptyState } from "../components/ui/Extras";
import { ProjectFormModal } from "../components/projects/ProjectFormModal";
import { formatDateShort } from "../utils/date";
import styles from "./pages.module.css";

export function ProjectsPage() {
  const { data, deleteProject, setView } = useAppState();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<{ id: string; name: string; deadline: string; budgetHours: number } | null>(null);
  const [deleting, setDeleting] = useState<{ id: string; name: string } | null>(null);

  if (!data) return null;

  return (
    <div>
      <div className={styles.toolbar}>
        <p className="page-subtitle" style={{ margin: 0 }}>
          Projects with hard deadlines and hourly budgets.
        </p>
        <div className={styles.toolbarActions}>
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            + New project
          </Button>
        </div>
      </div>

      <Card pad={false}>
        <Table
          rows={data.projects}
          rowKey={(p) => p.id}
          empty={<EmptyState title="No projects yet" hint="Create your first project to start planning." />}
          columns={[
            { key: "code", header: "Code", render: (p) => <span className={styles.taskCode}>{p.code}</span> },
            { key: "name", header: "Name", render: (p) => <strong>{p.name}</strong> },
            { key: "deadline", header: "Deadline", render: (p) => formatDateShort(p.deadline) },
            { key: "budget", header: "Budget", render: (p) => `${p.totalEstimatedHours}h / ${p.budgetHours}h` },
            {
              key: "tasks",
              header: "Tasks",
              render: (p) => (
                <Badge tone={p.doneTasksCount === p.tasksCount && p.tasksCount > 0 ? "green" : "neutral"}>
                  {p.doneTasksCount}/{p.tasksCount} done
                </Badge>
              ),
            },
            {
              key: "actions",
              header: "",
              render: (p) => (
                <div className="flex">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setView("tasks")}
                    title="Open tasks of this project"
                  >
                    Tasks
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditing({ id: p.id, name: p.name, deadline: p.deadline, budgetHours: p.budgetHours });
                      setFormOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button size="sm" variant="ghost" className="text-danger" onClick={() => setDeleting({ id: p.id, name: p.name })}>
                    Delete
                  </Button>
                </div>
              ),
            },
          ]}
        />
      </Card>

      <ProjectFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        project={editing}
      />

      <ConfirmDialog
        open={deleting !== null}
        title="Delete project"
        message={`Delete "${deleting?.name}"? Tasks, dependencies, plan entries and conflicts will be soft-deleted. The plan history remains available in Versions.`}
        confirmLabel="Delete project"
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting) await deleteProject(deleting.id);
          setDeleting(null);
        }}
      />
    </div>
  );
}