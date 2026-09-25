// Ввод времени ЧЧ:ММ двумя числовыми полями (без нативного пикера).

import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, TextInput } from './themed';

import { parseTime } from '../lib/dates';
import { COLORS } from './ui';

const pad = (n: number) => String(n).padStart(2, '0');

export function normalizeTime(hour: string, minute: string): string {
  const h = Math.min(23, Math.max(0, parseInt(hour, 10) || 0));
  const m = Math.min(59, Math.max(0, parseInt(minute, 10) || 0));
  return `${pad(h)}:${pad(m)}`;
}

export function TimeField({ value, onChange }: { value: string; onChange: (time: string) => void }) {
  const parsed = parseTime(value) ?? { hour: 9, minute: 0 };
  const [hour, setHour] = useState(pad(parsed.hour));
  const [minute, setMinute] = useState(pad(parsed.minute));

  // Внешнее значение сменилось (например, быстрый выбор) — синхронизируем поля
  // прямо при рендере (паттерн React «adjusting state when a prop changes»).
  // Если значение пришло от нашего же ввода — не трогаем то, что пользователь печатает.
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    const p = parseTime(value);
    if (p && normalizeTime(hour, minute) !== value) {
      setHour(pad(p.hour));
      setMinute(pad(p.minute));
    }
  }

  // Значение отдаём наружу на каждое нажатие, чтобы «Готово» при открытой
  // клавиатуре не потеряло последние цифры.
  const commit = (h: string, m: string) => onChange(normalizeTime(h, m));

  const reformat = () => {
    const [h, m] = normalizeTime(hour, minute).split(':');
    setHour(h);
    setMinute(m);
  };

  return (
    <View style={styles.row}>
      <TextInput
        style={styles.input}
        value={hour}
        onChangeText={(t) => {
          setHour(t);
          commit(t, minute);
        }}
        onBlur={reformat}
        keyboardType="number-pad"
        maxLength={2}
        selectTextOnFocus
        accessibilityLabel="Часы"
      />
      <Text style={styles.colon}>:</Text>
      <TextInput
        style={styles.input}
        value={minute}
        onChangeText={(t) => {
          setMinute(t);
          commit(hour, t);
        }}
        onBlur={reformat}
        keyboardType="number-pad"
        maxLength={2}
        selectTextOnFocus
        accessibilityLabel="Минуты"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    width: 48,
    textAlign: 'center',
    paddingVertical: 8,
    fontSize: 16,
    color: COLORS.text,
  },
  colon: { fontSize: 16, color: COLORS.text },
});
