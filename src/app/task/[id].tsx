import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '../../components/themed';
import { router, useLocalSearchParams } from 'expo-router';
import dayjs from 'dayjs';

import { useAppData } from '../../lib/AppDataContext';
import { DEFAULT_PRIORITY, NAMAZ_WINDOW_ORDER } from '../../lib/types';
import type {
  ChecklistItem,
  IntentionTagId,
  NamazWindowName,
  Priority,
  Recurrence,
  Reminder,
  SphereId,
  TaskDue,
} from '../../lib/types';
import { namazWindowsForDate } from '../../lib/prayerTimes';
import { todayKey } from '../../lib/dates';
import { projectPath } from '../../lib/projects';
import { DueField } from '../../components/DueField';
import { RecurrenceField } from '../../components/RecurrenceField';
import { RemindersField } from '../../components/RemindersField';
import { ChecklistEditor } from '../../components/ChecklistEditor';
import { TagsField } from '../../components/TagsField';
import { IntentionTagPicker, NamazWindowPicker, PriorityPicker, SpherePicker } from '../../components/pickers';
import { COLORS, Chip, ChipsRow, FieldLabel, confirmDestructive } from '../../components/ui';
import { MarkdownEditor } from '../../components/MarkdownEditor';
import type { TaskDraft } from '../../components/TaskSheet';
import { useTaskSheet } from '../../components/TaskSheet';
import { Icon } from '../../components/Icon';

