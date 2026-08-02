// Pure aggregations over completion/skip/task rows — computed on read, never stored (§4).
import type { Completion, Skip, Task } from '../types';
import { addDays, dayKeyFor, isScheduledDay } from './time';
import { splitSkillXp } from './xp';

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

// Outcomes for scheduled tasks (any type with a schedule) over the last `days` days.
// Days before a task was created don't count against it; today is never counted as missed.
export function scheduledOutcomes(
  tasks: Task[],
  completions: Completion[],
  skips: Skip[],
  days: number,
  today: Date
): ScheduledOutcomes {
  const habits = tasks.filter((t) => t.schedule && t.status === 'active');
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

// Most-completed tasks in the last `days` days (null = all time), by count then XP.
export function topTasks(completions: Completion[], days: number | null, today: Date, limit = 5): TaskStat[] {
  const from = days === null ? null : dayKeyFor(addDays(today, -(days - 1)));
  const byTask = new Map<string, TaskStat>();
  for (const c of completions) {
    if (from !== null && completionDayKey(c) < from) continue;
    const stat = byTask.get(c.taskId) ?? { taskId: c.taskId, count: 0, xp: 0 };
    stat.count++;
    stat.xp += c.xpAwarded;
    byTask.set(c.taskId, stat);
  }
  return [...byTask.values()]
    .sort((a, b) => b.count - a.count || b.xp - a.xp)
    .slice(0, limit);
}

export interface SkillAgg {
  skillId: string;
  count: number; // completions of tasks tagged with this skill
  xp: number; // this skill's share (§7 split rule) of that XP
}

// Per-skill completion/XP aggregation. `days` null = all time. XP attribution uses
// the tasks' CURRENT tags — stats are derived on read (§4), so retagging a task
// re-attributes its history by design.
export function skillBreakdown(
  completions: Completion[],
  links: Array<{ taskId: string; skillId: string }>,
  days: number | null,
  today: Date
): SkillAgg[] {
  const tagsByTask = new Map<string, string[]>();
  for (const l of links) {
    const arr = tagsByTask.get(l.taskId) ?? [];
    arr.push(l.skillId);
    tagsByTask.set(l.taskId, arr);
  }
  const from = days === null ? null : dayKeyFor(addDays(today, -(days - 1)));
  const agg = new Map<string, SkillAgg>();
  for (const c of completions) {
    if (from !== null && completionDayKey(c) < from) continue;
    const tags = tagsByTask.get(c.taskId);
    if (!tags?.length) continue;
    const share = splitSkillXp(c.xpAwarded, tags.length);
    for (const skillId of tags) {
      const a = agg.get(skillId) ?? { skillId, count: 0, xp: 0 };
      a.count++;
      a.xp += share;
      agg.set(skillId, a);
    }
  }
  return [...agg.values()].sort((a, b) => b.xp - a.xp || b.count - a.count);
}

export function xpOnDay(completions: Completion[], day: Date): number {
  const key = dayKeyFor(day);
  return completions
    .filter((c) => completionDayKey(c) === key)
    .reduce((sum, c) => sum + c.xpAwarded, 0);
}

export interface RangeSummary {
  completions: number;
  xp: number;
  activeDays: number;
  /** Days in the range that had at least one completion, as a fraction 0..1. Null for
   *  all-time, where "out of how many days" has no meaningful denominator. */
  activeRate: number | null;
}

// Headline figures for the dashboard's range filter (§10 Phase 2: day/week/month/all-time).
// `days` null = all time; otherwise the window is the last `days` days INCLUDING today, which
// matches topTasks/skillBreakdown so every panel on the screen agrees on what "this week"
// means. A dashboard whose panels disagree about the range is worse than no dashboard.
export function rangeSummary(
  completions: Completion[],
  days: number | null,
  today: Date
): RangeSummary {
  const from = days === null ? null : dayKeyFor(addDays(today, -(days - 1)));
  const active = new Set<string>();
  let count = 0;
  let xp = 0;
  for (const c of completions) {
    const key = completionDayKey(c);
    if (from !== null && key < from) continue;
    count++;
    xp += c.xpAwarded;
    active.add(key);
  }
  return {
    completions: count,
    xp,
    activeDays: active.size,
    activeRate: days === null ? null : active.size / days,
  };
}
