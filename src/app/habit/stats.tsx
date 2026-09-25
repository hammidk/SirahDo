// Статистика привычек (docs/spec/habits.md): период неделя / месяц / год — общий процент,
// теплокарта дней и строка по каждой привычке (процент, лучшая серия, всего).

import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../components/themed';
import dayjs from 'dayjs';

import { useAppData } from '../../lib/AppDataContext';
import { bestStreak, dayProgress, logIndex, periodStats } from '../../lib/habits';
import { DATE_FORMAT, WEEKDAY_SHORT, startOfIsoWeek, todayKey } from '../../lib/dates';
import { COLORS, Chip, ChipsRow } from '../../components/ui';
import { HabitIcon } from '../../components/HabitIcon';
import { withAlpha } from '../../theme/colors';

type Period = 'week' | 'month' | 'year';
const PERIODS: { id: Period; title: string }[] = [
  { id: 'week', title: 'Неделя' },
  { id: 'month', title: 'Месяц' },
  { id: 'year', title: 'Год' },
];

const cellColor = (ratio: number, scheduled: boolean) =>
  !scheduled ? COLORS.background : ratio <= 0 ? COLORS.hover : withAlpha(COLORS.success, 0.25 + 0.6 * ratio);

export default function HabitStatsScreen() {
  const { habits, habitLogs } = useAppData();
  const [period, setPeriod] = useState<Period>('week');
  const today = todayKey();
  const index = useMemo(() => logIndex(habitLogs), [habitLogs]);
  const active = habits.filter((h) => !h.archived);

  const range = useMemo(() => {
    const t = dayjs(today);
    if (period === 'week') return { from: startOfIsoWeek(t), to: startOfIsoWeek(t).add(6, 'day') };
    if (period === 'month') return { from: t.startOf('month'), to: t.endOf('month') };
    // Год — последние 52 недели, начиная с понедельника.
    return { from: startOfIsoWeek(t.subtract(51, 'week')), to: startOfIsoWeek(t).add(6, 'day') };
  }, [period, today]);

  const from = range.from.format(DATE_FORMAT);
  const to = range.to.format(DATE_FORMAT);
  const perHabit = active.map((h) => ({ habit: h, stats: periodStats(h, index, from, to, today), best: bestStreak(h, index, today) }));
  const totals = perHabit.reduce((acc, x) => ({ s: acc.s + x.stats.scheduledDays, d: acc.d + x.stats.doneDays }), { s: 0, d: 0 });
  const rate = totals.s ? totals.d / totals.s : 0;

  // Теплокарта: недели колонками (для года) или сетка дней.
  const days: string[] = [];
  for (let d = range.from; !d.isAfter(range.to); d = d.add(1, 'day')) days.push(d.format(DATE_FORMAT));
  const weeks: string[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  const cell = period === 'year' ? 5 : period === 'month' ? 22 : 36;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 40 }}>
      <ChipsRow>
        {PERIODS.map((p) => (
          <Chip key={p.id} label={p.title} active={period === p.id} onPress={() => setPeriod(p.id)} />
        ))}
      </ChipsRow>

      <View style={styles.card}>
        <Text style={styles.big}>{Math.round(rate * 100)}%</Text>
        <Text style={styles.caption}>
          выполнено запланированного · {totals.d} из {totals.s} {period === 'year' ? 'за 52 недели' : period === 'month' ? 'за месяц' : 'за неделю'}
        </Text>

        <View style={[styles.heatmap, period !== 'year' && { flexDirection: 'column' }]}>
          {period === 'year'
            ? weeks.map((w, wi) => (
                <View key={wi} style={{ gap: 1 }}>
                  {w.map((d) => {
                    const p = dayProgress(active, index, d);
                    return <View key={d} style={{ width: cell, height: cell, borderRadius: 1, backgroundColor: d > today ? 'transparent' : cellColor(p.ratio, p.total > 0) }} />;
                  })}
                </View>
              ))
            : weeks.map((w, wi) => (
                <View key={wi} style={{ flexDirection: 'row', gap: 4 }}>
                  {w.map((d, di) => {
                    const p = dayProgress(active, index, d);
                    return (
                      <View key={d} style={[styles.dayCell, { width: cell + 8 }]}>
                        {wi === 0 ? <Text style={styles.dow}>{WEEKDAY_SHORT[di]}</Text> : null}
                        <View
                          style={{
                            width: cell,
                            height: cell,
                            borderRadius: 6,
                            backgroundColor: d > today ? 'transparent' : cellColor(p.ratio, p.total > 0),
                            borderWidth: d === today ? 2 : 0,
                            borderColor: COLORS.primary,
                          }}
                          accessibilityLabel={`${dayjs(d).format('D MMMM')}: ${p.done} из ${p.total}`}
                        />
                      </View>
                    );
                  })}
                </View>
              ))}
        </View>
      </View>

      <Text style={styles.sectionTitle}>По привычкам</Text>
      {perHabit.length === 0 ? <Text style={styles.caption}>Пока нет привычек.</Text> : null}
      {perHabit.map(({ habit, stats, best }) => (
        <View key={habit.id} style={styles.row}>
          <View style={[styles.icon, { backgroundColor: withAlpha(habit.color, 0.18) }]}>
            <HabitIcon id={habit.icon} size={18} color={habit.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{habit.name}</Text>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.round(stats.rate * 100)}%`, backgroundColor: habit.color }]} />
            </View>
            <Text style={styles.caption}>
              {stats.doneDays} из {stats.scheduledDays} дн. · лучшая серия {best}
              {habit.targetCountPerDay > 1 ? ` · всего отметок ${stats.totalCount}` : ''}
            </Text>
          </View>
          <Text style={styles.percent}>{Math.round(stats.rate * 100)}%</Text>
        </View>
      ))}
      <Text style={styles.note}>Пропуски не обнуляют путь: важна не идеальная серия, а постоянство в долгую.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  card: { backgroundColor: COLORS.card, borderRadius: 8, padding: 14, marginTop: 12 },
  big: { fontSize: 30, fontWeight: '700', color: COLORS.text },
  caption: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  heatmap: { flexDirection: 'row', flexWrap: 'wrap', gap: 1, marginTop: 12 },
  dayCell: { alignItems: 'center', gap: 2, marginBottom: 4 },
  dow: { fontSize: 10, color: COLORS.muted },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginTop: 18, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.card, borderRadius: 8, padding: 12, marginBottom: 8 },
  icon: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  track: { height: 6, borderRadius: 3, backgroundColor: COLORS.background, marginTop: 6, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3, backgroundColor: COLORS.success },
  percent: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  note: { fontSize: 12, color: COLORS.muted, marginTop: 12, textAlign: 'center' },
});
