import { describe, expect, it } from 'vitest';
import {
  computeGlobalStreak,
  computeHabitStreak,
  isStreakAtRisk,
  mergeLongest,
} from '../streaks';
import type { Schedule } from '../../types';

const daily: Schedule = { freq: 'daily' };
// Sunday = 0 … Saturday = 6
const monWedFri: Schedule = { freq: 'custom', days: [1, 3, 5] };

const d = (key: string) => {
  const [y, m, day] = key.split('-').map(Number);
  return new Date(y, m - 1, day);
};
const days = (...keys: string[]) => new Set(keys);

describe('computeHabitStreak — daily', () => {
  it('is empty with no completions', () => {
    const s = computeHabitStreak(daily, days(), '2026-03-01', d('2026-03-05'));
    expect(s).toMatchObject({ current: 0, longest: 0, resetCount: 0, lastActiveDay: null });
  });

  it('counts consecutive days', () => {
    const s = computeHabitStreak(
      daily,
      days('2026-03-01', '2026-03-02', '2026-03-03'),
      '2026-03-01',
      d('2026-03-03')
    );
    expect(s.current).toBe(3);
    expect(s.longest).toBe(3);
    expect(s.resetCount).toBe(0);
    expect(s.lastActiveDay).toBe('2026-03-03');
  });

  // The rule that makes the feature humane rather than punishing.
  it('does NOT break on today when today is still unfinished', () => {
    const s = computeHabitStreak(
      daily,
      days('2026-03-01', '2026-03-02'),
      '2026-03-01',
      d('2026-03-03') // today, not yet done
    );
    expect(s.current).toBe(2);
    expect(s.resetCount).toBe(0);
    expect(s.breaks).toHaveLength(0);
  });

  it('breaks on a missed day that is over, recording how long the streak was', () => {
    const s = computeHabitStreak(
      daily,
      days('2026-03-01', '2026-03-02', '2026-03-04'),
      '2026-03-01',
      d('2026-03-04')
    );
    expect(s.breaks).toEqual([{ day: '2026-03-03', brokenLength: 2 }]);
    expect(s.resetCount).toBe(1);
    expect(s.current).toBe(1); // rebuilt on the 4th
    expect(s.longest).toBe(2); // the run before the break is still the record
  });

  // The whole reason state is derived rather than incremented.
  it('detects several days of absence retroactively, as one break', () => {
    const s = computeHabitStreak(
      daily,
      days('2026-03-01', '2026-03-02', '2026-03-03'),
      '2026-03-01',
      d('2026-03-08') // came back five days later
    );
    expect(s.current).toBe(0);
    expect(s.longest).toBe(3);
    // One break, not one per missed day: a streak already at 0 cannot break again.
    expect(s.resetCount).toBe(1);
    expect(s.breaks).toEqual([{ day: '2026-03-04', brokenLength: 3 }]);
  });

  it('keeps longest across multiple breaks', () => {
    const s = computeHabitStreak(
      daily,
      days('2026-03-01', '2026-03-02', '2026-03-03', '2026-03-05', '2026-03-08'),
      '2026-03-01',
      d('2026-03-08')
    );
    expect(s.longest).toBe(3);
    expect(s.resetCount).toBe(2);
    expect(s.current).toBe(1);
  });
});

describe('computeHabitStreak — custom schedule', () => {
  // 2026-03-02 is a Monday.
  it('ignores days the habit is not scheduled for', () => {
    const s = computeHabitStreak(
      monWedFri,
      days('2026-03-02', '2026-03-04', '2026-03-06'), // Mon, Wed, Fri
      '2026-03-02',
      d('2026-03-06')
    );
    expect(s.current).toBe(3);
    expect(s.resetCount).toBe(0); // the empty Tue/Thu are not misses
  });

  it('breaks only when a scheduled day is missed', () => {
    const s = computeHabitStreak(
      monWedFri,
      days('2026-03-02', '2026-03-06'), // did Mon, missed Wed, did Fri
      '2026-03-02',
      d('2026-03-06')
    );
    expect(s.breaks).toEqual([{ day: '2026-03-04', brokenLength: 1 }]);
    expect(s.current).toBe(1);
  });

  it('is not broken by a weekend when nothing is scheduled', () => {
    const s = computeHabitStreak(
      monWedFri,
      days('2026-03-06', '2026-03-09'), // Fri then the following Mon
      '2026-03-06',
      d('2026-03-09')
    );
    expect(s.current).toBe(2);
    expect(s.resetCount).toBe(0);
  });
});

describe('computeGlobalStreak', () => {
  it('counts any day with activity and breaks on a quiet day', () => {
    const s = computeGlobalStreak(
      days('2026-03-01', '2026-03-02', '2026-03-04', '2026-03-05'),
      '2026-03-01',
      d('2026-03-05')
    );
    expect(s.current).toBe(2);
    expect(s.longest).toBe(2);
    expect(s.resetCount).toBe(1);
    expect(s.breaks).toEqual([{ day: '2026-03-03', brokenLength: 2 }]);
  });

  it('treats an unfinished today as pending, not a break', () => {
    const s = computeGlobalStreak(days('2026-03-01', '2026-03-02'), '2026-03-01', d('2026-03-03'));
    expect(s.current).toBe(2);
    expect(s.resetCount).toBe(0);
  });
});

