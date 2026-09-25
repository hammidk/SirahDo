// Карточка проекта (docs/spec/overview.md): «Намерение → Действие → Упование».
// Действие — задачи проекта по разделам (как в Todoist), подпроекты-папки.
// Управление: переименовать, избранное, папка/сфера/тег намерения, архив, удаление.

import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../components/themed';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Icon } from '../../components/Icon';
import type { IconName } from '../../components/Icon';

import { useAppData } from '../../lib/AppDataContext';
import type { Section } from '../../lib/types';
import { INTENTION_TAGS, SPHERES } from '../../lib/types';
import {
  MAX_PROJECT_DEPTH,
  descendantIds,
  projectDepth,
  projectPath,
  subtreeHeight,
} from '../../lib/projects';
import { plural } from '../../lib/recurrence';
import { TaskCard } from '../../components/TaskCard';
import { Fab } from '../../components/Fab';
import { useTaskSheet } from '../../components/TaskSheet';
import { IntentionBlock } from '../../components/IntentionBlock';
import { NameSheet, NewProjectSheet } from '../../components/ProjectSheets';
import { IntentionTagPicker, SpherePicker } from '../../components/pickers';
import { Button, COLORS, Chip, ChipsRow, FieldLabel, Sheet, confirmDestructive } from '../../components/ui';

