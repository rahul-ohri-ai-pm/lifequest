import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, difficultyColors, glow, radii, spacing } from '../constants/theme';
import type { Difficulty } from '../types';

const DIFFICULTIES: Difficulty[] = ['trivial', 'easy', 'medium', 'hard', 'epic'];

interface Props {
  onAdd(title: string, difficulty: Difficulty): void;
}

// §2: fast capture — title + difficulty required, one tap to save.
export function FastCapture({ onAdd }: Props) {
  const [title, setTitle] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');

  const submit = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    onAdd(trimmed, difficulty);
    setTitle('');
  };

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
  row: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  chip: {
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chipText: { fontSize: 12, textTransform: 'capitalize' },
  addButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  addButtonText: { color: colors.background, fontWeight: 'bold', fontSize: 15 },
});
