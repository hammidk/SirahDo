// Дневник: все вечерние записи (новые сверху) и быстрый переход к записи за сегодня.

import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../components/themed';
import { router } from 'expo-router';
import dayjs from 'dayjs';

import { useAppData } from '../../lib/AppDataContext';
import { formatHijri, toHijri } from '../../lib/hijri';
import { todayKey } from '../../lib/dates';
import { COLORS } from '../../components/ui';

export default function DiaryListScreen() {
  const { diary, settings } = useAppData();
  const today = todayKey();
  const entries = [...diary].sort((a, b) => b.date.localeCompare(a.date));
  const hasToday = entries.some((e) => e.date === today);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 40 }}>
      <Pressable style={styles.todayButton} onPress={() => router.push(`/diary/${today}`)} accessibilityRole="button">
        <Text style={styles.todayText}>{hasToday ? 'Открыть запись за сегодня' : '+ Запись за сегодня'}</Text>
      </Pressable>

      {entries.length === 0 ? (
        <Text style={styles.hint}>
          Вечером, перед сном — пара предложений о дне: что получилось, что изменить завтра, за что благодарны.
        </Text>
      ) : null}

      {entries.map((e) => (
        <Pressable key={e.id} style={styles.card} onPress={() => router.push(`/diary/${e.date}`)} accessibilityRole="button">
          <View style={styles.header}>
            <Text style={styles.date}>{dayjs(e.date).format('dd, D MMMM YYYY')}</Text>
            <Text style={styles.hijri}>{formatHijri(toHijri(e.date, settings.hijriOffset ?? 0))}</Text>
          </View>
          {e.text ? (
            <Text style={styles.text} numberOfLines={3}>
              {e.text}
            </Text>
          ) : null}
          {e.gratitude ? (
            <Text style={styles.meta} numberOfLines={1}>
              🤲 {e.gratitude}
            </Text>
          ) : null}
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  todayButton: { backgroundColor: COLORS.aiBackground, borderRadius: 8, padding: 14, alignItems: 'center', marginBottom: 12 },
  todayText: { color: COLORS.ai, fontWeight: '700', fontSize: 15 },
  hint: { fontSize: 13, color: COLORS.muted, lineHeight: 19 },
  card: { backgroundColor: COLORS.card, borderRadius: 8, padding: 12, marginBottom: 8, gap: 4 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  date: { fontSize: 15, fontWeight: '600', color: COLORS.text, textTransform: 'capitalize' },
  hijri: { fontSize: 11, color: COLORS.muted },
  text: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
  meta: { fontSize: 12, color: COLORS.muted },
});
