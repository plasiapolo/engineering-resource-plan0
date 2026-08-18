import { describe, expect, it } from "vitest";
import { generatePlan, isSchedulableStatus } from "../../src/services/planner/planner";
import type { PlannerInput } from "../../src/services/planner/planner";
import { isWeekend } from "../../src/services/calendar/polishCalendar";

const PROJECT = { id: "p1", deadline: "2026-12-31", budgetHours: 1000 };
const USER_A1 = { id: "a1", skill: "A" };
const USER_A2 = { id: "a2", skill: "A" };

function makeInput(overrides: Partial<PlannerInput> = {}): PlannerInput {
  return {
    projects: [PROJECT],
    tasks: [],
    dependencies: [],
    users: [],
    availability: {},
    lockedEntries: [],
    startDate: "2026-09-01",
    ...overrides,
  };
}

describe("isSchedulableStatus", () => {
  it("allows only open statuses", () => {
    expect(isSchedulableStatus("NOT_STARTED")).toBe(true);
    expect(isSchedulableStatus("WORK_IN_PROGRESS")).toBe(true);
    expect(isSchedulableStatus("DONE")).toBe(false);
    expect(isSchedulableStatus("ON_HOLD")).toBe(false);
  });
});

describe("generatePlan", () => {
  it("schedules a simple task across working days", () => {
    const result = generatePlan(
      makeInput({
        tasks: [{ id: "t1", projectId: "p1", requiredSkill: "A", remainingHours: 16, status: "NOT_STARTED", rowIndex: 0 }],
        users: [USER_A1],
        availability: { a1: {} },
      }),
    );
    expect(result.failures).toHaveLength(0);
    expect(result.entries).toHaveLength(2);
    expect(result.entries.map((e) => e.hours)).toEqual([8, 8]);
    expect(result.entries.every((e) => e.userId === "a1")).toBe(true);
    expect(result.entries.every((e) => e.locked === false)).toBe(true);
    expect(result.entries.every((e) => !isWeekend(e.date))).toBe(true);
    // strictly sequential working days
    expect(result.entries[0].date).toBe("2026-09-01");
    expect(result.entries[1].date).toBe("2026-09-02");
  });

  it("splits a task across eligible specialists in parallel", () => {
    const result = generatePlan(
      makeInput({
        tasks: [{ id: "t1", projectId: "p1", requiredSkill: "A", remainingHours: 16, status: "NOT_STARTED", rowIndex: 0 }],
        users: [USER_A1, USER_A2],
        availability: { a1: {}, a2: {} },
      }),
    );
    expect(result.entries).toHaveLength(2);
    expect(result.entries[0].date).toBe(result.entries[1].date);
    expect(result.entries.reduce((s, e) => s + e.hours, 0)).toBe(16);
  });

  it("respects per-day availability limits", () => {
    const result = generatePlan(
      makeInput({
        tasks: [{ id: "t1", projectId: "p1", requiredSkill: "A", remainingHours: 12, status: "NOT_STARTED", rowIndex: 0 }],
        users: [USER_A1],
        availability: { a1: { "2026-09-01": 4 } },
      }),
    );
    expect(result.entries.map((e) => e.hours)).toEqual([4, 8]);
    expect(result.entries[0].date).toBe("2026-09-01");
    expect(result.entries[1].date).toBe("2026-09-02");
  });

  it("never exceeds availability on a single day", () => {
    const result = generatePlan(
      makeInput({
        tasks: [{ id: "t1", projectId: "p1", requiredSkill: "A", remainingHours: 10, status: "NOT_STARTED", rowIndex: 0 }],
        users: [USER_A1, USER_A2],
        availability: { a1: { "2026-09-01": 5 }, a2: { "2026-09-01": 2 } },
      }),
    );
    const dayOne = result.entries.filter((e) => e.date === "2026-09-01");
    expect(dayOne.find((e) => e.userId === "a1")?.hours).toBe(5);
    expect(dayOne.find((e) => e.userId === "a2")?.hours).toBe(2);
  });

  it("locked entries consume capacity and are never modified", () => {
    const locked = { taskId: "t0", userId: "a1", date: "2026-09-01", hours: 6, locked: true };
    const result = generatePlan(
      makeInput({
        tasks: [{ id: "t1", projectId: "p1", requiredSkill: "A", remainingHours: 8, status: "NOT_STARTED", rowIndex: 0 }],
        users: [USER_A1],
        availability: { a1: {} },
        lockedEntries: [locked],
      }),
    );
    expect(result.entries).toContainEqual(locked);
    // 8h task: only 2h free on day 1, rest on day 2
    const day1 = result.entries.find((e) => e.date === "2026-09-01" && e.taskId === "t1");
    expect(day1?.hours).toBe(2);
  });

  it("does not plan tasks that are DONE or ON_HOLD", () => {
    const result = generatePlan(
      makeInput({
        tasks: [
          { id: "t1", projectId: "p1", requiredSkill: "A", remainingHours: 8, status: "DONE", rowIndex: 0 },
          { id: "t2", projectId: "p1", requiredSkill: "A", remainingHours: 8, status: "ON_HOLD", rowIndex: 0 },
        ],
        users: [USER_A1],
        availability: { a1: {} },
      }),
    );
    expect(result.entries).toHaveLength(0);
  });

  it("reports a failure when no specialist has the skill", () => {
    const result = generatePlan(
      makeInput({
        tasks: [{ id: "t1", projectId: "p1", requiredSkill: "Z", remainingHours: 8, status: "NOT_STARTED", rowIndex: 0 }],
        users: [USER_A1],
        availability: { a1: {} },
      }),
    );
    expect(result.entries).toHaveLength(0);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0].reason).toContain("No specialist has skill Z");
  });

  it("reports a failure when capacity is insufficient before the deadline", () => {
    const result = generatePlan(
      makeInput({
        projects: [{ id: "p1", deadline: "2026-09-02", budgetHours: 1000 }],
        tasks: [{ id: "t1", projectId: "p1", requiredSkill: "A", remainingHours: 16, status: "NOT_STARTED", rowIndex: 0 }],
        users: [USER_A1],
        availability: { a1: {} },
        startDate: "2026-09-01",
      }),
    );
    // Only 2026-09-01 is before deadline 2026-09-02 => 8h available, 8h remain unplanned
    expect(result.entries).toHaveLength(1);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0].taskId).toBe("t1");
  });

  it("starts rows only after lower rows finished (bottom-up)", () => {
    const result = generatePlan(
      makeInput({
        tasks: [
          { id: "r0", projectId: "p1", requiredSkill: "A", remainingHours: 8, status: "NOT_STARTED", rowIndex: 0 },
          { id: "r1", projectId: "p1", requiredSkill: "A", remainingHours: 8, status: "NOT_STARTED", rowIndex: 1 },
        ],
        users: [USER_A1],
        availability: { a1: {} },
      }),
    );
    const r0 = result.entries.find((e) => e.taskId === "r0");
    const r1 = result.entries.find((e) => e.taskId === "r1");
    expect(r0?.date).toBe("2026-09-01");
    expect(r1?.date).toBe("2026-09-02");
  });

  it("schedules projects by earlier deadline first", () => {
    const result = generatePlan(
      makeInput({
        projects: [
          { id: "late", deadline: "2026-12-31", budgetHours: 1000 },
          { id: "early", deadline: "2026-09-10", budgetHours: 1000 },
        ],
        tasks: [
          { id: "tLate", projectId: "late", requiredSkill: "A", remainingHours: 8, status: "NOT_STARTED", rowIndex: 0 },
          { id: "tEarly", projectId: "early", requiredSkill: "A", remainingHours: 8, status: "NOT_STARTED", rowIndex: 0 },
        ],
        users: [USER_A1],
        availability: { a1: {} },
      }),
    );
    const early = result.entries.find((e) => e.taskId === "tEarly");
    const late = result.entries.find((e) => e.taskId === "tLate");
    expect(early?.date).toBe("2026-09-01");
    expect(late?.date).toBe("2026-09-02");
  });

  it("skips weekends and Polish holidays", () => {
    // 2026-11-01 (Sunday + holiday) and 2026-11-11 (Wednesday, National Independence Day)
    const result = generatePlan(
      makeInput({
        projects: [{ id: "p1", deadline: "2026-11-30", budgetHours: 1000 }],
        tasks: [{ id: "t1", projectId: "p1", requiredSkill: "A", remainingHours: 40, status: "NOT_STARTED", rowIndex: 0 }],
        users: [USER_A1],
        availability: { a1: {} },
        startDate: "2026-10-26",
      }),
    );
    expect(result.failures).toHaveLength(0);
    const dates = result.entries.map((e) => e.date);
    expect(dates).not.toContain("2026-11-01");
    expect(dates).not.toContain("2026-11-11");
    expect(dates.every((d) => !isWeekend(d))).toBe(true);
  });

  it("handles a weekend start date by moving forward", () => {
    const result = generatePlan(
      makeInput({
        tasks: [{ id: "t1", projectId: "p1", requiredSkill: "A", remainingHours: 8, status: "NOT_STARTED", rowIndex: 0 }],
        users: [USER_A1],
        availability: { a1: {} },
        startDate: "2026-08-22", // Saturday
      }),
    );
    expect(result.entries[0].date).toBe("2026-08-24"); // Monday
  });
});