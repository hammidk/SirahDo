// Боковая панель Календаря (docs/spec/calendar.md): режим просмотра и список календарей с
// чекбоксами (любая комбинация), слой «Задачи», создание/правка календаря.

import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '../themed';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../Icon';
import type { IconName } from '../Icon';

import type { Calendar, CalendarViewMode } from '../../lib/types';
import { CALENDAR_COLORS } from '../../lib/types';
import { useAppData } from '../../lib/AppDataContext';
import { Button, COLORS, FieldLabel, Sheet, confirmDestructive } from '../ui';

const MODES: { id: CalendarViewMode; title: string; icon: IconName }[] = [
  { id: 'agenda', title: 'Расписание', icon: 'list' },
  { id: 'day', title: 'День', icon: 'calendar-day' },
  { id: 'week', title: 'Неделя', icon: 'calendar' },
  { id: 'month', title: 'Месяц', icon: 'grid' },
];

export function CalendarDrawer({
  visible,
  mode,
  onChangeMode,
  onClose,
}: {
  visible: boolean;
  mode: CalendarViewMode;
  onChangeMode: (m: CalendarViewMode) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { calendars, settings, addOrUpdateCalendar, updateSettings } = useAppData();
  const [editing, setEditing] = useState<Calendar | 'new' | null>(null);
  const sorted = [...calendars].sort((a, b) => a.order - b.order);
  const showTasks = settings.showTasksInCalendar !== false;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.panel, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}>
          <ScrollView>
            <Text style={styles.heading}>Вид</Text>
            {MODES.map((m) => (
              <Pressable
                key={m.id}
                style={[styles.item, mode === m.id && styles.itemActive]}
                onPress={() => {
                  onChangeMode(m.id);
                  onClose();
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: mode === m.id }}
              >
                <Icon name={m.icon} size={20} color={mode === m.id ? COLORS.primary : COLORS.text} />
                <Text style={[styles.itemText, mode === m.id && { color: COLORS.primary, fontWeight: '600' }]}>{m.title}</Text>
              </Pressable>
            ))}

            <Text style={[styles.heading, { marginTop: 20 }]}>Календари</Text>
            {sorted.map((c) => (
              <View key={c.id} style={styles.item}>
                <Pressable
                  onPress={() => addOrUpdateCalendar({ id: c.id, visible: !c.visible })}
                  hitSlop={8}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: c.visible }}
                  accessibilityLabel={c.name}
                >
                  <View style={[styles.checkbox, { borderColor: c.color }, c.visible && { backgroundColor: c.color }]}>
                    {c.visible ? <Icon name="check" size={14} color={COLORS.onAccent} /> : null}
                  </View>
                </Pressable>
                <Text style={styles.itemText} numberOfLines={1}>
                  {c.name}
                </Text>
                <Pressable onPress={() => setEditing(c)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Изменить календарь ${c.name}`}>
                  <Icon name="more" size={18} color={COLORS.muted} />
                </Pressable>
              </View>
            ))}
            <View style={styles.item}>
              <Pressable
                onPress={() => updateSettings({ ...settings, showTasksInCalendar: !showTasks })}
                hitSlop={8}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: showTasks }}
                accessibilityLabel="Задачи"
              >
                <View style={[styles.checkbox, { borderColor: COLORS.muted }, showTasks && { backgroundColor: COLORS.muted }]}>
                  {showTasks ? <Icon name="check" size={14} color={COLORS.onAccent} /> : null}
                </View>
              </Pressable>
              <Text style={styles.itemText}>Задачи со сроком</Text>
            </View>
            <Pressable style={styles.item} onPress={() => setEditing('new')} accessibilityRole="button">
              <Icon name="add" size={20} color={COLORS.muted} />
              <Text style={[styles.itemText, { color: COLORS.primary }]}>Создать календарь</Text>
            </Pressable>
          </ScrollView>
        </View>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Закрыть панель" />
      </View>
      {editing ? <CalendarEditSheet calendar={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} /> : null}
    </Modal>
  );
}

/** Создание/правка календаря: название и цвет; удаление — вместе с событиями. */
export function CalendarEditSheet({ calendar, onClose }: { calendar?: Calendar; onClose: () => void }) {
  const { calendars, events, addOrUpdateCalendar, removeCalendar } = useAppData();
  const [name, setName] = useState(calendar?.name ?? '');
  const [color, setColor] = useState(calendar?.color ?? CALENDAR_COLORS[calendars.length % CALENDAR_COLORS.length]);

  const save = async () => {
    if (!name.trim()) return;
    await addOrUpdateCalendar(calendar ? { id: calendar.id, name: name.trim(), color } : { name: name.trim(), color });
    onClose();
  };

  const remove = () => {
    if (!calendar) return;
    const count = events.filter((e) => e.calendarId === calendar.id).length;
    confirmDestructive(`Удалить календарь «${calendar.name}»?`, count ? `Вместе с ним удалятся события: ${count}.` : undefined, async () => {
      await removeCalendar(calendar.id);
      onClose();
    });
  };

  return (
    <Sheet
      visible
      onClose={onClose}
      title={calendar ? 'Календарь' : 'Новый календарь'}
      footer={
        <>
          {calendar && calendars.length > 1 ? <Button title="Удалить" kind="danger" onPress={remove} /> : null}
          <Button title="Сохранить" onPress={save} />
        </>
      }
    >
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Например: Семья, Учёба, Работа"
        autoFocus={!calendar}
      />
      <FieldLabel>Цвет</FieldLabel>
      <View style={styles.colors}>
        {CALENDAR_COLORS.map((c) => (
          <Pressable
            key={c}
            style={[styles.color, { backgroundColor: c }, color === c && styles.colorActive]}
            onPress={() => setColor(c)}
            accessibilityRole="button"
            accessibilityLabel={`Цвет ${c}`}
            accessibilityState={{ selected: color === c }}
          />
        ))}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, flexDirection: 'row', backgroundColor: COLORS.overlay },
  panel: { width: '78%', maxWidth: 320, backgroundColor: COLORS.card, paddingHorizontal: 16 },
  heading: { fontSize: 12, fontWeight: '500', color: COLORS.tertiary, marginBottom: 6 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 6, borderRadius: 8 },
  itemActive: { backgroundColor: COLORS.hover },
  itemText: { flex: 1, fontSize: 15, color: COLORS.text },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  input: { fontSize: 16, backgroundColor: COLORS.background, borderRadius: 8, padding: 12, color: COLORS.text },
  colors: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  color: { width: 32, height: 32, borderRadius: 16 },
  colorActive: { borderWidth: 3, borderColor: COLORS.text },
});
