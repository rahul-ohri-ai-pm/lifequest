import type { SqlDatabase } from '../sqlite';

export const version = 5;
export const name = 'skill_status_icons';

// Two changes, both in service of the owner being able to add and remove categories.
//
// **`status`** — removing a category cannot mean deleting the row. A skill carries `total_xp`
// the user actually earned, and `task_skills` rows pointing at it; deleting it would silently
// destroy history, which is the same mistake `0004` avoided by *merging* Exercise into Fitness
// rather than dropping it (D33). So "remove" archives: the category leaves every picker and
// the Profile list, and its XP and links stay exactly where they are. A genuinely unused
// category — no XP, no tagged tasks — is still hard-deleted by the query layer, because there
// is nothing there to lose and leaving typos around forever is its own kind of mess.
//
// No CHECK constraint on `status`: SQLite's ALTER TABLE cannot add one, and the alternative is
// the twelve-step table rebuild. The two writers of this column both live in
// `db/queries/skills.ts`, so the constraint is enforced where it is cheap to enforce.
//
// **`icon`** — the column has existed since `0002` and has been NULL on every row, because the
// glyph was looked up by *name*. That breaks the moment a category is renamed: call Fitness
// "Lifting" and it silently falls back to the generic rune. Backfilling the seeded eight with
// their keys makes the glyph a property of the category rather than a coincidence of spelling.
const ICON_BY_NAME: Array<[name: string, iconKey: string]> = [
  ['Diet', 'diet'],
  ['Career', 'career'],
  ['Reading', 'reading'],
  ['Fitness', 'fitness'],
  ['Exercise', 'fitness'], // 0004 usually removed this row; harmless if it is already gone
  ['Gaming', 'gaming'],
  ['Social', 'social'],
  ['Stock Trading', 'trading'],
];

export async function up(db: SqlDatabase): Promise<void> {
  await db.execAsync(`ALTER TABLE skills ADD COLUMN status TEXT NOT NULL DEFAULT 'active'`);

  // Only where the user has not already chosen one — this migration must never overwrite a
  // deliberate pick, even though today no code path can have set one yet.
  for (const [skillName, iconKey] of ICON_BY_NAME) {
    await db.runAsync('UPDATE skills SET icon = ? WHERE name = ? AND icon IS NULL', iconKey, skillName);
  }
}
