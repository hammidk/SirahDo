// Базовые UI-кирпичики в стиле Notion (тёмная тема): подписи полей, чипы,
// строки-свойства, нижний лист, кнопки. Плоско: без теней, радиус 6–8,
// разделение — тонкими линиями. Цвета — только из src/theme/colors.ts.

import type { ReactNode } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS, RADIUS, tagBackground } from '../theme/colors';
import { Text } from './themed';
import { Icon } from './Icon';
import type { IconName } from './Icon';

export { COLORS, RADIUS } from '../theme/colors';

/** Подтверждение опасного действия. На вебе Alert с кнопками не работает — используем confirm(). */
export function confirmDestructive(title: string, message: string | undefined, onYes: () => void, yesLabel = 'Удалить') {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(message ? `${title}\n${message}` : title)) onYes();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Отмена', style: 'cancel' },
    { text: yesLabel, style: 'destructive', onPress: onYes },
  ]);
}

export function FieldLabel({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={style}>
      <Text style={styles.label}>{children}</Text>
    </View>
  );
}

/** Секция формы — карточка с чётким заголовком: крупные поля на одном уровне важности. */
export function FormSection({
  title,
  hint,
  right,
  children,
}: {
  title: string;
  hint?: string;
  right?: ReactNode; // элемент справа от заголовка (например, переключатель)
  children?: ReactNode;
}) {
  return (
    <View style={styles.formSection}>
      <View style={styles.formSectionHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.formSectionTitle}>{title}</Text>
          {hint ? <Text style={styles.formSectionHint}>{hint}</Text> : null}
        </View>
        {right}
      </View>
      {children ? <View style={styles.formSectionBody}>{children}</View> : null}
    </View>
  );
}

export function ChipsRow({ children }: { children: ReactNode }) {
  return <View style={styles.chipsRow}>{children}</View>;
}

/** Чип-«тег» Notion: приглушённый фон; выбранный — цвет категории на 15% + текст этого цвета. */
export function Chip({
  label,
  active,
  onPress,
  color,
  disabled,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  color?: string; // цвет категории для выбранного состояния
  disabled?: boolean;
}) {
  const tone = color ?? COLORS.primary;
  return (
    <Pressable
      style={({ pressed }) => [
        styles.chip,
        active && { backgroundColor: tagBackground(tone) },
        pressed && !active && styles.pressed,
        disabled && styles.chipDisabled,
      ]}
      onPress={onPress}
      disabled={disabled || !onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!active, disabled: !!disabled }}
    >
      <Text style={[styles.chipText, active && { color: tone }]}>{label}</Text>
    </Pressable>
  );
}

/** Строка-свойство как в карточке страницы Notion: «иконка · название — значение». */
export function FieldRow({
  icon,
  title,
  value,
  placeholder,
  onPress,
  onClear,
}: {
  icon?: IconName;
  title?: string;
  value?: string;
  placeholder?: string;
  onPress: () => void;
  onClear?: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.fieldRow, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[title, value || placeholder].filter(Boolean).join(': ')}
    >
      {icon ? <Icon name={icon} size={17} color={COLORS.muted} /> : null}
      {title ? <Text style={styles.fieldTitle}>{title}</Text> : null}
      <Text style={value ? styles.fieldValue : styles.fieldPlaceholder} numberOfLines={2}>
        {value || placeholder}
      </Text>
      {value && onClear ? (
        <Pressable onPress={onClear} hitSlop={10} accessibilityLabel="Очистить">
          <Icon name="close" size={15} color={COLORS.tertiary} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

/** Нижний лист поверх экрана. Контент прокручивается, кнопки действий — внизу. */
export function Sheet({
  visible,
  onClose,
  title,
  header,
  children,
  footer,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  header?: ReactNode; // своя шапка вместо заголовка
  children: ReactNode;
  footer?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {/* Лист поднимается над клавиатурой, чтобы поля и кнопки оставались видны. */}
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Закрыть" />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 14) }]}>
          <View style={styles.grabber} />
          {header ?? (title ? <Text style={styles.sheetTitle}>{title}</Text> : null)}
          <ScrollView style={styles.sheetBody} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          {footer ? <View style={styles.sheetFooter}>{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/**
 * Кнопки Notion: primary — светлая на тёмном, secondary — прозрачная с тонкой
 * обводкой, danger — как secondary, но красный текст. Без теней и градиентов.
 */
export function Button({
  title,
  onPress,
  kind = 'primary',
  style,
}: {
  title: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'danger';
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        kind === 'primary' ? styles.buttonPrimary : styles.buttonGhost,
        pressed && (kind === 'primary' ? styles.buttonPrimaryPressed : styles.pressed),
        style,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <Text
        style={[
          styles.buttonText,
          kind === 'primary' && styles.buttonTextPrimary,
          kind === 'danger' && styles.buttonTextDanger,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

export const sharedStyles = StyleSheet.create({
  /** Поле ввода Notion: фон bgSecondary без рамки (обводка появляется в фокусе). */
  input: {
    fontSize: 15,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.text,
  },
  /** Тонкий разделитель между строками. */
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.separator },
});

const styles = StyleSheet.create({
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.tertiary,
    marginTop: 18,
    marginBottom: 6,
  },
  formSection: { backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: 14, marginTop: 12 },
  formSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  formSectionTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  formSectionHint: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  formSectionBody: { marginTop: 12 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.hover,
  },
  chipDisabled: { opacity: 0.4 },
  chipText: { fontSize: 13, color: COLORS.muted },
  pressed: { backgroundColor: COLORS.hover },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.separator,
  },
  fieldTitle: { width: 104, fontSize: 14, color: COLORS.muted },
  fieldValue: { flex: 1, fontSize: 15, color: COLORS.text },
  fieldPlaceholder: { flex: 1, fontSize: 15, color: COLORS.tertiary },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: COLORS.overlay },
  sheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: RADIUS.md,
    borderTopRightRadius: RADIUS.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.separator,
    paddingHorizontal: 16,
    paddingTop: 8,
    maxHeight: '88%',
  },
  grabber: {
    alignSelf: 'center',
    width: 32,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.separator,
    marginBottom: 10,
  },
  sheetTitle: { fontSize: 17, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  sheetBody: { flexGrow: 0 },
  sheetFooter: { flexDirection: 'row', gap: 8, paddingTop: 12 },
  button: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
  },
  buttonPrimary: { backgroundColor: COLORS.text },
  buttonPrimaryPressed: { opacity: 0.85 },
  buttonGhost: { borderWidth: 1, borderColor: COLORS.separator },
  buttonText: { fontSize: 15, fontWeight: '500', color: COLORS.text },
  buttonTextPrimary: { color: COLORS.onAccent, fontWeight: '600' },
  buttonTextDanger: { color: COLORS.danger },
});
