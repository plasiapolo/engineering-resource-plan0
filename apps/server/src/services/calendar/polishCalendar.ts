import type { DateString } from "../../domain/types";

export const DEFAULT_WORKING_HOURS = 8;

export const WORKDAY_MS = 24 * 60 * 60 * 1000;

export function toDate(dateStr: DateString): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

export function toDateString(date: Date): DateString {
  return date.toISOString().slice(0, 10);
}

export function warsawToday(): DateString {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return parts;
}

export function addDays(dateStr: DateString, days: number): DateString {
  const d = toDate(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return toDateString(d);
}

export function addMonths(dateStr: DateString, months: number): DateString {
  const d = toDate(dateStr);
  const day = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + months);
  if (d.getUTCDate() < day) {
    d.setUTCDate(0);
  }
  return toDateString(d);
}

export function compareDates(a: DateString, b: DateString): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

export function maxDate(a: DateString, b: DateString): DateString {
  return compareDates(a, b) >= 0 ? a : b;
}

export function minDate(a: DateString, b: DateString): DateString {
  return compareDates(a, b) <= 0 ? a : b;
}

function dayOfWeek(dateStr: DateString): number {
  return toDate(dateStr).getUTCDay();
}

export function isWeekend(dateStr: DateString): boolean {
  const dow = dayOfWeek(dateStr);
  return dow === 0 || dow === 6;
}

function easterSunday(year: number): DateString {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function polishHolidaysForYear(year: number): DateString[] {
  const easter = toDate(easterSunday(year));
  const holiday: DateString[] = [
    `${year}-01-01`,
    `${year}-01-06`,
    `${year}-05-01`,
    `${year}-05-03`,
    `${year}-08-15`,
    `${year}-11-01`,
    `${year}-11-11`,
    `${year}-12-24`,
    `${year}-12-25`,
    `${year}-12-26`,
  ];
  const addEasterOffset = (offset: number): void => {
    const d = new Date(easter.getTime());
    d.setUTCDate(d.getUTCDate() + offset);
    holiday.push(toDateString(d));
  };
  addEasterOffset(0);
  addEasterOffset(1);
  addEasterOffset(49);
  addEasterOffset(60);
  return holiday;
}

const holidayCache = new Map<number, Set<string>>();

function holidaysForYear(year: number): Set<string> {
  let set = holidayCache.get(year);
  if (!set) {
    set = new Set(polishHolidaysForYear(year));
    holidayCache.set(year, set);
  }
  return set;
}

export function isPolishHoliday(dateStr: DateString): boolean {
  const year = Number(dateStr.slice(0, 4));
  return holidaysForYear(year).has(dateStr);
}

export function isWorkingDay(dateStr: DateString): boolean {
  return !isWeekend(dateStr) && !isPolishHoliday(dateStr);
}

export function nextWorkingDayAfter(dateStr: DateString): DateString {
  let d = dateStr;
  let guard = 0;
  do {
    d = addDays(d, 1);
    guard += 1;
  } while (!isWorkingDay(d) && guard < 400);
  return d;
}

export function previousWorkingDayBefore(dateStr: DateString): DateString {
  let d = dateStr;
  let guard = 0;
  do {
    d = addDays(d, -1);
    guard += 1;
  } while (!isWorkingDay(d) && guard < 400);
  return d;
}

export function lastWorkingDayBefore(dateStr: DateString): DateString {
  return previousWorkingDayBefore(dateStr);
}

export function workingDaysBetween(start: DateString, end: DateString): DateString[] {
  const result: DateString[] = [];
  let d = start;
  let guard = 0;
  while (compareDates(d, end) <= 0 && guard < 1000) {
    if (isWorkingDay(d)) result.push(d);
    d = addDays(d, 1);
    guard += 1;
  }
  return result;
}

export function addWorkingDays(dateStr: DateString, count: number): DateString {
  let d = dateStr;
  let remaining = count;
  while (remaining > 0) {
    d = nextWorkingDayAfter(d);
    remaining -= 1;
  }
  return d;
}

export function workingDayDistance(from: DateString, to: DateString): number {
  return workingDaysBetween(from, to).length - 1;
}