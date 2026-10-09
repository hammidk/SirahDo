// «Проекты» (docs/spec/overview.md): поиск сверху; Входящие, Дневник, История; блок
// «Фильтры и теги» (отдельный экран, только в расширенном режиме); Избранное
// (проекты, теги); дерево проектов-папок (до 3 уровней). Строки — на одной сетке.

import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '../themed';
import { router } from 'expo-router';
import { Icon } from '../Icon';

import { useAdvancedMode, useAppData } from '../../lib/AppDataContext';
import { buildProjectTree, flattenTree, projectPath } from '../../lib/projects';
import type { Project, Tag, Task } from '../../lib/types';
import { Fab } from '../Fab';
import { useTaskSheet } from '../TaskSheet';
import { TaskCard } from '../TaskCard';
import { NavGroup, NavRow, NavSeparator } from '../NavList';
import { COLORS } from '../ui';
import { NewProjectSheet } from '../ProjectSheets';

const SEARCH_TASK_LIMIT = 50;
const normalize = (s: string) => s.toLowerCase().replace(/ё/g, 'е');

export function ProjectsPage() {
  const { projects, tasks, tags, addOrUpdateProject } = useAppData();
  const { openTask } = useTaskSheet();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [query, setQuery] = useState('');
  const advanced = useAdvancedMode();

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
  const favTags = tags.filter((t) => t.favorite);
  const archivedCount = projects.filter((p) => p.archived).length;

  // Поиск по активным задачам (название, описание), проектам и тегам; без учёта регистра и «ё».
  const q = normalize(query.trim());
  const found = useMemo(() => {
    if (!q) return null;
    return {
      projects: projects.filter((p) => !p.archived && normalize(p.title).includes(q)),
      tags: tags.filter((t) => normalize(t.name).includes(q.replace(/^#/, ''))),
      tasks: activeTasks
        .filter((t) => normalize(t.title).includes(q) || (t.description ? normalize(t.description).includes(q) : false))
        .slice(0, SEARCH_TASK_LIMIT),
    };
  }, [q, projects, tags, activeTasks]);

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <View style={styles.container}>
      <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 96 }} keyboardShouldPersistTaps="handled">
        <View style={styles.search}>
          <Icon name="search" size={17} color={COLORS.tertiary} />
          <TextInput
            plain
            style={styles.searchInput}
            placeholder="Поиск задач, проектов, тегов"
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            autoCorrect={false}
            accessibilityLabel="Поиск"
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Очистить поиск">
              <Icon name="close-circle" size={17} color={COLORS.tertiary} />
            </Pressable>
          ) : null}
        </View>

        {found ? (
          <SearchResults
            found={found}
            projectsAll={projects}
            countByProject={countByProject}
            countByTag={countByTag}
          />
        ) : (
          <>
            <NavGroup>
              <NavRow icon="inbox" title="Входящие" right={String(inboxCount)} onPress={() => router.push('/inbox')} />
              <NavSeparator />
              <NavRow icon="diary" title="Дневник" onPress={() => router.push('/diary')} />
              <NavSeparator />
              <NavRow icon="history" title="История" onPress={() => router.push('/history')} />
            </NavGroup>

            {advanced ? (
              <NavGroup>
                <NavRow icon="filter" title="Фильтры и теги" onPress={() => router.push('/filters-tags')} />
              </NavGroup>
            ) : null}

            {favProjects.length + favTags.length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>Избранное</Text>
                <NavGroup>
                  {favProjects.map((p, i) => (
                    <View key={p.id}>
                      {i > 0 ? <NavSeparator /> : null}
                      <NavRow
                        icon="folder"
                        title={projectPath(p, projects)}
                        right={String(countByProject.get(p.id) ?? '')}
                        onPress={() => router.push(`/project/${p.id}`)}
                      />
                    </View>
                  ))}
                  {favTags.map((t, i) => (
                    <View key={t.id}>
                      {i > 0 || favProjects.length > 0 ? <NavSeparator /> : null}
                      <NavRow
                        icon="tag"
                        iconColor={t.color ?? COLORS.ai}
                        title={`#${t.name}`}
                        right={String(countByTag.get(t.id) ?? '')}
                        onPress={() => router.push(`/tag/${t.id}`)}
                      />
                    </View>
                  ))}
                </NavGroup>
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
              <NavGroup>
                {rows.map((node, i) => (
                  <View key={node.project.id}>
                    {i > 0 ? <NavSeparator /> : null}
                    {/* Строка папки выровнена по сетке «Избранного»; шеврон ветки — справа. */}
                    <NavRow
                      icon={node.children.length > 0 ? 'folder-open' : 'folder'}
                      title={node.project.title}
                      right={String(countByProject.get(node.project.id) ?? '')}
                      indent={node.depth}
                      onPress={() => router.push(`/project/${node.project.id}`)}
                      trailing={
                        node.children.length > 0 ? (
                          <Pressable
                            onPress={() => toggle(node.project.id)}
                            hitSlop={10}
                            accessibilityRole="button"
                            accessibilityLabel={collapsed.has(node.project.id) ? 'Развернуть' : 'Свернуть'}
                          >
                            <Icon name={collapsed.has(node.project.id) ? 'chevron-forward' : 'chevron-down'} size={16} color={COLORS.muted} />
                          </Pressable>
                        ) : undefined
                      }
                    />
                  </View>
                ))}
              </NavGroup>
            )}
            {archivedCount > 0 ? (
              <Pressable onPress={() => router.push('/archive')} style={styles.archiveLink} accessibilityRole="button">
                <Text style={styles.linkText}>Архив проектов ({archivedCount})</Text>
              </Pressable>
            ) : null}
          </>
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
    </View>
  );
}

function SearchResults({
  found,
  projectsAll,
  countByProject,
  countByTag,
}: {
  found: { projects: Project[]; tags: Tag[]; tasks: Task[] };
  projectsAll: Project[];
  countByProject: Map<string, number>;
  countByTag: Map<string, number>;
}) {
  const nothing = found.projects.length + found.tags.length + found.tasks.length === 0;
  if (nothing) return <Text style={styles.hint}>Ничего не найдено.</Text>;
  return (
    <>
      {found.projects.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Проекты</Text>
          <NavGroup>
            {found.projects.map((p, i) => (
              <View key={p.id}>
                {i > 0 ? <NavSeparator /> : null}
                <NavRow
                  icon="folder"
                  title={projectPath(p, projectsAll)}
                  right={String(countByProject.get(p.id) ?? '')}
                  onPress={() => router.push(`/project/${p.id}`)}
                />
              </View>
            ))}
          </NavGroup>
        </>
      ) : null}
      {found.tags.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Теги</Text>
          <NavGroup>
            {found.tags.map((t, i) => (
              <View key={t.id}>
                {i > 0 ? <NavSeparator /> : null}
                <NavRow
                  icon="tag"
                  iconColor={t.color ?? COLORS.ai}
                  title={`#${t.name}`}
                  right={String(countByTag.get(t.id) ?? '')}
                  onPress={() => router.push(`/tag/${t.id}`)}
                />
              </View>
            ))}
          </NavGroup>
        </>
      ) : null}
      {found.tasks.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Задачи · {found.tasks.length}</Text>
          {found.tasks.map((t) => (
            <TaskCard key={t.id} task={t} showProject />
          ))}
        </>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  screen: { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.card,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 10, color: COLORS.text },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginTop: 12, marginBottom: 8 },
  hint: { fontSize: 13, color: COLORS.muted, marginBottom: 8 },
  archiveLink: { paddingVertical: 6 },
  linkText: { fontSize: 14, color: COLORS.primary },
});
