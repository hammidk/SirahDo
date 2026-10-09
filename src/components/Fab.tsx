// Плавающая кнопка «+» (docs/SPEC.md). Действие контекстное — его задаёт экран:
// задача (Сегодня/Обзор/проект), событие (Календарь), привычка (Трекер).
// Стиль Notion: плоская, без тени — приподнятый фон и тонкая обводка.

import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS } from '../theme/colors';
import { Icon } from './Icon';

export function Fab({ onPress, accessibilityLabel }: { onPress: () => void; accessibilityLabel: string }) {
  // Нижнего таб-бара нет — кнопку приподнимаем над системной полосой «домой».
  const { bottom } = useSafeAreaInsets();
  return (
    <Pressable
      style={({ pressed }) => [styles.fab, { bottom: 20 + bottom }, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Icon name="add" size={24} color={COLORS.text} strokeWidth={2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 16,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.elevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.separator,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { backgroundColor: COLORS.hover },
});
