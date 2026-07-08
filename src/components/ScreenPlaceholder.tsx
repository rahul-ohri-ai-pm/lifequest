import { StyleSheet, Text, View } from 'react-native';
import { colors, glow, radii, spacing } from '../constants/theme';

export function ScreenPlaceholder({ title }: { title: string }) {
  return (
    <View style={styles.screen}>
      <View style={styles.panel}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>Coming soon</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  panel: {
    backgroundColor: colors.panel,
    borderRadius: radii.md,
    padding: spacing.lg,
    alignItems: 'center',
    minWidth: 220,
    ...glow,
  },
  title: { color: colors.textPrimary, fontSize: 20, fontWeight: 'bold' },
  subtitle: { color: colors.textSecondary, marginTop: spacing.sm },
});
