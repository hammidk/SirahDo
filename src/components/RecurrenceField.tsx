// Блок «Повторение» (docs/SPEC.md, «Повторение») — общий для событий календаря и срока задачи.
// Быстрые пресеты + гибкая настройка: интервал, дни недели, окончание.

import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, TextInput } from './themed';
import dayjs from 'dayjs';

import type { Recurrence, RecurrenceFreq } from '../lib/types';
import { WEEKDAY_SHORT, isoWeekday } from '../lib/dates';
import {
  RECURRENCE_PRESETS,
  describeRecurrence,
  freqUnitLabel,
  presetToRule,
  ruleToPreset,
} from '../lib/recurrence';
import { CalendarGrid } from './CalendarGrid';
import { Button, COLORS, Chip, ChipsRow, FieldLabel, FieldRow, Sheet } from './ui';

type EndMode = 'never' | 'until' | 'count';

interface Props {
  value?: Recurrence;
  startDate?: string; // YYYY-MM-DD — дата первого вхождения; без неё повтор недоступен
  onChange: (rule: Recurrence | undefined) => void;
  disabledHint?: string;
}

const FREQS: RecurrenceFreq[] = ['day', 'week', 'month', 'year'];

export function RecurrenceField({ value, startDate, onChange, disabledHint }: Props) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(false);
  const [freq, setFreq] = useState<RecurrenceFreq>('week');
  const [intervalText, setIntervalText] = useState('1');
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [endMode, setEndMode] = useState<EndMode>('never');
  const [until, setUntil] = useState<string | undefined>();
  const [count, setCount] = useState('10');

  if (!startDate) {
    return (
      <FieldRow
        icon="repeat"
        title="Повтор"
        placeholder={disabledHint ?? 'Сначала выберите дату'}
        onPress={() => {}}
      />
    );
  }

  const openSheet = () => {
    const rule = value;
    const preset = ruleToPreset(rule, startDate);
    setCustom(preset === 'custom');
    setFreq(rule?.freq ?? 'week');
    setIntervalText(String(rule?.interval ?? 1));
    setWeekdays(rule?.weekdays?.length ? rule.weekdays : [isoWeekday(dayjs(startDate))]);
    setEndMode(rule?.until ? 'until' : rule?.count ? 'count' : 'never');
    setUntil(rule?.until ?? dayjs(startDate).add(1, 'month').format('YYYY-MM-DD'));
    setCount(String(rule?.count ?? 10));
    setOpen(true);
  };

  const buildCustomRule = (): Recurrence => {
    const n = Math.max(1, Math.min(365, parseInt(intervalText, 10) || 1));
    const rule: Recurrence = { freq, interval: n };
    if (freq === 'week') rule.weekdays = weekdays.length > 0 ? [...weekdays].sort((a, b) => a - b) : [isoWeekday(dayjs(startDate))];
    if (endMode === 'until' && until) rule.until = until;
    if (endMode === 'count') rule.count = Math.max(1, Math.min(999, parseInt(count, 10) || 1));
    return rule;
  };

  const toggleWeekday = (d: number) =>
    setWeekdays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  const currentPreset = ruleToPreset(value, startDate);
  const intervalNum = Math.max(1, parseInt(intervalText, 10) || 1);

  return (
    <>
      <FieldRow
        icon="repeat"
        title="Повтор"
        value={value ? describeRecurrence(value, startDate) : undefined}
        placeholder="Не повторять"
        onPress={openSheet}
        onClear={() => onChange(undefined)}
      />

      <Sheet
        visible={open}
        onClose={() => setOpen(false)}
        title="Повтор"
        footer={
          custom ? (
            <>
              <Button title="Назад" kind="secondary" onPress={() => setCustom(false)} />
              <Button
                title="Готово"
                onPress={() => {
                  onChange(buildCustomRule());
                  setOpen(false);
                }}
              />
            </>
          ) : undefined
        }
      >
        {!custom ? (
          <View>
            {RECURRENCE_PRESETS.map((p) => (
              <Pressable
                key={p.id}
                style={styles.optionRow}
                onPress={() => {
                  onChange(presetToRule(p.id, startDate));
                  setOpen(false);
                }}
              >
                <Text style={styles.optionText}>{p.title}</Text>
                {currentPreset === p.id ? <Text style={styles.check}>✓</Text> : null}
              </Pressable>
            ))}
            <Pressable style={styles.optionRow} onPress={() => setCustom(true)}>
              <Text style={styles.optionText}>Настроить…</Text>
              {currentPreset === 'custom' ? <Text style={styles.check}>✓</Text> : null}
            </Pressable>
          </View>
        ) : (
          <View>
            <FieldLabel>Повторять каждые</FieldLabel>
            <View style={styles.intervalRow}>
              <TextInput
                style={styles.numberInput}
                value={intervalText}
                onChangeText={setIntervalText}
                keyboardType="number-pad"
                maxLength={3}
                selectTextOnFocus
                accessibilityLabel="Интервал"
              />
              <ChipsRow>
                {FREQS.map((f) => (
                  <Chip key={f} label={freqUnitLabel(f, intervalNum)} active={freq === f} onPress={() => setFreq(f)} />
                ))}
              </ChipsRow>
            </View>

            {freq === 'week' ? (
              <>
                <FieldLabel>По дням</FieldLabel>
                <ChipsRow>
                  {WEEKDAY_SHORT.map((label, i) => (
                    <Chip key={label} label={label} active={weekdays.includes(i + 1)} onPress={() => toggleWeekday(i + 1)} />
                  ))}
                </ChipsRow>
              </>
            ) : null}

            <FieldLabel>Окончание</FieldLabel>
            <ChipsRow>
              <Chip label="Никогда" active={endMode === 'never'} onPress={() => setEndMode('never')} />
              <Chip label="До даты" active={endMode === 'until'} onPress={() => setEndMode('until')} />
              <Chip label="Количество раз" active={endMode === 'count'} onPress={() => setEndMode('count')} />
            </ChipsRow>

            {endMode === 'until' ? (
              <View style={styles.endBlock}>
                <CalendarGrid value={until} onChange={setUntil} minDate={startDate} />
              </View>
            ) : null}
            {endMode === 'count' ? (
              <View style={[styles.endBlock, styles.intervalRow]}>
                <TextInput
                  style={styles.numberInput}
                  value={count}
                  onChangeText={setCount}
                  keyboardType="number-pad"
                  maxLength={3}
                  selectTextOnFocus
                  accessibilityLabel="Количество повторов"
                />
                <Text style={styles.optionText}>раз</Text>
              </View>
            ) : null}

            <Text style={styles.preview}>{describeRecurrence(buildCustomRule())}</Text>
          </View>
        )}
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.separator,
  },
  optionText: { fontSize: 15, color: COLORS.text },
  check: { color: COLORS.primary, fontWeight: '700', fontSize: 15 },
  intervalRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  numberInput: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    width: 56,
    textAlign: 'center',
    paddingVertical: 8,
    fontSize: 16,
    color: COLORS.text,
  },
  endBlock: { marginTop: 10 },
  preview: { marginTop: 14, fontSize: 13, color: COLORS.muted },
});
