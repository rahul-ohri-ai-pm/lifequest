import type { ReactNode } from 'react';
import { ShineBorder } from './ui/shine-border';
import { colors, text } from '../constants/theme';

// Generic glow-panel building blocks (§5). BarList takes {label, value, color}[] so
// per-category data slots in unchanged.

export function StatPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="relative mx-4 mb-4 overflow-hidden rounded-lg bg-panel p-4 panel-glow">
      <ShineBorder shineColor={[colors.accent, colors.accentSecondary]} duration={18} />
      <h2 className={`${text.panelLabel} mb-2`}>{title}</h2>
      {children}
    </section>
  );
}

export interface BarListItem {
  label: string;
  value: number;
  color: string;
  detail?: string;
}

export function BarList({ items, emptyText }: { items: BarListItem[]; emptyText: string }) {
  if (!items.length) return <p className="text-[13px] text-muted">{emptyText}</p>;
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="flex flex-col gap-2">
      {items.map((item, i) => (
        <div key={i}>
          <div className="mb-0.5 flex justify-between gap-2">
            <span className="truncate text-[13px] text-fg">{item.label}</span>
            <span className="shrink-0 text-[13px] font-bold" style={{ color: item.color }}>
              {item.detail ?? item.value}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-bg">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{ width: `${(item.value / max) * 100}%`, backgroundColor: item.color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TileRow({ tiles }: { tiles: { value: ReactNode; label: string }[] }) {
  return (
    <div className="flex gap-2">
      {tiles.map((t, i) => (
        <div key={i} className="flex-1 rounded bg-bg py-2 text-center">
          <div className="font-display text-2xl text-accent">{t.value}</div>
          <div className="mt-0.5 text-[11px] text-muted">{t.label}</div>
        </div>
      ))}
    </div>
  );
}
