import {
  activeDaysInLast,
  distinctActiveDays,
  lastNDayCounts,
  scheduledOutcomes,
  skillBreakdown,
  topTasks,
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
