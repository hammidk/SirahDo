// Строка задачи в списке (ТЗ §5.3) в стиле Notion: плоская, разделение тонкой
// линией; круглый чекбокс с тонкой обводкой (цвет — приоритет), при выполнении —
// зелёная заливка и зачёркнутый приглушённый текст. Метаданные — мелким
// вторичным текстом с line-иконками.

import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import type { Task } from '../lib/types';
import { INTENTION_TAGS, NAMAZ_WINDOW_TITLES, PRIORITIES, SPHERES } from '../lib/types';
import { formatDue, isOverdue } from '../lib/dates';
import { stripMarkdown } from '../lib/markdown';
import { useAppData } from '../lib/AppDataContext';
import { COLORS } from '../theme/colors';
import { Text } from './themed';
import { Icon } from './Icon';
import type { IconName } from './Icon';
import { useTaskSheet } from './TaskSheet';

function Meta({ icon, text, color = COLORS.muted }: { icon?: IconName; text: string; color?: string }) {
  return (
    <View style={styles.meta}>
      {icon ? <Icon name={icon} size={12} color={color} /> : null}
      <Text style={[styles.metaText, { color }]} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

export function TaskCard({
  task,
  showProject = false,
  trailing,
}: {
  task: Task;
  showProject?: boolean;
  trailing?: React.ReactNode; // доп. действие справа (например, «разобрать» во Входящих)
}) {
  const { reopenTask, tags, projects } = useAppData();
  const { openTask, completeWithFeedback } = useTaskSheet();
  const done = task.status === 'done';
  const priority = PRIORITIES.find((p) => p.id === task.priority) ?? PRIORITIES[3];
  const sphere = SPHERES.find((s) => s.id === task.sphere);
  const intention = INTENTION_TAGS.find((t) => t.id === task.intentionTag);
  const project = showProject && task.projectId ? projects.find((p) => p.id === task.projectId) : undefined;
  const taskTags = task.tagIds.map((id) => tags.find((t) => t.id === id)).filter((t) => !!t);
  const checklistDone = task.checklist.filter((c) => c.done).length;
  const overdue = !done && task.due ? isOverdue(task.due) : false;

  // Чекбокс и доп. действие — соседи основной области, а не вложенные кнопки.
  return (
    <View style={[styles.row, done && styles.rowDone]}>
      <Pressable
        style={[
          styles.checkbox,
          { borderColor: task.priority !== 4 ? priority.color : COLORS.tertiary },
          done && styles.checkboxDone,
        ]}
        hitSlop={10}
        onPress={() => (done ? reopenTask(task.id) : completeWithFeedback(task.id))}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={done ? 'Вернуть в работу' : 'Выполнить'}
      >
        {done ? <Icon name="check" size={12} color={COLORS.onAccent} strokeWidth={3} /> : null}
      </Pressable>

      <Pressable
        style={({ pressed }) => [styles.body, pressed && styles.pressed]}
        // Тап — компактный вид, долгое нажатие — сразу полная карточка.
        onPress={() => openTask({ taskId: task.id })}
        onLongPress={() => router.push(`/task/${task.id}`)}
        accessibilityRole="button"
        accessibilityLabel={task.title}
        accessibilityHint="Нажмите, чтобы открыть; удерживайте — полная карточка"
      >
        <Text style={[styles.title, done && styles.titleDone]} numberOfLines={2}>
          {task.title}
        </Text>
        {task.description ? (
          <Text style={styles.description} numberOfLines={1}>
            {stripMarkdown(task.description)}
          </Text>
        ) : null}

        <View style={styles.metaRow}>
          {task.due ? (
            <Meta
              icon={task.recurrence ? 'repeat' : 'calendar'}
              text={formatDue(task.due)}
              color={overdue ? COLORS.danger : COLORS.muted}
            />
          ) : null}
          {task.reminders.length > 0 ? <Meta icon="bell" text={String(task.reminders.length)} /> : null}
          {task.namazWindow ? <Meta icon="moon" text={NAMAZ_WINDOW_TITLES[task.namazWindow]} color={COLORS.warning} /> : null}
          {task.checklist.length > 0 ? <Meta icon="checklist" text={`${checklistDone}/${task.checklist.length}`} /> : null}
          {task.priority !== 4 ? <Meta icon="flag" text={priority.title} color={priority.color} /> : null}
          {taskTags.map((t) => (
            <Meta key={t.id} icon="hash" text={t.name} color={t.color ?? COLORS.ai} />
          ))}
          {intention ? <Meta text={intention.title} color={COLORS.ai} /> : null}
          {sphere ? <Meta text={sphere.title} /> : null}
          {project ? <Meta icon="folder" text={project.title} /> : null}
          {task.value ? <Meta text={`✦ ${task.value}`} color={COLORS.tertiary} /> : null}
        </View>
      </Pressable>
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.separator,
  },
  rowDone: { opacity: 0.7 },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxDone: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  body: { flex: 1, borderRadius: 6 },
  pressed: { backgroundColor: COLORS.hover },
  title: { fontSize: 15, lineHeight: 21, color: COLORS.text },
  titleDone: { textDecorationLine: 'line-through', color: COLORS.tertiary },
  description: { fontSize: 13, color: COLORS.muted, marginTop: 1 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 10, rowGap: 2, marginTop: 3 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 3, maxWidth: '100%' },
  metaText: { fontSize: 12 },
});
