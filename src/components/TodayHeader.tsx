import { StyleSheet, Text, View } from 'react-native';
import { useCharacterStore } from '../store/useCharacterStore';
import { levelProgress } from '../engine/xp';
import { colors, radii, spacing, text, type } from '../constants/theme';

interface Props {
  doneCount: number;
  totalCount: number;
}

// The core loop is "complete something, watch the bar move". Level and XP used to
// live only on the Profile tab, so completing a quest on Today produced no visible
// progression at all — this puts the progression where the action is.
export function TodayHeader({ doneCount, totalCount }: Props) {
  const character = useCharacterStore((s) => s.character);
  if (!character) return null;

  const p = levelProgress(character.totalXp);
  const pct = Math.min(p.progress * 100, 100);

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.levelBadge}>
          <Text style={styles.levelNum}>{p.level}</Text>
        </View>
        <View style={styles.barCol}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Level {p.level}</Text>
            <Text style={styles.xp}>
              {character.totalXp} / {p.nextLevelXp} XP
            </Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${pct}%` }]} />
          </View>
        </View>
      </View>
      {totalCount > 0 && (
        <Text style={styles.progress}>
          {doneCount} of {totalCount} done today
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    gap: spacing.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  levelBadge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.panel,
  },
  levelNum: { fontFamily: type.display, fontSize: 22, color: colors.accent },
  barCol: { flex: 1, gap: 6 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  label: { ...text.panelLabel },
  xp: { fontFamily: type.displayRegular, fontSize: 13, color: colors.textSecondary },
  track: {
    height: 8,
    borderRadius: radii.sm,
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    overflow: 'hidden',
  },
  fill: { height: '100%', backgroundColor: colors.accent },
  progress: { ...text.meta },
});
