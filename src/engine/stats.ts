// Pure aggregations over completion/skip/task rows — computed on read, never stored (§4).
import type { Completion, Skip, Task } from '../types';
import { addDays, dayKeyFor, isScheduledDay } from './time';

export interface DayCount {
  dayKey: string;
  count: number;
}

function completionDayKey(c: Completion): string {
  return dayKeyFor(new Date(c.completedAt));
}

// Completions per local day for the last `n` days, oldest first (today included).
export function lastNDayCounts(completions: Completion[], n: number, today: Date): DayCount[] {
  const counts = new Map<string, number>();
  for (const c of completions) {
    const key = completionDayKey(c);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const out: DayCount[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const dayKey = dayKeyFor(addDays(today, -i));
    out.push({ dayKey, count: counts.get(dayKey) ?? 0 });
  }
  return out;
}

// Days with >=1 completion within the last `days` days (today included).
export function activeDaysInLast(completions: Completion[], days: number, today: Date): number {
  const from = dayKeyFor(addDays(today, -(days - 1)));
  const to = dayKeyFor(today);
  const active = new Set<string>();
  for (const c of completions) {
    const key = completionDayKey(c);
    if (key >= from && key <= to) active.add(key);
  }
  return active.size;
}

export function distinctActiveDays(completions: Completion[]): number {
  return new Set(completions.map(completionDayKey)).size;
}

export interface ScheduledOutcomes {
  scheduled: number;
  done: number;
  skipped: number;
  missed: number; // past scheduled days with neither completion nor skip
}

// Outcomes for scheduled (habit) tasks over the last `days` days. Days before a task
// was created don't count against it; today is never counted as missed.
export function scheduledOutcomes(
  tasks: Task[],
  completions: Completion[],
  skips: Skip[],
  days: number,
  today: Date
): ScheduledOutcomes {
  const habits = tasks.filter((t) => t.type === 'habit' && t.schedule && t.status === 'active');
  const doneSet = new Set(completions.map((c) => `${c.taskId}|${completionDayKey(c)}`));
  const skipSet = new Set(skips.map((s) => `${s.taskId}|${s.day}`));
  const todayKey = dayKeyFor(today);

  const out: ScheduledOutcomes = { scheduled: 0, done: 0, skipped: 0, missed: 0 };
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(today, -i);
    const dayKey = dayKeyFor(date);
    for (const t of habits) {
      if (dayKeyFor(new Date(t.createdAt)) > dayKey) continue;
      if (!isScheduledDay(t.schedule!, date)) continue;
      out.scheduled++;
      if (doneSet.has(`${t.id}|${dayKey}`)) out.done++;
      else if (skipSet.has(`${t.id}|${dayKey}`)) out.skipped++;
      else if (dayKey < todayKey) out.missed++;
    }
  }
  return out;
}

export interface TaskStat {
  taskId: string;
  count: number;
  xp: number;
}

// Most-completed tasks in the last `days` days, by completion count then XP.
export function topTasks(completions: Completion[], days: number, today: Date, limit = 5): TaskStat[] {
  const from = dayKeyFor(addDays(today, -(days - 1)));
  const byTask = new Map<string, TaskStat>();
  for (const c of completions) {
    if (completionDayKey(c) < from) continue;
    const stat = byTask.get(c.taskId) ?? { taskId: c.taskId, count: 0, xp: 0 };
    stat.count++;
    stat.xp += c.xpAwarded;
    byTask.set(c.taskId, stat);
  }
  return [...byTask.values()]
    .sort((a, b) => b.count - a.count || b.xp - a.xp)
    .slice(0, limit);
}

export function xpOnDay(completions: Completion[], day: Date): number {
  const key = dayKeyFor(day);
  return completions
    .filter((c) => completionDayKey(c) === key)
    .reduce((sum, c) => sum + c.xpAwarded, 0);
}
