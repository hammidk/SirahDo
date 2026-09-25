// История одного дня: выполненное (с временем и итогом), перенесённое (с причиной),
// невыполненное (можно перенести на сегодня), привычки и запись дневника.

import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../components/themed';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import dayjs from 'dayjs';

import { useAppData } from '../../lib/AppDataContext';
import { dayHistory } from '../../lib/history';
import { formatHijri, toHijri } from '../../lib/hijri';
import { todayKey, toDateKey } from '../../lib/dates';
import { useTaskSheet } from '../../components/TaskSheet';
import { COLORS } from '../../components/ui';
import { HabitIcon } from '../../components/HabitIcon';
import { tagBackground } from '../../theme/colors';

function Section({ title, children, empty }: { title: string; children: React.ReactNode; empty?: boolean }) {
  if (empty) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export default function HistoryDayScreen() {
  const { date: raw } = useLocalSearchParams<{ date: string }>();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(raw ?? '') ? raw! : toDateKey(new Date());
  const { tasks, habits, habitLogs, diary, settings, addOrUpdateTask } = useAppData();
  const { openTask } = useTaskSheet();
  const today = todayKey();
  const d = dayHistory(date, { tasks, habits, habitLogs, diary }, today);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 40 }}>
      <Stack.Screen options={{ title: dayjs(date).format('D MMMM YYYY') }} />
      <Text style={styles.heading}>{dayjs(date).format('dddd, D MMMM')}</Text>
      <Text style={styles.hijri}>{formatHijri(toHijri(date, settings.hijriOffset ?? 0))}</Text>

      <Section title={`Выполнено · ${d.done.length}`} empty={!d.done.length}>
        {d.done.map((t) => (
          <Pressable key={t.id} style={styles.item} onPress={() => openTask({ taskId: t.id })} accessibilityRole="button">
            <Text style={styles.itemTitle}>✓ {t.title}</Text>
            <Text style={styles.meta}>
              {t.startedAt ? `${dayjs(t.startedAt).format('HH:mm')}–` : ''}
              {dayjs(t.endedAt).format('HH:mm')}
              {t.value ? ` · ✦ ${t.value}` : ''}
            </Text>
            {t.comment ? <Text style={styles.comment}>«{t.comment}»</Text> : null}
          </Pressable>
        ))}
      </Section>

      <Section title={`Перенесено · ${d.postponed.length}`} empty={!d.postponed.length}>
        {d.postponed.map((t) => (
          <Pressable key={t.id} style={styles.item} onPress={() => openTask({ taskId: t.id })} accessibilityRole="button">
            <Text style={styles.itemTitle}>↷ {t.title}</Text>
            <Text style={styles.meta}>
              {t.status === 'done' ? 'потом выполнено' : t.due ? `теперь на ${dayjs(t.due.date).format('D MMMM')}` : 'без срока'}
            </Text>
            {t.postponeReason ? <Text style={styles.comment}>Причина: {t.postponeReason}</Text> : null}
          </Pressable>
        ))}
      </Section>

      <Section title={`Не сделано · ${d.notDone.length}`} empty={!d.notDone.length}>
        {d.notDone.map((t) => (
          <View key={t.id} style={[styles.item, styles.row]}>
            <Pressable style={{ flex: 1 }} onPress={() => openTask({ taskId: t.id })} accessibilityRole="button">
              <Text style={styles.itemTitle}>○ {t.title}</Text>
            </Pressable>
            <Pressable
              onPress={() => addOrUpdateTask({ id: t.id, due: { ...t.due!, date: today } })}
              hitSlop={8}
              accessibilityRole="button"
            >
              <Text style={styles.link}>На сегодня</Text>
            </Pressable>
          </View>
        ))}
      </Section>

      <Section title="Привычки" empty={!d.habits.length}>
        <View style={styles.habits}>
          {d.habits.map(({ habit, count, done }) => (
            <View key={habit.id} style={[styles.habit, done && styles.habitDone]}>
              <HabitIcon id={habit.icon} size={14} color={done ? COLORS.success : habit.color} />
              <Text style={styles.habitName} numberOfLines={1}>
                {habit.name}
              </Text>
              <Text style={styles.meta}>{done ? '✓' : `${count}/${habit.targetCountPerDay}`}</Text>
            </View>
          ))}
        </View>
      </Section>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Дневник</Text>
        <Pressable style={styles.item} onPress={() => router.push(`/diary/${date}`)} accessibilityRole="button">
          {d.diary ? (
            <>
              {d.diary.text ? <Text style={styles.diaryText}>{d.diary.text}</Text> : null}
              {d.diary.wentWell ? <Text style={styles.meta}>Получилось: {d.diary.wentWell}</Text> : null}
              {d.diary.changeTomorrow ? <Text style={styles.meta}>Изменить: {d.diary.changeTomorrow}</Text> : null}
              {d.diary.gratitude ? <Text style={styles.meta}>Благодарность: {d.diary.gratitude}</Text> : null}
            </>
          ) : (
            <Text style={styles.meta}>Записи нет — нажмите, чтобы написать.</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  heading: { fontSize: 22, fontWeight: '700', color: COLORS.text, textTransform: 'capitalize' },
  hijri: { fontSize: 13, color: COLORS.muted, marginTop: 2 },
  section: { marginTop: 18 },
  sectionTitle: { fontSize: 13, fontWeight: '500', color: COLORS.tertiary, marginBottom: 6 },
  item: { backgroundColor: COLORS.card, borderRadius: 8, padding: 12, marginBottom: 6, gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  itemTitle: { fontSize: 15, color: COLORS.text },
  meta: { fontSize: 12, color: COLORS.muted },
  comment: { fontSize: 13, color: COLORS.ai, fontStyle: 'italic', marginTop: 2 },
  link: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  habits: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  habit: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.card, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 },
  habitDone: { backgroundColor: tagBackground(COLORS.success) },
  habitName: { fontSize: 13, color: COLORS.text, maxWidth: 160 },
  diaryText: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
});
