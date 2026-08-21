import { describe, expect, it } from "vitest";
import { nextSpecialistLogin } from "../../src/routes/team.routes";

describe("nextSpecialistLogin", () => {
  it.each([
    ["A", ["a1", "a2"], "a3"],
    ["B", ["b1"], "b2"],
    ["C", ["c1"], "c2"],
    ["E", ["e1"], "e2"],
    ["P", ["p1", "p2", "p3"], "p4"],
    ["S", ["s1", "s2", "s3"], "s4"],
  ])("generates the next login for %s", (skill, existing, expected) => {
    expect(nextSpecialistLogin(skill, existing)).toBe(expected);
  });

  it("starts at one when no specialist exists for a competence", () => {
    expect(nextSpecialistLogin("A", [])).toBe("a1");
  });
});
