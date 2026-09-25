// Событие календаря (ТЗ §4.2): название; время (весь день, начало, конец,
// повтор); календарь и цвет; уведомления; локация; описание; вложения-ссылки.
// id = "new" — создание (параметры date и hour задают начало).
// Допущение: правка повторяющегося события меняет всю серию.

import { useMemo, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Switch, Text, TextInput } from '../../components/themed';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Icon } from '../../components/Icon';
import dayjs from 'dayjs';

import { useAppData } from '../../lib/AppDataContext';
import type { Recurrence, Reminder } from '../../lib/types';
import { CALENDAR_COLORS } from '../../lib/types';
import { DATE_FORMAT } from '../../lib/dates';
import { DateTimePickerField } from '../../components/DateTimePickerField';
import { RecurrenceField } from '../../components/RecurrenceField';
import { RemindersField } from '../../components/RemindersField';
import { COLORS, FieldLabel, confirmDestructive } from '../../components/ui';

export default function EventScreen() {
  const params = useLocalSearchParams<{ id: string; date?: string; hour?: string }>();
  const isNew = params.id === 'new';
  const { events, calendars, addOrUpdateEvent, removeEvent } = useAppData();
  const existing = useMemo(() => events.find((e) => e.id === params.id), [events, params.id]);
  const sortedCalendars = [...calendars].sort((a, b) => a.order - b.order);

  const initialStart = useMemo(() => {
    if (existing) return existing.start;
    const base = params.date ? dayjs(params.date) : dayjs();
    const hour = Math.min(23, Math.max(0, parseInt(params.hour ?? '', 10) || dayjs().hour() + 1));
    return base.hour(hour).minute(0).second(0).millisecond(0).toISOString();
  }, [existing, params.date, params.hour]);

  const [title, setTitle] = useState(existing?.title ?? '');
  const [allDay, setAllDay] = useState(existing?.allDay ?? false);
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(existing?.end ?? dayjs(initialStart).add(1, 'hour').toISOString());
  const [recurrence, setRecurrence] = useState<Recurrence | undefined>(existing?.recurrence);
  const [calendarId, setCalendarId] = useState(existing?.calendarId ?? sortedCalendars.find((c) => c.visible)?.id ?? sortedCalendars[0]?.id);
  const [colorOverride, setColorOverride] = useState<string | undefined>(existing?.colorOverride);
  const [reminders, setReminders] = useState<Reminder[]>(existing?.reminders ?? (isNew ? [{ kind: 'offset', minutes: 10 }] : []));
  const [location, setLocation] = useState(existing?.location ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [links, setLinks] = useState<string[]>(existing?.links ?? []);
  const [linkDraft, setLinkDraft] = useState('');

  const calendar = calendars.find((c) => c.id === calendarId);

  // Смена начала сдвигает конец, сохраняя длительность (как в Google Calendar).
  const onChangeStart = (iso: string | undefined) => {
    if (!iso) return;
    const duration = Math.max(0, dayjs(end).diff(dayjs(start)));
    setStart(iso);
    setEnd(dayjs(iso).add(duration, 'millisecond').toISOString());
  };

  const addLink = () => {
    let url = linkDraft.trim();
    if (!url) return;
    if (!/^[a-z]+:\/\//i.test(url)) url = `https://${url}`;
    setLinks((l) => [...l, url]);
    setLinkDraft('');
  };

  const onSave = async () => {
    if (!title.trim()) {
      Alert.alert('Нужно название', 'Как назовём событие?');
      return;
    }
    if (!calendarId) {
      Alert.alert('Нет календаря', 'Создайте календарь в боковой панели.');
      return;
    }
    let s = dayjs(start);
    let e = dayjs(end);
    if (allDay) {
      s = s.startOf('day');
      e = e.startOf('day');
    }
    if (e.isBefore(s)) e = allDay ? s : s.add(1, 'hour');
    await addOrUpdateEvent({
      id: existing?.id,
      title: title.trim(),
      allDay,
      start: s.toISOString(),
      end: e.toISOString(),
      recurrence,
      calendarId,
      colorOverride,
      reminders,
      location: location.trim() || undefined,
      description: description.trim() || undefined,
      links,
    });
    router.back();
  };

  const onDelete = () =>
    existing &&
    confirmDestructive(
      'Удалить событие?',
      existing.recurrence ? 'Будут удалены все повторения этого события.' : undefined,
      async () => {
        await removeEvent(existing.id);
        router.back();
      }
    );

  if (!isNew && !existing) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ title: 'Событие' }} />
        <Text style={styles.hint}>Событие не найдено.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: isNew ? 'Новое событие' : 'Событие' }} />

      <TextInput
        style={styles.titleInput}
        placeholder="Название"
        value={title}
        onChangeText={setTitle}
        autoFocus={isNew}
        accessibilityLabel="Название события"
      />

      <FieldLabel>Время</FieldLabel>
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Весь день</Text>
        <Switch value={allDay} onValueChange={setAllDay} accessibilityLabel="Весь день" />
      </View>
      <DateTimePickerField title="Начало" icon="clock" value={start} onChange={onChangeStart} allowClear={false} dateOnly={allDay} />
      <DateTimePickerField
        title="Конец"
        icon="clock"
        value={end}
        onChange={(iso) => iso && setEnd(iso)}
        allowClear={false}
        dateOnly={allDay}
      />
      <RecurrenceField value={recurrence} startDate={dayjs(start).format(DATE_FORMAT)} onChange={setRecurrence} />

      <FieldLabel>Календарь</FieldLabel>
      <View style={styles.calendarRow}>
        {sortedCalendars.map((c) => (
          <Pressable
            key={c.id}
            style={[styles.calendarChip, calendarId === c.id && { borderColor: c.color, backgroundColor: `${c.color}1A` }]}
            onPress={() => setCalendarId(c.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: calendarId === c.id }}
          >
            <View style={[styles.dot, { backgroundColor: c.color }]} />
            <Text style={styles.calendarText}>{c.name}</Text>
          </Pressable>
        ))}
      </View>
      <FieldLabel>Цвет события</FieldLabel>
      <View style={styles.colors}>
        <Pressable
          style={[styles.color, { backgroundColor: calendar?.color ?? COLORS.primary }, !colorOverride && styles.colorActive]}
          onPress={() => setColorOverride(undefined)}
          accessibilityRole="button"
          accessibilityLabel="Цвет календаря"
        >
          <Text style={styles.colorAuto}>A</Text>
        </Pressable>
        {CALENDAR_COLORS.map((c) => (
          <Pressable
            key={c}
            style={[styles.color, { backgroundColor: c }, colorOverride === c && styles.colorActive]}
            onPress={() => setColorOverride(c)}
            accessibilityRole="button"
            accessibilityLabel={`Цвет ${c}`}
          />
        ))}
      </View>

      <FieldLabel>Уведомления</FieldLabel>
      <RemindersField value={reminders} onChange={setReminders} hasAnchor anchor="начала" />

      <FieldLabel>Локация</FieldLabel>
      <TextInput style={styles.input} placeholder="Где?" placeholderTextColor={COLORS.muted} value={location} onChangeText={setLocation} />

      <FieldLabel>Описание</FieldLabel>
      <TextInput
        style={[styles.input, { minHeight: 80 }]}
        placeholder="Подробности"
        value={description}
        onChangeText={setDescription}
        multiline
        textAlignVertical="top"
      />

      <FieldLabel>Вложения — ссылки</FieldLabel>
      {links.map((url, i) => (
        <View key={`${url}_${i}`} style={styles.linkRow}>
          <Icon name="link" size={18} color={COLORS.muted} />
          <Text style={styles.linkText} numberOfLines={1} onPress={() => Linking.openURL(url).catch(() => undefined)}>
            {url}
          </Text>
          <Pressable onPress={() => setLinks((l) => l.filter((_, j) => j !== i))} hitSlop={8} accessibilityLabel="Удалить ссылку">
            <Icon name="close" size={18} color={COLORS.muted} />
          </Pressable>
        </View>
      ))}
      <View style={styles.linkAdd}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="https://… (документ, встреча, файл в облаке)"
          value={linkDraft}
          onChangeText={setLinkDraft}
          onSubmitEditing={addLink}
          autoCapitalize="none"
          keyboardType="url"
        />
        <Pressable onPress={addLink} hitSlop={8} accessibilityRole="button" accessibilityLabel="Добавить ссылку">
          <Icon name="add-circle" size={30} color={COLORS.muted} />
        </Pressable>
      </View>
      <Text style={styles.hint}>Файлы с устройства — в следующей версии; сейчас можно прикрепить ссылку.</Text>

      <Pressable style={styles.saveButton} onPress={onSave} accessibilityRole="button">
        <Text style={styles.saveText}>{isNew ? 'Создать' : 'Сохранить'}</Text>
      </Pressable>
      {existing ? (
        <Pressable style={styles.deleteButton} onPress={onDelete} accessibilityRole="button">
          <Text style={styles.deleteText}>Удалить событие</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  hint: { color: COLORS.muted, fontSize: 12, paddingVertical: 6 },
  titleInput: { fontSize: 20, fontWeight: '600', backgroundColor: COLORS.card, borderRadius: 8, padding: 12, color: COLORS.text },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 6,
  },
  switchLabel: { fontSize: 15, color: COLORS.text },
  calendarRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  calendarChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.separator,
    backgroundColor: COLORS.card,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  calendarText: { fontSize: 14, color: COLORS.text },
  colors: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  color: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  colorActive: { borderWidth: 3, borderColor: COLORS.text },
  colorAuto: { color: COLORS.onAccent, fontWeight: '700', fontSize: 12 },
  input: { fontSize: 14, backgroundColor: COLORS.card, borderRadius: 8, padding: 12, color: COLORS.text },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.card, borderRadius: 8, padding: 10, marginBottom: 6 },
  linkText: { flex: 1, fontSize: 14, color: COLORS.primary },
  linkAdd: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  saveButton: { backgroundColor: COLORS.text, borderRadius: 6, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
  saveText: { color: COLORS.onAccent, fontWeight: '600', fontSize: 15 },
  deleteButton: { alignItems: 'center', paddingVertical: 14 },
  deleteText: { color: COLORS.danger, fontWeight: '600' },
});
