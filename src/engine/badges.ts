// Badge catalogue and evaluator (§10 Phase 2). Pure TypeScript, no React, no DB (§8).
//
// The catalogue is *data*, not code: every badge is a row in BADGES with a `measure` that
// reduces the snapshot to a number and a `target` to reach. That shape buys three things at
// once — a badge is unlocked when `measure >= target`, its progress bar is `measure / target`,
// and the gallery can say "3 / 5 quests" for a locked one without any badge-specific UI. A
// catalogue of bespoke `isUnlocked` predicates would have given only the first.
//
// Nothing here reads the clock or the database. `evaluateBadges` takes a snapshot and returns
// the whole verdict, which is what makes 25 badges testable without a browser.
import type { Completion, Skip, Task } from '../types';
import { dayKeyFor } from './time';
import { levelForTotalXp } from './xp';

export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'legend';
export type BadgeGroup = 'consistency' | 'volume' | 'mastery' | 'secret';

/** Everything a badge rule is allowed to look at. Assembled once per evaluation. */
export interface BadgeSnapshot {
  completions: Completion[];
  skips: Skip[];
  tasks: Task[];
  /** Character total XP. */
  totalXp: number;
  /** Per-skill lifetime XP, keyed by skill id. */
  skillXp: Record<string, number>;
  /** Current and best global active-day streak. */
  globalStreak: { current: number; longest: number };
  /** Best streak reached by any single habit. */
  bestHabitStreak: number;
  now: Date;
}

export interface BadgeRule {
  key: string;
  name: string;
  /** Shown once unlocked, and on locked non-hidden badges as the goal. */
  description: string;
  tier: BadgeTier;
  group: BadgeGroup;
  /** Hidden badges show as `???` until earned — the catalogue is a spoiler otherwise. */
  hidden?: boolean;
  /** How far along the user is, in the same unit as `target`. */
  measure(s: BadgeSnapshot): number;
  target: number;
  /** Unit for the "3 / 5" readout. Singular; the UI pluralises. */
  unit: string;
}

export interface BadgeStatus {
  rule: BadgeRule;
  unlocked: boolean;
  /** Clamped 0..1. */
  progress: number;
  /** Raw measure, for the "3 / 5 quests" line. */
  value: number;
}

// ---- Snapshot helpers -----------------------------------------------------------------
// Deliberately small and shared: a rule should read like its own description.

const dayOf = (c: Completion) => dayKeyFor(new Date(c.completedAt));

function countsByDay(s: BadgeSnapshot): Map<string, number> {
  const m = new Map<string, number>();
  for (const c of s.completions) m.set(dayOf(c), (m.get(dayOf(c)) ?? 0) + 1);
  return m;
}

function bestDay(s: BadgeSnapshot): number {
  let best = 0;
  for (const n of countsByDay(s).values()) best = Math.max(best, n);
  return best;
}

/** Completions whose local hour falls in [from, to). */
function countInHours(s: BadgeSnapshot, from: number, to: number): number {
  return s.completions.filter((c) => {
    const h = new Date(c.completedAt).getHours();
    return from <= to ? h >= from && h < to : h >= from || h < to;
  }).length;
}

function countOnWeekdays(s: BadgeSnapshot, days: number[]): number {
  return s.completions.filter((c) => days.includes(new Date(c.completedAt).getDay())).length;
}

/** Highest level reached by any single skill. */
function bestSkillLevel(s: BadgeSnapshot): number {
  let best = 1;
  for (const xp of Object.values(s.skillXp)) best = Math.max(best, levelForTotalXp(xp));
  return best;
}

/** Number of skills that have earned any XP at all. */
function skillsTouched(s: BadgeSnapshot): number {
  return Object.values(s.skillXp).filter((xp) => xp > 0).length;
}

/** Distinct days with at least one completion. */
function activeDays(s: BadgeSnapshot): number {
  return countsByDay(s).size;
}

/** Days on which every quest of a given type was cleared is overkill; this is simpler and
 *  means the same thing in practice — a day with at least `n` completions. */
function daysWithAtLeast(s: BadgeSnapshot, n: number): number {
  let count = 0;
  for (const c of countsByDay(s).values()) if (c >= n) count++;
  return count;
}

// ---- The catalogue --------------------------------------------------------------------

