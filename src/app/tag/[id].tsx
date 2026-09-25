// Тег: задачи с этим тегом, избранное, цвет, переименование, удаление.

import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../components/themed';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Icon } from '../../components/Icon';

import { useAppData } from '../../lib/AppDataContext';
import { CALENDAR_COLORS } from '../../lib/types';
import { dueSortKey } from '../../lib/dates';
import { TaskCard } from '../../components/TaskCard';
import { Fab } from '../../components/Fab';
import { useTaskSheet } from '../../components/TaskSheet';
import { NameSheet } from '../../components/ProjectSheets';
import { COLORS, FieldLabel, confirmDestructive } from '../../components/ui';

export default function TagScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { tags, tasks, addOrUpdateTag, removeTag } = useAppData();
  const { openTask } = useTaskSheet();
  const [renaming, setRenaming] = useState(false);
  const tag = tags.find((t) => t.id === id);

  const tagTasks = useMemo(
    () =>
      tasks
        .filter((t) => t.status === 'active' && t.tagIds.includes(id ?? ''))
        .sort((a, b) => dueSortKey(a.due).localeCompare(dueSortKey(b.due)) || a.priority - b.priority),
    [tasks, id]
  );

  if (!tag) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ title: 'Тег' }} />
        <Text style={styles.hint}>Тег не найден.</Text>
      </View>
    );
  }

  const onDelete = () =>
    confirmDestructive(`Удалить тег #${tag.name}?`, 'Задачи останутся, у них просто пропадёт этот тег.', async () => {
      await removeTag(tag.id);
      router.back();
    });

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          title: `#${tag.name}`,
          headerRight: () => (
            <View style={styles.headerActions}>
              <Pressable
                onPress={() => addOrUpdateTag({ id: tag.id, favorite: !tag.favorite })}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={tag.favorite ? 'Убрать из избранного' : 'В избранное'}
              >
                <Icon name="star" filled={tag.favorite} size={22} color={tag.favorite ? COLORS.warning : COLORS.muted} />
              </Pressable>
              <Pressable onPress={() => setRenaming(true)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Переименовать">
                <Icon name="edit" size={22} color={COLORS.muted} />
              </Pressable>
              <Pressable onPress={onDelete} hitSlop={10} accessibilityRole="button" accessibilityLabel="Удалить тег">
                <Icon name="trash" size={21} color={COLORS.danger} />
              </Pressable>
            </View>
          ),
        }}
      />
      <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 96 }}>
        <FieldLabel>Цвет</FieldLabel>
        <View style={styles.colors}>
          {CALENDAR_COLORS.map((c) => (
            <Pressable
              key={c}
              style={[styles.color, { backgroundColor: c }, (tag.color ?? COLORS.primary) === c && styles.colorActive]}
              onPress={() => addOrUpdateTag({ id: tag.id, color: c })}
              accessibilityRole="button"
              accessibilityLabel={`Цвет ${c}`}
              accessibilityState={{ selected: tag.color === c }}
            />
          ))}
        </View>

        <FieldLabel>Задачи</FieldLabel>
        {tagTasks.length === 0 ? <Text style={styles.hint}>С этим тегом нет активных задач.</Text> : null}
        {tagTasks.map((t) => (
          <TaskCard key={t.id} task={t} showProject />
        ))}
      </ScrollView>
      <Fab accessibilityLabel="Новая задача с этим тегом" onPress={() => openTask({ defaults: { tagIds: [tag.id] } })} />
      {renaming ? (
        <NameSheet
          title="Название тега"
          placeholder="Название"
          initial={tag.name}
          onClose={() => setRenaming(false)}
          onSave={async (name) => {
            await addOrUpdateTag({ id: tag.id, name: name.replace(/^#/, '') });
            setRenaming(false);
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  headerActions: { flexDirection: 'row', gap: 18, paddingHorizontal: 12 },
  hint: { color: COLORS.muted, fontSize: 13, paddingVertical: 8 },
  colors: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  color: { width: 30, height: 30, borderRadius: 15 },
  colorActive: { borderWidth: 3, borderColor: COLORS.text },
});
