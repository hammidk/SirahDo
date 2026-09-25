// Фильтр (docs/spec/overview.md): один из 4 фиксированных фильтров по сроку — живой
// список подходящих активных задач. Фильтры не создаются и не редактируются.

import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../components/themed';
import { Stack, useLocalSearchParams } from 'expo-router';

import { useAppData } from '../../lib/AppDataContext';
import { FIXED_FILTERS, matchesFilter } from '../../lib/filters';
import { dueSortKey } from '../../lib/dates';
import { TaskCard } from '../../components/TaskCard';
import { COLORS } from '../../components/ui';

export default function FilterScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { tasks } = useAppData();
  const filter = FIXED_FILTERS.find((f) => f.id === id);

  const results = useMemo(
    () =>
      filter
        ? tasks
            .filter((t) => matchesFilter(t, filter.id))
            .sort((a, b) => dueSortKey(a.due).localeCompare(dueSortKey(b.due)) || a.priority - b.priority)
        : [],
    [tasks, filter]
  );

  if (!filter) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ title: 'Фильтр' }} />
        <Text style={styles.hint}>Фильтр не найден.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 48 }}>
      <Stack.Screen options={{ title: filter.title }} />
      <Text style={styles.hint}>
        {filter.hint} · {results.length}
      </Text>
      {results.length === 0 ? <Text style={styles.empty}>Подходящих задач нет.</Text> : null}
      {results.map((t) => (
        <TaskCard key={t.id} task={t} showProject />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  hint: { color: COLORS.muted, fontSize: 13, paddingBottom: 8 },
  empty: { color: COLORS.tertiary, fontSize: 14, paddingVertical: 12 },
});
