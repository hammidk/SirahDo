// Пользовательские теги задачи: множественный выбор + создание нового тега на лету.

import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { TextInput } from './themed';

import { useAppData } from '../lib/AppDataContext';
import { Chip, ChipsRow, COLORS } from './ui';

export function TagsField({ value, onChange }: { value: string[]; onChange: (tagIds: string[]) => void }) {
  const { tags, addOrUpdateTag } = useAppData();
  const [draft, setDraft] = useState('');

  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);

  const create = async () => {
    const name = draft.trim().replace(/^#/, '');
    if (!name) return;
    const tag = await addOrUpdateTag({ name });
    if (!value.includes(tag.id)) onChange([...value, tag.id]);
    setDraft('');
  };

  const sorted = [...tags].sort((a, b) => a.name.localeCompare(b.name, 'ru'));

  return (
    <View>
      {sorted.length > 0 ? (
        <ChipsRow>
          {sorted.map((t) => (
            <Chip key={t.id} label={`#${t.name}`} active={value.includes(t.id)} color={t.color} onPress={() => toggle(t.id)} />
          ))}
        </ChipsRow>
      ) : null}
      <TextInput
        style={[styles.input, sorted.length > 0 && { marginTop: 8 }]}
        placeholder="Новый тег — Enter, чтобы добавить"
        value={draft}
        onChangeText={setDraft}
        onSubmitEditing={create}
        returnKeyType="done"
        autoCapitalize="none"
        submitBehavior="submit"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    fontSize: 14,
    backgroundColor: COLORS.card,
    borderRadius: 8,
    padding: 12,
    color: COLORS.text,
  },
});
