// Создание/правка привычки (ТЗ §6): название + иконка, описание, сфера, цель
// повторений в день (по умолчанию 1), дни недели, напоминания (несколько).

import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Switch, Text, TextInput } from '../../components/themed';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Icon } from '../../components/Icon';

import { useAppData } from '../../lib/AppDataContext';
import type { HabitReminder, SphereId } from '../../lib/types';
import { HABIT_ICONS, bestStreak, logIndex, totalDoneDays } from '../../lib/habits';
import { WEEKDAY_SHORT, todayKey } from '../../lib/dates';
import { SpherePicker } from '../../components/pickers';
import { HabitRemindersField } from '../../components/RemindersField';
import { COLORS, Chip, ChipsRow, FieldLabel, confirmDestructive } from '../../components/ui';

const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7];

export default function HabitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const { habits, habitLogs, addOrUpdateHabit, removeHabit } = useAppData();
  const existing = useMemo(() => habits.find((h) => h.id === id), [habits, id]);

  const [name, setName] = useState(existing?.name ?? '');
  const [icon, setIcon] = useState(existing?.icon ?? HABIT_ICONS[0]);
  const [customIcon, setCustomIcon] = useState('');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [sphere, setSphere] = useState<SphereId | undefined>(existing?.sphere);
  const [target, setTarget] = useState(existing?.targetCountPerDay ?? 1);
  const [weekdays, setWeekdays] = useState<number[]>(existing?.weekdays ?? ALL_DAYS);
  const [reminders, setReminders] = useState<HabitReminder[]>(existing?.reminders ?? []);
  const [archived, setArchived] = useState(existing?.archived ?? false);

  const toggleDay = (d: number) =>
    setWeekdays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b)));

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
      icon: customIcon.trim() || icon,
      description: description.trim() || undefined,
      sphere,
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
        <Text style={styles.bigIcon}>{customIcon.trim() || icon}</Text>
        <TextInput
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

      <FieldLabel>Иконка</FieldLabel>
      <View style={styles.icons}>
        {HABIT_ICONS.map((e) => (
          <Pressable
            key={e}
            style={[styles.iconCell, icon === e && !customIcon && styles.iconActive]}
            onPress={() => {
              setIcon(e);
              setCustomIcon('');
            }}
            accessibilityRole="button"
            accessibilityLabel={`Иконка ${e}`}
          >
            <Text style={styles.iconText}>{e}</Text>
          </Pressable>
        ))}
      </View>
      <TextInput
        style={[styles.input, { marginTop: 8 }]}
        placeholder="Или свой эмодзи"
        value={customIcon}
        onChangeText={(t) => setCustomIcon(t.slice(0, 4))}
      />

      <FieldLabel>Описание</FieldLabel>
      <TextInput
        style={[styles.input, { minHeight: 60 }]}
        placeholder="Зачем эта привычка, как её выполнять"
        value={description}
        onChangeText={setDescription}
        multiline
        textAlignVertical="top"
      />

      <FieldLabel>Сфера жизни</FieldLabel>
      <SpherePicker value={sphere} onChange={setSphere} />

      <FieldLabel>Сколько раз в день</FieldLabel>
      <View style={styles.stepper}>
        <Pressable
          onPress={() => setTarget((t) => Math.max(1, t - 1))}
          style={styles.stepButton}
          accessibilityRole="button"
          accessibilityLabel="Меньше"
        >
          <Icon name="remove" size={20} color={COLORS.muted} />
        </Pressable>
        <Text style={styles.stepValue}>{target}</Text>
        <Pressable
          onPress={() => setTarget((t) => Math.min(99, t + 1))}
          style={styles.stepButton}
          accessibilityRole="button"
          accessibilityLabel="Больше"
        >
          <Icon name="add" size={20} color={COLORS.muted} />
        </Pressable>
        <Text style={styles.stepHint}>{target === 5 ? 'например, после каждого намаза' : target === 1 ? 'один раз в день' : 'кнопка «+1» на каждое выполнение'}</Text>
      </View>

      <FieldLabel>Дни недели</FieldLabel>
      <ChipsRow>
        {WEEKDAY_SHORT.map((label, i) => (
          <Chip key={label} label={label} active={weekdays.includes(i + 1)} onPress={() => toggleDay(i + 1)} />
        ))}
      </ChipsRow>
      <View style={{ flexDirection: 'row', gap: 16, marginTop: 8 }}>
        <Pressable onPress={() => setWeekdays(ALL_DAYS)} hitSlop={6} accessibilityRole="button">
          <Text style={styles.link}>Каждый день</Text>
        </Pressable>
        <Pressable onPress={() => setWeekdays([1, 2, 3, 4, 5])} hitSlop={6} accessibilityRole="button">
          <Text style={styles.link}>По будням</Text>
        </Pressable>
        <Pressable onPress={() => setWeekdays([1, 4])} hitSlop={6} accessibilityRole="button">
          <Text style={styles.link}>Пн и Чт</Text>
        </Pressable>
      </View>

      <FieldLabel>Напоминания</FieldLabel>
      <HabitRemindersField value={reminders} onChange={setReminders} />

      {existing ? (
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchLabel}>Пауза (в архиве)</Text>
            <Text style={styles.hint}>Привычка скрыта из трекера, история сохраняется.</Text>
          </View>
          <Switch value={archived} onValueChange={setArchived} accessibilityLabel="Пауза" />
        </View>
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
  bigIcon: { fontSize: 32 },
  nameInput: { flex: 1, fontSize: 18, fontWeight: '600', color: COLORS.text },
  stats: { fontSize: 13, color: COLORS.muted, marginTop: 8 },
  icons: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  iconCell: { width: 44, height: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.card },
  iconActive: { backgroundColor: COLORS.hover, borderWidth: 2, borderColor: COLORS.primary },
  iconText: { fontSize: 22 },
  input: { fontSize: 14, backgroundColor: COLORS.card, borderRadius: 8, padding: 12, color: COLORS.text },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center' },
  stepValue: { fontSize: 22, fontWeight: '700', color: COLORS.text, minWidth: 30, textAlign: 'center' },
  stepHint: { flex: 1, fontSize: 12, color: COLORS.muted },
  link: { color: COLORS.primary, fontSize: 13 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.card, borderRadius: 8, padding: 12, marginTop: 18 },
  switchLabel: { fontSize: 15, color: COLORS.text },
  saveButton: { backgroundColor: COLORS.text, borderRadius: 6, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
  saveText: { color: COLORS.onAccent, fontWeight: '600', fontSize: 15 },
  deleteButton: { alignItems: 'center', paddingVertical: 14 },
  deleteText: { color: COLORS.danger, fontWeight: '600' },
});
