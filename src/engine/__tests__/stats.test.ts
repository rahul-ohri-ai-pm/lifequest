import {
  activeDaysInLast,
  distinctActiveDays,
  lastNDayCounts,
  rangeSummary,
  scheduledOutcomes,
  skillBreakdown,
  topTasks,
  weekStrip,
  xpOnDay,
} from '../stats';
import type { Completion, Skip, Task } from '../../types';

const TODAY = new Date(2026, 6, 11, 15, 0); // Sat 2026-07-11

function completion(taskId: string, y: number, m: number, d: number, xp = 10): Completion {
  return {
    id: `${taskId}-${y}${m}${d}-${Math.random()}`,
    taskId,
    completedAt: new Date(y, m, d, 12, 0).toISOString(),
    progressCount: null,
    xpAwarded: xp,
    createdAt: new Date(y, m, d, 12, 0).toISOString(),
  };
}

function habit(id: string, days: number[] | 'daily', createdY = 2026, createdM = 5, createdD = 1): Task {
  return {
    id,
    title: id,
    notes: null,
    type: 'habit',
    difficulty: 'easy',
    schedule: days === 'daily' ? { freq: 'daily' } : { freq: 'custom', days },
    targetCount: null,
    dueAt: null,
    reminderAt: null,
    status: 'active',
    createdAt: new Date(createdY, createdM, createdD).toISOString(),
    updatedAt: new Date(createdY, createdM, createdD).toISOString(),
  };
}

describe('lastNDayCounts', () => {
  it('returns n entries oldest-first ending today, zero-filled', () => {
    const cs = [completion('a', 2026, 6, 11), completion('a', 2026, 6, 11), completion('b', 2026, 6, 9)];
    const out = lastNDayCounts(cs, 3, TODAY);
    expect(out.map((d) => d.dayKey)).toEqual(['2026-07-09', '2026-07-10', '2026-07-11']);
    expect(out.map((d) => d.count)).toEqual([1, 0, 2]);
  });

  it('ignores completions older than the window', () => {
    const out = lastNDayCounts([completion('a', 2026, 5, 1)], 7, TODAY);
    expect(out.every((d) => d.count === 0)).toBe(true);
  });
});

describe('activeDaysInLast / distinctActiveDays', () => {
  const cs = [
    completion('a', 2026, 6, 11),
    completion('b', 2026, 6, 11), // same day
    completion('a', 2026, 6, 8),
    completion('a', 2026, 5, 1), // outside 7-day window
  ];
  it('counts distinct active days in window', () => {
    expect(activeDaysInLast(cs, 7, TODAY)).toBe(2);
  });
  it('counts all-time distinct days', () => {
    expect(distinctActiveDays(cs)).toBe(3);
  });
});

describe('scheduledOutcomes', () => {
  it('classifies done, skipped, missed on scheduled days only', () => {
    // Mon/Wed/Fri habit; window last 7 days (Sun Jul 5 .. Sat Jul 11)
    // Scheduled: Mon 6, Wed 8, Fri 10 → done Mon, skipped Wed, missed Fri
    const t = habit('h1', [1, 3, 5]);
    const skips: Skip[] = [{ id: 's1', taskId: 'h1', day: '2026-07-08', createdAt: '' }];
    const out = scheduledOutcomes([t], [completion('h1', 2026, 6, 6)], skips, 7, TODAY);
    expect(out).toEqual({ scheduled: 3, done: 1, skipped: 1, missed: 1 });
  });

  it('today is never missed; days before creation never count', () => {
    const t = habit('h2', 'daily', 2026, 6, 10); // created Jul 10
    const out = scheduledOutcomes([t], [], [], 7, TODAY);
    // Scheduled: Jul 10 (missed) + Jul 11 today (not missed)
    expect(out.scheduled).toBe(2);
    expect(out.missed).toBe(1);
  });

  it('ignores unscheduled and archived tasks', () => {
    const todo = { ...habit('t1', 'daily'), type: 'todo' as const, schedule: null };
    const archived = { ...habit('h3', 'daily'), status: 'archived' as const };
    const out = scheduledOutcomes([todo, archived], [], [], 7, TODAY);
    expect(out.scheduled).toBe(0);
  });

  it('counts scheduled counted tasks too (schedule is orthogonal to type)', () => {
    const countedHabit = { ...habit('c1', [1, 3, 5]), type: 'counted' as const, targetCount: 8 };
    const out = scheduledOutcomes([countedHabit], [completion('c1', 2026, 6, 6)], [], 7, TODAY);
    expect(out.scheduled).toBe(3); // Mon 6, Wed 8, Fri 10
    expect(out.done).toBe(1);
  });
});

describe('topTasks', () => {
  it('ranks by count then xp within the window, limited', () => {
    const cs = [
      completion('a', 2026, 6, 10, 5),
      completion('a', 2026, 6, 11, 5),
      completion('b', 2026, 6, 11, 100),
      completion('c', 2026, 6, 11, 50),
      completion('old', 2026, 4, 1, 100),
    ];
    const out = topTasks(cs, 30, TODAY, 2);
    expect(out.map((t) => t.taskId)).toEqual(['a', 'b']);
    expect(out[0]).toEqual({ taskId: 'a', count: 2, xp: 10 });
  });
});

describe('topTasks with null days', () => {
  it('includes all history', () => {
    const cs = [completion('old', 2025, 0, 1, 100), completion('new', 2026, 6, 11, 5)];
    expect(topTasks(cs, null, TODAY).map((t) => t.taskId)).toEqual(['old', 'new']);
  });
});

