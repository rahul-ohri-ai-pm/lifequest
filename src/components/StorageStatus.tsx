import { useEffect, useState } from 'react';
import { SystemPanel } from './system/SystemPanel';
import {
  ensurePersistentStorage,
  getStorageUsage,
  type PersistenceState,
  type StorageUsage,
} from '../db/storage';

// The database is the only copy of everything the user has ever logged (§2 — no server, by
// design), and whether the browser will keep it is not something the app gets to decide. So
// the state is shown rather than assumed: a silent request whose outcome nobody can see is
// indistinguishable from no request at all.
//
// `ensurePersistentStorage()` is memoized and already fired at boot, so reading it here costs
// nothing and cannot trigger a second permission prompt.

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

const copy: Record<PersistenceState, { label: string; detail: string }> = {
  persisted: {
    label: 'Storage protected',
    detail: 'This browser has marked your quest log as persistent and will not clear it on its own.',
  },
  'best-effort': {
    label: 'Storage evictable',
    detail:
      'The browser may clear your quest log if the device runs low on space. Installing LifeQuest to your home screen usually earns durable storage.',
  },
  unsupported: {
    label: 'Storage durability unknown',
    detail:
      'This browser will not report whether your quest log is safe from being cleared. Everything still works and saves normally.',
  },
};

export function StorageStatus() {
  const [state, setState] = useState<PersistenceState | null>(null);
  const [usage, setUsage] = useState<StorageUsage | null>(null);

  useEffect(() => {
    let cancelled = false;
    void ensurePersistentStorage().then((s) => !cancelled && setState(s));
    void getStorageUsage().then((u) => !cancelled && setUsage(u));
    return () => {
      cancelled = true;
    };
  }, []);

  if (!state) return null;

  const { label, detail } = copy[state];
  // Only the genuinely at-risk case gets the alert treatment — §5: if everything is loud,
  // nothing is. "Unknown" is a normal, common outcome and is reported quietly.
  const atRisk = state === 'best-effort';

  return (
    <SystemPanel
      tone={atRisk ? 'alert' : 'quiet'}
      brackets={false}
      innerClassName="flex flex-col gap-1 px-4 py-3"
    >
      <div className="flex items-baseline justify-between gap-2">
        <span
          className={`font-display text-[11px] uppercase tracking-[0.2em] ${
            atRisk ? 'text-danger' : 'text-muted'
          }`}
        >
          {label}
        </span>
        {usage && (
          <span className="font-display text-[11px] tabular-nums text-muted">
            {formatBytes(usage.usedBytes)} used
          </span>
        )}
      </div>
      <p className="text-xs leading-relaxed text-muted">{detail}</p>
    </SystemPanel>
  );
}
