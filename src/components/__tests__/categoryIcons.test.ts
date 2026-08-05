import { describe, expect, it } from 'vitest';
import { ICON_LIBRARY, resolveIconKey, searchIcons } from '../categoryIcons';

// `src/engine/` is where game math lives, and this is not that — but `searchIcons` and
// `resolveIconKey` are pure, and they are the two functions standing between a user typing
// "gym" and getting a rune instead of a dumbbell. Worth a test even though they render nothing.

describe('ICON_LIBRARY', () => {
  it('has unique keys', () => {
    const keys = ICON_LIBRARY.map((e) => e.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('always contains the generic fallback', () => {
    expect(ICON_LIBRARY.some((e) => e.key === 'rune')).toBe(true);
  });
});

describe('searchIcons', () => {
  it('returns the whole library, in order, for an empty query', () => {
    expect(searchIcons('')).toEqual(ICON_LIBRARY);
    expect(searchIcons('   ')).toHaveLength(ICON_LIBRARY.length);
  });

  it('finds a glyph by a keyword that is not its label', () => {
    expect(searchIcons('gym')[0].key).toBe('fitness');
    expect(searchIcons('spanish')[0].key).toBe('language');
    expect(searchIcons('pomodoro')[0].key).toBe('focus');
  });

  it('is case- and whitespace-insensitive', () => {
    expect(searchIcons('  GyM ')[0].key).toBe('fitness');
  });

  it('ranks an exact term above a mere substring', () => {
    // "run" is an exact keyword of `run` and a substring of nothing better.
    expect(searchIcons('run')[0].key).toBe('run');
  });

  it('matches on a prefix', () => {
    expect(searchIcons('medit')[0].key).toBe('meditate');
  });

  it('returns nothing for a query that matches nothing', () => {
    expect(searchIcons('zzzzqqq')).toEqual([]);
  });

  // Category names are usually phrases, and a phrase matches no single library term.
  it('tokenises a multi-word query', () => {
    expect(searchIcons('Meal prep')[0].key).toBe('cook');
    expect(searchIcons('Deep work')[0].key).toBe('focus');
    expect(searchIcons('morning run')[0].key).toBe('run');
  });

  it('lets an exact whole-phrase match outrank a single lucky word', () => {
    // "trading" is an exact keyword; "stock" only a keyword of the same entry, so the
    // phrase must not be dragged elsewhere by the common word.
    expect(searchIcons('stock trading')[0].key).toBe('trading');
  });
});

describe('resolveIconKey', () => {
  it('prefers an explicit key over the name', () => {
    expect(resolveIconKey('music', 'Fitness')).toBe('music');
  });

  it('ignores an explicit key that is not in the library', () => {
    // A key from a future version, or a hand-edited database. Falling back beats rendering
    // nothing, and the name is still a decent signal.
    expect(resolveIconKey('no-such-icon', 'Reading')).toBe('reading');
  });

  it('maps the seeded category names', () => {
    expect(resolveIconKey(null, 'Stock Trading')).toBe('trading');
    expect(resolveIconKey(null, 'Diet')).toBe('diet');
  });

  it('still maps Exercise, which migration 0004 merged into Fitness', () => {
    expect(resolveIconKey(null, 'Exercise')).toBe('fitness');
  });

  it('falls back to the keyword search for a name nobody seeded', () => {
    expect(resolveIconKey(null, 'Guitar')).toBe('music');
    expect(resolveIconKey(null, 'Puppy')).toBe('pet');
  });

  it('lands on the generic rune when there is nothing to go on', () => {
    expect(resolveIconKey(null, null)).toBe('rune');
    expect(resolveIconKey(null, '   ')).toBe('rune');
    expect(resolveIconKey(undefined, 'qqqzzzz')).toBe('rune');
  });
});
