// Дерево проектов-папок (ТЗ §5.1). В модели вложенность не ограничена,
// в интерфейсе — до MAX_PROJECT_DEPTH уровней.

import type { Project } from './types';

export const MAX_PROJECT_DEPTH = 3;

export interface ProjectNode {
  project: Project;
  depth: number; // 0 — верхний уровень
  children: ProjectNode[];
}

const byOrder = (a: Project, b: Project) => a.order - b.order || a.title.localeCompare(b.title, 'ru');

/** Дерево активных (не архивных) проектов. Проект с «потерянным» родителем — на верхнем уровне. */
export function buildProjectTree(projects: Project[], includeArchived = false): ProjectNode[] {
  const list = projects.filter((p) => includeArchived || !p.archived);
  const ids = new Set(list.map((p) => p.id));
  const build = (parentId: string | undefined, depth: number, seen: Set<string>): ProjectNode[] =>
    list
      .filter((p) => (parentId ? p.parentProjectId === parentId : !p.parentProjectId || !ids.has(p.parentProjectId)))
      .filter((p) => !seen.has(p.id))
      .sort(byOrder)
      .map((p) => {
        const nextSeen = new Set(seen).add(p.id); // защита от циклов в данных
        return { project: p, depth, children: build(p.id, depth + 1, nextSeen) };
      });
  return build(undefined, 0, new Set());
}

/** Дерево в плоский список с учётом свёрнутых узлов. */
export function flattenTree(nodes: ProjectNode[], collapsed: Set<string> = new Set()): ProjectNode[] {
  const out: ProjectNode[] = [];
  const walk = (list: ProjectNode[]) => {
    for (const n of list) {
      out.push(n);
      if (!collapsed.has(n.project.id)) walk(n.children);
    }
  };
  walk(nodes);
  return out;
}

/** Глубина проекта (0 — верхний уровень). */
export function projectDepth(project: Project, all: Project[]): number {
  let depth = 0;
  let parent = project.parentProjectId ? all.find((p) => p.id === project.parentProjectId) : undefined;
  while (parent && depth < 50) {
    depth++;
    parent = parent.parentProjectId ? all.find((p) => p.id === parent!.parentProjectId) : undefined;
  }
  return depth;
}

/** Проект и все его потомки. */
export function descendantIds(id: string, all: Project[]): Set<string> {
  const ids = new Set([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const p of all) {
      if (p.parentProjectId && ids.has(p.parentProjectId) && !ids.has(p.id)) {
        ids.add(p.id);
        grew = true;
      }
    }
  }
  return ids;
}

/** Высота поддерева: 1 — без детей. Нужна, чтобы при переносе не превысить лимит глубины. */
export function subtreeHeight(id: string, all: Project[]): number {
  const children = all.filter((p) => p.parentProjectId === id);
  return 1 + (children.length ? Math.max(...children.map((c) => subtreeHeight(c.id, all))) : 0);
}

/** «Родитель / Ребёнок» — путь для выбора проекта. */
export function projectPath(project: Project, all: Project[]): string {
  const parts = [project.title];
  let parent = project.parentProjectId ? all.find((p) => p.id === project.parentProjectId) : undefined;
  let guard = 0;
  while (parent && guard++ < 10) {
    parts.unshift(parent.title);
    parent = parent.parentProjectId ? all.find((p) => p.id === parent!.parentProjectId) : undefined;
  }
  return parts.join(' / ');
}