describe('DST safety', () => {
  // US spring-forward 2026-03-08 and fall-back 2026-11-01. Day stepping must use calendar
  // constructors, never +86_400_000ms, or these silently skip or repeat a day (D4).
  it('walks across spring forward without losing a day', () => {
    const keys = ['2026-03-06', '2026-03-07', '2026-03-08', '2026-03-09', '2026-03-10'];
    const s = computeGlobalStreak(days(...keys), '2026-03-06', d('2026-03-10'));
    expect(s.current).toBe(5);
    expect(s.resetCount).toBe(0);
  });

  it('walks across fall back without double-counting', () => {
    const keys = ['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02'];
    const s = computeGlobalStreak(days(...keys), '2026-10-30', d('2026-11-02'));
    expect(s.current).toBe(4);
    expect(s.resetCount).toBe(0);
  });
});

describe('edges', () => {
  it('handles a start day in the future', () => {
    const s = computeHabitStreak(daily, days(), '2026-05-01', d('2026-03-01'));
    expect(s).toMatchObject({ current: 0, longest: 0, resetCount: 0 });
  });

  it('handles a single day that is both start and today', () => {
    const s = computeHabitStreak(daily, days('2026-03-01'), '2026-03-01', d('2026-03-01'));
    expect(s.current).toBe(1);
    expect(s.longest).toBe(1);
  });

  it('a never-started habit has no break on its first, still-open day', () => {
    const s = computeHabitStreak(daily, days(), '2026-03-01', d('2026-03-01'));
    expect(s.resetCount).toBe(0);
  });
});

describe('isStreakAtRisk', () => {
  it('is true on a scheduled day that is still undone', () => {
    expect(isStreakAtRisk(daily, days('2026-03-01'), d('2026-03-02'))).toBe(true);
  });

  it('is false once today is done', () => {
    expect(isStreakAtRisk(daily, days('2026-03-02'), d('2026-03-02'))).toBe(false);
  });

  it('is false on a day the habit is not scheduled for', () => {
    // 2026-03-03 is a Tuesday; monWedFri does not include it.
    expect(isStreakAtRisk(monWedFri, days(), d('2026-03-03'))).toBe(false);
  });
});

describe('mergeLongest', () => {
  it('never lets a record decrease — undoing today must not erase last month', () => {
    expect(mergeLongest(12, 3)).toBe(12);
    expect(mergeLongest(2, 9)).toBe(9);
  });
});

// Calendar backfill can log work onto days *before* the habit was created — "I've been running
// all week, let me record it". `createdDay` is what keeps that coherent: pre-creation days are
// due only when something was actually logged against them, which is precisely what the calendar
// already draws for those days (questDayState returns 'upcoming', never 'missed').
describe('computeHabitStreak — backfill before the habit existed', () => {
  it('counts a backfilled day that predates creation', () => {
    const s = computeHabitStreak(
      daily,
      days('2026-03-03', '2026-03-04', '2026-03-05'),
      '2026-03-03', // walk starts at the earliest completion
      d('2026-03-05'),
      '2026-03-05' // …but the habit was only created today
    );
    expect(s).toMatchObject({ current: 3, longest: 3, lastActiveDay: '2026-03-05' });
  });

  it('does not treat an empty pre-creation day as a miss', () => {
    // Nothing logged on the 4th. Before creation that is not a failure, so the run survives.
    const s = computeHabitStreak(
      daily,
      days('2026-03-03', '2026-03-05'),
      '2026-03-03',
      d('2026-03-05'),
      '2026-03-05'
    );
    expect(s).toMatchObject({ current: 2, resetCount: 0, breaks: [] });
  });

  it('still breaks on a missed day once the habit exists', () => {
    // Created on the 3rd, so the empty 4th is a real miss and resets the run.
    const s = computeHabitStreak(
      daily,
      days('2026-03-03', '2026-03-05'),
      '2026-03-03',
      d('2026-03-05'),
      '2026-03-03'
    );
    expect(s).toMatchObject({ current: 1, longest: 1, resetCount: 1 });
    expect(s.breaks).toEqual([{ day: '2026-03-04', brokenLength: 1 }]);
  });

  it('defaults createdDay to fromDay, leaving existing callers unchanged', () => {
    const withDefault = computeHabitStreak(
      daily,
      days('2026-03-03', '2026-03-05'),
      '2026-03-03',
      d('2026-03-05')
    );
    const explicit = computeHabitStreak(
      daily,
      days('2026-03-03', '2026-03-05'),
      '2026-03-03',
      d('2026-03-05'),
      '2026-03-03'
    );
    expect(withDefault).toEqual(explicit);
  });

  it('skips unscheduled pre-creation days regardless of completions', () => {
    // A Tuesday completion on a Mon/Wed/Fri habit never counts, before creation or after.
    const s = computeHabitStreak(
      monWedFri,
      days('2026-03-03', '2026-03-04', '2026-03-06'), // Tue, Wed, Fri
      '2026-03-03',
      d('2026-03-06'),
      '2026-03-06'
    );
    expect(s).toMatchObject({ current: 2, longest: 2, lastActiveDay: '2026-03-06' });
  });
});
