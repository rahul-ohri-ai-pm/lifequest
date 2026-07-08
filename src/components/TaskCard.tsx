import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, difficultyColors, radii, spacing } from '../constants/theme';
import { xpForDifficulty } from '../engine/xp';
import type { Task } from '../types';

interface Props {
  task: Task;
  done: boolean; // strike-through state (counted: daily target reached)
  hasCompletionToday: boolean; // enables undo
  skippedToday: boolean;
  progressToday: number; // counted tasks: today's cumulative sum
  onComplete(task: Task): void;
  onUndo(task: Task): void;
  onSkip(task: Task): void;
  onUnskip(task: Task): void;
  onLogProgress(task: Task): void;
}

export function TaskCard({
  task,
  done,
  hasCompletionToday,
  skippedToday,
  progressToday,
  onComplete,
  onUndo,
  onSkip,
  onUnskip,
  onLogProgress,
}: Props) {
  const router = useRouter();
  const accent = difficultyColors[task.difficulty];
  const inactive = done || skippedToday;
  const isCounted = task.type === 'counted' && task.targetCount != null;

  return (
    <View style={[styles.card, { borderColor: accent }, inactive && styles.done]}>
      <Pressable style={styles.info} onPress={() => router.push(`/task/${task.id}`)}>
        <Text style={[styles.title, inactive && styles.doneText]} numberOfLines={1}>
          {task.title}
        </Text>
        <Text style={[styles.meta, { color: accent }]}>
          {task.type !== 'todo' ? `${task.type} · ` : ''}
          {task.difficulty} · {xpForDifficulty(task.difficulty)} XP
          {isCounted ? ` · ${progressToday}/${task.targetCount}` : ''}
          {skippedToday ? ' · skipped' : ''}
        </Text>
      </Pressable>
      {hasCompletionToday && (
        <Pressable onPress={() => onUndo(task)} hitSlop={8}>
          <Text style={styles.linkAction}>undo</Text>
        </Pressable>
      )}
      {/* §4 Skip: offered only for habits on their scheduled days */}
      {task.type === 'habit' && !done && !skippedToday && (
        <Pressable onPress={() => onSkip(task)} hitSlop={8}>
          <Text style={styles.linkAction}>skip</Text>
        </Pressable>
      )}
      {skippedToday && (
        <Pressable onPress={() => onUnskip(task)} hitSlop={8}>
          <Text style={styles.linkAction}>unskip</Text>
        </Pressable>
      )}
      {!skippedToday && isCounted && (
        <Pressable
          style={[styles.check, styles.plus, { borderColor: accent }, done && { backgroundColor: accent }]}
          onPress={() => onLogProgress(task)}
        >
          <Text style={[styles.plusText, { color: done ? colors.background : accent }]}>
            {done ? '✓' : '+1'}
          </Text>
        </Pressable>
      )}
      {!skippedToday && !isCounted && (
        <Pressable
          style={[styles.check, { borderColor: accent }, done && { backgroundColor: accent }]}
          onPress={() => onComplete(task)}
          disabled={done}
        >
          {done && <Text style={styles.checkMark}>✓</Text>}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  done: { opacity: 0.55 },
  info: { flex: 1, marginRight: spacing.sm },
  title: { color: colors.textPrimary, fontSize: 16 },
  doneText: { textDecorationLine: 'line-through', color: colors.textSecondary },
  meta: { fontSize: 12, marginTop: 2, textTransform: 'capitalize' },
  linkAction: { color: colors.textSecondary, fontSize: 12, textDecorationLine: 'underline' },
  check: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plus: { width: 36 },
  plusText: { fontSize: 12, fontWeight: 'bold' },
  checkMark: { color: colors.background, fontWeight: 'bold' },
});