type Dialog =
  | { kind: 'rename' }
  | { kind: 'settings' }
  | { kind: 'newSection' }
  | { kind: 'newSubproject' }
  | { kind: 'renameSection'; section: Section }
  | { kind: 'sectionMenu'; section: Section }
  | null;

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    projects,
    sections,
    tasks,
    addOrUpdateProject,
    removeProject,
    addOrUpdateSection,
    removeSection,
  } = useAppData();
  const { openTask } = useTaskSheet();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [showDone, setShowDone] = useState(false);

  const project = useMemo(() => projects.find((p) => p.id === id), [projects, id]);
  const projectSections = useMemo(
    () => sections.filter((s) => s.projectId === id).sort((a, b) => a.order - b.order),
    [sections, id]
  );
  const subprojects = useMemo(
    () => projects.filter((p) => p.parentProjectId === id && !p.archived).sort((a, b) => a.order - b.order),
    [projects, id]
  );
  const projectTasks = useMemo(() => tasks.filter((t) => t.projectId === id), [tasks, id]);
  const active = projectTasks.filter((t) => t.status === 'active');
  const done = projectTasks.filter((t) => t.status === 'done').sort((a, b) => (b.endedAt ?? '').localeCompare(a.endedAt ?? ''));

  if (!project) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ title: 'Проект' }} />
        <Text style={styles.hint}>Проект не найден.</Text>
      </View>
    );
  }

  const depth = projectDepth(project, projects);
  const parent = project.parentProjectId ? projects.find((p) => p.id === project.parentProjectId) : undefined;
  const sphere = SPHERES.find((s) => s.id === project.sphere);
  const intentionTag = INTENTION_TAGS.find((t) => t.id === project.intentionTag);

  const onDelete = () => {
    const ids = descendantIds(project.id, projects);
    const taskCount = tasks.filter((t) => t.projectId && ids.has(t.projectId)).length;
    const sectionCount = sections.filter((s) => ids.has(s.projectId)).length;
    const subCount = ids.size - 1;
    const parts = [
      `${taskCount} ${plural(taskCount, ['задача', 'задачи', 'задач'])}`,
      sectionCount ? `${sectionCount} ${plural(sectionCount, ['раздел', 'раздела', 'разделов'])}` : '',
      subCount ? `${subCount} ${plural(subCount, ['подпроект', 'подпроекта', 'подпроектов'])}` : '',
    ].filter(Boolean);
    confirmDestructive(
      `Удалить проект «${project.title}»?`,
      `Будут удалены: ${parts.join(', ')}. Это нельзя отменить. Если проект просто завершён — лучше отправить его в архив.`,
      async () => {
        await removeProject(project.id);
        router.back();
      }
    );
  };

  const onDeleteSection = (section: Section) => {
    const count = active.filter((t) => t.sectionId === section.id).length;
    confirmDestructive(
      `Удалить раздел «${section.title}»?`,
      count ? `${count} ${plural(count, ['задача останется', 'задачи останутся', 'задач останутся'])} в проекте без раздела.` : undefined,
      () => removeSection(section.id)
    );
  };

  const renderSection = (section: Section) => {
    const sectionTasks = active.filter((t) => t.sectionId === section.id);
    return (
      <View key={section.id} style={styles.sectionGroup}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.sectionActions}>
            <Pressable
              onPress={() => openTask({ defaults: { projectId: project.id, sectionId: section.id } })}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Добавить задачу в раздел ${section.title}`}
            >
              <Icon name="add" size={22} color={COLORS.muted} />
            </Pressable>
            <Pressable
              onPress={() => setDialog({ kind: 'sectionMenu', section })}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Действия с разделом ${section.title}`}
            >
              <Icon name="more" size={20} color={COLORS.muted} />
            </Pressable>
          </View>
        </View>
        <IntentionBlock
          compact
          value={section.intention}
          placeholder="Намерение раздела — зачем он? (необязательно)"
          onSave={(text) => addOrUpdateSection({ id: section.id, intention: text })}
        />
        {sectionTasks.length === 0 ? <Text style={styles.hint}>Пусто.</Text> : sectionTasks.map((t) => <TaskCard key={t.id} task={t} />)}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: parent ? parent.title : 'Проект',
          headerRight: () => (
            <View style={styles.headerActions}>
              <Pressable
                onPress={() => addOrUpdateProject({ id: project.id, favorite: !project.favorite })}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={project.favorite ? 'Убрать из избранного' : 'В избранное'}
              >
                <Icon name="star" filled={project.favorite} size={22} color={project.favorite ? COLORS.warning : COLORS.muted} />
              </Pressable>
              <Pressable
                onPress={() => setDialog({ kind: 'settings' })}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Настройки проекта"
              >
                <Icon name="options" size={22} color={COLORS.muted} />
              </Pressable>
            </View>
          ),
        }}
      />
      <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 96 }}>
        <Pressable onPress={() => setDialog({ kind: 'rename' })} accessibilityRole="button" accessibilityHint="Переименовать">
          <Text style={styles.title}>{project.title}</Text>
        </Pressable>
        {sphere || intentionTag ? (
          <Text style={styles.meta}>{[sphere?.title, intentionTag?.title].filter(Boolean).join(' · ')}</Text>
        ) : null}

        <Text style={styles.blockLabel}>Намерение</Text>
        <IntentionBlock
          value={project.intention}
          placeholder="Зачем этот проект? Ради чего он делается?"
          onSave={(text) => addOrUpdateProject({ id: project.id, intention: text })}
        />

        {subprojects.length > 0 || depth < MAX_PROJECT_DEPTH - 1 ? (
          <>
            <View style={styles.actionHeader}>
              <Text style={styles.blockLabel}>Подпроекты</Text>
              {depth < MAX_PROJECT_DEPTH - 1 ? (
                <Pressable onPress={() => setDialog({ kind: 'newSubproject' })} hitSlop={8} accessibilityRole="button">
                  <Text style={styles.addLink}>+ Подпроект</Text>
                </Pressable>
              ) : null}
            </View>
            {subprojects.map((p) => (
              <Pressable key={p.id} style={styles.subRow} onPress={() => router.push(`/project/${p.id}`)} accessibilityRole="button">
                <Icon name="folder" size={18} color={COLORS.muted} />
                <Text style={styles.subTitle}>{p.title}</Text>
                <Text style={styles.subCount}>{tasks.filter((t) => t.projectId === p.id && t.status === 'active').length}</Text>
              </Pressable>
            ))}
          </>
        ) : null}

        <View style={styles.actionHeader}>
          <Text style={styles.blockLabel}>Действие</Text>
          <Pressable onPress={() => openTask({ defaults: { projectId: project.id } })} hitSlop={8} accessibilityRole="button">
            <Text style={styles.addLink}>+ Задача</Text>
          </Pressable>
        </View>

        {active.filter((t) => !t.sectionId).map((t) => (
          <TaskCard key={t.id} task={t} />
        ))}
        {active.length === 0 && projectSections.length === 0 ? <Text style={styles.hint}>В проекте пока нет задач.</Text> : null}

        {projectSections.map(renderSection)}

        <Pressable style={styles.addSectionButton} onPress={() => setDialog({ kind: 'newSection' })} accessibilityRole="button">
          <Text style={styles.addLink}>+ Раздел</Text>
        </Pressable>

        {done.length > 0 ? (
          <>
            <Pressable onPress={() => setShowDone((v) => !v)} style={styles.doneToggle} accessibilityRole="button">
              <Text style={styles.doneToggleText}>
                {showDone ? 'Скрыть выполненные' : `Показать выполненные (${done.length})`}
              </Text>
            </Pressable>
            {showDone ? done.map((t) => <TaskCard key={t.id} task={t} />) : null}
          </>
        ) : null}

        <Text style={styles.blockLabel}>Упование</Text>
        <View style={[styles.block, styles.upovanieBlock]}>
          <Text style={styles.blockPlaceholder}>
            Здесь появятся рекомендации ИИ по религиозной стороне проекта — дуа, дополнительный намаз, азкары. Пока заглушка.
          </Text>
        </View>
      </ScrollView>

      <Fab accessibilityLabel="Новая задача в проекте" onPress={() => openTask({ defaults: { projectId: project.id } })} />

      {dialog?.kind === 'rename' ? (
        <NameSheet
          title="Название проекта"
          placeholder="Название"
          initial={project.title}
          onClose={() => setDialog(null)}
          onSave={async (title) => {
            await addOrUpdateProject({ id: project.id, title });
            setDialog(null);
          }}
        />
      ) : null}
      {dialog?.kind === 'newSection' ? (
        <NameSheet
          title="Новый раздел"
          placeholder="Название раздела"
          onClose={() => setDialog(null)}
          onSave={async (title) => {
            await addOrUpdateSection({ projectId: project.id, title });
            setDialog(null);
          }}
        />
      ) : null}
      {dialog?.kind === 'renameSection' ? (
        <NameSheet
          title="Название раздела"
          placeholder="Название"
          initial={dialog.section.title}
          onClose={() => setDialog(null)}
          onSave={async (title) => {
            await addOrUpdateSection({ id: dialog.section.id, title });
            setDialog(null);
          }}
        />
      ) : null}
      {dialog?.kind === 'newSubproject' ? (
        <NewProjectSheet
          projects={projects}
          defaultParentId={project.id}
          onClose={() => setDialog(null)}
          onCreate={async (title, parentProjectId) => {
            const p = await addOrUpdateProject({ title, parentProjectId });
            setDialog(null);
            router.push(`/project/${p.id}`);
          }}
        />
      ) : null}
      {dialog?.kind === 'sectionMenu' ? (
        <Sheet visible onClose={() => setDialog(null)} title={dialog.section.title}>
          <MenuItem icon="edit" label="Переименовать" onPress={() => setDialog({ kind: 'renameSection', section: dialog.section })} />
          <MenuItem
            icon="trash"
            label="Удалить раздел"
            danger
            onPress={() => {
              const s = dialog.section;
              setDialog(null);
              onDeleteSection(s);
            }}
          />
        </Sheet>
      ) : null}
      {dialog?.kind === 'settings' ? (
        <ProjectSettingsSheet
          projectId={project.id}
          onClose={() => setDialog(null)}
          onArchive={async () => {
            await addOrUpdateProject({ id: project.id, archived: true, favorite: false });
            setDialog(null);
            router.back();
          }}
          onDelete={() => {
            setDialog(null);
            onDelete();
          }}
        />
      ) : null}
    </View>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable style={styles.menuItem} onPress={onPress} accessibilityRole="button">
      <Icon name={icon} size={20} color={danger ? COLORS.danger : COLORS.text} />
      <Text style={[styles.menuText, danger && { color: COLORS.danger }]}>{label}</Text>
    </Pressable>
  );
}

