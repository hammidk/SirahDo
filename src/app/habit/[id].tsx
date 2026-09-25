// Создание/правка привычки (docs/spec/habits.md): название, иконка (набор line-иконок),
// цвет (им заливается карточка в трекере), описание, цель повторений в день,
// дни недели, напоминания. Каждое поле — отдельная секция-карточка одного уровня.

import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Switch, Text, TextInput } from '../../components/themed';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Icon } from '../../components/Icon';

import { useAppData } from '../../lib/AppDataContext';
import type { HabitReminder } from '../../lib/types';
import { DEFAULT_HABIT_ICON, HABIT_ICONS, bestStreak, logIndex, totalDoneDays } from '../../lib/habits';
import { WEEKDAY_SHORT, todayKey } from '../../lib/dates';
import { HabitIcon } from '../../components/HabitIcon';
import { HabitRemindersField } from '../../components/RemindersField';
import { COLORS, Chip, ChipsRow, FormSection, confirmDestructive } from '../../components/ui';
import { CATEGORY_COLORS, readableOn, tagBackground } from '../../theme/colors';

const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7];
const DAY_PRESETS: { title: string; days: number[] }[] = [
  { title: 'Каждый день', days: ALL_DAYS },
  { title: 'По будням', days: [1, 2, 3, 4, 5] },
  { title: 'Выходные', days: [6, 7] },
  { title: 'Пн и Чт', days: [1, 4] },
];
const QUICK_TARGETS = [1, 3, 5, 7];