export const BADGES: BadgeRule[] = [
  // --- Consistency: showing up, which is the whole point of the app -------------------
  {
    key: 'first_light',
    name: 'First Light',
    description: 'Clear your first quest.',
    tier: 'bronze',
    group: 'consistency',
    measure: (s) => s.completions.length,
    target: 1,
    unit: 'quest',
  },
  {
    key: 'streak_3',
    name: 'Kindling',
    description: 'Reach a 3-day streak.',
    tier: 'bronze',
    group: 'consistency',
    measure: (s) => s.globalStreak.longest,
    target: 3,
    unit: 'day',
  },
  {
    key: 'streak_7',
    name: 'Steady Flame',
    description: 'Reach a 7-day streak.',
    tier: 'silver',
    group: 'consistency',
    measure: (s) => s.globalStreak.longest,
    target: 7,
    unit: 'day',
  },
  {
    key: 'streak_30',
    name: 'Unbroken',
    description: 'Reach a 30-day streak.',
    tier: 'gold',
    group: 'consistency',
    measure: (s) => s.globalStreak.longest,
    target: 30,
    unit: 'day',
  },
  {
    key: 'streak_100',
    name: 'Ironbound',
    description: 'Reach a 100-day streak.',
    tier: 'legend',
    group: 'consistency',
    measure: (s) => s.globalStreak.longest,
    target: 100,
    unit: 'day',
  },
  {
    key: 'habit_streak_21',
    name: 'Second Nature',
    description: 'Keep a single daily quest going for 21 days.',
    tier: 'gold',
    group: 'consistency',
    measure: (s) => s.bestHabitStreak,
    target: 21,
    unit: 'day',
  },
  {
    key: 'active_30',
    name: 'Regular',
    description: 'Be active on 30 separate days.',
    tier: 'silver',
    group: 'consistency',
    measure: activeDays,
    target: 30,
    unit: 'day',
  },
  {
    key: 'active_180',
    name: 'Half a Year',
    description: 'Be active on 180 separate days.',
    tier: 'legend',
    group: 'consistency',
    measure: activeDays,
    target: 180,
    unit: 'day',
  },

  // --- Volume: how much has gone through the log --------------------------------------
  {
    key: 'quests_10',
    name: 'Apprentice',
    description: 'Clear 10 quests.',
    tier: 'bronze',
    group: 'volume',
    measure: (s) => s.completions.length,
    target: 10,
    unit: 'quest',
  },
  {
    key: 'quests_100',
    name: 'Journeyman',
    description: 'Clear 100 quests.',
    tier: 'silver',
    group: 'volume',
    measure: (s) => s.completions.length,
    target: 100,
    unit: 'quest',
  },
  {
    key: 'quests_500',
    name: 'Veteran',
    description: 'Clear 500 quests.',
    tier: 'gold',
    group: 'volume',
    measure: (s) => s.completions.length,
    target: 500,
    unit: 'quest',
  },
  {
    key: 'quests_1000',
    name: 'Grandmaster',
    description: 'Clear 1,000 quests.',
    tier: 'legend',
    group: 'volume',
    measure: (s) => s.completions.length,
    target: 1000,
    unit: 'quest',
  },
  {
    key: 'xp_1000',
    name: 'Thousandfold',
    description: 'Bank 1,000 XP.',
    tier: 'bronze',
    group: 'volume',
    measure: (s) => s.totalXp,
    target: 1000,
    unit: 'XP',
  },
  {
    key: 'xp_10000',
    name: 'Ten Thousand',
    description: 'Bank 10,000 XP.',
    tier: 'gold',
    group: 'volume',
    measure: (s) => s.totalXp,
    target: 10000,
    unit: 'XP',
  },
  {
    key: 'big_day_10',
    name: 'Landslide',
    description: 'Clear 10 quests in one day.',
    tier: 'silver',
    group: 'volume',
    measure: bestDay,
    target: 10,
    unit: 'quest',
  },
  {
    key: 'busy_weeks',
    name: 'Momentum',
    description: 'Have 25 days with 5 or more quests cleared.',
    tier: 'gold',
    group: 'volume',
    measure: (s) => daysWithAtLeast(s, 5),
    target: 25,
    unit: 'day',
  },

  // --- Mastery: levels, breadth, and depth ---------------------------------------------
  {
    key: 'level_5',
    name: 'Ascendant',
    description: 'Reach character level 5.',
    tier: 'bronze',
    group: 'mastery',
    measure: (s) => levelForTotalXp(s.totalXp),
    target: 5,
    unit: 'level',
  },
  {
    key: 'level_15',
    name: 'Exalted',
    description: 'Reach character level 15.',
    tier: 'silver',
    group: 'mastery',
    measure: (s) => levelForTotalXp(s.totalXp),
    target: 15,
    unit: 'level',
  },
  {
    key: 'level_30',
    name: 'Transcendent',
    description: 'Reach character level 30.',
    tier: 'legend',
    group: 'mastery',
    measure: (s) => levelForTotalXp(s.totalXp),
    target: 30,
    unit: 'level',
  },
  {
    key: 'skill_level_10',
    name: 'Specialist',
    description: 'Take any category to level 10.',
    tier: 'gold',
    group: 'mastery',
    measure: bestSkillLevel,
    target: 10,
    unit: 'level',
  },
  {
    key: 'breadth_5',
    name: 'Well Rounded',
    description: 'Earn XP in 5 different categories.',
    tier: 'silver',
    group: 'mastery',
    measure: skillsTouched,
    target: 5,
    unit: 'category',
  },
  {
    key: 'breadth_8',
    name: 'Polymath',
    description: 'Earn XP in 8 different categories.',
    tier: 'gold',
    group: 'mastery',
    measure: skillsTouched,
    target: 8,
    unit: 'category',
  },
  {
    key: 'epic_25',
    name: 'Dragonslayer',
    description: 'Clear 25 epic quests.',
    tier: 'gold',
    group: 'mastery',
    measure: (s) => {
      const epic = new Set(s.tasks.filter((t) => t.difficulty === 'epic').map((t) => t.id));
      return s.completions.filter((c) => epic.has(c.taskId)).length;
    },
    target: 25,
    unit: 'quest',
  },
  {
    key: 'builder_10',
    name: 'Architect',
    description: 'Have 10 quests on the go at once.',
    tier: 'bronze',
    group: 'mastery',
    measure: (s) => s.tasks.filter((t) => t.status === 'active').length,
    target: 10,
    unit: 'quest',
  },

  // --- Secret: found, not pursued ------------------------------------------------------
  // Hidden badges exist so the gallery has something left to discover. They are all things
  // a real user does by accident, never things that need grinding for.
  {
    key: 'night_owl',
    name: 'Night Owl',
    description: 'Clear 20 quests between midnight and 5am.',
    tier: 'silver',
    group: 'secret',
    hidden: true,
    measure: (s) => countInHours(s, 0, 5),
    target: 20,
    unit: 'quest',
  },
  {
    key: 'early_bird',
    name: 'Early Bird',
    description: 'Clear 20 quests before 7am.',
    tier: 'silver',
    group: 'secret',
    hidden: true,
    measure: (s) => countInHours(s, 5, 7),
    target: 20,
    unit: 'quest',
  },
  {
    key: 'weekend_warrior',
    name: 'Weekend Warrior',
    description: 'Clear 50 quests on a Saturday or Sunday.',
    tier: 'silver',
    group: 'secret',
    hidden: true,
    measure: (s) => countOnWeekdays(s, [0, 6]),
    target: 50,
    unit: 'quest',
  },
  {
    key: 'clean_slate',
    name: 'Clean Slate',
    description: 'Clear 15 quests in a single day.',
    tier: 'gold',
    group: 'secret',
    hidden: true,
    measure: bestDay,
    target: 15,
    unit: 'quest',
  },
  {
    key: 'honest_quitter',
    name: 'Honest',
    description: 'Skip 10 quests on purpose instead of letting them slide.',
    tier: 'bronze',
    group: 'secret',
    hidden: true,
    // §7 makes a skip break a streak exactly like a miss, so this rewards no exploit — it
    // rewards using the honest button rather than quietly ignoring the row.
    measure: (s) => s.skips.length,
    target: 10,
    unit: 'skip',
  },
  {
    key: 'comeback',
    name: 'Comeback',
    description: 'Start a new 7-day streak after breaking one.',
    tier: 'gold',
    group: 'secret',
    hidden: true,
    // Only meaningful once a streak has actually been lost: current is a *new* run, and the
    // record proves an older, longer one existed before it.
    measure: (s) =>
      s.globalStreak.longest > s.globalStreak.current ? s.globalStreak.current : 0,
    target: 7,
    unit: 'day',
  },
];

