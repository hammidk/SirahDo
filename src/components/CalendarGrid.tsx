// Сетка месяца (Пн–Вс) с выбором дня. Переиспользуется пикерами даты,
// окончанием повторения и (далее) экраном Календаря.

import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './themed';
import dayjs, { Dayjs } from 'dayjs';

import { DATE_FORMAT, WEEKDAY_SHORT, isoWeekday } from '../lib/dates';
import { COLORS } from './ui';

function buildMonthGrid(month: Dayjs): (Dayjs | null)[] {
  const start = month.startOf('month');
  const leadingBlanks = isoWeekday(start) - 1;
  const days: (Dayjs | null)[] = [];
  for (let i = 0; i < leadingBlanks; i++) days.push(null);
  for (let d = 0; d < start.daysInMonth(); d++) days.push(start.add(d, 'day'));
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

interface Props {
  value?: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  minDate?: string; // YYYY-MM-DD — дни раньше недоступны
}

export function CalendarGrid({ value, onChange, minDate }: Props) {
  const [visibleMonth, setVisibleMonth] = useState(() => (value ? dayjs(value) : dayjs()).startOf('month'));
  const grid = useMemo(() => buildMonthGrid(visibleMonth), [visibleMonth]);
  const todayStr = dayjs().format(DATE_FORMAT);

  return (
    <View>
      <View style={styles.monthHeader}>
        <Pressable
          onPress={() => setVisibleMonth((m) => m.subtract(1, 'month'))}
          hitSlop={10}
          accessibilityLabel="Предыдущий месяц"
        >
          <Text style={styles.monthNav}>‹</Text>
        </Pressable>
        <Text style={styles.monthLabel}>{visibleMonth.format('MMMM YYYY')}</Text>
        <Pressable
          onPress={() => setVisibleMonth((m) => m.add(1, 'month'))}
          hitSlop={10}
          accessibilityLabel="Следующий месяц"
        >
          <Text style={styles.monthNav}>›</Text>
        </Pressable>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAY_SHORT.map((w) => (
          <Text key={w} style={styles.weekdayLabel}>
            {w}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {grid.map((d, i) => {
          if (!d) return <View key={i} style={styles.dayCell} />;
          const key = d.format(DATE_FORMAT);
          const isSelected = key === value;
          const isToday = key === todayStr;
          const disabled = !!minDate && key < minDate;
          return (
            <Pressable
              key={i}
              style={styles.dayCell}
              disabled={disabled}
              onPress={() => onChange(key)}
              accessibilityLabel={d.format('D MMMM YYYY')}
              accessibilityState={{ selected: isSelected, disabled }}
            >
              <View style={[styles.dayCircle, isSelected && styles.dayCircleSelected]}>
                <Text
                  style={[
                    styles.dayText,
                    isToday && !isSelected && styles.dayTextToday,
                    isSelected && styles.dayTextSelected,
                    disabled && styles.dayTextDisabled,
                  ]}
                >
                  {d.date()}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  monthLabel: { fontSize: 15, fontWeight: '600', color: COLORS.text, textTransform: 'capitalize' },
  monthNav: { fontSize: 24, color: COLORS.primary, paddingHorizontal: 12 },
  weekdayRow: { flexDirection: 'row', marginBottom: 4 },
  weekdayLabel: { flex: 1, textAlign: 'center', fontSize: 11, color: COLORS.muted },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: `${100 / 7}%`, height: 40, alignItems: 'center', justifyContent: 'center' },
  dayCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  dayCircleSelected: { backgroundColor: COLORS.primary },
  dayText: { fontSize: 14, color: COLORS.text },
  dayTextToday: { color: COLORS.primary, fontWeight: '700' },
  dayTextSelected: { color: COLORS.onAccent, fontWeight: '700' },
  dayTextDisabled: { color: COLORS.separator },
});
