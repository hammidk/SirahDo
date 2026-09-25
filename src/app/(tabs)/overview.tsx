// «Обзор» (docs/spec/overview.md): Входящие, Дневник, История, Избранное (проекты, фильтры,
// теги), дерево проектов-папок (до 3 уровней), фильтры и теги.

import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../components/themed';
import { router } from 'expo-router';
import { Icon } from '../../components/Icon';
import type { IconName } from '../../components/Icon';

import { useAppData } from '../../lib/AppDataContext';
import { buildProjectTree, flattenTree, projectPath } from '../../lib/projects';
import { matchesCriteria } from '../../lib/filters';
import { Fab } from '../../components/Fab';
import { useTaskSheet } from '../../components/TaskSheet';
import { COLORS } from '../../components/ui';
import { NameSheet, NewProjectSheet } from '../../components/ProjectSheets';


function Row({
  icon,
  iconColor,
  title,
  right,
  onPress,
  indent = 0,
  leading,
}: {
  icon: IconName;
  iconColor?: string;
  title: string;
  right?: string;
  onPress: () => void;
  indent?: number;
  leading?: React.ReactNode;
}) {
  // Кнопка сворачивания (leading) — рядом со строкой, а не внутри неё: вложенные кнопки ломают доступность.
  return (
    <View style={[styles.rowOuter, { paddingLeft: 14 + indent * 18 }]}>
      {leading}
      <Pressable style={styles.row} onPress={onPress} accessibilityRole="button">
        <Icon name={icon} size={18} color={iconColor ?? COLORS.muted} />
        <Text style={styles.rowTitle} numberOfLines={1}>
          {title}
        </Text>
        {right ? <Text style={styles.rowCount}>{right}</Text> : null}
      </Pressable>
    </View>
  );
}

function Group({ children }: { children: React.ReactNode }) {
  return <View style={styles.group}>{children}</View>;
}

function Separator() {
  return <View style={styles.separator} />;
}

