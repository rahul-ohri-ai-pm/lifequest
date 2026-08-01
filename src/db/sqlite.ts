// The database surface the rest of the app is written against.
//
// This is deliberately the same four methods expo-sqlite exposed, with the same shapes:
// when the app moved off Expo to a plain web build, every file in db/queries/ and
// db/migrations/ kept compiling against this interface and only the driver underneath
// changed (src/db/client.ts). Keep it that way — nothing outside client.ts should know
// which SQLite build is in use.

export type SqlValue = string | number | null;

export interface SqlDatabase {
  /** Run one or more statements for their side effects. No parameters, no result. */
  execAsync(sql: string): Promise<void>;
  /** Run a single parameterised statement for its side effects. */
  runAsync(sql: string, ...params: SqlValue[]): Promise<void>;
  /** All rows, as objects keyed by column name. */
  getAllAsync<T>(sql: string, ...params: SqlValue[]): Promise<T[]>;
  /** First row, or null when the query matched nothing. */
  getFirstAsync<T>(sql: string, ...params: SqlValue[]): Promise<T | null>;
}
