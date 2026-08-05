import { describe, expect, it } from 'vitest';
import {
  BADGES,
  evaluateBadge,
  evaluateBadges,
  newlyUnlocked,
  sortForGallery,
  type BadgeSnapshot,
} from '../badges';
import type { Completion, Skip, Task } from '../../types';

// Local-time ISO, so an hour-of-day rule is tested against the hour the *user* saw — the same
// trap dayKeyFor exists to avoid (D4). Building these with toISOString() would silently shift
// the night-owl cases across midnight in any non-UTC zone.
function localIso(y: number, m: number, d: number, h = 12, min = 0): string {
  return new Date(y, m - 1, d, h, min).toISOString();
}

let seq = 0;
function completion(day: string, opts: { hour?: number; xp?: number; taskId?: string } = {}): Completion {
  const [y, m, d] = day.split('-').map(Number);
  return {
    id: `c${++seq}`,
    taskId: opts.taskId ?? 't1',
    completedAt: localIso(y, m, d, opts.hour ?? 12),
    progressCount: null,
    xpAwarded: opts.xp ?? 25,
    createdAt: localIso(y, m, d, opts.hour ?? 12),
  };
}

function task(id: string, over: Partial<Task> = {}): Task {
  return {
    id,
    title: id,
    notes: null,
    type: 'todo',
    difficulty: 'medium',
    schedule: null,
    targetCount: null,
    dueAt: null,
    reminderAt: null,
    status: 'active',
    createdAt: localIso(2026, 1, 1),
    updatedAt: localIso(2026, 1, 1),
    ...over,
  };
}

function snapshot(over: Partial<BadgeSnapshot> = {}): BadgeSnapshot {
  return {
    completions: [],
    skips: [],
    tasks: [],
    totalXp: 0,
    skillXp: {},
    globalStreak: { current: 0, longest: 0 },
    bestHabitStreak: 0,
    now: new Date(2026, 5, 1),
    ...over,
  };
}

const byKey = (key: string) => BADGES.find((b) => b.key === key)!;
const statusOf = (key: string, s: BadgeSnapshot) => evaluateBadge(byKey(key), s);

