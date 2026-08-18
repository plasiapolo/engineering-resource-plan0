import { describe, expect, it } from "vitest";
import { buildSnapshotContent, snapshotEquals } from "../../src/services/versioning/snapshot";
import type { SnapshotContent } from "../../src/services/versioning/snapshot";

describe("buildSnapshotContent", () => {
  it("sorts plan entries by date then task code", () => {
    const content = buildSnapshotContent(
      [
        { taskId: "t2", taskCode: "Z1-A1-2.000002", userId: "a1", userName: "A1", date: "2026-09-02", hours: 8, locked: false },
        { taskId: "t1", taskCode: "Z1-A1-1.000001", userId: "a1", userName: "A1", date: "2026-09-01", hours: 8, locked: true },
        { taskId: "t3", taskCode: "Z1-A1-3.000003", userId: "a1", userName: "A1", date: "2026-09-01", hours: 2, locked: false },
      ],
      [],
    );
    expect(content.planEntries.map((e) => e.taskCode)).toEqual(["Z1-A1-1.000001", "Z1-A1-3.000003", "Z1-A1-2.000002"]);
  });

  it("does not mutate the input arrays", () => {
    const input = [{ taskId: "t1", taskCode: "Z1-A1-1.000001", userId: "a1", userName: "A1", date: "2026-09-01", hours: 8, locked: false }];
    buildSnapshotContent(input, []);
    expect(input[0].taskId).toBe("t1");
  });
});

describe("snapshotEquals", () => {
  it("detects identical snapshots", () => {
    const a: SnapshotContent = { planEntries: [], conflicts: [] };
    expect(snapshotEquals(a, { planEntries: [], conflicts: [] })).toBe(true);
  });

  it("detects differing snapshots", () => {
    const a: SnapshotContent = {
      planEntries: [{ taskId: "t1", taskCode: "Z1-A1-1.000001", userId: "a1", userName: "A1", date: "2026-09-01", hours: 8, locked: false }],
      conflicts: [],
    };
    const b: SnapshotContent = {
      planEntries: [{ taskId: "t1", taskCode: "Z1-A1-1.000001", userId: "a1", userName: "A1", date: "2026-09-01", hours: 9, locked: false }],
      conflicts: [],
    };
    expect(snapshotEquals(a, b)).toBe(false);
  });
});