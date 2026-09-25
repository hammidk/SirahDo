// Сохранённый фильтр (docs/spec/overview.md): условия из чипов + живой список подходящих задач.
// id = "new" — создание нового фильтра.

import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '../../components/themed';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Icon } from '../../components/Icon';

import { useAppData } from '../../lib/AppDataContext';
import type { DueFilter, FilterCriteria, IntentionTagId, Priority, SphereId } from '../../lib/types';
import { INTENTION_TAGS, PRIORITIES, SPHERES } from '../../lib/types';
import { DUE_FILTERS, isEmptyCriteria, matchesCriteria } from '../../lib/filters';
import { dueSortKey } from '../../lib/dates';
import { TaskCard } from '../../components/TaskCard';
import { COLORS, Chip, ChipsRow, FieldLabel, confirmDestructive } from '../../components/ui';

function toggle<T>(list: T[] | undefined, value: T): T[] {
  const l = list ?? [];
  return l.includes(value) ? l.filter((x) => x !== value) : [...l, value];
}

export default function FilterScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const { filters, tasks, tags, addOrUpdateFilter, removeFilter } = useAppData();
  const existing = filters.find((f) => f.id === id);

  const [name, setName] = useState(existing?.name ?? '');
  const [criteria, setCriteria] = useState<FilterCriteria>(existing?.criteria ?? {});
  const [editing, setEditing] = useState(isNew);
  const dirty = !existing || name !== existing.name || JSON.stringify(criteria) !== JSON.stringify(existing.criteria);

  const results = useMemo(
    () =>
      tasks
        .filter((t) => matchesCriteria(t, criteria))
        .sort((a, b) => dueSortKey(a.due).localeCompare(dueSortKey(b.due)) || a.priority - b.priority),
    [tasks, criteria]
  );

  const onSave = async () => {
    if (!name.trim()) {
      Alert.alert('Нужно название', 'Например: «Ибада на этой неделе».');
      return;
    }
    const saved = await addOrUpdateFilter(
      existing ? { id: existing.id, name: name.trim(), criteria } : { name: name.trim(), criteria }
    );
    setEditing(false);
    if (isNew) router.replace(`/filter/${saved.id}`);
  };

  const onDelete = () =>
    existing &&
    confirmDestructive(`Удалить фильтр «${existing.name}»?`, 'Задачи не пострадают.', async () => {
      await removeFilter(existing.id);
      router.back();
    });

  if (!isNew && !existing) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ title: 'Фильтр' }} />
        <Text style={styles.hint}>Фильтр не найден.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
      <Stack.Screen
        options={{
          title: isNew ? 'Новый фильтр' : existing!.name,
          headerRight: existing
            ? () => (
                <View style={styles.headerActions}>
                  <Pressable
                    onPress={() => addOrUpdateFilter({ id: existing.id, favorite: !existing.favorite })}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel={existing.favorite ? 'Убрать из избранного' : 'В избранное'}
                  >
                    <Icon name="star" filled={existing.favorite} size={22} color={existing.favorite ? COLORS.warning : COLORS.muted} />
                  </Pressable>
                  <Pressable onPress={onDelete} hitSlop={10} accessibilityRole="button" accessibilityLabel="Удалить фильтр">
                    <Icon name="trash" size={21} color={COLORS.danger} />
                  </Pressable>
                </View>
              )
            : undefined,
        }}
      />

      {editing ? (
        <View>
          <TextInput
            style={styles.nameInput}
            placeholder="Название фильтра"
            value={name}
            onChangeText={setName}
            autoFocus={isNew}
          />

          <FieldLabel>Срок</FieldLabel>
          <ChipsRow>
            {DUE_FILTERS.map((d) => (
              <Chip
                key={d.id}
                label={d.title}
                active={criteria.due === d.id}
                onPress={() => setCriteria((c) => ({ ...c, due: c.due === d.id ? undefined : (d.id as DueFilter) }))}
              />
            ))}
          </ChipsRow>

          <FieldLabel>Приоритет</FieldLabel>
          <ChipsRow>
            {PRIORITIES.map((p) => (
              <Chip
                key={p.id}
                label={p.title}
                color={p.color}
                active={!!criteria.priorities?.includes(p.id)}
                onPress={() => setCriteria((c) => ({ ...c, priorities: toggle<Priority>(c.priorities, p.id) }))}
              />
            ))}
          </ChipsRow>

          <FieldLabel>Сфера жизни</FieldLabel>
          <ChipsRow>
            {SPHERES.map((s) => (
              <Chip
                key={s.id}
                label={s.title}
                active={!!criteria.spheres?.includes(s.id)}
                onPress={() => setCriteria((c) => ({ ...c, spheres: toggle<SphereId>(c.spheres, s.id) }))}
              />
            ))}
          </ChipsRow>

          <FieldLabel>Тег намерения</FieldLabel>
          <ChipsRow>
            {INTENTION_TAGS.map((t) => (
              <Chip
                key={t.id}
                label={t.title}
                color={COLORS.ai}
                active={!!criteria.intentionTags?.includes(t.id)}
                onPress={() => setCriteria((c) => ({ ...c, intentionTags: toggle<IntentionTagId>(c.intentionTags, t.id) }))}
              />
            ))}
          </ChipsRow>

          {tags.length > 0 ? (
            <>
              <FieldLabel>Теги (любой из)</FieldLabel>
              <ChipsRow>
                {tags.map((t) => (
                  <Chip
                    key={t.id}
                    label={`#${t.name}`}
                    color={t.color}
                    active={!!criteria.tagIds?.includes(t.id)}
                    onPress={() => setCriteria((c) => ({ ...c, tagIds: toggle<string>(c.tagIds, t.id) }))}
                  />
                ))}
              </ChipsRow>
            </>
          ) : null}

          <Pressable style={[styles.saveButton, !dirty && styles.saveDisabled]} onPress={onSave} accessibilityRole="button">
            <Text style={styles.saveText}>{isNew ? 'Создать фильтр' : 'Сохранить условия'}</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable style={styles.summary} onPress={() => setEditing(true)} accessibilityRole="button" accessibilityHint="Изменить условия">
          <Icon name="filter" size={18} color={COLORS.ai} />
          <Text style={styles.summaryText}>{describeCriteria(criteria, tags)}</Text>
          <Icon name="edit" size={18} color={COLORS.muted} />
        </Pressable>
      )}

      <FieldLabel>Задачи · {results.length}</FieldLabel>
      {isEmptyCriteria(criteria) ? <Text style={styles.hint}>Условий нет — показаны все активные задачи.</Text> : null}
      {results.map((t) => (
        <TaskCard key={t.id} task={t} showProject />
      ))}
    </ScrollView>
  );
}

