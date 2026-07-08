import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, difficultyColors, radii, spacing } from '../constants/theme';
import { xpForDifficulty } from '../engine/xp';
import type { Task } from '../types';

interface Props {
  task: Task;
  completedToday: boolean;
  onComplete(task: Task): void;
}

export function TaskCard({ task, completedToday, onComplete }: Props) {
  const accent = difficultyColors[task.difficulty];
  return (
    <View style={[styles.card, { borderColor: accent }, completedToday && styles.done]}>
      <View style={styles.info}>
        <Text style={[styles.title, completedToday && styles.doneText]} numberOfLines={1}>
          {task.title}
        </Text>
        <Text style={[styles.meta, { color: accent }]}>
          {task.difficulty} · {xpForDifficulty(task.difficulty)} XP
        </Text>
      </View>
      <Pressable
        style={[styles.check, { borderColor: accent }, completedToday && { backgroundColor: accent }]}
        onPress={() => onComplete(task)}
        disabled={completedToday}
      >
        {completedToday && <Text style={styles.checkMark}>✓</Text>}
      </Pressable>
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
  },
  done: { opacity: 0.55 },
  info: { flex: 1, marginRight: spacing.sm },
  title: { color: colors.textPrimary, fontSize: 16 },
  doneText: { textDecorationLine: 'line-through', color: colors.textSecondary },
  meta: { fontSize: 12, marginTop: 2, textTransform: 'capitalize' },
  check: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: { color: colors.background, fontWeight: 'bold' },
});
