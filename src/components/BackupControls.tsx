import { useRef, useState } from 'react';
import { SystemPanel } from './system/SystemPanel';
import { ExportIcon, ImportIcon } from './icons';
import { exportBackup, importBackup } from '../db/queries/backup';
import { parseBackupPayload, type BackupPayload } from '../engine/backup';
import { dayKeyFor } from '../engine/time';

// Phase 3 JSON export/import (§10) — the backup story a no-server, on-device app gets instead
// of cloud sync. §2's durable-storage grant is best-effort and the browser can refuse or revoke
// it (DECISIONS.md D43); this is the one copy the user actually controls.
//
// Import is destructive (it replaces every table, see db/queries/backup.ts) and gets the same
// two-step confirm as StartupFailure's "Reset local data" — reading the file and committing it
// are deliberately separate actions so a stray tap can't wipe a live device from a bad file.

type Busy = 'export' | 'reading' | 'importing' | null;

function summarize(payload: BackupPayload): string {
  const exported = new Date(payload.exportedAt);
  const when = Number.isNaN(exported.getTime()) ? payload.exportedAt : exported.toLocaleString();
  return (
    `${payload.tasks.length} quests, ${payload.completions.length} completions, ` +
    `${payload.skills.length} categories — exported ${when}`
  );
}

export function BackupControls() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<BackupPayload | null>(null);
  const [exported, setExported] = useState(false);

  const onExport = () => {
    setError(null);
    setBusy('export');
    void exportBackup(new Date())
      .then((payload) => {
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lifequest-backup-${dayKeyFor(new Date())}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        setExported(true);
        setTimeout(() => setExported(false), 3000);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setBusy(null));
  };

  const onFileChosen = (file: File) => {
    setError(null);
    setBusy('reading');
    void file
      .text()
      .then((text) => parseBackupPayload(JSON.parse(text)))
      .then(setPending)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setBusy(null));
  };

  const onConfirmImport = () => {
    if (!pending) return;
    setBusy('importing');
    void importBackup(pending)
      .then(() => location.reload())
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : String(e));
        setBusy(null);
      });
  };

  return (
    <SystemPanel brackets={false} innerClassName="flex flex-col gap-3 px-4 py-4">
      <p className="text-xs leading-relaxed text-muted">
        Everything lives only on this device. Export a JSON copy now and then, and keep it
        somewhere safe — it's the only way to move to a new device or recover from a cleared
        browser.
      </p>

      {!pending ? (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onExport}
            disabled={busy === 'export'}
            className="notch [--notch:6px] flex flex-1 items-center justify-center gap-1.5 border border-accent/60 px-3 py-2 font-display text-[11px] uppercase tracking-[0.16em] text-accent transition-colors hover:bg-accent/15 disabled:opacity-50"
          >
            <ExportIcon size={13} /> {busy === 'export' ? 'Exporting…' : 'Export backup'}
          </button>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={busy === 'reading'}
            className="notch [--notch:6px] flex flex-1 items-center justify-center gap-1.5 border border-edge px-3 py-2 font-display text-[11px] uppercase tracking-[0.16em] text-muted transition-colors hover:border-muted hover:text-fg disabled:opacity-50"
          >
            <ImportIcon size={13} /> {busy === 'reading' ? 'Reading…' : 'Import backup…'}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = ''; // lets the same file be picked again after an error
              if (file) onFileChosen(file);
            }}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-sm leading-relaxed text-danger">
            This replaces every quest, completion, streak and badge on this device with the
            backup below. There is no undo.
          </p>
          <p className="text-xs leading-relaxed text-muted">{summarize(pending)}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onConfirmImport}
              disabled={busy === 'importing'}
              className="notch [--notch:6px] flex-1 border-2 border-danger px-3 py-2 font-display text-sm uppercase tracking-[0.16em] text-danger transition-colors hover:bg-danger/15 disabled:opacity-50"
            >
              {busy === 'importing' ? 'Restoring…' : 'Replace data'}
            </button>
            <button
              type="button"
              onClick={() => setPending(null)}
              disabled={busy === 'importing'}
              className="notch [--notch:6px] border border-edge px-3 py-2 font-display text-sm uppercase tracking-[0.16em] text-muted"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {exported && <p className="text-xs text-accent">Backup saved to your downloads.</p>}
      {error && <p className="text-xs leading-relaxed text-danger">{error}</p>}
    </SystemPanel>
  );
}
