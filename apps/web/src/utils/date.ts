import type { DateString } from "../domain/types";
import { CALENDAR_MONTHS_BACK, CALENDAR_MONTHS_FORWARD } from "../domain/constants";

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function toDateString(d: Date): DateString {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDateString(s: DateString): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
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

export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function weekDates(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

export function formatDateLong(s: DateString): string {
  const d = parseDateString(s);
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

export function formatDateShort(s: DateString): string {
  const d = parseDateString(s);
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" });
}

export function formatDDMMYYYY(s: DateString): string {
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}

export function parseDDMMYYYY(s: string): DateString | null {
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", { timeZone: "Europe/Warsaw" });
}

export function calendarWindow(): { start: DateString; end: DateString } {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth() - CALENDAR_MONTHS_BACK, 1);
  const end = new Date(today.getFullYear(), today.getMonth() + CALENDAR_MONTHS_FORWARD, 1);
  return { start: toDateString(start), end: toDateString(end) };
}

export function dayOfWeek(date: Date): number {
  return date.getDay();
}

export function isWeekend(date: Date): boolean {
  const dow = dayOfWeek(date);
  return dow === 0 || dow === 6;
}

export function easterSunday(year: number): Date {
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
  return new Date(year, month - 1, day);
}

export function isPolishHoliday(date: Date): boolean {
  const y = date.getFullYear();
  const s = toDateString(date);
  const fixed = [
    `${y}-01-01`,
    `${y}-01-06`,
    `${y}-05-01`,
    `${y}-05-03`,
    `${y}-08-15`,
    `${y}-11-01`,
    `${y}-11-11`,
    `${y}-12-24`,
    `${y}-12-25`,
    `${y}-12-26`,
  ];
  if (fixed.includes(s)) return true;
  const easter = easterSunday(y);
  for (const offset of [0, 1, 49, 60]) {
    if (toDateString(addDays(easter, offset)) === s) return true;
  }
  return false;
}

export function isWorkingDay(date: Date): boolean {
  return !isWeekend(date) && !isPolishHoliday(date);
}

export function compareDates(a: DateString, b: DateString): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}