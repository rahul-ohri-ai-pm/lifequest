import { useBadgeStore } from './useBadgeStore';
import { useStreakStore } from './useStreakStore';
import { useTaskStore } from './useTaskStore';

/**
 * Re-derive everything that is computed from the completions log, in dependency order.
 *
 * Streaks first, then badges — several badge rules read the streak record, so evaluating them
 * against yesterday's streak would delay an unlock by one interaction. Both are derived rather
 * than incremented (D29), which is why every write to the log has to be followed by this;
 * there is no counter quietly keeping up on its own.
 *
 * Returns the badge keys earned by this write. `celebrate: false` records them without
 * queueing a takeover — see useBadgeStore.evaluate for why boot uses it.
 */
export async function resyncDerived(now = new Date(), celebrate = true): Promise<string[]> {
  const tasks = useTaskStore.getState().tasks;
  await useStreakStore.getState().hydrate(tasks, now);
  return useBadgeStore.getState().evaluate(tasks, now, celebrate);
}
