import type { DateString, PlannerEntryDraft, PlannerFailure } from "../../domain/types";
import type { TaskStatus } from "../../domain/types";
import {
  DEFAULT_WORKING_HOURS,
  compareDates,
  isWorkingDay,
  lastWorkingDayBefore,
  maxDate,
  nextWorkingDayAfter,
} from "../calendar/polishCalendar";

export interface PlannerTask {
  id: string;
  projectId: string;
  requiredSkill: string;
  remainingHours: number;
  status: TaskStatus;
  rowIndex: number;
}

export interface PlannerProject {
  id: string;
  deadline: DateString;
  budgetHours: number;
}

export interface PlannerUser {
  id: string;
  skill: string;
}

export interface PlannerDependency {
  predecessorTaskId: string;
  successorTaskId: string;
}

export interface PlannerEntryLike extends PlannerEntryDraft {}

export interface PlannerInput {
  projects: PlannerProject[];
  tasks: PlannerTask[];
  dependencies: PlannerDependency[];
  users: PlannerUser[];
  availability: Record<string, Record<DateString, number>>;
  lockedEntries: PlannerEntryLike[];
  startDate: DateString;
}

export interface PlannerResult {
  entries: PlannerEntryLike[];
  failures: PlannerFailure[];
}

export function isSchedulableStatus(status: TaskStatus): boolean {
  return status === "NOT_STARTED" || status === "WORK_IN_PROGRESS";
}

/**
 * Greedy scheduling engine.
 *
 * Rules implemented:
 * - Projects are planned in order of earlier deadline, then larger budget.
 * - Within a project tasks are planned bottom-up by pyramid row; a row can only
 *   start after every task of the lower rows has been fully scheduled.
 * - Tasks in the same row are planned in parallel (no dependencies between them).
 * - Only working days (weekdays excluding Polish holidays) are used.
 * - A task is split across all eligible specialists proportionally to their daily
 *   free capacity. Each specialist's daily load never exceeds their availability.
 * - Scheduling is strictly forward from `startDate` and must finish by the last
 *   working day strictly before the project deadline.
 * - Locked (manual) entries are never modified and consume capacity.
 */
export function generatePlan(input: PlannerInput): PlannerResult {
  const { projects, tasks, users, availability, lockedEntries, startDate } = input;

  const byUserDay = new Map<string, Map<string, number>>();
  const placed: PlannerEntryLike[] = [];
  const failures: PlannerFailure[] = [];

  const capacity = (userId: string, date: DateString): number => {
    const base = availability[userId]?.[date] ?? DEFAULT_WORKING_HOURS;
    const used = byUserDay.get(userId)?.get(date) ?? 0;
    return Math.max(0, base - used);
  };

  const place = (entry: PlannerEntryLike): void => {
    placed.push(entry);
    let dayMap = byUserDay.get(entry.userId);
    if (!dayMap) {
      dayMap = new Map();
      byUserDay.set(entry.userId, dayMap);
    }
    dayMap.set(entry.date, (dayMap.get(entry.date) ?? 0) + entry.hours);
  };

  for (const locked of lockedEntries) {
    place(locked);
  }

  const schedulable = tasks.filter((t) => isSchedulableStatus(t.status) && t.remainingHours > 0);

  const byProject = new Map<string, PlannerTask[]>();
  for (const task of schedulable) {
    const list = byProject.get(task.projectId) ?? [];
    list.push(task);
    byProject.set(task.projectId, list);
  }

  const orderedProjects = [...projects]
    .filter((p) => (byProject.get(p.id) ?? []).length > 0)
    .sort((a, b) => {
      const byDeadline = compareDates(a.deadline, b.deadline);
      if (byDeadline !== 0) return byDeadline;
      return b.budgetHours - a.budgetHours;
    });

  for (const project of orderedProjects) {
    const projectTasks = (byProject.get(project.id) ?? []).sort((a, b) => {
      if (a.rowIndex !== b.rowIndex) return a.rowIndex - b.rowIndex;
      return b.remainingHours - a.remainingHours;
    });

    const horizon = lastWorkingDayBefore(project.deadline);
    let currentRow = -1;
    let lowerRowsEnd: DateString | null = null;
    let cursor = startDate;

    for (const task of projectTasks) {
      if (task.rowIndex !== currentRow) {
        currentRow = task.rowIndex;
        cursor = lowerRowsEnd ? nextWorkingDayAfter(lowerRowsEnd) : startDate;
        if (compareDates(cursor, startDate) < 0) cursor = startDate;
      }

      const endDate = scheduleTask(task, cursor, horizon);
      if (endDate) {
        lowerRowsEnd = lowerRowsEnd ? maxDate(lowerRowsEnd, endDate) : endDate;
      }
    }
  }

  function scheduleTask(
    task: PlannerTask,
    cursor: DateString,
    horizon: DateString,
  ): DateString | null {
    const eligible = users.filter((u) => u.skill === task.requiredSkill);
    let remaining = task.remainingHours;
    let day = cursor;
    let endDate: DateString | null = null;
    let guard = 0;

    while (remaining > 0 && guard < 800) {
      if (compareDates(day, horizon) > 0) break;
      if (!isWorkingDay(day)) {
        day = nextWorkingDayAfter(day);
        guard += 1;
        continue;
      }
      let placedToday = false;
      for (const user of eligible) {
        if (remaining <= 0) break;
        const free = capacity(user.id, day);
        if (free > 0) {
          const hours = Math.min(free, remaining);
          place({ taskId: task.id, userId: user.id, date: day, hours, locked: false });
          remaining -= hours;
          endDate = day;
          placedToday = true;
        }
      }
      if (remaining > 0) {
        if (!placedToday) {
          const someCapacityInFuture = hasFutureCapacity(eligible, nextWorkingDayAfter(day), horizon);
          if (!someCapacityInFuture) break;
        }
        day = nextWorkingDayAfter(day);
      }
      guard += 1;
    }

    if (remaining > 0) {
      const reason = !eligible.length
        ? `No specialist has skill ${task.requiredSkill}`
        : `Not enough available capacity for skill ${task.requiredSkill} before project deadline`;
      failures.push({ taskId: task.id, reason });
      return null;
    }
    return endDate;
  }

  function hasFutureCapacity(eligible: PlannerUser[], from: DateString, horizon: DateString): boolean {
    let d = from;
    let guard = 0;
    while (compareDates(d, horizon) <= 0 && guard < 800) {
      if (isWorkingDay(d)) {
        for (const user of eligible) {
          if (capacity(user.id, d) > 0) return true;
        }
      }
      d = nextWorkingDayAfter(d);
      guard += 1;
    }
    return false;
  }

  return { entries: placed, failures };
}