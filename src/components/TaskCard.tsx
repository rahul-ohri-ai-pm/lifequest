import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  colors,
  difficultyColors,
  glowStrong,
  radii,
  spacing,
  text,
  type,
} from '../constants/theme';
import { xpForDifficulty } from '../engine/xp';
import type { Task } from '../types';

interface Props {
  task: Task;
  done: boolean; // strike-through state (counted: daily target reached)
  hasCompletionToday: boolean; // enables undo
  skippedToday: boolean;
  progressToday: number; // counted tasks: today's cumulative sum
  spineColor?: string | null; // first tagged category's color (§5 card accent)
  onComplete(task: Task): void;
  onUndo(task: Task): void;
  onSkip(task: Task): void;
  onUnskip(task: Task): void;
  onLogProgress(task: Task): void;
}

// Metadata is shown only when it says something. Every task defaults to medium
// (Phase 1.5 hid the difficulty picker), so printing "Medium · 25 XP" on every
// row was five identical lines of noise — difficulty now appears only when the
// user actually changed it, and then it carries its rarity color (§5).
function metaParts(task: Task, progressToday: number, skippedToday: boolean): string[] {
  const parts: string[] = [];
  if (task.type === 'counted' && task.targetCount != null) {
    parts.push(`${progressToday}/${task.targetCount}`);
  }
  if (task.difficulty !== 'medium') parts.push(task.difficulty);
  if (skippedToday) parts.push('skipped');
  return parts;
}

export function TaskCard({
  task,
  done,
  hasCompletionToday,
  skippedToday,
  progressToday,
  spineColor,
  onComplete,
  onUndo,
  onSkip,
  onUnskip,
  onLogProgress,
}: Props) {
  const router = useRouter();
  const rarity = difficultyColors[task.difficulty];
  const inactive = done || skippedToday;
  const isCounted = task.type === 'counted' && task.targetCount != null;
  const parts = metaParts(task, progressToday, skippedToday);
  const xp = xpForDifficulty(task.difficulty);

  return (
    <View style={[styles.card, done && styles.cardDone, skippedToday && styles.cardSkipped]}>
      {/* Category spine — the one place color varies, so a list of quests is
          scannable at a glance without turning every card into a rainbow. */}
      <View style={[styles.spine, { backgroundColor: spineColor ?? colors.panelBorder }]} />

      <Pressable style={styles.info} onPress={() => router.push(`/task/${task.id}`)}>
        <Text style={[styles.title, inactive && styles.doneText]} numberOfLines={2}>
          {task.title}
        </Text>
        <View style={styles.metaRow}>
          <Text style={[styles.xp, task.difficulty !== 'medium' && { color: rarity }]}>
            {xp} XP
          </Text>
          {parts.map((p) => (
            <Text key={p} style={styles.meta}>
              · {p}
            </Text>
          ))}
        </View>
      </Pressable>

      <View style={styles.actions}>
        {/* Secondary verbs are real buttons, not underlined text that reads as a
            broken link. They stay quiet until the row needs them. */}
        {hasCompletionToday && (
          <Pressable
            style={styles.ghostButton}
            onPress={() => onUndo(task)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Undo ${task.title}`}
          >
            <Text style={styles.ghostText}>Undo</Text>
          </Pressable>
        )}
        {/* §4 Skip: offered only for habits on their scheduled days */}
        {task.type === 'habit' && !done && !skippedToday && (
          <Pressable
            style={styles.ghostButton}
            onPress={() => onSkip(task)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Skip ${task.title}`}
          >
            <Text style={styles.ghostText}>Skip</Text>
          </Pressable>
        )}
        {skippedToday && (
          <Pressable
            style={styles.ghostButton}
            onPress={() => onUnskip(task)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Undo skip ${task.title}`}
          >
            <Text style={styles.ghostText}>Undo skip</Text>
          </Pressable>
        )}

        {!skippedToday && isCounted && (
          <Pressable
            style={[styles.check, styles.checkWide, done && styles.checkDone]}
            onPress={() => onLogProgress(task)}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`Log progress on ${task.title}`}
          >
            <Text style={[styles.checkLabel, done && styles.checkLabelDone]}>
              {done ? '✓' : '+1'}
            </Text>
          </Pressable>
        )}
        {!skippedToday && !isCounted && (
          <Pressable
            style={[styles.check, done && styles.checkDone]}
            onPress={() => onComplete(task)}
            disabled={done}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityState={{ checked: done }}
            accessibilityLabel={`Complete ${task.title}`}
          >
            <Text style={[styles.checkLabel, done && styles.checkLabelDone]}>{done ? '✓' : ''}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    borderRadius: radii.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    minHeight: 68,
  },
  // Completing something is the point of the app, so the card marks it loudly.
  cardDone: { borderColor: colors.accent, backgroundColor: colors.panelRaised },
  cardSkipped: { opacity: 0.5 },
  spine: { width: 3 },
  info: { flex: 1, justifyContent: 'center', paddingVertical: spacing.sm, paddingLeft: spacing.md },
  title: { ...text.cardTitle, fontSize: 17 },
  doneText: { textDecorationLine: 'line-through', color: colors.textSecondary },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  xp: { fontFamily: type.display, fontSize: 12, letterSpacing: 0.5, color: colors.textSecondary },
  meta: { ...text.meta, textTransform: 'capitalize' },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  ghostButton: {
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  ghostText: { fontSize: 12, color: colors.textSecondary },
  // The primary action: a 40pt target that fills and glows when it lands.
  check: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkWide: { width: 48, borderRadius: 12 },
  checkDone: { backgroundColor: colors.accent, ...glowStrong },
  checkLabel: { fontFamily: type.display, fontSize: 14, color: colors.accent },
  checkLabelDone: { color: colors.background },
});
