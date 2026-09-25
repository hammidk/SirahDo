// «Входящие» (docs/spec/overview.md) — временный буфер нераспределённых задач. Каждую задачу
// можно одним действием разобрать: перенести в проект/раздел или назначить
// окно намаза на сегодня.

import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../components/themed';
import { Icon } from '../components/Icon';

import { useAppData } from '../lib/AppDataContext';
import type { Task } from '../lib/types';
import { NAMAZ_WINDOW_ORDER, NAMAZ_WINDOW_TITLES } from '../lib/types';
import { buildProjectTree, flattenTree } from '../lib/projects';
import { todayKey } from '../lib/dates';
import { TaskCard } from '../components/TaskCard';
import { Fab } from '../components/Fab';
import { useTaskSheet } from '../components/TaskSheet';
import { COLORS, Chip, ChipsRow, FieldLabel, Sheet } from '../components/ui';

export default function InboxScreen() {
  const { tasks } = useAppData();
  const { openTask } = useTaskSheet();
  const [triage, setTriage] = useState<Task | null>(null);

  const inboxTasks = useMemo(() => tasks.filter((t) => !t.projectId && t.status === 'active'), [tasks]);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 96 }}>
        <Text style={styles.hint}>
          Буфер нераспределённых задач. Нажмите «→», чтобы разложить задачу по проекту или окну намаза.
        </Text>
        {inboxTasks.length === 0 ? <Text style={styles.empty}>Входящие пусты — всё разложено 👍</Text> : null}
        {inboxTasks.map((t) => (
          <TaskCard
            key={t.id}
            task={t}
            trailing={
              <Pressable
                onPress={() => setTriage(t)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={`Разобрать задачу ${t.title}`}
                style={styles.triageButton}
              >
                <Icon name="arrow-circle" size={24} color={COLORS.muted} />
              </Pressable>
            }
          />
        ))}
      </ScrollView>
      <Fab accessibilityLabel="Новая задача во Входящие" onPress={() => openTask()} />
      {triage ? <TriageSheet task={triage} onClose={() => setTriage(null)} /> : null}
    </View>
  );
}

/** Разбор задачи: проект → раздел, либо окно намаза на сегодня. Действие применяется сразу. */
function TriageSheet({ task, onClose }: { task: Task; onClose: () => void }) {
  const { projects, sections, addOrUpdateTask } = useAppData();
  const [projectId, setProjectId] = useState<string | undefined>();
  const rows = flattenTree(buildProjectTree(projects));
  const projectSections = sections.filter((s) => s.projectId === projectId).sort((a, b) => a.order - b.order);

  const moveTo = async (pid: string, sectionId?: string) => {
    await addOrUpdateTask({ id: task.id, projectId: pid, sectionId });
    onClose();
  };

  return (
    <Sheet visible onClose={onClose} title={`Разобрать: ${task.title}`}>
      {rows.length === 0 ? <Text style={styles.hint}>Сначала создайте проект в «Обзоре».</Text> : null}
      {rows.length > 0 ? <FieldLabel>В проект</FieldLabel> : null}
      {rows.map((n) => (
        <Pressable
          key={n.project.id}
          style={[styles.projectRow, { paddingLeft: 8 + n.depth * 18 }, projectId === n.project.id && styles.projectRowActive]}
          onPress={() => {
            const hasSections = sections.some((s) => s.projectId === n.project.id);
            if (hasSections) setProjectId(n.project.id);
            else moveTo(n.project.id);
          }}
          accessibilityRole="button"
        >
          <Icon name="folder" size={18} color={COLORS.muted} />
          <Text style={styles.projectTitle}>{n.project.title}</Text>
          {sections.some((s) => s.projectId === n.project.id) ? (
            <Icon name="chevron-forward" size={16} color={COLORS.muted} />
          ) : null}
        </Pressable>
      ))}
      {projectId && projectSections.length > 0 ? (
        <>
          <FieldLabel>Раздел</FieldLabel>
          <ChipsRow>
            <Chip label="Без раздела" onPress={() => moveTo(projectId)} />
            {projectSections.map((s) => (
              <Chip key={s.id} label={s.title} onPress={() => moveTo(projectId, s.id)} />
            ))}
          </ChipsRow>
        </>
      ) : null}

      <FieldLabel>Или в окно намаза сегодня</FieldLabel>
      <ChipsRow>
        {NAMAZ_WINDOW_ORDER.map((w) => (
          <Chip
            key={w}
            label={NAMAZ_WINDOW_TITLES[w]}
            color={COLORS.warning}
            onPress={async () => {
              await addOrUpdateTask({ id: task.id, namazWindow: w, due: { ...task.due, date: todayKey() } });
              onClose();
            }}
          />
        ))}
      </ChipsRow>
      <Text style={styles.note}>Окно намаза не убирает задачу из Входящих — она просто появится на «Сегодня» в этом окне.</Text>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  screen: { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  hint: { color: COLORS.muted, fontSize: 13, paddingBottom: 10 },
  empty: { color: COLORS.muted, fontSize: 14, paddingVertical: 20, textAlign: 'center' },
  triageButton: { alignSelf: 'center' },
  projectRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingRight: 8, borderRadius: 8 },
  projectRowActive: { backgroundColor: COLORS.background },
  projectTitle: { flex: 1, fontSize: 15, color: COLORS.text },
  note: { fontSize: 12, color: COLORS.muted, marginTop: 8 },
});
