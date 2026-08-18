import type { DateString } from "../../domain/types";

export interface SnapshotPlanEntry {
  taskId: string;
  taskCode: string;
  userId: string;
  userName: string;
  date: DateString;
  hours: number;
  locked: boolean;
}

export interface SnapshotConflict {
  type: string;
  title: string;
  description: string;
  severity: string;
  projectId: string | null;
  taskId: string | null;
  employeeId: string | null;
}

export interface SnapshotContent {
  planEntries: SnapshotPlanEntry[];
  conflicts: SnapshotConflict[];
}

export function buildSnapshotContent(
  planEntries: SnapshotPlanEntry[],
  conflicts: SnapshotConflict[],
): SnapshotContent {
  return {
    planEntries: [...planEntries].sort((a, b) =>
      a.date === b.date ? a.taskCode.localeCompare(b.taskCode) : a.date < b.date ? -1 : 1,
    ),
    conflicts: [...conflicts].sort((a, b) => (a.title === b.title ? 0 : a.title < b.title ? -1 : 1)),
  };
}

export function snapshotEquals(a: SnapshotContent, b: SnapshotContent): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function snapshotDateKey(dateStr: DateString): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}