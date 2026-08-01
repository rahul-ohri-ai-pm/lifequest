import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { SystemPanel } from './system/SystemPanel';
import { colors } from '../constants/theme';

// Generic system-window building blocks (§5). BarList takes {label, value, color}[] so
// per-category data slots in unchanged.

export function StatPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <SystemPanel brackets={false} className="mx-4 mb-4" innerClassName="overflow-hidden px-4 py-3">
      <h2 className="mb-2 font-display text-[11px] uppercase tracking-[0.22em] text-muted">{title}</h2>
      {children}
    </SystemPanel>
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
            <span className="shrink-0 font-display text-[13px] font-bold" style={{ color: item.color }}>
              {item.detail ?? item.value}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full border border-edge bg-bg-alt">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: item.color, boxShadow: `0 0 6px ${item.color}` }}
              initial={{ width: 0 }}
              animate={{ width: `${(item.value / max) * 100}%` }}
              transition={{ duration: 0.6, delay: Math.min(i, 8) * 0.04, ease: 'easeOut' }}
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
        <div
          key={i}
          className="notch [--notch:6px] flex-1 border border-edge bg-bg-alt py-2 text-center"
          style={{ borderColor: `${colors.panelBorder}` }}
        >
          <div className="font-display text-2xl text-accent text-glow">{t.value}</div>
          <div className="mt-0.5 text-[11px] text-muted">{t.label}</div>
        </div>
      ))}
    </div>
  );
}