export default function HabitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const { habits, habitLogs, addOrUpdateHabit, removeHabit } = useAppData();
  const existing = useMemo(() => habits.find((h) => h.id === id), [habits, id]);

  const [name, setName] = useState(existing?.name ?? '');
  const [icon, setIcon] = useState(existing?.icon ?? DEFAULT_HABIT_ICON);
  const [color, setColor] = useState<string>(existing?.color ?? CATEGORY_COLORS[habits.length % CATEGORY_COLORS.length]);
  const [description, setDescription] = useState(existing?.description ?? '');
  const [target, setTarget] = useState(existing?.targetCountPerDay ?? 1);
  const [weekdays, setWeekdays] = useState<number[]>(existing?.weekdays ?? ALL_DAYS);
  const [reminders, setReminders] = useState<HabitReminder[]>(existing?.reminders ?? []);
  const [archived, setArchived] = useState(existing?.archived ?? false);

  const toggleDay = (d: number) =>
    setWeekdays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b)));
  const sameDays = (days: number[]) => days.length === weekdays.length && days.every((d) => weekdays.includes(d));

  const onSave = async () => {
    if (!name.trim()) {
      Alert.alert('Нужно название', 'Например: «Зикр после намаза».');
      return;
    }
    if (weekdays.length === 0) {
      Alert.alert('Выберите дни', 'Отметьте хотя бы один день недели.');
      return;
    }
    await addOrUpdateHabit({
      id: existing?.id,
      name: name.trim(),
      icon,
      color,
      description: description.trim() || undefined,
      targetCountPerDay: Math.max(1, Math.min(99, target)),
      weekdays,
      reminders,
      archived,
    });
    router.back();
  };

  const onDelete = () =>
    existing &&
    confirmDestructive(
      `Удалить привычку «${existing.name}»?`,
      'Вся история отметок тоже удалится. Если хотите просто сделать паузу — отправьте её в архив.',
      async () => {
        await removeHabit(existing.id);
        router.back();
      }
    );

  const index = logIndex(habitLogs);

  if (!isNew && !existing) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ title: 'Привычка' }} />
        <Text style={styles.hint}>Привычка не найдена.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: isNew ? 'Новая привычка' : 'Привычка' }} />

      <View style={styles.nameRow}>
        <View style={[styles.bigIcon, { backgroundColor: tagBackground(color) }]}>
          <HabitIcon id={icon} size={26} color={color} />
        </View>
        <TextInput
          plain
          style={styles.nameInput}
          placeholder="Название привычки"
          value={name}
          onChangeText={setName}
          autoFocus={isNew}
          accessibilityLabel="Название привычки"
        />
      </View>

      {existing ? (
        <Text style={styles.stats}>
          Выполнено дней: {totalDoneDays(existing, habitLogs)} · лучшая серия: {bestStreak(existing, index, todayKey())}
        </Text>
      ) : null}

      <FormSection title="Иконка">
        <View style={styles.iconGrid}>
          {HABIT_ICONS.map((it) => {
            const active = icon === it.id;
            return (
              <Pressable
                key={it.id}
                style={[styles.iconCell, active && { backgroundColor: tagBackground(color), borderColor: color }]}
                onPress={() => setIcon(it.id)}
                accessibilityRole="button"
                accessibilityLabel={`Иконка: ${it.label}`}
                accessibilityState={{ selected: active }}
              >
                <HabitIcon id={it.id} size={20} color={active ? color : COLORS.muted} />
              </Pressable>
            );
          })}
        </View>
      </FormSection>

      <FormSection title="Цвет" hint="Этим цветом заполняется карточка в трекере">
        <View style={styles.colorRow}>
          {CATEGORY_COLORS.map((c) => (
            <Pressable
              key={c}
              style={[styles.colorRing, color === c && { borderColor: c }]}
              onPress={() => setColor(c)}
              accessibilityRole="button"
              accessibilityLabel="Цвет привычки"
              accessibilityState={{ selected: color === c }}
            >
              <View style={[styles.colorDot, { backgroundColor: c }]} />
            </Pressable>
          ))}
        </View>
      </FormSection>

      <FormSection title="Описание">
        <TextInput
          style={styles.input}
          placeholder="Зачем эта привычка, как её выполнять"
          value={description}
          onChangeText={setDescription}
          multiline
          textAlignVertical="top"
        />
      </FormSection>

      <FormSection
        title="Сколько раз в день"
        hint={target === 1 ? 'Одно выполнение в день' : 'Каждое нажатие «+1» заполняет карточку, пока не наберётся цель'}
      >
        <View style={styles.stepper}>
          <Pressable
            onPress={() => setTarget((t) => Math.max(1, t - 1))}
            style={styles.stepButton}
            accessibilityRole="button"
            accessibilityLabel="Меньше"
          >
            <Icon name="remove" size={22} color={COLORS.text} />
          </Pressable>
          <View style={styles.stepValueBox}>
            <Text style={styles.stepValue}>{target}</Text>
            <Text style={styles.stepUnit}>раз в день</Text>
          </View>
          <Pressable
            onPress={() => setTarget((t) => Math.min(99, t + 1))}
            style={styles.stepButton}
            accessibilityRole="button"
            accessibilityLabel="Больше"
          >
            <Icon name="add" size={22} color={COLORS.text} />
          </Pressable>
        </View>
        <View style={styles.quickRow}>
          {QUICK_TARGETS.map((n) => (
            <Chip key={n} label={`${n}×`} active={target === n} color={color} onPress={() => setTarget(n)} />
          ))}
        </View>
      </FormSection>

      <FormSection title="Дни недели" hint={weekdays.length === 7 ? 'Каждый день' : `${weekdays.length} дн. в неделю`}>
        <View style={styles.daysRow}>
          {WEEKDAY_SHORT.map((label, i) => {
            const on = weekdays.includes(i + 1);
            return (
              <Pressable
                key={label}
                style={[styles.dayCircle, on && { backgroundColor: color, borderColor: color }]}
                onPress={() => toggleDay(i + 1)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={label}
              >
                <Text style={[styles.dayText, on && { color: readableOn(color) }]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.presets}>
          <ChipsRow>
            {DAY_PRESETS.map((p) => (
              <Chip key={p.title} label={p.title} active={sameDays(p.days)} color={color} onPress={() => setWeekdays(p.days)} />
            ))}
          </ChipsRow>
        </View>
      </FormSection>

      <HabitRemindersField value={reminders} onChange={setReminders} accent={color} />

      {existing ? (
        <FormSection
          title="Пауза (в архиве)"
          hint="Привычка скрыта из трекера, история сохраняется."
          right={<Switch value={archived} onValueChange={setArchived} accessibilityLabel="Пауза" />}
        />
      ) : null}

      <Pressable style={styles.saveButton} onPress={onSave} accessibilityRole="button">
        <Text style={styles.saveText}>{isNew ? 'Создать' : 'Сохранить'}</Text>
      </Pressable>
      {existing ? (
        <Pressable style={styles.deleteButton} onPress={onDelete} accessibilityRole="button">
          <Text style={styles.deleteText}>Удалить привычку</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  hint: { color: COLORS.muted, fontSize: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.card, borderRadius: 8, padding: 12 },
  bigIcon: { width: 48, height: 48, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  nameInput: { flex: 1, fontSize: 18, fontWeight: '600', color: COLORS.text },
  stats: { fontSize: 13, color: COLORS.muted, marginTop: 8 },

  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8 },
  iconCell: {
    width: '13%',
    aspectRatio: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: 'transparent',
  },

  colorRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  colorRing: {
    flex: 1,
    maxWidth: 38,
    aspectRatio: 1,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorDot: { width: 22, height: 22, borderRadius: 11 },

  input: { fontSize: 15, backgroundColor: COLORS.background, borderRadius: 8, padding: 12, minHeight: 64, color: COLORS.text },

  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepButton: { width: 52, height: 52, borderRadius: 26, backgroundColor: COLORS.hover, alignItems: 'center', justifyContent: 'center' },
  stepValueBox: { alignItems: 'center' },
  stepValue: { fontSize: 34, fontWeight: '700', color: COLORS.text },
  stepUnit: { fontSize: 12, color: COLORS.muted },
  quickRow: { flexDirection: 'row', gap: 6, marginTop: 12 },
  presets: { marginTop: 12 },

  daysRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  dayCircle: {
    flex: 1,
    maxWidth: 42,
    aspectRatio: 1,
    borderRadius: 21,
    borderWidth: 1.5,
    borderColor: COLORS.separator,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: { fontSize: 13, fontWeight: '600', color: COLORS.muted },

  saveButton: { backgroundColor: COLORS.text, borderRadius: 6, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
  saveText: { color: COLORS.onAccent, fontWeight: '600', fontSize: 15 },
  deleteButton: { alignItems: 'center', paddingVertical: 14 },
  deleteText: { color: COLORS.danger, fontWeight: '600' },
});
