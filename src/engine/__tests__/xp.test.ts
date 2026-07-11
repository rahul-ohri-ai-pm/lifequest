import { levelForTotalXp, levelProgress, splitSkillXp, xpForDifficulty, xpRequiredForLevel } from '../xp';

// §7 table, verbatim
const GOLDEN: Array<[level: number, cumulativeXp: number]> = [
  [1, 100],
  [2, 280],
  [3, 520],
  [4, 800],
  [5, 1120],
  [6, 1470],
  [7, 1850],
  [8, 2260],
  [9, 2700],
  [10, 3160],
];

describe('xpForDifficulty', () => {
  it('matches the §7 difficulty table', () => {
    expect(xpForDifficulty('trivial')).toBe(5);
    expect(xpForDifficulty('easy')).toBe(10);
    expect(xpForDifficulty('medium')).toBe(25);
    expect(xpForDifficulty('hard')).toBe(50);
    expect(xpForDifficulty('epic')).toBe(100);
  });
});

describe('xpRequiredForLevel', () => {
  it.each(GOLDEN)('level %i requires %i cumulative XP', (level, xp) => {
    expect(xpRequiredForLevel(level)).toBe(xp);
  });

  it('is strictly increasing through level 100', () => {
    for (let l = 1; l < 100; l++) {
      expect(xpRequiredForLevel(l + 1)).toBeGreaterThan(xpRequiredForLevel(l));
    }
  });
});

describe('levelForTotalXp', () => {
  it('starts at level 1 with 0 XP', () => {
    expect(levelForTotalXp(0)).toBe(1);
  });

  it.each(GOLDEN.slice(1))('crosses into level %i exactly at %i XP', (level, xp) => {
    expect(levelForTotalXp(xp - 1)).toBe(level - 1);
    expect(levelForTotalXp(xp)).toBe(level);
    expect(levelForTotalXp(xp + 1)).toBe(level);
  });
});

describe('splitSkillXp', () => {
  it('splits evenly with rounding (§7: 25 XP / 2 skills ≈ 13 each)', () => {
    expect(splitSkillXp(25, 1)).toBe(25);
    expect(splitSkillXp(25, 2)).toBe(13);
    expect(splitSkillXp(25, 3)).toBe(8);
    expect(splitSkillXp(100, 4)).toBe(25);
  });
  it('returns 0 for untagged tasks or zero-XP entries', () => {
    expect(splitSkillXp(25, 0)).toBe(0);
    expect(splitSkillXp(0, 2)).toBe(0);
  });
});

describe('levelProgress', () => {
  it('reports 0 progress at an exact level boundary', () => {
    const p = levelProgress(280);
    expect(p.level).toBe(2);
    expect(p.currentLevelXp).toBe(280);
    expect(p.nextLevelXp).toBe(520);
    expect(p.progress).toBe(0);
  });

  it('reports fractional progress mid-level', () => {
    const p = levelProgress(400); // halfway through 280->520
    expect(p.level).toBe(2);
    expect(p.progress).toBeCloseTo(0.5);
  });

  it('stays within [0,1) at level 1 from zero XP', () => {
    const p = levelProgress(50);
    expect(p.level).toBe(1);
    expect(p.currentLevelXp).toBe(0);
    expect(p.progress).toBeGreaterThanOrEqual(0);
    expect(p.progress).toBeLessThan(1);
  });
});
