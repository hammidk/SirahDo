// Общие листы для проектов, разделов и тегов: создание проекта с выбором
// папки и простой ввод имени.

import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { TextInput } from './themed';

import type { Project } from '../lib/types';
import { MAX_PROJECT_DEPTH, projectDepth, projectPath } from '../lib/projects';
import { Button, COLORS, Chip, ChipsRow, FieldLabel, Sheet } from './ui';

/** Новый проект: название и (по желанию) родительская папка — с учётом лимита глубины. */
export function NewProjectSheet({
  projects,
  defaultParentId,
  onClose,
  onCreate,
}: {
  projects: Project[];
  defaultParentId?: string;
  onClose: () => void;
  onCreate: (title: string, parentProjectId?: string) => void;
}) {
  const [title, setTitle] = useState('');
  const [parentId, setParentId] = useState<string | undefined>(defaultParentId);
  const parents = projects
    .filter((p) => !p.archived && projectDepth(p, projects) < MAX_PROJECT_DEPTH - 1)
    .map((p) => ({ p, path: projectPath(p, projects) }))
    .sort((a, b) => a.path.localeCompare(b.path, 'ru'));

  const submit = () => {
    if (title.trim()) onCreate(title.trim(), parentId);
  };

  return (
    <Sheet
      visible
      onClose={onClose}
      title="Новый проект"
      footer={
        <>
          <Button title="Отмена" kind="secondary" onPress={onClose} />
          <Button title="Создать" onPress={submit} />
        </>
      }
    >
      <TextInput
        style={styles.input}
        placeholder="Название проекта"
        value={title}
        onChangeText={setTitle}
        autoFocus
        onSubmitEditing={submit}
        returnKeyType="done"
      />
      {parents.length > 0 ? (
        <>
          <FieldLabel>Внутри папки</FieldLabel>
          <ChipsRow>
            <Chip label="Верхний уровень" active={!parentId} onPress={() => setParentId(undefined)} />
            {parents.map(({ p, path }) => (
              <Chip key={p.id} label={path} active={parentId === p.id} onPress={() => setParentId(p.id)} />
            ))}
          </ChipsRow>
        </>
      ) : null}
    </Sheet>
  );
}

/** Простой лист «ввести имя» — для тегов, разделов, переименований. */
export function NameSheet({
  title,
  placeholder,
  initial = '',
  onClose,
  onSave,
}: {
  title: string;
  placeholder: string;
  initial?: string;
  onClose: () => void;
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState(initial);
  const submit = () => {
    if (name.trim()) onSave(name.trim());
  };
  return (
    <Sheet
      visible
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button title="Отмена" kind="secondary" onPress={onClose} />
          <Button title="Сохранить" onPress={submit} />
        </>
      }
    >
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        value={name}
        onChangeText={setName}
        autoFocus
        onSubmitEditing={submit}
        returnKeyType="done"
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  input: {
    fontSize: 16,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
    color: COLORS.text,
  },
});
