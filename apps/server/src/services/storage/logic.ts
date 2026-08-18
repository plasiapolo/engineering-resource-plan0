import type { DateString, Role, TaskStatus } from "../../domain/types";

export const SKILL_SPECIALISTS: Record<string, string[]> = {
  A: ["A1", "A2"],
  B: ["B1"],
  E: ["E1"],
  C: ["C1"],
  S: ["S1", "S2", "S3"],
  P: ["P1", "P2", "P3"],
};

export interface RowTask {
  id: string;
}

export interface GeneratedDependency {
  predecessorTaskId: string;
  successorTaskId: string;
}

/**
 * A pyramid row maps to a dependency level. Every task in a lower row is a
 * predecessor of every task in the row directly above it.
 */
export function buildDependenciesFromRows(rows: RowTask[][]): GeneratedDependency[] {
  const dependencies: GeneratedDependency[] = [];
  for (let r = 0; r < rows.length - 1; r += 1) {
    for (const successor of rows[r + 1]) {
      for (const predecessor of rows[r]) {
        dependencies.push({ predecessorTaskId: predecessor.id, successorTaskId: successor.id });
      }
    }
  }
  return dependencies;
}

export function uniqueNumbersForTasks(rows: RowTask[][], taskIds: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const row of rows) {
    for (const task of row) {
      if (seen.has(task.id)) {
        throw new Error(`Task ${task.id} appears in more than one pyramid row`);
      }
      seen.add(task.id);
      result.push(task.id);
    }
  }
  for (const id of taskIds) {
    if (!seen.has(id)) {
      throw new Error(`Task ${id} is not placed in the pyramid`);
    }
  }
  return result;
}

export function nextTaskNumber(existingNumbers: number[]): string {
  const max = existingNumbers.reduce((m, n) => Math.max(m, n), 0);
  return String(max + 1).padStart(6, "0");
}

export function parseTaskNumber(taskCode: string): number {
  const dot = taskCode.lastIndexOf(".");
  if (dot < 0) return 0;
  return Number(taskCode.slice(dot + 1)) || 0;
}

export function codePartOf(taskCode: string): string {
  const dot = taskCode.lastIndexOf(".");
  return dot >= 0 ? taskCode.slice(0, dot) : taskCode;
}

export function buildTaskCode(
  projectCode: string,
  skill: string,
  assignedSpecialist: string | null,
  rowIndex: number,
  number: string,
): string {
  const skillPart = assignedSpecialist ? `${skill}${assignedSpecialist.replace(skill, "")}` : `${skill}X`;
  return `${projectCode}-${skillPart}-${rowIndex + 1}.${number}`;
}

export function specialistCodeFromLogin(login: string): string {
  return login.toUpperCase();
}

export const ALLOWED_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  NOT_STARTED: ["WORK_IN_PROGRESS"],
  WORK_IN_PROGRESS: ["ON_HOLD", "DONE"],
  ON_HOLD: ["WORK_IN_PROGRESS", "DONE"],
  DONE: ["WORK_IN_PROGRESS", "ON_HOLD"],
};

export interface TransitionCheck {
  allowed: boolean;
  reason?: string;
}

export function checkStatusTransition(
  from: TaskStatus,
  to: TaskStatus,
  role: Role,
): TransitionCheck {
  if (from === to) return { allowed: true };
  const allowed = ALLOWED_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    return {
      allowed: false,
      reason: `Cannot change task status from ${from} to ${to}.`,
    };
  }
  if (from === "DONE" && role !== "PROJECT_MANAGER") {
    return {
      allowed: false,
      reason: "Only the project manager may reopen a done task.",
    };
  }
  return { allowed: true };
}

export interface AssignmentDraft {
  taskId: string;
  userId: string;
  date: DateString;
  hours: number;
}

/**
 * Merges incoming assignments with existing plan entries so that each
 * (task, user, date) combination is represented by a single entry.
 */
export function mergeAssignments(
  existing: Array<{ taskId: string; userId: string; date: DateString; hours: number }>,
  incoming: AssignmentDraft[],
): Array<{ taskId: string; userId: string; date: DateString; hours: number; create: boolean }> {
  const existingByKey = new Map(existing.map((e) => [`${e.taskId}|${e.userId}|${e.date}`, e]));
  const result: Array<{ taskId: string; userId: string; date: DateString; hours: number; create: boolean }> = [];
  for (const item of incoming) {
    if (item.hours <= 0) continue;
    const key = `${item.taskId}|${item.userId}|${item.date}`;
    if (existingByKey.has(key)) {
      result.push({ ...item, create: false });
    } else {
      result.push({ ...item, create: true });
    }
  }
  return result;
}