export default function OverviewScreen() {
  const { projects, tasks, tags, filters, addOrUpdateProject, addOrUpdateTag } = useAppData();
  const { openTask } = useTaskSheet();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [newTagOpen, setNewTagOpen] = useState(false);

  const activeTasks = useMemo(() => tasks.filter((t) => t.status === 'active'), [tasks]);
  const inboxCount = activeTasks.filter((t) => !t.projectId).length;
  const countByProject = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of activeTasks) if (t.projectId) m.set(t.projectId, (m.get(t.projectId) ?? 0) + 1);
    return m;
  }, [activeTasks]);
  const countByTag = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of activeTasks) for (const id of t.tagIds) m.set(id, (m.get(id) ?? 0) + 1);
    return m;
  }, [activeTasks]);

  const tree = useMemo(() => buildProjectTree(projects), [projects]);
  const rows = flattenTree(tree, collapsed);
  const favProjects = projects.filter((p) => p.favorite && !p.archived);
  const favFilters = filters.filter((f) => f.favorite);
  const favTags = tags.filter((t) => t.favorite);
  const hasFavorites = favProjects.length + favFilters.length + favTags.length > 0;
  const sortedFilters = [...filters].sort((a, b) => a.order - b.order);
  const sortedTags = [...tags].sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  const archivedCount = projects.filter((p) => p.archived).length;

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const filterCount = (id: string) => {
    const f = filters.find((x) => x.id === id);
    return f ? activeTasks.filter((t) => matchesCriteria(t, f.criteria)).length : 0;
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 96 }} keyboardShouldPersistTaps="handled">
        <Group>
          <Row icon="inbox" title="Входящие" right={String(inboxCount)} onPress={() => router.push('/inbox')} />
          <Separator />
          <Row icon="diary" title="Дневник" onPress={() => router.push('/diary')} />
          <Separator />
          <Row icon="history" title="История" onPress={() => router.push('/history')} />
        </Group>

        {hasFavorites ? (
          <>
            <Text style={styles.sectionTitle}>Избранное</Text>
            <Group>
              {favProjects.map((p, i) => (
                <View key={p.id}>
                  {i > 0 ? <Separator /> : null}
                  <Row
                    icon="folder"
                   
                    title={projectPath(p, projects)}
                    right={String(countByProject.get(p.id) ?? '')}
                    onPress={() => router.push(`/project/${p.id}`)}
                  />
                </View>
              ))}
              {favFilters.map((f, i) => (
                <View key={f.id}>
                  {i > 0 || favProjects.length > 0 ? <Separator /> : null}
                  <Row icon="filter" title={f.name} right={String(filterCount(f.id))} onPress={() => router.push(`/filter/${f.id}`)} />
                </View>
              ))}
              {favTags.map((t, i) => (
                <View key={t.id}>
                  {i > 0 || favProjects.length + favFilters.length > 0 ? <Separator /> : null}
                  <Row icon="tag" iconColor={t.color ?? COLORS.primary} title={`#${t.name}`} right={String(countByTag.get(t.id) ?? '')} onPress={() => router.push(`/tag/${t.id}`)} />
                </View>
              ))}
            </Group>
          </>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Проекты</Text>
          <Pressable onPress={() => setNewProjectOpen(true)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Новый проект">
            <Icon name="add" size={24} color={COLORS.muted} />
          </Pressable>
        </View>
        {rows.length === 0 ? (
          <Text style={styles.hint}>Проектов пока нет. Проект — это папка задач со своим намерением.</Text>
        ) : (
          <Group>
            {rows.map((node, i) => (
              <View key={node.project.id}>
                {i > 0 ? <Separator /> : null}
                <Row
                  icon={node.children.length > 0 ? 'folder-open' : 'folder'}
                 
                  title={node.project.title}
                  right={String(countByProject.get(node.project.id) ?? '')}
                  indent={node.depth}
                  onPress={() => router.push(`/project/${node.project.id}`)}
                  leading={
                    node.children.length > 0 ? (
                      <Pressable
                        onPress={() => toggle(node.project.id)}
                        hitSlop={10}
                        accessibilityRole="button"
                        accessibilityLabel={collapsed.has(node.project.id) ? 'Развернуть' : 'Свернуть'}
                      >
                        <Icon
                          name={collapsed.has(node.project.id) ? 'chevron-forward' : 'chevron-down'}
                          size={16}
                          color={COLORS.muted}
                        />
                      </Pressable>
                    ) : (
                      <View style={{ width: 16 }} />
                    )
                  }
                />
              </View>
            ))}
          </Group>
        )}
        {archivedCount > 0 ? (
          <Pressable onPress={() => router.push('/archive')} style={styles.archiveLink} accessibilityRole="button">
            <Text style={styles.linkText}>Архив проектов ({archivedCount})</Text>
          </Pressable>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Фильтры</Text>
          <Pressable onPress={() => router.push('/filter/new')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Новый фильтр">
            <Icon name="add" size={24} color={COLORS.muted} />
          </Pressable>
        </View>
        {sortedFilters.length === 0 ? (
          <Text style={styles.hint}>Например: «Ибада на этой неделе» или «П1 по Ризку».</Text>
        ) : (
          <Group>
            {sortedFilters.map((f, i) => (
              <View key={f.id}>
                {i > 0 ? <Separator /> : null}
                <Row icon="filter" title={f.name} right={String(filterCount(f.id))} onPress={() => router.push(`/filter/${f.id}`)} />
              </View>
            ))}
          </Group>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Теги</Text>
          <Pressable onPress={() => setNewTagOpen(true)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Новый тег">
            <Icon name="add" size={24} color={COLORS.muted} />
          </Pressable>
        </View>
        {sortedTags.length === 0 ? (
          <Text style={styles.hint}>Теги добавляются в карточке задачи или здесь.</Text>
        ) : (
          <Group>
            {sortedTags.map((t, i) => (
              <View key={t.id}>
                {i > 0 ? <Separator /> : null}
                <Row icon="tag" iconColor={t.color ?? COLORS.primary} title={`#${t.name}`} right={String(countByTag.get(t.id) ?? '')} onPress={() => router.push(`/tag/${t.id}`)} />
              </View>
            ))}
          </Group>
        )}
      </ScrollView>

      <Fab accessibilityLabel="Новая задача во Входящие" onPress={() => openTask()} />

      {newProjectOpen ? (
        <NewProjectSheet
          projects={projects}
          onClose={() => setNewProjectOpen(false)}
          onCreate={async (title, parentProjectId) => {
            const p = await addOrUpdateProject({ title, parentProjectId });
            setNewProjectOpen(false);
            router.push(`/project/${p.id}`);
          }}
        />
      ) : null}
      {newTagOpen ? (
        <NameSheet
          title="Новый тег"
          placeholder="Например: работа"
          onClose={() => setNewTagOpen(false)}
          onSave={async (name) => {
            await addOrUpdateTag({ name: name.replace(/^#/, '') });
            setNewTagOpen(false);
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  screen: { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  group: { backgroundColor: COLORS.card, borderRadius: 8, overflow: 'hidden', marginBottom: 8 },
  rowOuter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  row: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingRight: 14 },
  rowTitle: { flex: 1, fontSize: 15, color: COLORS.text },
  rowCount: { fontSize: 14, color: COLORS.muted },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.separator, marginLeft: 44 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginTop: 12, marginBottom: 8 },
  hint: { fontSize: 13, color: COLORS.muted, marginBottom: 8 },
  archiveLink: { paddingVertical: 6 },
  linkText: { fontSize: 14, color: COLORS.primary },
});