describe('skillBreakdown', () => {
  const links = [
    { taskId: 'a', skillId: 'fitness' },
    { taskId: 'a', skillId: 'social' }, // task a tagged with 2 skills
    { taskId: 'b', skillId: 'fitness' },
  ];
  it('splits XP across tags and aggregates per skill', () => {
    const cs = [completion('a', 2026, 6, 11, 25), completion('b', 2026, 6, 10, 10)];
    const out = skillBreakdown(cs, links, 30, TODAY);
    // fitness: 13 (a's split) + 10 (b) = 23 over 2 completions; social: 13 over 1
    expect(out[0]).toEqual({ skillId: 'fitness', count: 2, xp: 23 });
    expect(out[1]).toEqual({ skillId: 'social', count: 1, xp: 13 });
  });
  it('ignores untagged completions and respects the window', () => {
    const cs = [completion('untagged', 2026, 6, 11, 50), completion('a', 2025, 0, 1, 25)];
    expect(skillBreakdown(cs, links, 30, TODAY)).toEqual([]);
    expect(skillBreakdown(cs, links, null, TODAY)).toHaveLength(2); // all-time includes old
  });
});

describe('xpOnDay', () => {
  it('sums xp for the local day only', () => {
    const cs = [completion('a', 2026, 6, 11, 25), completion('b', 2026, 6, 11, 10), completion('c', 2026, 6, 10, 99)];
    expect(xpOnDay(cs, TODAY)).toBe(35);
  });
});

describe('rangeSummary', () => {
  const today = new Date(2026, 2, 10); // 2026-03-10
  const c = (day: string, xp: number, id = day): Completion => ({
    id,
    taskId: 't',
    completedAt: new Date(`${day}T12:00:00`).toISOString(),
    progressCount: null,
    xpAwarded: xp,
    createdAt: new Date(`${day}T12:00:00`).toISOString(),
  });
  const rows = [
    c('2026-03-10', 25, 'a'), // today
    c('2026-03-10', 10, 'b'), // same day, second completion
    c('2026-03-08', 25, 'c'), // 3 days ago
    c('2026-02-20', 50, 'd'), // ~18 days ago
    c('2025-11-01', 100, 'e'), // last year
  ];

  it('day = today only', () => {
    expect(rangeSummary(rows, 1, today)).toMatchObject({ completions: 2, xp: 35, activeDays: 1 });
  });

  it('week includes the boundary day', () => {
    // 7 days ending today = 2026-03-04..03-10, so the 03-08 row is in.
    expect(rangeSummary(rows, 7, today)).toMatchObject({ completions: 3, xp: 60, activeDays: 2 });
  });

  it('month reaches back 30 days', () => {
    expect(rangeSummary(rows, 30, today)).toMatchObject({ completions: 4, xp: 110, activeDays: 3 });
  });

  it('all time counts everything and has no rate', () => {
    const s = rangeSummary(rows, null, today);
    expect(s).toMatchObject({ completions: 5, xp: 210, activeDays: 4 });
    expect(s.activeRate).toBeNull();
  });

  it('reports the active-day rate within a bounded range', () => {
    expect(rangeSummary(rows, 7, today).activeRate).toBeCloseTo(2 / 7);
  });

  it('is empty for an empty log', () => {
    expect(rangeSummary([], 7, today)).toMatchObject({ completions: 0, xp: 0, activeDays: 0 });
  });
});

describe('weekStrip', () => {
  // Wed 2026-03-11. Week starting Monday = 03-09 .. 03-15.
  const wed = new Date(2026, 2, 11);

  it('returns the seven days of the Monday-start week', () => {
    const week = weekStrip(new Set(), wed);
    expect(week.map((d) => d.dayKey)).toEqual([
      '2026-03-09', '2026-03-10', '2026-03-11', '2026-03-12',
      '2026-03-13', '2026-03-14', '2026-03-15',
    ]);
    expect(week.map((d) => d.weekday)).toEqual([1, 2, 3, 4, 5, 6, 0]);
    expect(week.map((d) => d.dayOfMonth)).toEqual([9, 10, 11, 12, 13, 14, 15]);
  });

  it('marks today, and only today', () => {
    expect(weekStrip(new Set(), wed).filter((d) => d.isToday).map((d) => d.dayKey)).toEqual([
      '2026-03-11',
    ]);
  });

  it('separates future days from missed ones', () => {
    const week = weekStrip(new Set(), wed);
    expect(week.filter((d) => d.isFuture).map((d) => d.dayOfMonth)).toEqual([12, 13, 14, 15]);
    // Today is not future, so a day with nothing logged yet is still "not future".
    expect(week[2].isFuture).toBe(false);
  });

  it('flags the days that had a completion', () => {
    const week = weekStrip(new Set(['2026-03-09', '2026-03-11', '2026-04-01']), wed);
    expect(week.filter((d) => d.active).map((d) => d.dayOfMonth)).toEqual([9, 11]);
  });

  it('handles Sunday, where a Monday-start week runs backwards six days', () => {
    const sun = new Date(2026, 2, 15);
    const week = weekStrip(new Set(), sun);
    expect(week[0].dayKey).toBe('2026-03-09');
    expect(week[6].isToday).toBe(true);
    expect(week.some((d) => d.isFuture)).toBe(false);
  });

  it('honours a Sunday-start week', () => {
    const week = weekStrip(new Set(), wed, 0);
    expect(week[0].dayKey).toBe('2026-03-08');
    expect(week[0].weekday).toBe(0);
  });

  it('crosses a month boundary without renumbering', () => {
    // Wed 2026-04-01 -> week starts Mon 2026-03-30.
    const week = weekStrip(new Set(), new Date(2026, 3, 1));
    expect(week.map((d) => d.dayOfMonth)).toEqual([30, 31, 1, 2, 3, 4, 5]);
    expect(week[0].dayKey).toBe('2026-03-30');
  });
});
