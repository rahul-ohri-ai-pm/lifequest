import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useTaskStore } from '../../src/store/useTaskStore';
import { xpForDifficulty } from '../../src/engine/xp';
import { colors, difficultyColors, glow, radii, spacing } from '../../src/constants/theme';

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const task = useTaskStore((s) => s.tasks.find((t) => t.id === id));
  const archiveTask = useTaskStore((s) => s.archiveTask);

  if (!task) {
    return (
      <View style={styles.screen}>
        <Text style={styles.notFound}>Task not found (it may be archived).</Text>
      </View>
    );
  }

  const accent = difficultyColors[task.difficulty];

  const onArchive = async () => {
    await archiveTask(task.id, new Date());
    router.back();
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: task.title }} />
      <View style={[styles.panel, { borderColor: accent }]}>
        <Text style={styles.title}>{task.title}</Text>
        <Text style={[styles.meta, { color: accent }]}>
          {task.type} · {task.difficulty} · {xpForDifficulty(task.difficulty)} XP
        </Text>
        {task.notes ? <Text style={styles.notes}>{task.notes}</Text> : null}
        {task.targetCount ? <Text style={styles.notes}>Daily target: {task.targetCount}</Text> : null}
      </View>
      <Pressable style={styles.archiveButton} onPress={onArchive}>
        <Text style={styles.archiveText}>Archive</Text>
      </Pressable>
      <Text style={styles.hint}>
        Archiving hides this quest from your lists but keeps all its history. You can restore it
        anytime from Profile → Archived.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, padding: spacing.md },
  notFound: { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xl },
  panel: {
    backgroundColor: colors.panel,
    borderRadius: radii.md,
    padding: spacing.lg,
    ...glow,
  },
  title: { color: colors.textPrimary, fontSize: 20, fontWeight: 'bold' },
  meta: { fontSize: 13, marginTop: spacing.xs, textTransform: 'capitalize' },
  notes: { color: colors.textSecondary, marginTop: spacing.sm },
  archiveButton: {
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.textSecondary,
    borderRadius: radii.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  archiveText: { color: colors.textSecondary, fontSize: 15 },
  hint: { color: colors.textSecondary, fontSize: 12, marginTop: spacing.sm },
});