/** Папка (с учётом лимита глубины), сфера, тег намерения, архив и удаление. */
function ProjectSettingsSheet({
  projectId,
  onClose,
  onArchive,
  onDelete,
}: {
  projectId: string;
  onClose: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const { projects, addOrUpdateProject } = useAppData();
  const project = projects.find((p) => p.id === projectId)!;
  const blocked = descendantIds(projectId, projects);
  const height = subtreeHeight(projectId, projects);
  // Новый родитель: не сам проект и не его потомок, и чтобы всё поддерево влезло в лимит глубины.
  const parents = projects
    .filter((p) => !p.archived && !blocked.has(p.id) && projectDepth(p, projects) + 1 + height <= MAX_PROJECT_DEPTH)
    .map((p) => ({ p, path: projectPath(p, projects) }))
    .sort((a, b) => a.path.localeCompare(b.path, 'ru'));

  return (
    <Sheet visible onClose={onClose} title="Настройки проекта">
      <FieldLabel>Папка</FieldLabel>
      <ChipsRow>
        <Chip
          label="Верхний уровень"
          active={!project.parentProjectId}
          onPress={() => addOrUpdateProject({ id: projectId, parentProjectId: undefined })}
        />
        {parents.map(({ p, path }) => (
          <Chip
            key={p.id}
            label={path}
            active={project.parentProjectId === p.id}
            onPress={() => addOrUpdateProject({ id: projectId, parentProjectId: p.id })}
          />
        ))}
      </ChipsRow>

      <FieldLabel>Сфера жизни</FieldLabel>
      <SpherePicker value={project.sphere} onChange={(v) => addOrUpdateProject({ id: projectId, sphere: v })} />

      <FieldLabel>Тег намерения</FieldLabel>
      <IntentionTagPicker value={project.intentionTag} onChange={(v) => addOrUpdateProject({ id: projectId, intentionTag: v })} />

      <View style={styles.settingsActions}>
        <Button title="В архив" kind="secondary" onPress={onArchive} />
        <Button title="Удалить" kind="danger" onPress={onDelete} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  screen: { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  headerActions: { flexDirection: 'row', gap: 18, paddingHorizontal: 12 },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.text },
  meta: { fontSize: 13, color: COLORS.muted, marginTop: 2 },
  blockLabel: { fontSize: 13, fontWeight: '500', color: COLORS.tertiary, marginBottom: 6, marginTop: 16 },
  block: { backgroundColor: COLORS.card, borderRadius: 8, padding: 12, marginBottom: 8 },
  blockPlaceholder: { fontSize: 13, color: COLORS.muted, fontStyle: 'italic' },
  upovanieBlock: { backgroundColor: COLORS.aiBackground },
  actionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addLink: { color: COLORS.primary, fontSize: 14, fontWeight: '500', marginTop: 10 },
  hint: { color: COLORS.muted, fontSize: 13, paddingVertical: 8 },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.card,
    borderRadius: 8,
    paddingVertical: 11,
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  subTitle: { flex: 1, fontSize: 15, color: COLORS.text },
  subCount: { fontSize: 13, color: COLORS.muted },
  sectionGroup: { marginTop: 16 },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.separator,
    paddingBottom: 4,
    marginBottom: 4,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, flex: 1 },
  sectionActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  addSectionButton: { paddingVertical: 8 },
  doneToggle: { paddingVertical: 10 },
  doneToggleText: { fontSize: 13, color: COLORS.muted },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  menuText: { fontSize: 16, color: COLORS.text },
  settingsActions: { flexDirection: 'row', gap: 8, marginTop: 24 },
});
