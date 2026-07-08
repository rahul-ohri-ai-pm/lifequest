import { monthGrid } from '../calendar';

describe('monthGrid', () => {
  it('every week has exactly 7 cells and starts on Sunday', () => {
    const grid = monthGrid(2026, 6); // July 2026
    for (const week of grid) expect(week).toHaveLength(7);
    expect(grid[0][0].dayKey.endsWith('-28')).toBe(true); // Sun Jun 28
  });

  it('contains every day of the month exactly once', () => {
    const grid = monthGrid(2026, 6);
    const inMonth = grid.flat().filter((c) => c.inMonth);
    expect(inMonth).toHaveLength(31);
    expect(inMonth[0].dayKey).toBe('2026-07-01');
    expect(inMonth[30].dayKey).toBe('2026-07-31');
  });

  it('handles leap-year February', () => {
    const grid = monthGrid(2024, 1);
    expect(grid.flat().filter((c) => c.inMonth)).toHaveLength(29);
  });

  it('February starting on Sunday in a non-leap year fits exactly 4 weeks', () => {
    const grid = monthGrid(2026, 1); // Feb 2026 starts on a Sunday, 28 days
    expect(grid).toHaveLength(4);
    expect(grid.flat().every((c) => c.inMonth)).toBe(true);
  });

  it('pads leading and trailing days from adjacent months', () => {
    const grid = monthGrid(2026, 6); // July 2026 starts Wed, ends Fri
    expect(grid[0][0].inMonth).toBe(false);
    const last = grid[grid.length - 1];
    expect(last[6].inMonth).toBe(false);
    expect(last[6].dayKey).toBe('2026-08-01');
  });
});
