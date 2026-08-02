import type { Schedule } from '../types';
import { addDays, dayKeyFor, dateFromDayKey, isScheduledDay } from './time';

// §7 streak rules, as pure functions over the completions log.
//
// The central design decision: streak state is **derived, never incremented**. Nothing here
// says "the user completed something, so add one" — every call walks the days from the task's
// start to today and works out what must be true. That is what makes the app correct after the
// user has been away: miss four scheduled days without ever opening LifeQuest and the breaks
// are still found on next launch, because they are read out of the log rather than recorded as
// they happen. A counter-based design would simply never notice.
//
// §7 also fixes two rules that are easy to get wrong in the opposite direction:
//   * **No freezes, no grace.** A missed scheduled day resets `current` to 0 and counts as a
//     break. The user explicitly wanted breaks visible and counted, not silently forgiven.
//   * **A skip breaks a streak exactly like a miss**, so this module reads completions alone
//     and never needs the skips table (§4). Skips exist for stats, to tell "chose not to" apart
//     from "forgot" — a distinction the streak does not care about.

export interface StreakBreak {
  /** The scheduled day that was missed. */
  day: string;
  /** How long the streak had grown before this break ended it. */
  brokenLength: number;
}

export interface StreakState {
  current: number;
  longest: number;
  /** Lifetime number of breaks — matches `streaks.reset_count`. */
  resetCount: number;
  /** dayKey of the most recent qualifying completion, or null. */
  lastActiveDay: string | null;
  /** Every break found, oldest first. Feeds `streak_resets` and the stats history. */
  breaks: StreakBreak[];
}

const EMPTY: StreakState = {
  current: 0,
  longest: 0,
  resetCount: 0,
  lastActiveDay: null,
  breaks: [],
};

/**
 * Walks day by day from `fromDay` to `today`, asking `isDue` which days counted and
 * `completedDays` which were actually done.
 *
 * `today` is deliberately never treated as a miss. A scheduled day that has not happened yet
 * is *pending*, not failed — breaking someone's streak at 00:01 because they had not done
 * their evening run yet would be both wrong and cruel, and it is the single most likely way to
 * get this feature wrong.
 */
function walk(
  isDue: (date: Date) => boolean,
  completedDays: ReadonlySet<string>,
  fromDay: string,
  today: Date
): StreakState {
  const todayKey = dayKeyFor(today);
  if (fromDay > todayKey) return { ...EMPTY, breaks: [] };

  let current = 0;
  let longest = 0;
  let lastActiveDay: string | null = null;
  const breaks: StreakBreak[] = [];

  for (let d = dateFromDayKey(fromDay); ; d = addDays(d, 1)) {
    const key = dayKeyFor(d);
    if (key > todayKey) break;

    if (isDue(d)) {
      if (completedDays.has(key)) {
        current += 1;
        if (current > longest) longest = current;
        lastActiveDay = key;
      } else if (key !== todayKey) {
        // A miss, and the day is over — the streak ends here. A streak of 0 cannot break, so
        // a run of empty days produces one break, not one per day.
        if (current > 0) breaks.push({ day: key, brokenLength: current });
        current = 0;
      }
    }
  }

  return { current, longest, resetCount: breaks.length, lastActiveDay, breaks };
}

/**
 * Per-habit streak: consecutive completions on that habit's scheduled days (§7).
 * Days the habit is not scheduled for are skipped entirely — a Mon/Wed/Fri habit is not broken
 * by an empty Tuesday.
 */
export function computeHabitStreak(
  schedule: Schedule,
  completedDays: ReadonlySet<string>,
  fromDay: string,
  today: Date
): StreakState {
  return walk((date) => isScheduledDay(schedule, date), completedDays, fromDay, today);
}

/**
 * The global "active day" streak: any day with at least one completion of anything counts
 * (§7). Every calendar day is due, so a single quiet day breaks it.
 */
export function computeGlobalStreak(
  activeDays: ReadonlySet<string>,
  fromDay: string,
  today: Date
): StreakState {
  return walk(() => true, activeDays, fromDay, today);
}

/**
 * True when today is a scheduled day this habit has not been completed on yet — i.e. the
 * streak is alive but at risk before midnight. Drives the "at risk" state in the UI, which is
 * the honest version of the reference poster's red warning panel.
 */
export function isStreakAtRisk(
  schedule: Schedule,
  completedDays: ReadonlySet<string>,
  today: Date
): boolean {
  return isScheduledDay(schedule, today) && !completedDays.has(dayKeyFor(today));
}

/** `longest` is a running max and is never decremented (§7) — undoing a completion today must
 * not erase a record set last month. Callers merge the freshly-derived value with the stored
 * one through this, rather than overwriting. */
export function mergeLongest(storedLongest: number, derivedLongest: number): number {
  return Math.max(storedLongest, derivedLongest);
}
