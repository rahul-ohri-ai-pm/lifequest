import { BACKUP_FORMAT_VERSION, BackupValidationError, parseBackupPayload } from '../backup';

function validPayload() {
  return {
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: '2026-09-12T00:00:00.000Z',
    character: { totalXp: 100, level: 1, updatedAt: '2026-09-12T00:00:00.000Z' },
    tasks: [
      {
        id: 't1',
        title: 'Read',
        notes: null,
        type: 'habit',
        difficulty: 'easy',
        schedule: { freq: 'daily' },
        targetCount: null,
        dueAt: null,
        reminderAt: null,
        status: 'active',
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-01T00:00:00.000Z',
      },
    ],
    completions: [
      {
        id: 'c1',
        taskId: 't1',
        completedAt: '2026-09-12T09:00:00.000Z',
        progressCount: null,
        xpAwarded: 10,
        createdAt: '2026-09-12T09:00:00.000Z',
      },
    ],
    skips: [],
    skills: [
      {
        id: 's1',
        name: 'Reading',
        icon: 'reading' as string | null,
        color: '#8B5CF6' as string | null,
        totalXp: 10,
        level: 1,
        status: 'active',
        createdAt: '2026-09-01T00:00:00.000Z',
      },
    ],
    taskSkills: [{ taskId: 't1', skillId: 's1' }],
    streaks: [
      {
        id: 'st1',
        taskId: 't1',
        currentStreak: 1,
        longestStreak: 1,
        resetCount: 0,
        lastActiveDate: '2026-09-12',
        updatedAt: '2026-09-12T09:00:00.000Z',
      },
    ],
    streakResets: [] as Array<Record<string, unknown>>,
    badgeUnlocks: [{ badgeKey: 'first-quest', unlockedAt: '2026-09-01T00:00:00.000Z' }],
    settings: [{ key: 'theme', value: 'dark' }],
  };
}

describe('parseBackupPayload', () => {
  it('accepts a well-formed payload and round-trips every field', () => {
    const payload = parseBackupPayload(validPayload());
    expect(payload.character.totalXp).toBe(100);
    expect(payload.tasks).toHaveLength(1);
    expect(payload.tasks[0].schedule).toEqual({ freq: 'daily' });
    expect(payload.taskSkills).toEqual([{ taskId: 't1', skillId: 's1' }]);
    expect(payload.badgeUnlocks[0].badgeKey).toBe('first-quest');
  });

  it('rejects a non-object top level', () => {
    expect(() => parseBackupPayload('not json')).toThrow(BackupValidationError);
    expect(() => parseBackupPayload(null)).toThrow(BackupValidationError);
    expect(() => parseBackupPayload([1, 2, 3])).toThrow(BackupValidationError);
  });

  it('rejects a mismatched format version with a specific message', () => {
    const data = { ...validPayload(), formatVersion: 999 };
    expect(() => parseBackupPayload(data)).toThrow(/format version 999/);
  });

  it('rejects a missing array field', () => {
    const data: Record<string, unknown> = validPayload();
    delete data.completions;
    expect(() => parseBackupPayload(data)).toThrow(/completions must be an array/);
  });

  it('rejects a task with an unknown difficulty', () => {
    const data = validPayload();
    data.tasks[0].difficulty = 'legendary';
    expect(() => parseBackupPayload(data)).toThrow(/difficulty must be one of/);
  });

  it('rejects a task missing a required string field', () => {
    const data = validPayload();
    // @ts-expect-error deliberately malformed for the test
    data.tasks[0].title = 42;
    expect(() => parseBackupPayload(data)).toThrow(/title must be a string/);
  });

  it('rejects a completion with a non-numeric xpAwarded', () => {
    const data = validPayload();
    // @ts-expect-error deliberately malformed for the test
    data.completions[0].xpAwarded = '10';
    expect(() => parseBackupPayload(data)).toThrow(/xpAwarded must be a number/);
  });

  it('requires the day column on a streak reset (not part of the domain type)', () => {
    const data = validPayload();
    data.streakResets = [
      { id: 'r1', streakId: 'st1', brokenStreakLength: 3, resetAt: '2026-09-10T00:00:00.000Z' },
    ];
    expect(() => parseBackupPayload(data)).toThrow(/day must be a string/);
  });

  it('accepts null for nullable fields', () => {
    const data = validPayload();
    data.tasks[0].notes = null;
    data.tasks[0].dueAt = null;
    data.skills[0].icon = null;
    const payload = parseBackupPayload(data);
    expect(payload.tasks[0].notes).toBeNull();
    expect(payload.skills[0].icon).toBeNull();
  });
});
