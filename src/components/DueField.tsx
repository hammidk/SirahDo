// Срок задачи (ТЗ §5.3): быстрый выбор Сегодня/Завтра, календарь, время (необязательно).
// Длительность и повтор — отдельные поля рядом (DurationField, RecurrenceField).

import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Switch, Text } from './themed';
import dayjs from 'dayjs';

import type { TaskDue } from '../lib/types';
import { DATE_FORMAT, formatDue, isOverdue } from '../lib/dates';
import { CalendarGrid } from './CalendarGrid';
import { TimeField } from './TimeField';
import { Button, COLORS, Chip, ChipsRow, FieldRow, Sheet } from './ui';

interface Props {
  value?: TaskDue;
  onChange: (due: TaskDue | undefined) => void;
}

/** Лист выбора срока — открывается из поля «Срок» и из быстрого листа задачи. */
export function DueSheet({
  visible,
  onClose,
  value,
  onChange,
}: {
  visible: boolean;
  onClose: () => void;
  value?: TaskDue;
  onChange: (due: TaskDue | undefined) => void;
}) {
  const [date, setDate] = useState(dayjs().format(DATE_FORMAT));
  const [withTime, setWithTime] = useState(false);
  const [time, setTime] = useState('09:00');

  // Черновик листа заново заполняется из значения при каждом открытии.
  const [openedFor, setOpenedFor] = useState(false);
  if (visible && !openedFor) {
    setOpenedFor(true);
    setDate(value?.date ?? dayjs().format(DATE_FORMAT));
    setWithTime(!!value?.time);
    setTime(value?.time ?? dayjs().add(1, 'hour').startOf('hour').format('HH:mm'));
  } else if (!visible && openedFor) {
    setOpenedFor(false);
  }

  const apply = (d: string) => {
    onChange({ date: d, time: withTime ? time : undefined });
    onClose();
  };

  const today = dayjs().format(DATE_FORMAT);
  const tomorrow = dayjs().add(1, 'day').format(DATE_FORMAT);

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Срок"
      footer={
        <>
          <Button
            title="Без срока"
            kind="secondary"
            onPress={() => {
              onChange(undefined);
              onClose();
            }}
          />
          <Button title="Готово" onPress={() => apply(date)} />
        </>
      }
    >
      <ChipsRow>
        <Chip label="Сегодня" active={date === today} onPress={() => apply(today)} />
        <Chip label="Завтра" active={date === tomorrow} onPress={() => apply(tomorrow)} />
      </ChipsRow>

      <View style={styles.gridWrap}>
        <CalendarGrid value={date} onChange={setDate} />
      </View>

      <View style={styles.timeRow}>
        <Text style={styles.timeLabel}>Время</Text>
        <Switch value={withTime} onValueChange={setWithTime} accessibilityLabel="Указать время" />
      </View>
      {withTime ? (
        <View style={styles.timeInputRow}>
          <TimeField value={time} onChange={setTime} />
        </View>
      ) : (
        <Text style={styles.hint}>Без времени — задача на весь день.</Text>
      )}
    </Sheet>
  );
}

export function DueField({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const overdue = value ? isOverdue(value) : false;

  return (
    <>
      <FieldRow
        icon="calendar"
        title="Срок"
        value={value ? `${formatDue(value)}${overdue ? ' · просрочено' : ''}` : undefined}
        placeholder="Без срока"
        onPress={() => setOpen(true)}
        onClear={() => onChange(undefined)}
      />
      <DueSheet visible={open} onClose={() => setOpen(false)} value={value} onChange={onChange} />
    </>
  );
}

const styles = StyleSheet.create({
  gridWrap: { marginTop: 12 },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.separator,
  },
  timeLabel: { fontSize: 15, color: COLORS.text },
  timeInputRow: { alignItems: 'flex-end', marginTop: 8 },
  hint: { fontSize: 12, color: COLORS.muted, marginTop: 6 },
});
