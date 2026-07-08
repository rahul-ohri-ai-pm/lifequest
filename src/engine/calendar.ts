// Pure month-grid builder for the hand-rolled calendar screen (§4).
import { dayKeyFor } from './time';

export interface DayCell {
  dayKey: string;
  dayOfMonth: number;
  inMonth: boolean;
}

// month: 0-11. Returns full weeks (rows of 7), Sunday-first, padded with
// adjacent-month days so every row is complete.
export function monthGrid(year: number, month: number): DayCell[][] {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay()); // back up to Sunday
  const weeks: DayCell[][] = [];
  const cursor = new Date(start);
  do {
    const week: DayCell[] = [];
    for (let i = 0; i < 7; i++) {
      week.push({
        dayKey: dayKeyFor(cursor),
        dayOfMonth: cursor.getDate(),
        inMonth: cursor.getMonth() === month,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  } while (cursor.getMonth() === month);
  return weeks;
}
