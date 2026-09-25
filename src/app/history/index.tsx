// История: список прожитых дней (новые сверху) с короткой сводкой.

import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../components/themed';
import { router } from 'expo-router';
import dayjs from 'dayjs';

import { useAppData } from '../../lib/AppDataContext';
import { dayHistory, isQuietDay } from '../../lib/history';
import { logIndex } from '../../lib/habits';
import { formatHijri, toHijri } from '../../lib/hijri';
import { DATE_FORMAT, todayKey } from '../../lib/dates';
import { COLORS } from '../../components/ui';

const PAGE = 30;

export default function HistoryScreen() {
  const { tasks, habits, habitLogs, diary, settings } = useAppData();
  const [days, setDays] = useState(PAGE);
  const today = todayKey();
  const index = useMemo(() => logIndex(habitLogs), [habitLogs]);

  const list = useMemo(
    () =>
      Array.from({ length: days }, (_, i) => dayjs(today).subtract(i, 'day').format(DATE_FORMAT)).map((d) =>
        dayHistory(d, { tasks, habits, habitLogs, diary }, today, index)
      ),
    [days, today, tasks, habits, habitLogs, diary, index]
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 40 }}>
      {list.map((d) => {
        const quiet = isQuietDay(d);
        const habitsDone = d.habits.filter((h) => h.done).length;
        return (
          <Pressable
            key={d.date}
            style={[styles.card, quiet && styles.cardQuiet]}
            onPress={() => router.push(`/history/${d.date}`)}
            accessibilityRole="button"
          >
            <View style={styles.header}>
              <Text style={styles.date}>
                {d.date === today ? 'Сегодня · ' : ''}
                {dayjs(d.date).format('dd, D MMMM')}
              </Text>
              <Text style={styles.hijri}>{formatHijri(toHijri(d.date, settings.hijriOffset ?? 0))}</Text>
            </View>
            {quiet ? (
              <Text style={styles.quiet}>Тихий день — без записей</Text>
            ) : (
              <View style={styles.stats}>
                {d.done.length ? <Text style={[styles.stat, { color: COLORS.success }]}>✓ {d.done.length}</Text> : null}
                {d.postponed.length ? <Text style={[styles.stat, { color: COLORS.warning }]}>↷ {d.postponed.length}</Text> : null}
                {d.notDone.length ? <Text style={styles.stat}>○ {d.notDone.length}</Text> : null}
                {d.habits.length ? (
                  <Text style={styles.stat}>
                    привычки {habitsDone}/{d.habits.length}
                  </Text>
                ) : null}
                {d.diary ? <Text style={[styles.stat, { color: COLORS.ai }]}>📔 дневник</Text> : null}
              </View>
            )}
            {d.done.length ? (
              <Text style={styles.titles} numberOfLines={1}>
                {d.done.map((t) => t.title).join(' · ')}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
      <Pressable style={styles.more} onPress={() => setDays((n) => n + PAGE)} accessibilityRole="button">
        <Text style={styles.moreText}>Показать ещё {PAGE} дней</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  card: { backgroundColor: COLORS.card, borderRadius: 8, padding: 12, marginBottom: 8 },
  cardQuiet: { opacity: 0.6 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  date: { fontSize: 15, fontWeight: '600', color: COLORS.text, textTransform: 'capitalize' },
  hijri: { fontSize: 11, color: COLORS.muted },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 6 },
  stat: { fontSize: 13, color: COLORS.muted, fontWeight: '600' },
  quiet: { fontSize: 13, color: COLORS.muted, marginTop: 4 },
  titles: { fontSize: 12, color: COLORS.muted, marginTop: 4 },
  more: { paddingVertical: 14, alignItems: 'center' },
  moreText: { color: COLORS.primary, fontSize: 14 },
});
