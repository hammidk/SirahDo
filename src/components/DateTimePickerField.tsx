// Поле выбора момента (дата + время), значение — ISO-строка. Свой пикер на
// чистом RN (без нативных зависимостей — чтобы не ломать обычный Expo Go).
// Используется для событий календаря и напоминаний «в точное время».

import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from './themed';
import dayjs from 'dayjs';

import { DATE_FORMAT } from '../lib/dates';
import { CalendarGrid } from './CalendarGrid';
import type { IconName } from './Icon';
import { TimeField } from './TimeField';
import { Button, COLORS, FieldRow, Sheet } from './ui';

interface Props {
  value?: string; // ISO
  onChange: (iso: string | undefined) => void;
  label?: string; // плейсхолдер, когда значение не задано
  title?: string; // подпись над значением
  icon?: IconName;
  allowClear?: boolean;
  dateOnly?: boolean; // без времени — для событий «весь день»
}

export function DateTimePickerField({ value, onChange, label, title, icon, allowClear = true, dateOnly }: Props) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(dayjs().format(DATE_FORMAT));
  const [time, setTime] = useState('09:00');

  const openPicker = () => {
    const base = value ? dayjs(value) : dayjs().add(1, 'hour').startOf('hour');
    setDate(base.format(DATE_FORMAT));
    setTime(base.format('HH:mm'));
    setOpen(true);
  };

  const confirm = () => {
    const [h, m] = dateOnly ? [0, 0] : time.split(':').map(Number);
    onChange(dayjs(date).hour(h).minute(m).second(0).millisecond(0).toISOString());
    setOpen(false);
  };

  const display = value ? dayjs(value).format(dateOnly ? 'dd, D MMMM YYYY' : 'dd, D MMMM YYYY, HH:mm') : undefined;

  return (
    <>
      <FieldRow
        icon={icon}
        title={title}
        value={display}
        placeholder={label ?? 'Не выбрано'}
        onPress={openPicker}
        onClear={allowClear ? () => onChange(undefined) : undefined}
      />

      <Sheet
        visible={open}
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button title="Отмена" kind="secondary" onPress={() => setOpen(false)} />
            <Button title="Готово" onPress={confirm} />
          </>
        }
      >
        <CalendarGrid value={date} onChange={setDate} />
        {dateOnly ? null : (
          <View style={styles.timeRow}>
            <Text style={styles.timeLabel}>Время</Text>
            <TimeField value={time} onChange={setTime} />
          </View>
        )}
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.separator,
  },
  timeLabel: { fontSize: 15, color: COLORS.text },
});
