import { useMemo, useState } from 'react';
import { SystemPanel } from './SystemPanel';
import { CategorySlot } from './CategorySlot';
import { CategoryIcon } from '../categoryIcons';
import { ICON_LIBRARY, resolveIconKey, searchIcons } from '../categoryIcons';
import { CheckIcon, UndoIcon } from '../icons';
import { cn } from '../../lib/utils';
import type { SkillDef } from '../../types';

// Create or edit a category: name, glyph, colour.
//
// The glyph picker searches the local library by keyword (see categoryIcons for why it is
// local and not an icon API). Until the user picks one deliberately, the selection *tracks the
// name they are typing* — type "Guitar" and the music mark appears on its own. That is the
// behaviour the owner asked for ("find options based on keywords"), and it means most
// categories never need the picker opened at all.

const PALETTE = [
  '#4C8DFF', '#8B5CF6', '#22D3EE', '#34D399', '#A3E635',
  '#F5B942', '#F97316', '#EC4899', '#E5484D', '#8A93A8',
];

interface Props {
  /** Absent when creating. */
  skill?: SkillDef;
  /** Names already taken, lower-cased. Excludes the skill being edited. */
  taken: Set<string>;
  onSave(values: { name: string; color: string; icon: string }): void | Promise<void>;
  onCancel(): void;
}

export function CategoryEditor({ skill, taken, onSave, onCancel }: Props) {
  const [name, setName] = useState(skill?.name ?? '');
  const [color, setColor] = useState(skill?.color ?? PALETTE[0]);
  // `null` means "still following the name". Picking a glyph pins it.
  const [pinnedIcon, setPinnedIcon] = useState<string | null>(skill?.icon ?? null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);

  const trimmed = name.trim();
  const icon = pinnedIcon ?? resolveIconKey(null, trimmed);
  const duplicate = trimmed.length > 0 && taken.has(trimmed.toLowerCase());
  const canSave = trimmed.length > 0 && !duplicate && !busy;

  // The picker searches on its own box when the user has typed there, and otherwise previews
  // what the *name* would match — so opening it on "Guitar practice" leads with music.
  const results = useMemo(
    () => (query.trim() ? searchIcons(query) : trimmed ? searchIcons(trimmed) : ICON_LIBRARY),
    [query, trimmed]
  );

  const submit = () => {
    if (!canSave) return;
    setBusy(true);
    void Promise.resolve(onSave({ name: trimmed, color, icon })).finally(() => setBusy(false));
  };

  return (
    <SystemPanel glow innerClassName="flex flex-col gap-3 px-3 py-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setPickerOpen((o) => !o)}
          aria-label="Choose an icon"
          aria-expanded={pickerOpen}
          className="shrink-0"
        >
          <CategorySlot color={color} size={44}>
            <CategoryIcon iconKey={icon} size={24} />
          </CategorySlot>
        </button>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Category name…"
          aria-label="Category name"
          maxLength={40}
          autoFocus
          className="min-w-0 flex-1 border-b border-edge bg-transparent pb-1 text-[17px] text-fg outline-hidden placeholder:text-muted focus:border-accent"
        />
      </div>

      {duplicate && (
        <p className="font-display text-[11px] uppercase tracking-[0.14em] text-danger">
          "{trimmed}" already exists
        </p>
      )}

      {pickerOpen && (
        <div className="flex flex-col gap-2 border-t border-edge/60 pt-2.5">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search icons — gym, guitar, spanish…"
            aria-label="Search icons"
            className="w-full border-b border-edge bg-transparent pb-1 text-sm text-fg outline-hidden placeholder:text-muted focus:border-accent"
          />
          {results.length === 0 ? (
            <p className="py-3 text-center text-xs text-muted">No icon matches that.</p>
          ) : (
            <div className="grid max-h-44 grid-cols-6 gap-2 overflow-y-auto pt-1">
              {results.map((entry) => (
                <button
                  key={entry.key}
                  type="button"
                  title={entry.label}
                  aria-label={entry.label}
                  aria-pressed={entry.key === icon}
                  onClick={() => {
                    setPinnedIcon(entry.key);
                    setPickerOpen(false);
                    setQuery('');
                  }}
                  className={cn('grid place-items-center', entry.key === icon && 'scale-110')}
                >
                  <CategorySlot color={entry.key === icon ? color : null} dim={entry.key !== icon} size={38}>
                    <CategoryIcon iconKey={entry.key} size={21} />
                  </CategorySlot>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-t border-edge/60 pt-2.5">
        {PALETTE.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            aria-label={`Colour ${c}`}
            aria-pressed={c === color}
            className={cn(
              'notch [--notch:4px] size-6 transition-transform',
              c === color && 'scale-115'
            )}
            style={{
              backgroundColor: c,
              boxShadow: c === color ? `0 0 10px ${c}` : undefined,
              outline: c === color ? '1px solid #E6E9F2' : undefined,
              outlineOffset: 2,
            }}
          />
        ))}
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="grid size-9 place-items-center rounded-full border border-edge text-muted transition-colors hover:border-muted hover:text-fg"
          aria-label="Cancel"
          title="Cancel"
        >
          <UndoIcon size={16} />
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!canSave}
          aria-label={skill ? 'Save category' : 'Add category'}
          className={cn(
            'notch [--notch:6px] grid h-9 w-14 place-items-center border-2 border-accent transition-colors',
            canSave ? 'text-accent hover:bg-accent/15' : 'border-edge text-muted'
          )}
        >
          <CheckIcon size={17} />
        </button>
      </div>
    </SystemPanel>
  );
}
