// Date helpers — pure over passed-in Date values (§8: no Date.now() inside the engine).
// dayKey is always LOCAL time: getFullYear/getMonth/getDate, never toISOString()
// (the UTC-shift bug would log an 11 PM completion on tomorrow).
import type { Schedule } from '../types';

export function dayKeyFor(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Day arithmetic via calendar constructors, never +86_400_000ms (breaks on DST days)
export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

export function dateFromDayKey(dayKey: string): Date {
  const [y, m, d] = dayKey.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// ISO boundaries of the LOCAL day containing `date` — for querying completions by day.
export function dayWindow(date: Date): { startIso: string; endIso: string } {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return { startIso: start.toISOString(), endIso: addDays(start, 1).toISOString() };
}

// Is a habit scheduled on this date? (days: 0-6, Sun-Sat, matching Date.getDay)
export function isScheduledDay(schedule: Schedule, date: Date): boolean {
  if (schedule.freq === 'daily') return true;
  return schedule.days.includes(date.getDay());
}