describe('the catalogue itself', () => {
  it('ships at least 25 badges, including hidden ones', () => {
    expect(BADGES.length).toBeGreaterThanOrEqual(25);
    expect(BADGES.filter((b) => b.hidden).length).toBeGreaterThan(0);
  });

  it('has unique keys', () => {
    const keys = BADGES.map((b) => b.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('has a positive target and a unit on every badge', () => {
    for (const b of BADGES) {
      expect(b.target, b.key).toBeGreaterThan(0);
      expect(b.unit.length, b.key).toBeGreaterThan(0);
      expect(b.description.length, b.key).toBeGreaterThan(0);
    }
  });

  it('unlocks nothing at all on a brand-new character', () => {
    // A gallery that congratulates you before you have done anything is worse than no gallery.
    expect(evaluateBadges(snapshot()).filter((s) => s.unlocked)).toEqual([]);
  });
});

describe('evaluateBadge', () => {
  it('reports progress toward a locked badge', () => {
    const s = snapshot({ completions: [completion('2026-05-01'), completion('2026-05-02')] });
    const st = statusOf('quests_10', s);
    expect(st.unlocked).toBe(false);
    expect(st.value).toBe(2);
    expect(st.progress).toBeCloseTo(0.2);
  });

  it('unlocks exactly at the target, not one past it', () => {
    const nine = Array.from({ length: 9 }, () => completion('2026-05-01'));
    expect(statusOf('quests_10', snapshot({ completions: nine })).unlocked).toBe(false);
    expect(
      statusOf('quests_10', snapshot({ completions: [...nine, completion('2026-05-01')] })).unlocked
    ).toBe(true);
  });

  it('clamps progress at 1 once the target is passed', () => {
    const s = snapshot({ completions: Array.from({ length: 40 }, () => completion('2026-05-01')) });
    expect(statusOf('quests_10', s).progress).toBe(1);
  });
});

describe('consistency badges', () => {
  it('reads the streak record, not the current run', () => {
    // A broken streak must not revoke the badge it earned — §7's longest-never-decreases rule
    // carried through to badges.
    const s = snapshot({ globalStreak: { current: 0, longest: 8 } });
    expect(statusOf('streak_7', s).unlocked).toBe(true);
    expect(statusOf('streak_30', s).unlocked).toBe(false);
  });

  it('counts active days as distinct days, not completions', () => {
    const s = snapshot({
      completions: [
        completion('2026-05-01'),
        completion('2026-05-01'),
        completion('2026-05-01'),
        completion('2026-05-02'),
      ],
    });
    expect(statusOf('active_30', s).value).toBe(2);
  });

  it('tracks the best single habit streak separately from the global one', () => {
    const s = snapshot({ globalStreak: { current: 40, longest: 40 }, bestHabitStreak: 21 });
    expect(statusOf('habit_streak_21', s).unlocked).toBe(true);
    expect(statusOf('habit_streak_21', snapshot({ bestHabitStreak: 20 })).unlocked).toBe(false);
  });
});

describe('volume badges', () => {
  it('finds the best single day', () => {
    const s = snapshot({
      completions: [
        ...Array.from({ length: 11 }, () => completion('2026-05-03')),
        ...Array.from({ length: 4 }, () => completion('2026-05-04')),
      ],
    });
    expect(statusOf('big_day_10', s).unlocked).toBe(true);
    expect(statusOf('big_day_10', s).value).toBe(11);
    expect(statusOf('clean_slate', s).unlocked).toBe(false); // needs 15
  });

  it('counts XP from the character total, not by summing the log', () => {
    // The two can legitimately differ: a counted task logs several rows and only one carries
    // XP, and bonus XP (Phase 3 goals) never appears as a completion at all.
    expect(statusOf('xp_1000', snapshot({ totalXp: 1000 })).unlocked).toBe(true);
  });
});

describe('mastery badges', () => {
  it('derives character level from the XP curve rather than trusting a stored number', () => {
    // 1120 XP is exactly level 5 on the §7 curve.
    expect(statusOf('level_5', snapshot({ totalXp: 1120 })).unlocked).toBe(true);
    expect(statusOf('level_5', snapshot({ totalXp: 1119 })).unlocked).toBe(false);
  });

  it('counts only categories that have actually earned XP', () => {
    const s = snapshot({ skillXp: { a: 100, b: 25, c: 0, d: 0, e: 0 } });
    expect(statusOf('breadth_5', s).value).toBe(2);
  });

  it('takes the best single category level, not the sum', () => {
    const s = snapshot({ skillXp: { a: 3160, b: 10 } }); // 3160 = level 10
    expect(statusOf('skill_level_10', s).unlocked).toBe(true);
  });

  it('counts epic completions by joining through the task list', () => {
    const s = snapshot({
      tasks: [task('epic1', { difficulty: 'epic' }), task('normal', { difficulty: 'medium' })],
      completions: [
        ...Array.from({ length: 25 }, () => completion('2026-05-01', { taskId: 'epic1' })),
        completion('2026-05-01', { taskId: 'normal' }),
      ],
    });
    expect(statusOf('epic_25', s).unlocked).toBe(true);
    expect(statusOf('epic_25', s).value).toBe(25);
  });

  it('ignores archived quests when counting what is on the go', () => {
    const s = snapshot({
      tasks: [
        ...Array.from({ length: 9 }, (_, i) => task(`a${i}`)),
        task('archived', { status: 'archived' }),
      ],
    });
    expect(statusOf('builder_10', s).unlocked).toBe(false);
  });
});

describe('secret badges', () => {
  it('counts night-owl completions in local hours', () => {
    const s = snapshot({
      completions: [
        ...Array.from({ length: 20 }, () => completion('2026-05-01', { hour: 2 })),
        completion('2026-05-01', { hour: 13 }),
      ],
    });
    expect(statusOf('night_owl', s).unlocked).toBe(true);
    expect(statusOf('night_owl', s).value).toBe(20);
  });

  it('does not let an early-bird completion count as a night owl', () => {
    const s = snapshot({ completions: Array.from({ length: 20 }, () => completion('2026-05-01', { hour: 6 })) });
    expect(statusOf('early_bird', s).unlocked).toBe(true);
    expect(statusOf('night_owl', s).value).toBe(0);
  });

  it('counts weekend completions by weekday', () => {
    // 2026-05-02 is a Saturday, 2026-05-03 a Sunday, 2026-05-04 a Monday.
    const s = snapshot({
      completions: [
        ...Array.from({ length: 30 }, () => completion('2026-05-02')),
        ...Array.from({ length: 20 }, () => completion('2026-05-03')),
        ...Array.from({ length: 40 }, () => completion('2026-05-04')),
      ],
    });
    expect(statusOf('weekend_warrior', s).value).toBe(50);
    expect(statusOf('weekend_warrior', s).unlocked).toBe(true);
  });

  it('awards Comeback only after a streak has actually been broken', () => {
    // A first, unbroken 7-day run is not a comeback.
    expect(statusOf('comeback', snapshot({ globalStreak: { current: 7, longest: 7 } })).unlocked).toBe(false);
    // A 7-day run that follows a longer, lost one is.
    expect(statusOf('comeback', snapshot({ globalStreak: { current: 7, longest: 20 } })).unlocked).toBe(true);
  });

  it('counts deliberate skips', () => {
    const skips: Skip[] = Array.from({ length: 10 }, (_, i) => ({
      id: `s${i}`,
      taskId: 't1',
      day: '2026-05-01',
      createdAt: localIso(2026, 5, 1),
    }));
    expect(statusOf('honest_quitter', snapshot({ skips })).unlocked).toBe(true);
  });
});

describe('newlyUnlocked', () => {
  it('returns only keys that were not already recorded', () => {
    const s = snapshot({ completions: [completion('2026-05-01')], globalStreak: { current: 1, longest: 3 } });
    const all = newlyUnlocked(s, new Set());
    expect(all).toContain('first_light');
    expect(all).toContain('streak_3');
    expect(newlyUnlocked(s, new Set(all))).toEqual([]);
  });

  it('never revokes a badge whose condition no longer holds', () => {
    // The undo case: a badge earned in March must survive deleting today's completion.
    const earned = new Set(['first_light', 'quests_10']);
    expect(newlyUnlocked(snapshot(), earned)).toEqual([]);
  });
});

describe('sortForGallery', () => {
  it('puts unlocked first, rarest first, then locked by closeness', () => {
    const s = snapshot({
      completions: Array.from({ length: 10 }, () => completion('2026-05-01')),
      globalStreak: { current: 3, longest: 3 },
    });
    const sorted = sortForGallery(evaluateBadges(s));
    const firstLocked = sorted.findIndex((x) => !x.unlocked);
    expect(sorted.slice(0, firstLocked).every((x) => x.unlocked)).toBe(true);
    // Within the unlocked block, tier never increases.
    const order = { bronze: 0, silver: 1, gold: 2, legend: 3 } as const;
    const tiers = sorted.slice(0, firstLocked).map((x) => order[x.rule.tier]);
    expect([...tiers].sort((a, b) => b - a)).toEqual(tiers);
  });

  it('keeps undiscovered hidden badges below the locked ones', () => {
    const sorted = sortForGallery(evaluateBadges(snapshot()));
    const lastVisible = sorted.map((x) => !!x.rule.hidden).lastIndexOf(false);
    const firstHidden = sorted.map((x) => !!x.rule.hidden).indexOf(true);
    expect(firstHidden).toBeGreaterThan(lastVisible - 1);
  });
});
