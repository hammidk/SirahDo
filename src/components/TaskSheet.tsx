// Компактный вид задачи (docs/spec/tasks.md) и обратная связь после выполнения.
//
// - Быстрый лист: название, короткое описание, срок, напоминания, приоритет,
//   теги, проект (меняется прямо здесь), сфера; «⤢» открывает полную карточку.
// - Плашка «Выполнено · Итог · Отменить» после отметки задачи.
// - Лист «Итог»: короткий анализ результата + время начала и окончания
//   (Product Book: «после завершения задачи пользователь может коротко
//   проанализировать результат» — всегда по желанию, без принуждения).
//
// Один провайдер на всё приложение: экраны вызывают useTaskSheet().

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { Switch, Text, TextInput } from './themed';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from './Icon';
import type { IconName } from './Icon';
import dayjs from 'dayjs';

import type { CompletionResult, CompleteTaskExtra } from '../lib/AppDataContext';
import { useAppData } from '../lib/AppDataContext';
import type { NamazWindowName, Priority, Reminder, SphereId, Task, TaskDue } from '../lib/types';
import { DEFAULT_PRIORITY, NAMAZ_WINDOW_TITLES, PRIORITIES, SPHERES } from '../lib/types';
import { formatDue, isOverdue } from '../lib/dates';
import { DueSheet } from './DueField';
import { RemindersField } from './RemindersField';
import { TagsField } from './TagsField';
import { PriorityPicker, SpherePicker } from './pickers';
import { TimeField } from './TimeField';
import { Button, COLORS, Chip, ChipsRow, Sheet } from './ui';

/** Поля, которые можно заполнить в компактном виде и передать в полную карточку. */
export interface TaskDraft {
  title: string;
  description?: string;
  due?: TaskDue;
  reminders: Reminder[];
  priority: Priority;
  tagIds: string[];
  projectId?: string;
  sectionId?: string;
  sphere?: SphereId;
  namazWindow?: NamazWindowName;
}

export interface OpenTaskOptions {
  taskId?: string; // нет — новая задача
  defaults?: Partial<TaskDraft>;
}

interface TaskSheetContextValue {
  openTask: (options?: OpenTaskOptions) => void;
  /** Выполнить задачу и показать плашку «Итог / Отменить». */
  completeWithFeedback: (taskId: string, extra?: CompleteTaskExtra) => Promise<void>;
}

const TaskSheetContext = createContext<TaskSheetContextValue | null>(null);

export function useTaskSheet(): TaskSheetContextValue {
  const ctx = useContext(TaskSheetContext);
  if (!ctx) throw new Error('useTaskSheet must be used within TaskSheetProvider');
  return ctx;
}

const emptyDraft = (defaults?: Partial<TaskDraft>): TaskDraft => ({
  title: '',
  reminders: [],
  priority: DEFAULT_PRIORITY,
  tagIds: [],
  ...defaults,
});

const draftFromTask = (t: Task): TaskDraft => ({
  title: t.title,
  description: t.description,
  due: t.due,
  reminders: t.reminders,
  priority: t.priority,
  tagIds: t.tagIds,
  projectId: t.projectId,
  sectionId: t.sectionId,
  sphere: t.sphere,
  namazWindow: t.namazWindow,
});

export function TaskSheetProvider({ children }: { children: ReactNode }) {
  const { tasks, completeTask, undoCompleteTask } = useAppData();

  // ---------- Быстрый лист ----------
  const [quick, setQuick] = useState<{ taskId?: string; draft: TaskDraft; key: number } | null>(null);
  const openTask = useCallback(
    (options?: OpenTaskOptions) => {
      const existing = options?.taskId ? tasks.find((t) => t.id === options.taskId) : undefined;
      setQuick({
        taskId: existing?.id,
        draft: existing ? draftFromTask(existing) : emptyDraft(options?.defaults),
        key: Date.now(),
      });
    },
    [tasks]
  );

  // ---------- Плашка и «Итог» ----------
  const [snack, setSnack] = useState<{ result: CompletionResult; key: number } | null>(null);
  const [outcomeFor, setOutcomeFor] = useState<Task | null>(null);

  const completeWithFeedback = useCallback(
    async (taskId: string, extra?: CompleteTaskExtra) => {
      const result = await completeTask(taskId, extra);
      if (result) setSnack({ result, key: Date.now() });
    },
    [completeTask]
  );

  // Стабильная ссылка: иначе таймер плашки перезапускался бы при каждом обновлении данных.
  const dismissSnack = useCallback(() => setSnack(null), []);

  const value = useMemo(() => ({ openTask, completeWithFeedback }), [openTask, completeWithFeedback]);

  return (
    <TaskSheetContext.Provider value={value}>
      <View style={{ flex: 1 }}>
        {children}
        {snack ? (
          <Snackbar
            key={snack.key}
            text={snack.result.nextTaskId ? 'Выполнено · следующий повтор создан' : 'Задача выполнена'}
            onDismiss={dismissSnack}
            actions={[
              {
                label: 'Итог',
                onPress: () => {
                  const done = tasks.find((t) => t.id === snack.result.previous.id);
                  setOutcomeFor(done ?? snack.result.previous);
                  setSnack(null);
                },
              },
              {
                label: 'Отменить',
                onPress: () => {
                  undoCompleteTask(snack.result);
                  setSnack(null);
                },
              },
            ]}
          />
        ) : null}
      </View>
      {quick ? <QuickTaskSheet key={quick.key} taskId={quick.taskId} initial={quick.draft} onClose={() => setQuick(null)} /> : null}
      {outcomeFor ? <OutcomeSheet key={outcomeFor.id} task={outcomeFor} onClose={() => setOutcomeFor(null)} /> : null}
    </TaskSheetContext.Provider>
  );
}

