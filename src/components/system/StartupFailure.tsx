import { useState } from 'react';
import { SystemPanel } from './SystemPanel';
import { probeStorage } from '../../db/client';
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
//  2. **Lead with the fixable cause.** "You may be in a private tab" is actionable; "OPFS"
//     is not.
//  3. **Ask the device.** The diagnostics run the same OPFS steps the app does and report
//     which one fails, so a screenshot becomes a diagnosis instead of a guess.

interface Props {
  message: string;
}

export function StartupFailure({ message }: Props) {
  const [report, setReport] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const runProbe = () => {
    setBusy(true);
    void probeStorage()
      .then(setReport)
      .finally(() => setBusy(false));
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
            <span className="text-fg">A private / incognito tab.</span> On-device storage is
            switched off there. Open it in a normal tab.
          </li>
          <li>
            <span className="text-fg">Another tab already has it open.</span> Only one at a time
            — close the others.
          </li>
          <li>
            <span className="text-fg">The device is low on storage.</span> Free some space and
            try again.
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
