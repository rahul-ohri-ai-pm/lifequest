import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
// Two weights only, imported per-weight so metro bundles just these two files
// and not the whole Rajdhani family (§3 bundle discipline, §5 typography).
import { useFonts, Rajdhani_400Regular, Rajdhani_700Bold } from '@expo-google-fonts/rajdhani';
import { getDb } from '../src/db/client';
import { runMigrations } from '../src/db/migrations';
import { useCharacterStore } from '../src/store/useCharacterStore';
import { useSkillStore } from '../src/store/useSkillStore';
import { useTaskStore } from '../src/store/useTaskStore';
import { colors } from '../src/constants/theme';

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // fontError is deliberately treated as "carry on": a missing display face makes
  // the app plainer, not broken, and bricking startup over a font would be worse.
  const [fontsLoaded, fontError] = useFonts({ Rajdhani_400Regular, Rajdhani_700Bold });

  useEffect(() => {
    (async () => {
      try {
        const db = await getDb();
        await runMigrations(db);
        await Promise.all([
          useCharacterStore.getState().hydrate(),
          useTaskStore.getState().hydrate(new Date()),
          useSkillStore.getState().hydrate(),
        ]);
        setReady(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, []);

  if (error) {
    return (
      <View style={styles.gate}>
        <Text style={styles.errorText}>Failed to start: {error}</Text>
      </View>
    );
  }

  if (!ready || !(fontsLoaded || fontError)) {
    return (
      <View style={styles.gate}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.backgroundAlt },
          headerTintColor: colors.textPrimary,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  gate: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: { color: colors.textPrimary, padding: 24, textAlign: 'center' },
});
