import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SkillChips } from './SkillChips';
import { orderSkillsByMru, useSkillStore } from '../store/useSkillStore';
import { colors, glow, radii, spacing } from '../constants/theme';
import type { Schedule, TaskType } from '../types';
import type { NewTask } from '../db/queries/tasks';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']; // index = Date.getDay()

interface Props {
  onAdd(input: NewTask, skillIds: string[]): void;
}

// §2 fast capture, reworked per Phase 1.5: title is the only required field.
// Schedule and target are orthogonal toggles — no type picker, no difficulty
// picker (difficulty defaults to medium; editable on the task's edit screen).
export function FastCapture({ onAdd }: Props) {
  const [title, setTitle] = useState('');
  const [repeat, setRepeat] = useState(false);
  const [days, setDays] = useState<number[]>([]); // empty = daily
  const [counted, setCounted] = useState(false);
  const [target, setTarget] = useState('');
  const [skillIds, setSkillIds] = useState<string[]>([]);
  // Subscribe to the raw state and derive here: a selector returning a fresh array on every
  // render loops forever under zustand v5 (see orderSkillsByMru).
  const skills = useSkillStore((s) => s.skills);
  const mru = useSkillStore((s) => s.mru);
  const orderedSkills = useMemo(() => orderSkillsByMru(skills, mru), [skills, mru]);

  const submit = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const schedule: Schedule | null = repeat
      ? days.length
        ? { freq: 'custom', days: [...days].sort() }
        : { freq: 'daily' }
      : null;
    const targetCount = counted ? Math.max(1, parseInt(target, 10) || 1) : null;
    const type: TaskType = counted ? 'counted' : repeat ? 'habit' : 'todo';
    onAdd({ title: trimmed, difficulty: 'medium', type, schedule, targetCount }, skillIds);
    setTitle('');
    setRepeat(false);
    setDays([]);
    setCounted(false);
    setTarget('');
    setSkillIds([]);
  };

  const toggleSkill = (id: string) =>
    setSkillIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

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
      <SkillChips skills={orderedSkills} selected={skillIds} onToggle={toggleSkill} />
      <View style={styles.row}>
        <Pressable
          onPress={() => setRepeat(!repeat)}
          style={[styles.toggle, repeat && styles.toggleActive]}
        >
          <Text style={[styles.toggleText, repeat && styles.toggleTextActive]}>↻ Repeat</Text>
        </Pressable>
        <Pressable
          onPress={() => setCounted(!counted)}
          style={[styles.toggle, counted && styles.toggleActive]}
        >
          <Text style={[styles.toggleText, counted && styles.toggleTextActive]}># Count to target</Text>
        </Pressable>
      </View>
      {repeat && (
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
          {!days.length && <Text style={styles.dayHint}>every day</Text>}
        </View>
      )}
      {counted && (
        <TextInput
          style={styles.input}
          placeholder="Daily target (e.g. 8)"
          placeholderTextColor={colors.textSecondary}
          value={target}
          onChangeText={setTarget}
          keyboardType="number-pad"
        />
      )}
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
  toggle: {
    borderWidth: 1,
    borderColor: colors.textSecondary,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  toggleActive: { borderColor: colors.accent, backgroundColor: colors.accent + '22' },
  toggleText: { fontSize: 13, color: colors.textSecondary },
  toggleTextActive: { color: colors.accent },
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