// ---- Evaluation -----------------------------------------------------------------------

export function evaluateBadge(rule: BadgeRule, snapshot: BadgeSnapshot): BadgeStatus {
  const value = rule.measure(snapshot);
  return {
    rule,
    value,
    unlocked: value >= rule.target,
    progress: rule.target <= 0 ? 1 : Math.max(0, Math.min(value / rule.target, 1)),
  };
}

export function evaluateBadges(snapshot: BadgeSnapshot): BadgeStatus[] {
  return BADGES.map((rule) => evaluateBadge(rule, snapshot));
}

/**
 * Keys that are unlocked *now* but were not already recorded.
 *
 * The already-unlocked set is passed in rather than derived, because unlocking is a one-way
 * door: undoing today's completion must never revoke a badge earned in March. That is the same
 * argument §7 makes for `longest_streak`, and it is why this returns *new* keys instead of
 * "the set that currently qualifies".
 */
export function newlyUnlocked(
  snapshot: BadgeSnapshot,
  alreadyUnlocked: ReadonlySet<string>
): string[] {
  return evaluateBadges(snapshot)
    .filter((s) => s.unlocked && !alreadyUnlocked.has(s.rule.key))
    .map((s) => s.rule.key);
}

const TIER_ORDER: Record<BadgeTier, number> = { bronze: 0, silver: 1, gold: 2, legend: 3 };

/** Gallery order: unlocked first (rarest first), then locked by how close they are. */
export function sortForGallery(statuses: BadgeStatus[]): BadgeStatus[] {
  return [...statuses].sort((a, b) => {
    if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
    if (a.unlocked) return TIER_ORDER[b.rule.tier] - TIER_ORDER[a.rule.tier];
    // A hidden badge you have not found should not sit at the top of the locked list
    // advertising how close you are — that is most of the way to not being hidden.
    if (!!a.rule.hidden !== !!b.rule.hidden) return a.rule.hidden ? 1 : -1;
    return b.progress - a.progress;
  });
}
