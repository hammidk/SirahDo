// Описание задачи с панелью форматирования (ТЗ §5.3): жирный, курсив, список,
// нумерованный список, ссылка + переключатель «Просмотр». Хранится как markdown.

import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, TextInput } from './themed';
import type { NativeSyntheticEvent, TextInput as RNTextInput, TextInputSelectionChangeEventData } from 'react-native';
import { Icon } from './Icon';

import type { FormatKind, Selection } from '../lib/markdown';
import { applyFormat, caretAfterEdit, continueList } from '../lib/markdown';
import { MarkdownView } from './MarkdownView';
import { COLORS } from './ui';

const TOOLS: { kind: FormatKind; label: string; a11y: string }[] = [
  { kind: 'bold', label: 'B', a11y: 'Жирный' },
  { kind: 'italic', label: 'I', a11y: 'Курсив' },
  { kind: 'bullet', label: '•', a11y: 'Маркированный список' },
  { kind: 'numbered', label: '1.', a11y: 'Нумерованный список' },
  { kind: 'link', label: '🔗', a11y: 'Ссылка' },
];

export function MarkdownEditor({
  value,
  onChange,
  placeholder = 'Описание',
}: {
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
}) {
  const [preview, setPreview] = useState(false);
  const selection = useRef<Selection>({ start: value.length, end: value.length });
  // Выделение задаём принудительно только сразу после форматирования,
  // иначе поле остаётся неуправляемым по курсору (без «прыжков» при наборе).
  const [forced, setForced] = useState<Selection | undefined>();
  const inputRef = useRef<RNTextInput>(null);

  const format = (kind: FormatKind) => {
    const result = applyFormat(value, selection.current, kind);
    onChange(result.text);
    selection.current = result.selection;
    setForced(result.selection);
    setPreview(false);
    inputRef.current?.focus();
  };

  const onSelectionChange = (e: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
    selection.current = e.nativeEvent.selection;
    if (forced) setForced(undefined);
  };

  const onChangeText = (text: string) => {
    // Enter в пункте списка продолжает список.
    const continued = continueList(value, text);
    if (continued) {
      onChange(continued.text);
      selection.current = continued.selection;
      setForced(continued.selection);
      return;
    }
    // Курсор — в конце правки; если платформа пришлёт onSelectionChange, он уточнит позицию.
    const caret = caretAfterEdit(value, text);
    selection.current = { start: caret, end: caret };
    onChange(text);
  };

  return (
    <View style={styles.box}>
      <View style={styles.toolbar}>
        {TOOLS.map((t) => (
          <Pressable
            key={t.kind}
            style={styles.tool}
            onPress={() => format(t.kind)}
            accessibilityRole="button"
            accessibilityLabel={t.a11y}
            hitSlop={4}
          >
            <Text
              style={[
                styles.toolText,
                t.kind === 'bold' && { fontWeight: '800' },
                t.kind === 'italic' && { fontStyle: 'italic' },
              ]}
            >
              {t.label}
            </Text>
          </Pressable>
        ))}
        <View style={{ flex: 1 }} />
        <Pressable
          style={[styles.tool, preview && styles.toolActive]}
          onPress={() => setPreview((p) => !p)}
          accessibilityRole="button"
          accessibilityLabel={preview ? 'Редактировать' : 'Просмотр'}
          accessibilityState={{ selected: preview }}
        >
          <Icon name={preview ? 'edit' : 'eye'} size={18} color={preview ? COLORS.text : COLORS.muted} />
        </Pressable>
      </View>

      {preview ? (
        <Pressable style={styles.preview} onPress={() => setPreview(false)} accessibilityHint="Нажмите, чтобы редактировать">
          {value.trim() ? <MarkdownView text={value} /> : <Text style={styles.placeholder}>{placeholder}</Text>}
        </Pressable>
      ) : (
        <TextInput
          ref={inputRef}
          plain
          style={styles.input}
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          onSelectionChange={onSelectionChange}
          selection={forced}
          multiline
          textAlignVertical="top"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: COLORS.card, borderRadius: 8, overflow: 'hidden' },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.separator,
  },
  tool: { minWidth: 34, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  toolActive: { backgroundColor: COLORS.hover },
  toolText: { fontSize: 15, color: COLORS.text },
  input: { fontSize: 14, color: COLORS.text, padding: 12, minHeight: 90 },
  preview: { padding: 12, minHeight: 90 },
  placeholder: { fontSize: 14, color: COLORS.muted },
});