export default function TaskDetailScreen() {
  const params = useLocalSearchParams<{
    id: string;
    projectId?: string;
    sectionId?: string;
    date?: string;
    window?: NamazWindowName;
    draft?: string; // черновик из компактного вида (JSON TaskDraft)
  }>();
  const isNew = params.id === 'new';
  const { tasks, projects, sections, settings, addOrUpdateTask, reopenTask, removeTask, startTask } = useAppData();
  const { completeWithFeedback } = useTaskSheet();

  const existing = useMemo(() => tasks.find((t) => t.id === params.id), [tasks, params.id]);
  // Черновик из быстрого листа («⤢» на новой задаче) — начальные значения формы.
  const [draft] = useState<Partial<TaskDraft>>(() => {
    if (!params.draft) return {};
    try {
      return JSON.parse(params.draft) as Partial<TaskDraft>;
    } catch {
      return {};
    }
  });

  const [title, setTitle] = useState(existing?.title ?? draft.title ?? '');
  const [description, setDescription] = useState(existing?.description ?? draft.description ?? '');
  const [checklist, setChecklist] = useState<ChecklistItem[]>(existing?.checklist ?? []);
  const [due, setDue] = useState<TaskDue | undefined>(
    existing?.due ?? draft.due ?? (params.date ? { date: params.date } : undefined)
  );
  const [duration, setDuration] = useState(existing?.durationMinutes ? String(existing.durationMinutes) : '');
  const [recurrence, setRecurrence] = useState<Recurrence | undefined>(existing?.recurrence);
  const [reminders, setReminders] = useState<Reminder[]>(existing?.reminders ?? draft.reminders ?? []);
  const [priority, setPriority] = useState<Priority>(existing?.priority ?? draft.priority ?? DEFAULT_PRIORITY);
  const [tagIds, setTagIds] = useState<string[]>(existing?.tagIds ?? draft.tagIds ?? []);
  const [intentionTag, setIntentionTag] = useState<IntentionTagId | undefined>(existing?.intentionTag);
  const [projectId, setProjectId] = useState<string | undefined>(existing?.projectId ?? draft.projectId ?? (params.projectId || undefined));
  const [sectionId, setSectionId] = useState<string | undefined>(existing?.sectionId ?? draft.sectionId ?? (params.sectionId || undefined));
  const [sphere, setSphere] = useState<SphereId | undefined>(existing?.sphere ?? draft.sphere);
  const [namazWindow, setNamazWindow] = useState<NamazWindowName | undefined>(
    existing?.namazWindow ?? draft.namazWindow ?? (NAMAZ_WINDOW_ORDER.includes(params.window as NamazWindowName) ? params.window : undefined)
  );
  const [value, setValue] = useState(existing?.value ?? '');
  const [expectedResult, setExpectedResult] = useState(existing?.expectedResult ?? '');
  const [comment, setComment] = useState(existing?.comment ?? '');
  const [postponeReason, setPostponeReason] = useState(existing?.postponeReason ?? '');

  const activeProjects = useMemo(
    () =>
      projects
        .filter((p) => !p.archived)
        .map((p) => ({ p, path: projectPath(p, projects) }))
        .sort((a, b) => a.path.localeCompare(b.path, 'ru')),
    [projects]
  );

  const availableSections = useMemo(
    () => sections.filter((s) => s.projectId === projectId).sort((a, b) => a.order - b.order),
    [sections, projectId]
  );

  // Окна намаза на день срока (или на сегодня, если срока нет).
  const windowsForDue = useMemo(
    () => namazWindowsForDate(due?.date ?? todayKey(), settings),
    [due?.date, settings]
  );

  // Перенос: срок существующей задачи сдвинули на более позднюю дату.
  const postponed = !!existing?.due && !!due && due.date > existing.due.date;

  /** Сохраняет форму; false — если не заполнено название. */
  const persist = async (): Promise<boolean> => {
    if (!title.trim()) {
      Alert.alert('Название обязательно', 'Напишите, что нужно сделать.');
      return false;
    }
    const durationNum = parseInt(duration, 10);
    await addOrUpdateTask({
      id: existing?.id,
      title: title.trim(),
      description: description.trim() || undefined,
      checklist: checklist.filter((c) => c.text.trim()),
      due,
      durationMinutes: durationNum > 0 ? durationNum : undefined,
      recurrence: due ? recurrence : undefined,
      reminders,
      priority,
      tagIds,
      intentionTag,
      projectId,
      sectionId: projectId ? sectionId : undefined,
      sphere,
      namazWindow,
      value: value.trim() || undefined,
      expectedResult: expectedResult.trim() || undefined,
      comment: comment.trim() || undefined,
      postponeReason: postponeReason.trim() || existing?.postponeReason,
    });
    return true;
  };

  const onSave = async () => {
    if (await persist()) router.back();
  };

  // Сначала сохраняем правки из формы, затем меняем статус.
  const onToggleDone = async () => {
    if (!existing || !(await persist())) return;
    if (existing.status === 'done') await reopenTask(existing.id);
    else await completeWithFeedback(existing.id, { comment: comment.trim() || undefined });
    router.back();
  };

  const onDelete = () => {
    if (!existing) return;
    confirmDestructive('Удалить задачу?', undefined, async () => {
      await removeTask(existing.id);
      router.back();
    });
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
      <TextInput
        style={styles.titleInput}
        placeholder="Название задачи"
        value={title}
        onChangeText={setTitle}
        autoFocus={isNew}
        multiline
      />
      <MarkdownEditor value={description} onChange={setDescription} />

      {existing && existing.status === 'active' ? (
        <Pressable
          style={styles.startRow}
          onPress={() => startTask(existing.id)}
          accessibilityRole="button"
          accessibilityHint="Отметить время начала работы над задачей"
        >
          <Text style={styles.startIcon}>{existing.startedAt ? '⏳' : '▶'}</Text>
          <Text style={styles.startText}>
            {existing.startedAt
              ? `Начато ${dayjs(existing.startedAt).format('D MMM, HH:mm')} · нажмите, чтобы начать заново`
              : 'Начать — отметить время начала'}
          </Text>
        </Pressable>
      ) : null}

      <FieldLabel>Чек-лист</FieldLabel>
      <ChecklistEditor value={checklist} onChange={setChecklist} />

      <FieldLabel>Срок</FieldLabel>
      <DueField
        value={due}
        onChange={(d) => {
          setDue(d);
          if (!d) setRecurrence(undefined);
        }}
      />
      <RecurrenceField value={recurrence} startDate={due?.date} onChange={setRecurrence} disabledHint="Сначала назначьте срок" />
      <View style={styles.inlineRow}>
        <Icon name="timer" size={17} color={COLORS.muted} />
        <Text style={styles.inlineLabel}>Длительность</Text>
        <TextInput
          style={styles.inlineInput}
          placeholder="— мин"
          value={duration}
          onChangeText={setDuration}
          keyboardType="number-pad"
          maxLength={4}
          accessibilityLabel="Длительность в минутах"
        />
        {duration ? <Text style={styles.inlineSuffix}>мин</Text> : null}
      </View>

      <FieldLabel>Напоминания</FieldLabel>
      <RemindersField value={reminders} onChange={setReminders} hasAnchor={!!due} />

      <FieldLabel>Приоритет</FieldLabel>
      <PriorityPicker value={priority} onChange={setPriority} />

      <FieldLabel>Проект</FieldLabel>
      <ChipsRow>
        <Chip
          label="Входящие"
          active={!projectId}
          onPress={() => {
            setProjectId(undefined);
            setSectionId(undefined);
          }}
        />
        {activeProjects.map(({ p, path }) => (
          <Chip
            key={p.id}
            label={path}
            active={projectId === p.id}
            onPress={() => {
              setProjectId(p.id);
              setSectionId(undefined);
            }}
          />
        ))}
      </ChipsRow>

      {projectId && availableSections.length > 0 ? (
        <>
          <FieldLabel>Раздел</FieldLabel>
          <ChipsRow>
            <Chip label="Без раздела" active={!sectionId} onPress={() => setSectionId(undefined)} />
            {availableSections.map((s) => (
              <Chip key={s.id} label={s.title} active={sectionId === s.id} onPress={() => setSectionId(sectionId === s.id ? undefined : s.id)} />
            ))}
          </ChipsRow>
        </>
      ) : null}

      <FieldLabel>Сфера жизни</FieldLabel>
      <SpherePicker value={sphere} onChange={setSphere} />

      <FieldLabel>Тег намерения</FieldLabel>
      <IntentionTagPicker value={intentionTag} onChange={setIntentionTag} />

      <FieldLabel>Теги</FieldLabel>
      <TagsField value={tagIds} onChange={setTagIds} />

      <FieldLabel>Окно намаза {due ? `(${dayjs(due.date).format('D MMM')})` : '(сегодня)'}</FieldLabel>
      <NamazWindowPicker value={namazWindow} onChange={setNamazWindow} windows={windowsForDue} />

      <FieldLabel>Ценность — ради чего выполняется</FieldLabel>
      <TextInput style={styles.input} placeholder="Ради чего эта задача?" value={value} onChangeText={setValue} multiline />

      <FieldLabel>Ожидаемый результат</FieldLabel>
      <TextInput
        style={styles.input}
        placeholder="Что получится в итоге?"
        value={expectedResult}
        onChangeText={setExpectedResult}
        multiline
      />

      {postponed || existing?.postponeReason ? (
        <>
          <FieldLabel>Причина переноса</FieldLabel>
          <TextInput
            style={styles.input}
            placeholder="Почему перенесли? (необязательно)"
            value={postponeReason}
            onChangeText={setPostponeReason}
            multiline
          />
        </>
      ) : null}

      {existing ? (
        <>
          <FieldLabel>Итог — короткий анализ</FieldLabel>
          <TextInput
            style={styles.input}
            placeholder="Как прошло? Что получилось?"
            value={comment}
            onChangeText={setComment}
            multiline
          />
          {existing.status === 'done' && existing.endedAt ? (
            <Text style={styles.meta}>
              Выполнено {dayjs(existing.endedAt).format('D MMMM, HH:mm')}
              {existing.startedAt ? ` · начато ${dayjs(existing.startedAt).format('HH:mm')}` : ''}
            </Text>
          ) : null}
        </>
      ) : null}

      <Pressable style={styles.saveButton} onPress={onSave} accessibilityRole="button">
        <Text style={styles.saveButtonText}>{isNew ? 'Создать' : 'Сохранить'}</Text>
      </Pressable>

      {existing ? (
        <View style={styles.secondaryRow}>
          <Pressable style={styles.secondaryButton} onPress={onToggleDone} accessibilityRole="button">
            <Text style={styles.secondaryText}>
              {existing.status === 'done' ? '↺ Вернуть в работу' : '✓ Выполнить'}
            </Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={onDelete} accessibilityRole="button">
            <Text style={styles.deleteText}>Удалить</Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  titleInput: {
    fontSize: 18,
    fontWeight: '600',
    backgroundColor: COLORS.card,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    color: COLORS.text,
  },
  startRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.card,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  startIcon: { fontSize: 14, width: 22, textAlign: 'center', color: COLORS.success },
  startText: { flex: 1, fontSize: 13, color: COLORS.text },
  input: {
    fontSize: 14,
    backgroundColor: COLORS.card,
    borderRadius: 8,
    padding: 12,
    color: COLORS.text,
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.card,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  inlineIcon: { fontSize: 16, width: 22, textAlign: 'center' },
  inlineLabel: { flex: 1, fontSize: 14, color: COLORS.text },
  inlineInput: {
    minWidth: 64,
    textAlign: 'right',
    fontSize: 14,
    paddingVertical: 6,
    color: COLORS.text,
  },
  inlineSuffix: { fontSize: 14, color: COLORS.muted },
  meta: { fontSize: 12, color: COLORS.muted, marginTop: 6 },
  saveButton: {
    backgroundColor: COLORS.text,
    borderRadius: 6,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonText: { color: COLORS.onAccent, fontWeight: '600', fontSize: 15 },
  secondaryRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  secondaryButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: COLORS.card,
  },
  secondaryText: { color: COLORS.text, fontWeight: '600' },
  deleteText: { color: COLORS.danger, fontWeight: '600' },
});
