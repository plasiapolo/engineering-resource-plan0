import { describe, expect, it } from "vitest";
import {
  ALLOWED_TRANSITIONS,
  buildDependenciesFromRows,
  buildTaskCode,
  checkStatusTransition,
  codePartOf,
  mergeAssignments,
  nextTaskNumber,
  parseTaskNumber,
  uniqueNumbersForTasks,
} from "../../src/services/storage/logic";

describe("buildDependenciesFromRows", () => {
  it("creates complete bipartite dependencies between consecutive rows", () => {
    const deps = buildDependenciesFromRows([
      [{ id: "a" }, { id: "b" }],
      [{ id: "c" }, { id: "d" }],
    ]);
    expect(deps).toEqual([
      { predecessorTaskId: "a", successorTaskId: "c" },
      { predecessorTaskId: "b", successorTaskId: "c" },
      { predecessorTaskId: "a", successorTaskId: "d" },
      { predecessorTaskId: "b", successorTaskId: "d" },
    ]);
  });

  it("returns empty for a single row", () => {
    expect(buildDependenciesFromRows([[{ id: "a" }]])).toEqual([]);
  });
});

describe("uniqueNumbersForTasks", () => {
  it("rejects tasks appearing in more than one row", () => {
    expect(() => uniqueNumbersForTasks([[{ id: "a" }], [{ id: "a" }]], ["a"])).toThrow("more than one pyramid row");
  });

  it("rejects tasks that are not placed", () => {
    expect(() => uniqueNumbersForTasks([[{ id: "a" }]], ["a", "b"])).toThrow("not placed");
  });
});

describe("task numbers", () => {
  it("increments task numbers", () => {
    expect(nextTaskNumber([])).toBe("000001");
    expect(nextTaskNumber([1, 2, 42])).toBe("000043");
  });

  it("parses the numeric suffix", () => {
    expect(parseTaskNumber("Z1-A1-1.000042")).toBe(42);
    expect(parseTaskNumber("no-number")).toBe(0);
  });

  it("strips the numeric suffix from a code", () => {
    expect(codePartOf("Z1-A1-1.000042")).toBe("Z1-A1-1");
    expect(codePartOf("Z1-A1-1")).toBe("Z1-A1-1");
  });
});

describe("buildTaskCode", () => {
  it("builds an unassigned code with AX", () => {
    expect(buildTaskCode("Z1", "A", null, 0, "000001")).toBe("Z1-AX-1.000001");
  });

  it("builds an assigned code with the specialist number", () => {
    expect(buildTaskCode("Z1", "A", "A1", 0, "000001")).toBe("Z1-A1-1.000001");
    expect(buildTaskCode("Z1", "S", "S2", 2, "000007")).toBe("Z1-S2-3.000007");
  });
});

describe("status transitions", () => {
  it("allows expected forward transitions", () => {
    for (const [from, to] of [
      ["NOT_STARTED", "WORK_IN_PROGRESS"],
      ["WORK_IN_PROGRESS", "DONE"],
      ["WORK_IN_PROGRESS", "ON_HOLD"],
      ["ON_HOLD", "WORK_IN_PROGRESS"],
      ["ON_HOLD", "DONE"],
    ] as const) {
      expect(checkStatusTransition(from, to, "SPECIALIST").allowed).toBe(true);
    }
  });

  it("rejects invalid transitions", () => {
    expect(checkStatusTransition("NOT_STARTED", "DONE", "SPECIALIST").allowed).toBe(false);
    expect(checkStatusTransition("NOT_STARTED", "ON_HOLD", "SPECIALIST").allowed).toBe(false);
  });

  it("only allows the project manager to reopen a done task", () => {
    expect(checkStatusTransition("DONE", "WORK_IN_PROGRESS", "SPECIALIST").allowed).toBe(false);
    expect(checkStatusTransition("DONE", "WORK_IN_PROGRESS", "PROJECT_MANAGER").allowed).toBe(true);
    expect(checkStatusTransition("DONE", "ON_HOLD", "PROJECT_MANAGER").allowed).toBe(true);
  });

  it("defines a transition list for every status", () => {
    expect(Object.keys(ALLOWED_TRANSITIONS)).toEqual(["NOT_STARTED", "WORK_IN_PROGRESS", "ON_HOLD", "DONE"]);
  });
});

describe("mergeAssignments", () => {
  it("skips zero-hour drafts and keeps create flags", () => {
    const merged = mergeAssignments(
      [{ taskId: "t1", userId: "a1", date: "2026-09-01", hours: 4 }],
      [
        { taskId: "t1", userId: "a1", date: "2026-09-01", hours: 5 },
        { taskId: "t2", userId: "a1", date: "2026-09-02", hours: 8 },
        { taskId: "t3", userId: "a1", date: "2026-09-03", hours: 0 },
      ],
    );
    expect(merged).toEqual([
      { taskId: "t1", userId: "a1", date: "2026-09-01", hours: 5, create: false },
      { taskId: "t2", userId: "a1", date: "2026-09-02", hours: 8, create: true },
    ]);
  });
});