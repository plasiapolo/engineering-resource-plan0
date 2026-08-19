import type { ApiPlanEntry, ApiTask } from "../domain/types";

export function scheduledHoursByProject(tasks: ApiTask[], planEntries: ApiPlanEntry[]): Map<string, number> {
  const taskProject = new Map<string, string>();
  for (const t of tasks) taskProject.set(t.id, t.projectId);
  const byProject = new Map<string, number>();
  for (const e of planEntries) {
    const projectId = taskProject.get(e.taskId);
    if (!projectId) continue;
    byProject.set(projectId, (byProject.get(projectId) ?? 0) + e.hours);
  }
  return byProject;
}