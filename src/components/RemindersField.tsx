// Блок «Напоминания» (ТЗ §8): несколько напоминаний, быстрый выбор и гибкая
// настройка. RemindersField — для задач и событий (относительно срока/начала
// или в точное время), HabitRemindersField — время суток для привычек.

import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, TextInput } from './themed';
import dayjs from 'dayjs';

import type { HabitReminder, Reminder } from '../lib/types';
import { DATE_FORMAT } from '../lib/dates';
import { plural } from '../lib/recurrence';
import { CalendarGrid } from './CalendarGrid';
import { TimeField } from './TimeField';
import { Button, COLORS, Chip, ChipsRow, FieldLabel, Sheet } from './ui';
import { Icon } from './Icon';

const QUICK_OFFSETS = [0, 5, 10, 30, 60, 24 * 60];

type Unit = 'min' | 'hour' | 'day';
const UNIT_MINUTES: Record<Unit, number> = { min: 1, hour: 60, day: 24 * 60 };

export function describeOffset(minutes: number, anchor: 'срока' | 'начала' = 'срока'): string {
  if (minutes === 0) return `В момент ${anchor}`;
  if (minutes % (24 * 60) === 0) {
    const d = minutes / (24 * 60);
    return `За ${d} ${plural(d, ['день', 'дня', 'дней'])}`;
  }
  if (minutes % 60 === 0) {
    const h = minutes / 60;
    return `За ${h} ${plural(h, ['час', 'часа', 'часов'])}`;
  }
  return `За ${minutes} мин`;
}

export function describeReminder(r: Reminder, anchor: 'срока' | 'начала' = 'срока'): string {
  return r.kind === 'offset' ? describeOffset(r.minutes, anchor) : dayjs(r.at).format('D MMM, HH:mm');
}

function sameReminder(a: Reminder, b: Reminder) {
  return a.kind === b.kind && (a.kind === 'offset' ? a.minutes === (b as typeof a).minutes : a.at === (b as typeof a).at);
}

interface Props {
  value: Reminder[];
  onChange: (reminders: Reminder[]) => void;
  hasAnchor: boolean; // есть ли срок/начало, от которого считать «за N минут»
  anchor?: 'срока' | 'начала';
}

