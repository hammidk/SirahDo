// Дневник — вечерняя запись за день (docs/spec/journal.md): свободный текст + короткий анализ
// дня. Одна запись на дату. Список записей и История — на этапе 7.

import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '../../components/themed';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import dayjs from 'dayjs';

import { useAppData } from '../../lib/AppDataContext';
import { toDateKey } from '../../lib/dates';
import { COLORS, FieldLabel, confirmDestructive } from '../../components/ui';

export default function DiaryEntryScreen() {
  const { date: rawDate } = useLocalSearchParams<{ date: string }>();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(rawDate ?? '') ? rawDate! : toDateKey(new Date());
  const { diary, tasks, habits, habitLogs, saveDiaryEntry, removeDiaryEntry } = useAppData();

  const existing = useMemo(() => diary.find((d) => d.date === date), [diary, date]);
  const [text, setText] = useState(existing?.text ?? '');
  const [wentWell, setWentWell] = useState(existing?.wentWell ?? '');
  const [changeTomorrow, setChangeTomorrow] = useState(existing?.changeTomorrow ?? '');
  const [gratitude, setGratitude] = useState(existing?.gratitude ?? '');

  // Короткая сводка дня — опора для анализа.
  const doneTasks = useMemo(
    () => tasks.filter((t) => t.status === 'done' && t.endedAt && toDateKey(t.endedAt) === date),
    [tasks, date]
  );
  const habitsDone = useMemo(() => {
    const logs = habitLogs.filter((l) => l.date === date);
    return habits.filter((h) => {
      const log = logs.find((l) => l.habitId === h.id);
      return log && log.completedCount >= h.targetCountPerDay;
    }).length;
  }, [habits, habitLogs, date]);

  const onSave = async () => {
    await saveDiaryEntry(date, {
      text: text.trim(),
      wentWell: wentWell.trim() || undefined,
      changeTomorrow: changeTomorrow.trim() || undefined,
      gratitude: gratitude.trim() || undefined,
    });
    router.back();
  };

  const onDelete = () =>
    confirmDestructive('Удалить запись дневника?', undefined, async () => {
      await removeDiaryEntry(date);
      router.back();
    });

  const title = dayjs(date).format('D MMMM');

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: `Дневник · ${title}` }} />

      <View style={styles.summary}>
        <Text style={styles.summaryText}>
          ✓ Выполнено задач: {doneTasks.length}
          {habits.length > 0 ? `   ·   Привычек: ${habitsDone} из ${habits.filter((h) => !h.archived).length}` : ''}
        </Text>
        {doneTasks.slice(0, 5).map((t) => (
          <Text key={t.id} style={styles.summaryItem} numberOfLines={1}>
            • {t.title}
          </Text>
        ))}
        {doneTasks.length > 5 ? <Text style={styles.summaryItem}>и ещё {doneTasks.length - 5}…</Text> : null}
      </View>

      <FieldLabel>Как прошёл день</FieldLabel>
      <TextInput
        style={[styles.input, styles.inputLarge]}
        placeholder="Пара предложений о дне — без оценок, просто честно."
        value={text}
        onChangeText={setText}
        multiline
      />

      <FieldLabel>Что получилось</FieldLabel>
      <TextInput style={styles.input} placeholder="За что себя похвалить?" value={wentWell} onChangeText={setWentWell} multiline />

      <FieldLabel>Что изменить завтра</FieldLabel>
      <TextInput
        style={styles.input}
        placeholder="Одно маленькое улучшение"
        value={changeTomorrow}
        onChangeText={setChangeTomorrow}
        multiline
      />

      <FieldLabel>Благодарность</FieldLabel>
      <TextInput
        style={styles.input}
        placeholder="За что благодарен Аллаху сегодня?"
        value={gratitude}
        onChangeText={setGratitude}
        multiline
      />

      <Pressable style={styles.saveButton} onPress={onSave} accessibilityRole="button">
        <Text style={styles.saveButtonText}>Сохранить</Text>
      </Pressable>
      {existing ? (
        <Pressable style={styles.deleteButton} onPress={onDelete} accessibilityRole="button">
          <Text style={styles.deleteText}>Удалить запись</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  summary: { backgroundColor: COLORS.aiBackground, borderRadius: 8, padding: 12, gap: 4 },
  summaryText: { fontSize: 14, fontWeight: '600', color: COLORS.ai },
  summaryItem: { fontSize: 13, color: COLORS.text },
  input: {
    fontSize: 14,
    backgroundColor: COLORS.card,
    borderRadius: 8,
    padding: 12,
    minHeight: 48,
    textAlignVertical: 'top',
    color: COLORS.text,
  },
  inputLarge: { minHeight: 120 },
  saveButton: { backgroundColor: COLORS.text, borderRadius: 6, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
  saveButtonText: { color: COLORS.onAccent, fontWeight: '600', fontSize: 15 },
  deleteButton: { alignItems: 'center', paddingVertical: 14 },
  deleteText: { color: COLORS.danger, fontWeight: '600' },
});
