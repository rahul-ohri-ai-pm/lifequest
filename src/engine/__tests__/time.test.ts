import { addDays, dateFromDayKey, dayKeyFor, dayWindow, isScheduledDay } from '../time';

describe('dayKeyFor', () => {
  it('uses local date components with zero padding', () => {
    expect(dayKeyFor(new Date(2026, 0, 5, 12, 0))).toBe('2026-01-05');
  });

  it('keeps 23:59 on the same local day (no UTC shift)', () => {
    expect(dayKeyFor(new Date(2026, 6, 9, 23, 59, 59))).toBe('2026-07-09');
  });

  it('rolls to the next day at 00:01', () => {
    expect(dayKeyFor(new Date(2026, 6, 10, 0, 1))).toBe('2026-07-10');
  });
});

describe('addDays', () => {
  it('crosses month boundaries', () => {
    expect(dayKeyFor(addDays(new Date(2026, 0, 31), 1))).toBe('2026-02-01');
  });

  it('handles leap years', () => {
    expect(dayKeyFor(addDays(new Date(2024, 1, 28), 1))).toBe('2024-02-29');
    expect(dayKeyFor(addDays(new Date(2025, 1, 28), 1))).toBe('2025-03-01');
  });

  it('negative days go backwards', () => {
    expect(dayKeyFor(addDays(new Date(2026, 2, 1), -1))).toBe('2026-02-28');
  });

  it('advances exactly one calendar day regardless of wall-clock hours (DST-safe)', () => {
    // 500 consecutive days — every step must be exactly one calendar day,
    // covering DST transitions in any timezone the tests run in.
    let d = new Date(2026, 0, 1);
    for (let i = 0; i < 500; i++) {
      const next = addDays(d, 1);
      expect(next.getDate()).not.toBe(d.getDate());
      expect(dayKeyFor(next) > dayKeyFor(d)).toBe(true);
      d = next;
    }
    expect(dayKeyFor(d)).toBe('2027-05-16');
  });
});

describe('dateFromDayKey', () => {
  it('round-trips with dayKeyFor', () => {
    expect(dayKeyFor(dateFromDayKey('2026-07-09'))).toBe('2026-07-09');
    expect(dayKeyFor(dateFromDayKey('2024-02-29'))).toBe('2024-02-29');
  });
});

describe('dayWindow', () => {
  it('spans exactly the local day containing the date', () => {
    const { startIso, endIso } = dayWindow(new Date(2026, 6, 9, 15, 30));
    const start = new Date(startIso);
    const end = new Date(endIso);
    expect(dayKeyFor(start)).toBe('2026-07-09');
    expect(dayKeyFor(end)).toBe('2026-07-10');
    expect(start.getHours()).toBe(0);
    expect(end.getHours()).toBe(0);
  });

  it('a timestamp at 23:59 falls inside its own day window', () => {
    const at = new Date(2026, 6, 9, 23, 59, 59);
    const { startIso, endIso } = dayWindow(at);
    const iso = at.toISOString();
    expect(iso >= startIso && iso < endIso).toBe(true);
  });
});

describe('isScheduledDay', () => {
  it('daily schedules match every day', () => {
    expect(isScheduledDay({ freq: 'daily' }, new Date(2026, 6, 9))).toBe(true);
    expect(isScheduledDay({ freq: 'daily' }, new Date(2026, 6, 12))).toBe(true);
  });

  it('custom schedules match only listed weekdays (0=Sun..6=Sat)', () => {
    const mwf = { freq: 'custom' as const, days: [1, 3, 5] };
    expect(isScheduledDay(mwf, new Date(2026, 6, 6))).toBe(true); // Mon
    expect(isScheduledDay(mwf, new Date(2026, 6, 7))).toBe(false); // Tue
    expect(isScheduledDay(mwf, new Date(2026, 6, 8))).toBe(true); // Wed
    expect(isScheduledDay(mwf, new Date(2026, 6, 12))).toBe(false); // Sun
  });
});