function describeCriteria(c: FilterCriteria, tags: { id: string; name: string }[]): string {
  const parts: string[] = [];
  if (c.due) parts.push(DUE_FILTERS.find((d) => d.id === c.due)!.title);
  if (c.priorities?.length) parts.push(c.priorities.map((p) => `П${p}`).join('/'));
  if (c.spheres?.length) parts.push(c.spheres.map((s) => SPHERES.find((x) => x.id === s)?.title).join('/'));
  if (c.intentionTags?.length) parts.push(c.intentionTags.map((t) => INTENTION_TAGS.find((x) => x.id === t)?.title).join('/'));
  if (c.tagIds?.length) parts.push(c.tagIds.map((id) => `#${tags.find((t) => t.id === id)?.name ?? '?'}`).join(' '));
  return parts.length ? parts.join(' · ') : 'Все активные задачи';
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  headerActions: { flexDirection: 'row', gap: 18, paddingHorizontal: 12 },
  hint: { color: COLORS.muted, fontSize: 13, paddingVertical: 6 },
  nameInput: { fontSize: 17, fontWeight: '600', backgroundColor: COLORS.card, borderRadius: 8, padding: 12, color: COLORS.text },
  saveButton: { backgroundColor: COLORS.text, borderRadius: 6, paddingVertical: 13, alignItems: 'center', marginTop: 18 },
  saveDisabled: { opacity: 0.5 },
  saveText: { color: COLORS.onAccent, fontWeight: '600', fontSize: 15 },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.card, borderRadius: 8, padding: 12 },
  summaryText: { flex: 1, fontSize: 14, color: COLORS.text },
});
