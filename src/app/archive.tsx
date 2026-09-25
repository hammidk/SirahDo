// Архив проектов: завершённые проекты не мешают в «Обзоре», но их можно вернуть.

import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../components/themed';

import { useAppData } from '../lib/AppDataContext';
import { plural } from '../lib/dates';
import { COLORS, confirmDestructive } from '../components/ui';

export default function ArchiveScreen() {
  const { projects, tasks, addOrUpdateProject, removeProject } = useAppData();
  const archived = projects.filter((p) => p.archived).sort((a, b) => a.title.localeCompare(b.title, 'ru'));

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 40 }}>
      {archived.length === 0 ? <Text style={styles.hint}>Архив пуст.</Text> : null}
      {archived.map((p) => {
        const count = tasks.filter((t) => t.projectId === p.id).length;
        return (
          <View key={p.id} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{p.title}</Text>
              <Text style={styles.meta}>
                {count} {plural(count, ['задача', 'задачи', 'задач'])}
              </Text>
            </View>
            <Pressable onPress={() => addOrUpdateProject({ id: p.id, archived: false })} hitSlop={8} accessibilityRole="button">
              <Text style={styles.restore}>Вернуть</Text>
            </Pressable>
            <Pressable
              onPress={() =>
                confirmDestructive(`Удалить проект «${p.title}»?`, 'Вместе с задачами, разделами и подпроектами. Это нельзя отменить.', () =>
                  removeProject(p.id)
                )
              }
              hitSlop={8}
              accessibilityRole="button"
            >
              <Text style={styles.delete}>Удалить</Text>
            </Pressable>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  hint: { color: COLORS.muted, fontSize: 13 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: COLORS.card,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  title: { fontSize: 15, color: COLORS.text, fontWeight: '500' },
  meta: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  restore: { color: COLORS.primary, fontWeight: '600' },
  delete: { color: COLORS.danger, fontWeight: '600' },
});