export function RemindersField({ value, onChange, hasAnchor, anchor = 'срока' }: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'quick' | 'custom' | 'at'>('quick');
  const [amount, setAmount] = useState('15');
  const [unit, setUnit] = useState<Unit>('min');
  const [atDate, setAtDate] = useState(dayjs().format(DATE_FORMAT));
  const [atTime, setAtTime] = useState('09:00');

  const add = (r: Reminder) => {
    if (!value.some((x) => sameReminder(x, r))) onChange([...value, r]);
    setOpen(false);
  };

  const openSheet = () => {
    setMode(hasAnchor ? 'quick' : 'at');
    const next = dayjs().add(1, 'hour').startOf('hour');
    setAtDate(next.format(DATE_FORMAT));
    setAtTime(next.format('HH:mm'));
    setOpen(true);
  };

  // Напоминания «за N» без срока не сработают — показываем их приглушёнными.
  return (
    <View>
      <View style={styles.list}>
        {value.map((r, i) => {
          const inactive = r.kind === 'offset' && !hasAnchor;
          return (
            <View key={i} style={[styles.pill, inactive && styles.pillInactive]}>
              <Icon name="bell" size={13} color={COLORS.muted} />
              <Text style={styles.pillText}>{describeReminder(r, anchor)}</Text>
              <Pressable
                onPress={() => onChange(value.filter((_, j) => j !== i))}
                hitSlop={10}
                accessibilityLabel="Удалить напоминание"
              >
                <Text style={styles.pillRemove}>✕</Text>
              </Pressable>
            </View>
          );
        })}
        <Pressable style={styles.addPill} onPress={openSheet} accessibilityRole="button">
          <Text style={styles.addPillText}>+ Напоминание</Text>
        </Pressable>
      </View>
      {!hasAnchor && value.some((r) => r.kind === 'offset') ? (
        <Text style={styles.hint}>Назначьте срок — напоминания «за N минут» считаются от него.</Text>
      ) : null}

      <Sheet
        visible={open}
        onClose={() => setOpen(false)}
        title="Напоминание"
        footer={
          mode === 'quick' ? undefined : (
            <>
              <Button title="Отмена" kind="secondary" onPress={() => setOpen(false)} />
              <Button
                title="Добавить"
                onPress={() => {
                  if (mode === 'custom') {
                    const n = Math.max(0, parseInt(amount, 10) || 0);
                    add({ kind: 'offset', minutes: n * UNIT_MINUTES[unit] });
                  } else {
                    const [h, m] = atTime.split(':').map(Number);
                    add({ kind: 'at', at: dayjs(atDate).hour(h).minute(m).second(0).millisecond(0).toISOString() });
                  }
                }}
              />
            </>
          )
        }
      >
        <ChipsRow>
          <Chip label="Быстро" active={mode === 'quick'} disabled={!hasAnchor} onPress={() => setMode('quick')} />
          <Chip label="Своё смещение" active={mode === 'custom'} disabled={!hasAnchor} onPress={() => setMode('custom')} />
          <Chip label="Точное время" active={mode === 'at'} onPress={() => setMode('at')} />
        </ChipsRow>

        {mode === 'quick' ? (
          <View style={styles.block}>
            {QUICK_OFFSETS.map((m) => (
              <Pressable key={m} style={styles.optionRow} onPress={() => add({ kind: 'offset', minutes: m })}>
                <Text style={styles.optionText}>{describeOffset(m, anchor)}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {mode === 'custom' ? (
          <View style={styles.block}>
            <FieldLabel>За сколько до {anchor}</FieldLabel>
            <View style={styles.customRow}>
              <TextInput
                style={styles.numberInput}
                value={amount}
                onChangeText={setAmount}
                keyboardType="number-pad"
                maxLength={4}
                selectTextOnFocus
                accessibilityLabel="Количество"
              />
              <ChipsRow>
                <Chip label="мин" active={unit === 'min'} onPress={() => setUnit('min')} />
                <Chip label="ч" active={unit === 'hour'} onPress={() => setUnit('hour')} />
                <Chip label="дн" active={unit === 'day'} onPress={() => setUnit('day')} />
              </ChipsRow>
            </View>
          </View>
        ) : null}

        {mode === 'at' ? (
          <View style={styles.block}>
            <CalendarGrid value={atDate} onChange={setAtDate} minDate={dayjs().format(DATE_FORMAT)} />
            <View style={styles.timeRow}>
              <Text style={styles.optionText}>Время</Text>
              <TimeField value={atTime} onChange={setAtTime} />
            </View>
          </View>
        ) : null}
      </Sheet>
    </View>
  );
}

// ---------- Привычки ----------

export function HabitRemindersField({
  value,
  onChange,
}: {
  value: HabitReminder[];
  onChange: (reminders: HabitReminder[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [time, setTime] = useState('08:00');

  return (
    <View>
      <View style={styles.list}>
        {value.map((r, i) => (
          <View key={`${r.time}_${i}`} style={styles.pill}>
            <Icon name="bell" size={13} color={COLORS.muted} />
            <Text style={styles.pillText}>{r.time}</Text>
            <Pressable
              onPress={() => onChange(value.filter((_, j) => j !== i))}
              hitSlop={10}
              accessibilityLabel="Удалить напоминание"
            >
              <Text style={styles.pillRemove}>✕</Text>
            </Pressable>
          </View>
        ))}
        <Pressable style={styles.addPill} onPress={() => setOpen(true)} accessibilityRole="button">
          <Text style={styles.addPillText}>+ Напоминание</Text>
        </Pressable>
      </View>

      <Sheet
        visible={open}
        onClose={() => setOpen(false)}
        title="Время напоминания"
        footer={
          <>
            <Button title="Отмена" kind="secondary" onPress={() => setOpen(false)} />
            <Button
              title="Добавить"
              onPress={() => {
                if (!value.some((r) => r.time === time)) {
                  onChange([...value, { time }].sort((a, b) => a.time.localeCompare(b.time)));
                }
                setOpen(false);
              }}
            />
          </>
        }
      >
        <View style={styles.timeRow}>
          <Text style={styles.optionText}>Каждый день привычки в</Text>
          <TimeField value={time} onChange={setTime} />
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.hover,
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  pillInactive: { opacity: 0.45 },
  pillText: { fontSize: 13, color: COLORS.text },
  pillRemove: { fontSize: 12, color: COLORS.muted },
  addPill: {
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: COLORS.separator,
  },
  addPillText: { fontSize: 13, color: COLORS.muted },
  hint: { fontSize: 12, color: COLORS.muted, marginTop: 6 },
  block: { marginTop: 12 },
  optionRow: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.separator,
  },
  optionText: { fontSize: 15, color: COLORS.text },
  customRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  numberInput: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    width: 64,
    textAlign: 'center',
    paddingVertical: 8,
    fontSize: 16,
    color: COLORS.text,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
});
