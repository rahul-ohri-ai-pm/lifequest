import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, difficultyColors, glow, radii, spacing } from '../constants/theme';
import type { Difficulty, Schedule, TaskType } from '../types';
import type { NewTask } from '../db/queries/tasks';

const DIFFICULTIES: Difficulty[] = ['trivial', 'easy', 'medium', 'hard', 'epic'];
const TYPES: TaskType[] = ['todo', 'habit', 'counted'];
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']; // index = Date.getDay()

interface Props {
  onAdd(input: NewTask): void;
}

// §2: fast capture — title + difficulty required, everything else optional.
export function FastCapture({ onAdd }: Props) {
  const [title, setTitle] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [type, setType] = useState<TaskType>('todo');
  const [days, setDays] = useState<number[]>([]); // empty = daily
  const [target, setTarget] = useState('');

  const submit = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const schedule: Schedule | null =
      type === 'habit' ? (days.length ? { freq: 'custom', days: [...days].sort() } : { freq: 'daily' }) : null;
    const targetCount = type === 'counted' ? Math.max(1, parseInt(target, 10) || 1) : null;
    onAdd({ title: trimmed, difficulty, type, schedule, targetCount });
    setTitle('');
    setTarget('');
    setDays([]);
  };

  const toggleDay = (d: number) =>
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  return (
    <View style={styles.panel}>
      <TextInput
        style={styles.input}
        placeholder="New quest…"
        placeholderTextColor={colors.textSecondary}
        value={title}
        onChangeText={setTitle}
        onSubmitEditing={submit}
        returnKeyType="done"
      />
      <View style={styles.row}>
        {TYPES.map((t) => (
          <Pressable
            key={t}
            onPress={() => setType(t)}
            style={[styles.chip, styles.typeChip, type === t && styles.typeChipActive]}
          >
            <Text style={[styles.chipText, { color: type === t ? colors.accent : colors.textSecondary }]}>
              {t}
            </Text>
          </Pressable>
        ))}
      </View>
      {type === 'habit' && (
        <View style={styles.row}>
          {WEEKDAYS.map((label, d) => (
            <Pressable
              key={d}
              onPress={() => toggleDay(d)}
              style={[styles.dayChip, days.includes(d) && styles.dayChipActive]}
            >
              <Text style={[styles.chipText, { color: days.includes(d) ? colors.background : colors.textSecondary }]}>
                {label}
              </Text>
            </Pressable>
          ))}
          <Text style={styles.dayHint}>{days.length ? '' : 'every day'}</Text>
        </View>
      )}
      {type === 'counted' && (
        <TextInput
          style={styles.input}
          placeholder="Daily target (e.g. 8)"
          placeholderTextColor={colors.textSecondary}
          value={target}
          onChangeText={setTarget}
          keyboardType="number-pad"
        />
      )}
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
      <Pressable style={styles.addButton} onPress={submit}>
        <Text style={styles.addButtonText}>+ Add</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.panel,
    borderRadius: radii.md,
    padding: spacing.md,
    margin: spacing.md,
    gap: spacing.sm,
    ...glow,
  },
  input: {
    color: colors.textPrimary,
    fontSize: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.accent,
    paddingVertical: spacing.sm,
  },
  row: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap', alignItems: 'center' },
  chip: {
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  typeChip: { borderColor: colors.textSecondary },
  typeChipActive: { borderColor: colors.accent, backgroundColor: colors.accent + '22' },
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
  dayHint: { color: colors.textSecondary, fontSize: 12, marginLeft: spacing.xs },
  addButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  addButtonText: { color: colors.background, fontWeight: 'bold', fontSize: 15 },
});
