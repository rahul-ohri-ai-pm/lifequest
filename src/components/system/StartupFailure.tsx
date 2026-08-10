import { useState } from 'react';
import { SystemPanel } from './SystemPanel';
import { probeStorage, resetLocalData } from '../../db/client';
import { colors } from '../../constants/theme';

// The screen that shows when the database will not open.
//
// It used to be one centred paragraph and nothing else — no way forward, no way to find out
// what happened. That is fine when the reader is the developer and the console is open; it is
// useless on a phone, which is exactly where the only real report of it came from.
//
// Three things it now does that a paragraph cannot:
//  1. **Retry.** The underlying error described itself as transient, and a full reload rebuilds
//     the worker from scratch — the single most likely thing to help, and previously impossible
//     without the user knowing to pull-to-refresh.
//  2. **Lead with the fixable cause** — and with the *right* one. The first version led with
//     "you may be in a private tab", which turned out to be exactly backwards: the one real
//     report of this failure was on iOS Safari, and the same link **worked** in a private tab.
//     That is the signature of broken local state, not a permissions block, because a private
//     tab starts with an empty storage bucket. The order below now reflects that evidence
//     rather than my first guess.
//  3. **Ask the device.** The diagnostics run the same OPFS steps the app does and report
//     which one fails, so a screenshot becomes a diagnosis instead of a guess.

interface Props {
  message: string;
}

export function StartupFailure({ message }: Props) {
  const [report, setReport] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  // Two-step, deliberately. This deletes everything and cannot be undone, so it must not be
  // reachable by one stray tap on a screen the user is already frustrated with.
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [resetting, setResetting] = useState(false);

  const runProbe = () => {
    setBusy(true);
    void probeStorage()
      .then(setReport)
      .finally(() => setBusy(false));
  };

  const doReset = () => {
    setResetting(true);
    void resetLocalData()
      .then(() => location.reload())
      .catch((e: unknown) => {
        setReport([`reset failed: ${e instanceof Error ? e.message : String(e)}`]);
        setResetting(false);
        setConfirmingReset(false);
      });
  };

  const copy = () => {
    const text = [`error: ${message}`, ...(report ?? [])].join('\n');
    // No clipboard permission on some browsers, and no clipboard at all over plain HTTP —
    // failing silently would leave the button looking broken, so the state only flips on
    // success.
    void navigator.clipboard
      ?.writeText(text)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {});
  };

  return (
    <div className="grid min-h-dvh place-items-center bg-bg p-5">
      <SystemPanel tone="alert" glow className="w-full max-w-sm" innerClassName="flex flex-col gap-3 px-5 py-6">
        <span className="font-display text-[11px] uppercase tracking-[0.3em] text-danger">
          System offline
        </span>
        <h1 className="font-display text-2xl uppercase tracking-[0.1em] text-fg">
          Can't open your data
        </h1>

        {/* Ordered by how likely each is to be the actual problem on a phone. */}
        <p className="text-sm leading-relaxed text-muted">
          LifeQuest keeps everything on your device, and the browser wouldn't let it open its
          storage. The usual causes, in order:
        </p>
        <ul className="flex list-disc flex-col gap-1.5 pl-4 text-sm leading-relaxed text-muted">
          <li>
            <span className="text-fg">Another tab already has it open.</span> Only one at a time
            — close the others and tap Try again.
          </li>
          <li>
            <span className="text-fg">The device is low on storage.</span> Free some space and
            try again.
          </li>
          <li>
            <span className="text-fg">The local database got into a bad state.</span> If the same
            link works in a private tab but not here, this is it — and Reset below is the fix.
          </li>
        </ul>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={() => location.reload()}
            className="notch [--notch:6px] flex-1 border-2 border-accent px-3 py-2 font-display text-sm uppercase tracking-[0.16em] text-accent transition-colors hover:bg-accent/15"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={runProbe}
            disabled={busy}
            className="notch [--notch:6px] border border-edge px-3 py-2 font-display text-sm uppercase tracking-[0.16em] text-muted transition-colors hover:border-muted hover:text-fg"
          >
            {busy ? 'Checking…' : 'Diagnose'}
          </button>
        </div>

        {/* Last resort, and labelled as one. Only offered here — on a screen that exists
            because the data is already unreachable — never anywhere the app is working. */}
        <div className="border-t border-edge/60 pt-3">
          {!confirmingReset ? (
            <button
              type="button"
              onClick={() => setConfirmingReset(true)}
              className="font-display text-[11px] uppercase tracking-[0.16em] text-muted transition-colors hover:text-danger"
            >
              Reset local data…
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-sm leading-relaxed text-danger">
                This deletes every quest, completion and XP point on this device. There is no
                backup and no undo. Only do this if the app has never worked here.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={doReset}
                  disabled={resetting}
                  className="notch [--notch:6px] flex-1 border-2 border-danger px-3 py-2 font-display text-sm uppercase tracking-[0.16em] text-danger transition-colors hover:bg-danger/15"
                >
                  {resetting ? 'Erasing…' : 'Erase and restart'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingReset(false)}
                  className="notch [--notch:6px] border border-edge px-3 py-2 font-display text-sm uppercase tracking-[0.16em] text-muted"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        <details className="pt-1">
          <summary className="cursor-pointer font-display text-[11px] uppercase tracking-[0.2em] text-muted">
            Technical detail
          </summary>
          <p className="mt-2 break-words font-mono text-[11px] leading-relaxed text-muted">
            {message}
          </p>
          {report && (
            <>
              <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap break-words border-t border-edge/60 pt-2 font-mono text-[11px] leading-relaxed text-muted">
                {report.join('\n')}
              </pre>
              <button
                type="button"
                onClick={copy}
                className="mt-2 font-display text-[11px] uppercase tracking-[0.16em]"
                style={{ color: copied ? colors.accent : colors.textSecondary }}
              >
                {copied ? 'Copied' : 'Copy report'}
              </button>
            </>
          )}
        </details>
      </SystemPanel>
    </div>
  );
}
