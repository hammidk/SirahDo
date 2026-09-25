// Трекер привычек (docs/spec/habits.md): вверху неделя с кружками выполнения, ниже — привычки
// выбранного дня со счётчиком «N раз в день». Без штрафов: невыполненный день —
// просто пустой кружок, рядом с серией всегда видна лучшая серия.

import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../components/themed';
import { Tabs, router } from 'expo-router';
import { Icon } from '../../components/Icon';
import dayjs from 'dayjs';

import { useAppData } from '../../lib/AppDataContext';
import type { Habit } from '../../lib/types';
import { SPHERES } from '../../lib/types';
import { bestStreak, countOn, currentStreak, dayProgress, isScheduled, logIndex } from '../../lib/habits';
import { DATE_FORMAT, WEEKDAY_SHORT, startOfIsoWeek, todayKey } from '../../lib/dates';
import { useNow } from '../../lib/hooks';
import { Fab } from '../../components/Fab';
import { COLORS } from '../../components/ui';
import { withAlpha } from '../../theme/colors';


export default function TrackerScreen() {
  const { habits, habitLogs, setHabitCount } = useAppData();
  useNow(60_000); // обновление в полночь
  const today = todayKey();
  const [selected, setSelected] = useState(today);
  const [weekStart, setWeekStart] = useState(() => startOfIsoWeek(dayjs()).format(DATE_FORMAT));

  const index = useMemo(() => logIndex(habitLogs), [habitLogs]);
  const active = useMemo(() => habits.filter((h) => !h.archived).sort((a, b) => a.order - b.order), [habits]);
  const week = Array.from({ length: 7 }, (_, i) => dayjs(weekStart).add(i, 'day').format(DATE_FORMAT));

  const scheduled = active.filter((h) => isScheduled(h, selected));
  const rest = active.filter((h) => !isScheduled(h, selected));
  const isFuture = selected > today;

  const shiftWeek = (dir: 1 | -1) => setWeekStart((w) => dayjs(w).add(dir, 'week').format(DATE_FORMAT));

  return (
    <View style={styles.container}>
      <Tabs.Screen
        options={{
          headerRight: () => (
            <Pressable
              onPress={() => router.push('/habit/stats')}
              hitSlop={10}
              style={{ paddingHorizontal: 16 }}
              accessibilityRole="button"
              accessibilityLabel="Статистика привычек"
            >
              <Icon name="stats" size={22} color={COLORS.muted} />
            </Pressable>
          ),
        }}
      />
      <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 96 }}>
        <View style={styles.weekCard}>
          <View style={styles.weekNav}>
            <Pressable onPress={() => shiftWeek(-1)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Предыдущая неделя">
              <Icon name="chevron-back" size={20} color={COLORS.muted} />
            </Pressable>
            <Text style={styles.weekTitle}>
              {dayjs(weekStart).format('D MMM')} – {dayjs(weekStart).add(6, 'day').format('D MMM')}
            </Text>
            <Pressable onPress={() => shiftWeek(1)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Следующая неделя">
              <Icon name="chevron-forward" size={20} color={COLORS.muted} />
            </Pressable>
          </View>
          <View style={styles.weekRow}>
            {week.map((d, i) => {
              const p = dayProgress(active, index, d);
              const future = d > today;
              const full = p.total > 0 && p.done === p.total;
              return (
                <Pressable
                  key={d}
                  style={styles.dayCell}
                  onPress={() => setSelected(d)}
                  accessibilityRole="button"
                  accessibilityLabel={`${dayjs(d).format('D MMMM')}: выполнено ${p.done} из ${p.total}`}
                  accessibilityState={{ selected: d === selected }}
                >
                  <Text style={[styles.dow, d === today && styles.dowToday]}>{WEEKDAY_SHORT[i]}</Text>
                  <View
                    style={[
                      styles.circle,
                      p.total === 0 && styles.circleEmpty,
                      !future && p.total > 0 && { backgroundColor: withAlpha(COLORS.success, 0.1 + 0.6 * p.ratio), borderColor: withAlpha(COLORS.success, 0.6) },
                      full && styles.circleFull,
                      d === selected && styles.circleSelected,
                    ]}
                  >
                    {full ? (
                      <Icon name="check" size={16} color={COLORS.onAccent} />
                    ) : (
                      <Text style={styles.circleNum}>{dayjs(d).date()}</Text>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
          {selected !== today ? (
            <Pressable
              onPress={() => {
                setSelected(today);
                setWeekStart(startOfIsoWeek(dayjs()).format(DATE_FORMAT));
              }}
              accessibilityRole="button"
            >
              <Text style={styles.backToday}>К сегодня</Text>
            </Pressable>
          ) : null}
        </View>

        <Text style={styles.sectionTitle}>
          {selected === today ? 'Сегодня' : dayjs(selected).format('dddd, D MMMM')}
        </Text>

        {active.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Начните с одной маленькой привычки</Text>
            <Text style={styles.emptyText}>
              Например, «Зикр после намаза — 5 раз в день» или «Страница Корана». Постепенно, без давления: пропуск не обнуляет
              ваш путь.
            </Text>
          </View>
        ) : null}
        {active.length > 0 && scheduled.length === 0 ? <Text style={styles.hint}>На этот день привычек по плану нет.</Text> : null}

        {scheduled.map((h) => (
          <HabitRow
            key={h.id}
            habit={h}
            count={countOn(index, h.id, selected)}
            streak={currentStreak(h, index, today)}
            best={bestStreak(h, index, today)}
            disabled={isFuture}
            onSet={(c) => setHabitCount(h.id, selected, c)}
          />
        ))}

        {rest.length > 0 ? (
          <>
            <Text style={styles.subTitle}>Не по плану в этот день</Text>
            {rest.map((h) => (
              <Pressable key={h.id} style={styles.restRow} onPress={() => router.push(`/habit/${h.id}`)} accessibilityRole="button">
                <Text style={styles.restIcon}>{h.icon}</Text>
                <Text style={styles.restName}>{h.name}</Text>
              </Pressable>
            ))}
          </>
        ) : null}
      </ScrollView>
      <Fab accessibilityLabel="Новая привычка" onPress={() => router.push('/habit/new')} />
    </View>
  );
}

function HabitRow({
  habit,
  count,
  streak,
  best,
  disabled,
  onSet,
}: {
  habit: Habit;
  count: number;
  streak: number;
  best: number;
  disabled: boolean;
  onSet: (count: number) => void;
}) {
  const target = habit.targetCountPerDay;
  const done = count >= target;
  const sphere = SPHERES.find((s) => s.id === habit.sphere);
  const progress = Math.min(1, count / target);

  // Кнопка: +1 до цели; для привычки «1 раз» — переключатель выполнено/нет.
  const onMain = () => {
    if (disabled) return;
    if (target === 1) onSet(done ? 0 : 1);
    else if (!done) onSet(count + 1);
  };

  return (
    <View style={[styles.habitRow, done && styles.habitRowDone]}>
      <Pressable style={styles.habitBody} onPress={() => router.push(`/habit/${habit.id}`)} accessibilityRole="button" accessibilityLabel={`${habit.name}, изменить`}>
        <Text style={styles.habitIcon}>{habit.icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.habitName} numberOfLines={1}>
            {habit.name}
          </Text>
          <Text style={styles.habitMeta} numberOfLines={1}>
            {[
              target > 1 ? `${Math.min(count, target)} из ${target}` : null,
              streak > 0 ? `серия ${streak}` : null,
              best > 0 ? `лучшая ${best}` : null,
              sphere?.title,
            ]
              .filter(Boolean)
              .join(' · ') || 'Новая привычка — первый шаг самый важный'}
          </Text>
          {target > 1 ? (
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
            </View>
          ) : null}
        </View>
      </Pressable>
      {target > 1 && count > 0 && !disabled ? (
        <Pressable onPress={() => onSet(count - 1)} hitSlop={8} style={styles.minus} accessibilityRole="button" accessibilityLabel="Минус одно выполнение">
          <Icon name="remove" size={18} color={COLORS.muted} />
        </Pressable>
      ) : null}
      <Pressable
        onPress={onMain}
        disabled={disabled}
        style={[styles.mainButton, done && styles.mainButtonDone, disabled && { opacity: 0.35 }]}
        accessibilityRole={target === 1 ? 'checkbox' : 'button'}
        accessibilityState={{ checked: done, disabled }}
        accessibilityLabel={target === 1 ? (done ? 'Снять отметку' : 'Отметить выполнение') : `Плюс одно выполнение, сейчас ${count} из ${target}`}
      >
        {done ? <Icon name="check" size={22} color={COLORS.onAccent} /> : target > 1 ? <Text style={styles.plus}>+1</Text> : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  screen: { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  weekCard: { backgroundColor: COLORS.card, borderRadius: 8, padding: 12 },
  weekNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  weekTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCell: { alignItems: 'center', gap: 6, flex: 1 },
  dow: { fontSize: 11, color: COLORS.muted },
  dowToday: { color: COLORS.primary, fontWeight: '700' },
  circle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: COLORS.separator,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleEmpty: { borderStyle: 'dashed' },
  circleFull: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  circleSelected: { borderWidth: 2, borderColor: COLORS.text },
  circleNum: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  backToday: { textAlign: 'center', color: COLORS.primary, fontSize: 13, marginTop: 10 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginTop: 18, marginBottom: 8, textTransform: 'capitalize' },
  subTitle: { fontSize: 13, fontWeight: '500', color: COLORS.tertiary, marginTop: 16, marginBottom: 6 },
  hint: { fontSize: 13, color: COLORS.muted, paddingVertical: 6 },
  empty: { backgroundColor: COLORS.card, borderRadius: 8, padding: 16, gap: 6 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  emptyText: { fontSize: 13, color: COLORS.muted, lineHeight: 19 },
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.separator,
  },
  habitRowDone: { opacity: 0.8 },
  habitBody: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  habitIcon: { fontSize: 26 },
  habitName: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  habitMeta: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  progressTrack: { height: 4, borderRadius: 2, backgroundColor: COLORS.background, marginTop: 6, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2, backgroundColor: COLORS.success },
  minus: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
  mainButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainButtonDone: { backgroundColor: COLORS.success },
  plus: { fontSize: 14, fontWeight: '700', color: COLORS.success },
  restRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  restIcon: { fontSize: 18, opacity: 0.6 },
  restName: { fontSize: 14, color: COLORS.muted },
});
