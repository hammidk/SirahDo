// Блок «Намерение» проекта/раздела (ТЗ §3): в свёрнутом виде — первая строка,
// по тапу разворачивается; карандаш — редактирование. Необязательное поле.

import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, TextInput } from './themed';
import { Icon } from './Icon';

import { COLORS } from './ui';

export function IntentionBlock({
  value,
  onSave,
  placeholder,
  compact = false,
}: {
  value?: string;
  onSave: (text: string | undefined) => void;
  placeholder: string;
  compact?: boolean; // для разделов — без карточки
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');

  if (editing) {
    return (
      <View style={compact ? styles.compactBox : styles.box}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder={placeholder}
          multiline
          autoFocus
          accessibilityLabel="Намерение"
        />
        <View style={styles.actions}>
          <Pressable
            onPress={() => {
              setDraft(value ?? '');
              setEditing(false);
            }}
            hitSlop={8}
            accessibilityRole="button"
          >
            <Text style={styles.cancel}>Отмена</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              onSave(draft.trim() || undefined);
              setEditing(false);
            }}
            hitSlop={8}
            accessibilityRole="button"
          >
            <Text style={styles.save}>Сохранить</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const text = value?.trim();
  const multiline = !!text && (text.includes('\n') || text.length > 60);

  return (
    <View style={[compact ? styles.compactBox : styles.box, styles.row]}>
      <Pressable
        style={{ flex: 1 }}
        onPress={() => (text ? setExpanded((e) => !e) : setEditing(true))}
        accessibilityRole="button"
        accessibilityHint={text ? (expanded ? 'Свернуть' : 'Развернуть') : 'Написать намерение'}
      >
        {text ? (
          <Text style={styles.text} numberOfLines={expanded ? undefined : 1}>
            {text}
          </Text>
        ) : (
          <Text style={styles.placeholder}>{placeholder}</Text>
        )}
        {multiline && !expanded ? <Text style={styles.more}>ещё</Text> : null}
      </Pressable>
      <Pressable
        onPress={() => {
          setDraft(value ?? '');
          setEditing(true);
        }}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Изменить намерение"
      >
        <Icon name="edit" size={18} color={COLORS.muted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: COLORS.card, borderRadius: 8, padding: 12, marginBottom: 8 },
  compactBox: { paddingVertical: 4, marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  text: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
  placeholder: { fontSize: 13, color: COLORS.muted, fontStyle: 'italic' },
  more: { fontSize: 12, color: COLORS.primary, marginTop: 2 },
  input: { fontSize: 14, color: COLORS.text, minHeight: 60, textAlignVertical: 'top', backgroundColor: COLORS.card, borderRadius: 8, padding: 10 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 20, marginTop: 8 },
  cancel: { fontSize: 14, color: COLORS.muted },
  save: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
});
