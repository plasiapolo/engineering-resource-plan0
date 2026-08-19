import { describe, expect, it } from "vitest";
import {
  addMonths,
  addWorkingDays,
  isPolishHoliday,
  isWeekend,
  isWorkingDay,
  lastWorkingDayBefore,
  nextWorkingDayAfter,
  polishHolidaysForYear,
  previousWorkingDayBefore,
  warsawToday,
  workingDayDistance,
  workingDaysBetween,
} from "../../src/services/calendar/polishCalendar";

describe("polishCalendar", () => {
  it("marks weekends", () => {
    expect(isWeekend("2026-08-22")).toBe(true); // Saturday
    expect(isWeekend("2026-08-23")).toBe(true); // Sunday
    expect(isWeekend("2026-08-24")).toBe(false); // Monday
  });

  it("knows fixed Polish holidays", () => {
    expect(isPolishHoliday("2026-01-01")).toBe(true);
    expect(isPolishHoliday("2026-01-06")).toBe(true);
    expect(isPolishHoliday("2026-05-01")).toBe(true);
    expect(isPolishHoliday("2026-05-03")).toBe(true);
    expect(isPolishHoliday("2026-08-15")).toBe(true);
    expect(isPolishHoliday("2026-11-01")).toBe(true);
    expect(isPolishHoliday("2026-11-11")).toBe(true);
    expect(isPolishHoliday("2026-12-24")).toBe(true);
    expect(isPolishHoliday("2026-12-25")).toBe(true);
    expect(isPolishHoliday("2026-12-26")).toBe(true);
  });

  it("computes movable holidays from Easter", () => {
    // Easter Monday 2026 = 2026-04-06
    expect(isPolishHoliday("2026-04-06")).toBe(true);
    // Corpus Christi 2026 = 2026-06-04
    expect(isPolishHoliday("2026-06-04")).toBe(true);
    // Pentecost (Whit Sunday) 2026 = 2026-05-24
    expect(isPolishHoliday("2026-05-24")).toBe(true);
    // Easter Sunday itself 2026 = 2026-04-05
    expect(isPolishHoliday("2026-04-05")).toBe(true);
  });

  it("isWorkingDay combines weekend and holiday rules", () => {
    expect(isWorkingDay("2026-05-03")).toBe(false); // Sunday + holiday
    expect(isWorkingDay("2026-05-04")).toBe(true); // Monday
  });

  it("moves to the next working day after a weekend", () => {
    expect(nextWorkingDayAfter("2026-08-21")).toBe("2026-08-24"); // Fri -> Mon
  });

  it("moves to the previous working day before a holiday", () => {
    // 2026-01-01 (New Year) is a holiday, so the previous working day is 2025-12-31
    expect(previousWorkingDayBefore("2026-01-02")).toBe("2025-12-31");
    expect(lastWorkingDayBefore("2026-01-03")).toBe("2026-01-02");
  });

  it("adds working days skipping holidays", () => {
    // 2026-04-30 is a Thursday, +1 working day lands on 2026-05-04 (May 1 + May 3 skipped)
    expect(addWorkingDays("2026-04-30", 1)).toBe("2026-05-04");
  });

  it("lists working days between two dates", () => {
    const days = workingDaysBetween("2026-08-17", "2026-08-21");
    expect(days).toEqual(["2026-08-17", "2026-08-18", "2026-08-19", "2026-08-20", "2026-08-21"]);
  });

  it("computes working day distance", () => {
    expect(workingDayDistance("2026-08-17", "2026-08-21")).toBe(4);
    expect(workingDayDistance("2026-08-21", "2026-08-24")).toBe(1);
  });

  it("returns today in Europe/Warsaw as YYYY-MM-DD", () => {
    expect(warsawToday()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("adds months clamping to the last day of the target month", () => {
    expect(addMonths("2026-08-19", 3)).toBe("2026-11-19");
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2026-03-31", 1)).toBe("2026-04-30");
  });

  it("never produces invalid holiday dates", () => {
    for (const year of [2024, 2025, 2026, 2027, 2028]) {
      for (const date of polishHolidaysForYear(year)) {
        expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });
});