import { StyleSheet, Text, View } from 'react-native';
import { colors, glow, radii, spacing } from '../constants/theme';

// Generic glow-panel building blocks for the stats screen. BarList takes
// {label, value, color}[] so per-category data can slot in later unchanged.

export function StatPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>{title}</Text>
      {children}
    </View>
  );
}

export interface BarListItem {
  label: string;
  value: number;
  color: string;
  detail?: string;
}

export function BarList({ items, emptyText }: { items: BarListItem[]; emptyText: string }) {
  if (!items.length) return <Text style={styles.empty}>{emptyText}</Text>;
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <View style={{ gap: spacing.sm }}>
      {items.map((item, i) => (
        <View key={i}>
          <View style={styles.barLabelRow}>
            <Text style={styles.barLabel} numberOfLines={1}>
              {item.label}
            </Text>
            <Text style={[styles.barValue, { color: item.color }]}>
              {item.detail ?? item.value}
            </Text>
          </View>
          <View style={styles.barTrack}>
            <View
              style={[styles.barFill, { width: `${(item.value / max) * 100}%`, backgroundColor: item.color }]}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

export function TileRow({ tiles }: { tiles: { value: string; label: string }[] }) {
  return (
    <View style={styles.tileRow}>
      {tiles.map((t, i) => (
        <View key={i} style={styles.tile}>
          <Text style={styles.tileValue}>{t.value}</Text>
          <Text style={styles.tileLabel}>{t.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.panel,
    borderRadius: radii.md,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    ...glow,
  },
  panelTitle: {
    color: colors.textSecondary,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  empty: { color: colors.textSecondary, fontSize: 13 },
  barLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  barLabel: { color: colors.textPrimary, fontSize: 13, flex: 1, marginRight: spacing.sm },
  barValue: { fontSize: 13, fontWeight: 'bold' },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 3 },
  tileRow: { flexDirection: 'row', gap: spacing.sm },
  tile: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: radii.sm,
  },
  tileValue: { color: colors.accent, fontSize: 22, fontWeight: 'bold' },
  tileLabel: { color: colors.textSecondary, fontSize: 11, marginTop: 2, textAlign: 'center' },
});
