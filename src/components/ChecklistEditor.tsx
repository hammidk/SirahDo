// Чек-лист внутри задачи: подзадачи-галочки (ТЗ §5.3).

import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, TextInput } from './themed';

import type { ChecklistItem } from '../lib/types';
import { makeId } from '../lib/storage';
import { COLORS } from './ui';

export function ChecklistEditor({ value, onChange }: { value: ChecklistItem[]; onChange: (items: ChecklistItem[]) => void }) {
  const [draft, setDraft] = useState('');

  const add = () => {
    const text = draft.trim();
    if (!text) return;
    onChange([...value, { id: makeId(), text, done: false }]);
    setDraft('');
  };

  const update = (id: string, patch: Partial<ChecklistItem>) =>
    onChange(value.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const doneCount = value.filter((i) => i.done).length;

  return (
    <View style={styles.box}>
      {value.length > 0 ? (
        <Text style={styles.progress}>
          {doneCount} из {value.length}
        </Text>
      ) : null}
      {value.map((item) => (
        <View key={item.id} style={styles.row}>
          <Pressable
            style={[styles.checkbox, item.done && styles.checkboxDone]}
            onPress={() => update(item.id, { done: !item.done })}
            hitSlop={8}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: item.done }}
          >
            {item.done ? <Text style={styles.checkmark}>✓</Text> : null}
          </Pressable>
          <TextInput
            plain
            style={[styles.itemInput, item.done && styles.itemDone]}
            value={item.text}
            onChangeText={(text) => update(item.id, { text })}
            onEndEditing={() => {
              if (!item.text.trim()) onChange(value.filter((i) => i.id !== item.id));
            }}
          />
          <Pressable
            onPress={() => onChange(value.filter((i) => i.id !== item.id))}
            hitSlop={8}
            accessibilityLabel="Удалить пункт"
          >
            <Text style={styles.remove}>✕</Text>
          </Pressable>
        </View>
      ))}
      <View style={styles.row}>
        <Text style={styles.plus}>+</Text>
        <TextInput
          plain
          style={styles.itemInput}
          placeholder="Добавить пункт"
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={add}
          onEndEditing={add}
          returnKeyType="done"
          submitBehavior="submit"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: COLORS.card, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4 },
  progress: { fontSize: 11, color: COLORS.muted, paddingTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: COLORS.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  checkmark: { color: COLORS.onAccent, fontSize: 12, fontWeight: '700' },
  itemInput: { flex: 1, fontSize: 14, color: COLORS.text, paddingVertical: 10 },
  itemDone: { color: COLORS.muted, textDecorationLine: 'line-through' },
  remove: { fontSize: 12, color: COLORS.muted },
  plus: { width: 20, textAlign: 'center', fontSize: 18, color: COLORS.primary },
});
