import { useMemo, useState } from "react";
import { useAppState } from "../store/AppStateContext";
import { Card, CardHeader } from "../components/ui/Card";
import { PyramidEditor } from "../components/dependencies/PyramidEditor";
import { EmptyState } from "../components/ui/Extras";
import type { ApiTask } from "../domain/types";

export function DependenciesPage() {
  const { data, savePyramid } = useAppState();
  const [saving, setSaving] = useState<string | null>(null);

  const projects = data?.projects ?? [];

  const tasksByProject = useMemo(() => {
    const map = new Map<string, ApiTask[]>();
    for (const task of data?.tasks ?? []) {
      const list = map.get(task.projectId) ?? [];
      list.push(task);
      map.set(task.projectId, list);
    }
    return map;
  }, [data]);

  if (!data) return null;

  if (projects.length === 0) {
    return (
      <Card>
        <EmptyState title="No projects" hint="Create a project first, then arrange its tasks in a pyramid." />
      </Card>
    );
  }

  return (
    <div>
      <p className="page-subtitle">
        One pyramid per project. Every task of the project is visible in its pyramid. Drag tasks between rows; the row
        order defines all dependencies and updates the task code automatically.
      </p>

      {projects.map((project) => {
        const projectTasks = tasksByProject.get(project.id) ?? [];
        return (
          <Card key={project.id} className="mb-16">
            <CardHeader
              title={`${project.code} — ${project.name}`}
              subtitle={`${projectTasks.length} task${projectTasks.length === 1 ? "" : "s"}`}
            />
            {projectTasks.length === 0 ? (
              <EmptyState title="No tasks in this project" hint="Add tasks first, then arrange them in the pyramid." />
            ) : (
              <PyramidEditor
                key={project.id}
                tasks={projectTasks}
                saving={saving === project.id}
                onSave={async (rows) => {
                  setSaving(project.id);
                  try {
                    await savePyramid(project.id, rows);
                  } finally {
                    setSaving(null);
                  }
                }}
              />
            )}
          </Card>
        );
      })}

      <div className="mt-16">
        <p className="page-subtitle" style={{ margin: 0 }}>
          Task codes are updated automatically: the row number in the code (e.g. Z1-SX-3) changes when you move a task
          between rows. The trailing task number stays unique and immutable.
        </p>
      </div>
    </div>
  );
}