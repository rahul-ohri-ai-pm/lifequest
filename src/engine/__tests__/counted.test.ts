import { xpForCountedLog } from '../counted';

// Target 8, medium difficulty (25 XP) — the §7 water-glasses example
describe('xpForCountedLog', () => {
  it('awards 0 before the target is reached', () => {
    expect(xpForCountedLog(0, 3, 8, 'medium')).toBe(0);
    expect(xpForCountedLog(3, 4, 8, 'medium')).toBe(0); // 7/8
  });

  it('awards full XP on the entry that exactly reaches the target', () => {
    expect(xpForCountedLog(7, 1, 8, 'medium')).toBe(25);
  });

  it('awards full XP on the entry that crosses the target mid-amount', () => {
    expect(xpForCountedLog(6, 5, 8, 'medium')).toBe(25); // 6 -> 11
  });

  it('awards 0 for entries after the target was already met', () => {
    expect(xpForCountedLog(8, 1, 8, 'medium')).toBe(0);
    expect(xpForCountedLog(12, 3, 8, 'medium')).toBe(0);
  });

  it('a single entry covering the whole target awards full XP', () => {
    expect(xpForCountedLog(0, 8, 8, 'medium')).toBe(25);
    expect(xpForCountedLog(0, 20, 8, 'epic')).toBe(100);
  });

  it('exactly one award across any sequence of logs summing past the target', () => {
    const logs = [2, 3, 1, 4, 2]; // cumulative: 2,5,6,10,12 — target hit on 4th
    let prior = 0;
    const awards = logs.map((n) => {
      const xp = xpForCountedLog(prior, n, 8, 'hard');
      prior += n;
      return xp;
    });
    expect(awards.filter((x) => x > 0)).toEqual([50]);
    expect(awards[3]).toBe(50);
  });
});
