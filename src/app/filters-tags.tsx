// «Фильтры и теги» (docs/spec/overview.md): развёрнутые списки. Фильтров — 4
// фиксированных (не добавляются); теги — свои, «+» создаёт новый, тап — экран тега
// (переименование, цвет, избранное, удаление).

import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../components/themed';
import { router } from 'expo-router';

import { useAppData } from '../lib/AppDataContext';
import { FIXED_FILTERS, matchesFilter } from '../lib/filters';
import { Icon } from '../components/Icon';
import { NavGroup, NavRow, NavSeparator } from '../components/NavList';
import { NameSheet } from '../components/ProjectSheets';
import { COLORS } from '../components/ui';

export default function FiltersTagsScreen() {
  const { tasks, tags, addOrUpdateTag } = useAppData();
  const [newTagOpen, setNewTagOpen] = useState(false);

  const activeTasks = useMemo(() => tasks.filter((t) => t.status === 'active'), [tasks]);
  const countByTag = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of activeTasks) for (const id of t.tagIds) m.set(id, (m.get(id) ?? 0) + 1);
    return m;
  }, [activeTasks]);
  const sortedTags = [...tags].sort((a, b) => a.name.localeCompare(b.name, 'ru'));

  return (
    <View style={styles.container}>
      <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 48 }}>
        <Text style={styles.sectionTitle}>Фильтры</Text>
        <NavGroup>
          {FIXED_FILTERS.map((f, i) => (
            <View key={f.id}>
              {i > 0 ? <NavSeparator /> : null}
              <NavRow
                icon="filter"
                title={f.title}
                right={String(activeTasks.filter((t) => matchesFilter(t, f.id)).length)}
                onPress={() => router.push(`/filter/${f.id}`)}
              />
            </View>
          ))}
        </NavGroup>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Теги</Text>
          <Pressable onPress={() => setNewTagOpen(true)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Новый тег">
            <Icon name="add" size={24} color={COLORS.muted} />
          </Pressable>
        </View>
        {sortedTags.length === 0 ? (
          <Text style={styles.hint}>Тегов пока нет. Нажмите «+» или добавьте тег в карточке задачи.</Text>
        ) : (
          <NavGroup>
            {sortedTags.map((t, i) => (
              <View key={t.id}>
                {i > 0 ? <NavSeparator /> : null}
                <NavRow
                  icon="tag"
                  iconColor={t.color ?? COLORS.ai}
                  title={`#${t.name}`}
                  right={String(countByTag.get(t.id) ?? '')}
                  onPress={() => router.push(`/tag/${t.id}`)}
                />
              </View>
            ))}
          </NavGroup>
        )}
      </ScrollView>

      {newTagOpen ? (
        <NameSheet
          title="Новый тег"
          placeholder="Например: работа"
          onClose={() => setNewTagOpen(false)}
          onSave={async (name) => {
            await addOrUpdateTag({ name: name.replace(/^#/, '') });
            setNewTagOpen(false);
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  screen: { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginTop: 8, marginBottom: 8 },
  hint: { fontSize: 13, color: COLORS.muted, marginBottom: 8 },
});