// ---------- Компактный вид задачи ----------

type Panel = 'reminders' | 'priority' | 'tags' | 'project' | 'sphere' | null;

function QuickTaskSheet({ taskId, initial, onClose }: { taskId?: string; initial: TaskDraft; onClose: () => void }) {
  const { projects, sections, tags, addOrUpdateTask } = useAppData();
  const [draft, setDraft] = useState<TaskDraft>(initial);
  const [panel, setPanel] = useState<Panel>(null);
  const [dueOpen, setDueOpen] = useState(false);
  const [visible, setVisible] = useState(true);
  const isNew = !taskId;

  const set = <K extends keyof TaskDraft>(key: K, value: TaskDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const togglePanel = (p: Exclude<Panel, null>) => setPanel((cur) => (cur === p ? null : p));

  const close = () => {
    setVisible(false);
    onClose();
  };

  const save = async (): Promise<Task | undefined> => {
    const title = draft.title.trim();
    if (!title) return undefined;
    return addOrUpdateTask({
      ...draft,
      id: taskId,
      title,
      description: draft.description?.trim() || undefined,
      sectionId: draft.projectId ? draft.sectionId : undefined,
    });
  };

  const onSave = async () => {
    if (!draft.title.trim()) return;
    await save();
    close();
  };

  // «⤢» — полная карточка. Существующую задачу сперва сохраняем, новую передаём черновиком.
  const onExpand = async () => {
    if (taskId) {
      if (draft.title.trim()) await save();
      close();
      router.push(`/task/${taskId}`);
    } else {
      close();
      router.push({ pathname: '/task/new', params: { draft: JSON.stringify(draft) } });
    }
  };

  const project = projects.find((p) => p.id === draft.projectId);
  const section = sections.find((s) => s.id === draft.sectionId);
  const priority = PRIORITIES.find((p) => p.id === draft.priority) ?? PRIORITIES[3];
  const sphere = SPHERES.find((s) => s.id === draft.sphere);
  const tagNames = draft.tagIds.map((id) => tags.find((t) => t.id === id)?.name).filter(Boolean);
  const projectSections = sections.filter((s) => s.projectId === draft.projectId).sort((a, b) => a.order - b.order);

  return (
    <Sheet
      visible={visible}
      onClose={close}
      header={
        <View style={styles.quickHeader}>
          <Text style={styles.quickTitle}>{isNew ? 'Новая задача' : 'Задача'}</Text>
          <Pressable
            onPress={onExpand}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Открыть задачу полностью"
          >
            <Icon name="expand" size={22} color={COLORS.muted} />
          </Pressable>
        </View>
      }
      footer={
        <>
          <Button title="Отмена" kind="secondary" onPress={close} />
          <Button title={isNew ? 'Добавить' : 'Сохранить'} onPress={onSave} />
        </>
      }
    >
      <TextInput
        style={styles.titleInput}
        plain
        placeholder="Что нужно сделать?"
        value={draft.title}
        onChangeText={(t) => set('title', t)}
        autoFocus={isNew}
        multiline
        submitBehavior="blurAndSubmit"
        returnKeyType="done"
        onSubmitEditing={onSave}
        accessibilityLabel="Название задачи"
      />
      <TextInput
        style={styles.descriptionInput}
        plain
        placeholder="Описание"
        value={draft.description ?? ''}
        onChangeText={(t) => set('description', t)}
        multiline
        numberOfLines={3}
        accessibilityLabel="Описание"
      />

      <View style={styles.chips}>
        <QuickChip
          icon="calendar"
          label={draft.due ? formatDue(draft.due) : 'Срок'}
          active={!!draft.due}
          danger={!!draft.due && isOverdue(draft.due)}
          onPress={() => setDueOpen(true)}
        />
        <QuickChip
          icon="bell"
          label={draft.reminders.length > 0 ? `${draft.reminders.length}` : 'Напоминание'}
          active={draft.reminders.length > 0}
          selected={panel === 'reminders'}
          onPress={() => togglePanel('reminders')}
        />
        <QuickChip
          icon="flag"
          label={priority.title}
          active={draft.priority !== 4}
          color={draft.priority !== 4 ? priority.color : undefined}
          selected={panel === 'priority'}
          onPress={() => togglePanel('priority')}
        />
        <QuickChip
          icon="tag"
          label={tagNames.length > 0 ? tagNames.map((n) => `#${n}`).join(' ') : 'Теги'}
          active={tagNames.length > 0}
          selected={panel === 'tags'}
          onPress={() => togglePanel('tags')}
        />
        <QuickChip
          icon={project ? 'folder' : 'inbox'}
          label={project ? `${project.title}${section ? ` / ${section.title}` : ''}` : 'Входящие'}
          active={!!project}
          selected={panel === 'project'}
          onPress={() => togglePanel('project')}
        />
        <QuickChip
          icon="circle"
          label={sphere ? sphere.title : 'Сфера'}
          active={!!sphere}
          selected={panel === 'sphere'}
          onPress={() => togglePanel('sphere')}
        />
        {draft.namazWindow ? (
          // Окно намаза задаётся «+» у секции окна; здесь его можно только снять (полный выбор — в «⤢»).
          <QuickChip
            icon="close-circle"
            label={NAMAZ_WINDOW_TITLES[draft.namazWindow]}
            active
            color={COLORS.warning}
            onPress={() => set('namazWindow', undefined)}
          />
        ) : null}
      </View>

      {panel === 'reminders' ? (
        <View style={styles.panel}>
          <RemindersField value={draft.reminders} onChange={(r) => set('reminders', r)} hasAnchor={!!draft.due} />
        </View>
      ) : null}
      {panel === 'priority' ? (
        <View style={styles.panel}>
          <PriorityPicker
            value={draft.priority}
            onChange={(p) => {
              set('priority', p);
              setPanel(null);
            }}
          />
        </View>
      ) : null}
      {panel === 'tags' ? (
        <View style={styles.panel}>
          <TagsField value={draft.tagIds} onChange={(ids) => set('tagIds', ids)} />
        </View>
      ) : null}
      {panel === 'project' ? (
        <View style={styles.panel}>
          <ChipsRow>
            <Chip
              label="Входящие"
              active={!draft.projectId}
              onPress={() => setDraft((d) => ({ ...d, projectId: undefined, sectionId: undefined }))}
            />
            {projects
              .filter((p) => !p.archived)
              .map((p) => (
                <Chip
                  key={p.id}
                  label={p.title}
                  active={draft.projectId === p.id}
                  onPress={() => setDraft((d) => ({ ...d, projectId: p.id, sectionId: undefined }))}
                />
              ))}
          </ChipsRow>
          {draft.projectId && projectSections.length > 0 ? (
            <View style={{ marginTop: 10 }}>
              <ChipsRow>
                <Chip label="Без раздела" active={!draft.sectionId} onPress={() => set('sectionId', undefined)} />
                {projectSections.map((s) => (
                  <Chip key={s.id} label={s.title} active={draft.sectionId === s.id} onPress={() => set('sectionId', s.id)} />
                ))}
              </ChipsRow>
            </View>
          ) : null}
        </View>
      ) : null}
      {panel === 'sphere' ? (
        <View style={styles.panel}>
          <SpherePicker
            value={draft.sphere}
            onChange={(v) => {
              set('sphere', v);
              setPanel(null);
            }}
          />
        </View>
      ) : null}

      <DueSheet visible={dueOpen} onClose={() => setDueOpen(false)} value={draft.due} onChange={(d) => set('due', d)} />
    </Sheet>
  );
}

function QuickChip({
  icon,
  label,
  active,
  selected,
  danger,
  color,
  onPress,
}: {
  icon: IconName;
  label: string;
  active?: boolean;
  selected?: boolean;
  danger?: boolean;
  color?: string;
  onPress: () => void;
}) {
  const tint = danger ? COLORS.danger : (color ?? (active ? COLORS.primary : COLORS.muted));
  return (
    <Pressable
      style={[styles.quickChip, selected && styles.quickChipSelected]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ expanded: selected }}
    >
      <Icon name={icon} size={15} color={tint} />
      <Text style={[styles.quickChipText, { color: active || danger ? tint : COLORS.muted }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

// ---------- «Итог» после выполнения ----------

function OutcomeSheet({ task, onClose }: { task: Task; onClose: () => void }) {
  const { addOrUpdateTask } = useAppData();
  const [visible, setVisible] = useState(true);
  const [comment, setComment] = useState(task.comment ?? '');
  const ended = task.endedAt ? dayjs(task.endedAt) : dayjs();
  const [withStart, setWithStart] = useState(!!task.startedAt);
  const [startTime, setStartTime] = useState(
    task.startedAt ? dayjs(task.startedAt).format('HH:mm') : ended.subtract(task.durationMinutes ?? 30, 'minute').format('HH:mm')
  );
  const [endTime, setEndTime] = useState(ended.format('HH:mm'));

  const close = () => {
    setVisible(false);
    onClose();
  };

  const onSave = async () => {
    const [eh, em] = endTime.split(':').map(Number);
    const endedAt = ended.hour(eh).minute(em).second(0).millisecond(0);
    let startedAt: string | undefined;
    if (withStart) {
      const [sh, sm] = startTime.split(':').map(Number);
      let start = ended.hour(sh).minute(sm).second(0).millisecond(0);
      // Начало позже конца — значит, начали накануне.
      if (start.isAfter(endedAt)) start = start.subtract(1, 'day');
      startedAt = start.toISOString();
    }
    await addOrUpdateTask({
      id: task.id,
      comment: comment.trim() || undefined,
      endedAt: endedAt.toISOString(),
      startedAt,
    });
    close();
  };

  return (
    <Sheet
      visible={visible}
      onClose={close}
      title="Итог"
      footer={
        <>
          <Button title="Пропустить" kind="secondary" onPress={close} />
          <Button title="Сохранить" onPress={onSave} />
        </>
      }
    >
      <Text style={styles.outcomeTask} numberOfLines={2}>
        ✓ {task.title}
      </Text>
      {task.expectedResult ? <Text style={styles.outcomeHint}>Ожидали: {task.expectedResult}</Text> : null}
      <TextInput
        style={styles.outcomeInput}
        placeholder="Как прошло? Что получилось, что нет?"
        value={comment}
        onChangeText={setComment}
        multiline
        autoFocus
        accessibilityLabel="Короткий анализ результата"
      />
      <View style={styles.timeRow}>
        <Text style={styles.timeLabel}>Начал</Text>
        <Switch value={withStart} onValueChange={setWithStart} accessibilityLabel="Указать время начала" />
        <View style={{ flex: 1 }} />
        {withStart ? <TimeField value={startTime} onChange={setStartTime} /> : null}
      </View>
      <View style={styles.timeRow}>
        <Text style={styles.timeLabel}>Закончил</Text>
        <View style={{ flex: 1 }} />
        <TimeField value={endTime} onChange={setEndTime} />
      </View>
    </Sheet>
  );
}

// ---------- Плашка ----------

const SNACK_MS = 5000;

function Snackbar({
  text,
  actions,
  onDismiss,
}: {
  text: string;
  actions: { label: string; onPress: () => void }[];
  onDismiss: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [opacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    const id = setTimeout(onDismiss, SNACK_MS);
    return () => clearTimeout(id);
  }, [opacity, onDismiss]);

  return (
    <Animated.View
      style={[styles.snack, { bottom: insets.bottom + 64, opacity }]}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
    >
      <Text style={styles.snackText} numberOfLines={1}>
        {text}
      </Text>
      {actions.map((a) => (
        <Pressable key={a.label} onPress={a.onPress} hitSlop={8} accessibilityRole="button">
          <Text style={styles.snackAction}>{a.label}</Text>
        </Pressable>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  quickHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  quickTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  titleInput: { fontSize: 18, fontWeight: '600', color: COLORS.text, paddingVertical: 6 },
  descriptionInput: { fontSize: 14, color: COLORS.text, paddingVertical: 4, maxHeight: 90 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.separator,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    maxWidth: '100%',
  },
  quickChipSelected: { backgroundColor: COLORS.hover, borderColor: COLORS.muted },
  quickChipText: { fontSize: 13, flexShrink: 1 },
  panel: { marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.separator },

  outcomeTask: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  outcomeHint: { fontSize: 13, color: COLORS.muted, marginTop: 4 },
  outcomeInput: {
    marginTop: 10,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    fontSize: 14,
    color: COLORS.text,
    textAlignVertical: 'top',
  },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  timeLabel: { fontSize: 15, color: COLORS.text },

  snack: {
    position: 'absolute',
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: COLORS.elevated,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.separator,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  snackText: { flex: 1, color: COLORS.text, fontSize: 14 },
  snackAction: { color: COLORS.primary, fontSize: 14, fontWeight: '600' },
});
