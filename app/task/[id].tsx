import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useTaskStore } from '../../src/store/useTaskStore';
import { addDays, dateFromDayKey, dayKeyFor } from '../../src/engine/time';
import { colors, difficultyColors, glow, radii, spacing } from '../../src/constants/theme';
import type { Difficulty, Schedule } from '../../src/types';

const DIFFICULTIES: Difficulty[] = ['trivial', 'easy', 'medium', 'hard', 'epic'];
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const task = useTaskStore((s) => s.tasks.find((t) => t.id === id));
  const updateTask = useTaskStore((s) => s.updateTask);
  const archiveTask = useTaskStore((s) => s.archiveTask);

  const [title, setTitle] = useState(task?.title ?? '');
  const [notes, setNotes] = useState(task?.notes ?? '');
  const [difficulty, setDifficulty] = useState<Difficulty>(task?.difficulty ?? 'easy');
  const [days, setDays] = useState<number[]>(
    task?.schedule?.freq === 'custom' ? task.schedule.days : []
  );
  const [target, setTarget] = useState(task?.targetCount ? String(task.targetCount) : '');
  const [due, setDue] = useState(task?.dueAt ? dayKeyFor(new Date(task.dueAt)) : '');
  const [saved, setSaved] = useState(false);

  if (!task) {
    return (
      <View style={styles.screen}>
        <Text style={styles.hint}>Task not found (it may be archived).</Text>
      </View>
    );
  }

  const dueValid = due === '' || DAY_KEY_RE.test(due);
  const canSave = title.trim().length > 0 && dueValid;

  const onSave = async () => {
    const schedule: Schedule | null =
      task.type === 'habit'
        ? days.length
          ? { freq: 'custom', days: [...days].sort() }
          : { freq: 'daily' }
        : null;
    await updateTask(
      task.id,
      {
        title: title.trim(),
        notes: notes.trim() || null,
        difficulty,
        schedule,
        targetCount: task.type === 'counted' ? Math.max(1, parseInt(target, 10) || 1) : null,
        dueAt: due ? dateFromDayKey(due).toISOString() : null,
      },
      new Date()
    );
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  // §4 Snooze: push due_at forward without touching completion history
  const snooze = async (byDays: number) => {
    const base = task.dueAt ? new Date(task.dueAt) : new Date();
    const next = addDays(base, byDays);
    await updateTask(task.id, { dueAt: next.toISOString() }, new Date());
    setDue(dayKeyFor(next));
  };

  const onArchive = async () => {
    await archiveTask(task.id, new Date());
    router.back();
  };

  const toggleDay = (d: number) =>
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: spacing.xl }}>
      <Stack.Screen options={{ title: task.title }} />
      <View style={styles.panel}>
        <Text style={styles.label}>Title</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} />

        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={[styles.input, styles.notesInput]}
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholder="Optional"
          placeholderTextColor={colors.textSecondary}
        />

        <Text style={styles.label}>Difficulty</Text>
        <View style={styles.row}>
          {DIFFICULTIES.map((d) => (
            <Pressable
              key={d}
              onPress={() => setDifficulty(d)}
              style={[
                styles.chip,
                { borderColor: difficultyColors[d] },
                difficulty === d && { backgroundColor: difficultyColors[d] + '33' },
              ]}
            >
              <Text style={[styles.chipText, { color: difficultyColors[d] }]}>{d}</Text>
            </Pressable>
          ))}
        </View>

        {task.type === 'habit' && (
          <>
            <Text style={styles.label}>Scheduled days {days.length ? '' : '(every day)'}</Text>
            <View style={styles.row}>
              {WEEKDAYS.map((label, d) => (
                <Pressable
                  key={d}
                  onPress={() => toggleDay(d)}
                  style={[styles.dayChip, days.includes(d) && styles.dayChipActive]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: days.includes(d) ? colors.background : colors.textSecondary },
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        {task.type === 'counted' && (
          <>
            <Text style={styles.label}>Daily target</Text>
            <TextInput
              style={styles.input}
              value={target}
              onChangeText={setTarget}
              keyboardType="number-pad"
            />
          </>
        )}

        <Text style={styles.label}>Due date (YYYY-MM-DD)</Text>
        <TextInput
          style={[styles.input, !dueValid && styles.inputError]}
          value={due}
          onChangeText={setDue}
          placeholder="None"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
        />
        <View style={styles.row}>
          <Pressable style={styles.snoozeChip} onPress={() => snooze(1)}>
            <Text style={styles.snoozeText}>Snooze +1d</Text>
          </Pressable>
          <Pressable style={styles.snoozeChip} onPress={() => snooze(7)}>
            <Text style={styles.snoozeText}>Snooze +1w</Text>
          </Pressable>
        </View>

        <Pressable
          style={[styles.saveButton, !canSave && { opacity: 0.4 }]}
          onPress={onSave}
          disabled={!canSave}
        >
          <Text style={styles.saveText}>{saved ? 'Saved ✓' : 'Save'}</Text>
        </Pressable>
      </View>

      <Pressable style={styles.archiveButton} onPress={onArchive}>
        <Text style={styles.archiveText}>Archive</Text>
      </Pressable>
      <Text style={styles.hint}>
        Archiving hides this quest but keeps all history. Restore from Profile → Archived.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, padding: spacing.md },
  panel: {
    backgroundColor: colors.panel,
    borderRadius: radii.md,
    padding: spacing.lg,
    gap: spacing.sm,
    ...glow,
  },
  label: { color: colors.textSecondary, fontSize: 12, marginTop: spacing.sm },
  input: {
    color: colors.textPrimary,
    fontSize: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.accent,
    paddingVertical: spacing.xs,
  },
  inputError: { borderBottomColor: '#E5484D' },
  notesInput: { minHeight: 60, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap', alignItems: 'center' },
  chip: {
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chipText: { fontSize: 12, textTransform: 'capitalize' },
  dayChip: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.textSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  snoozeChip: {
    borderWidth: 1,
    borderColor: colors.accentSecondary,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  snoozeText: { color: colors.accentSecondary, fontSize: 12 },
  saveButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  saveText: { color: colors.background, fontWeight: 'bold', fontSize: 15 },
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
