// Верхняя панель навигации в стиле Notion (docs/spec/navigation.md): аватар слева,
// справа 4 вкладки-«таблетки». Активная — иконка + подпись на светлом фоне,
// неактивные — только иконка в круге. Ширина, фон и подпись анимируются
// синхронно с прогрессом свайпа между страницами (progress — дробный номер вкладки).

import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { interpolate, interpolateColor, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

import { COLORS } from '../../theme/colors';
import { Icon } from '../Icon';
import type { IconName } from '../Icon';
import { Text } from '../themed';

export const PILL_SIZE = 44;
const PAD = 12; // (44 − иконка 20) / 2 — иконка по центру свёрнутой таблетки
const ICON = 20;
const GAP = 8;
const ACTIVE_BG = COLORS.border; // #2F2F2F — светлее фона
const INACTIVE_BG = COLORS.elevated; // #252525

export interface TabItem {
  key: string;
  title: string;
  icon: IconName;
}

function Pill({
  item,
  index,
  selected,
  progress,
  onPress,
}: {
  item: TabItem;
  index: number;
  selected: boolean;
  progress: SharedValue<number>;
  onPress: () => void;
}) {
  // Полная ширина активной таблетки: отступ + иконка + зазор + подпись + отступ.
  const fullWidth = useSharedValue(PILL_SIZE * 2.6);

  const pillStyle = useAnimatedStyle(() => {
    const d = Math.min(1, Math.abs(progress.get() - index));
    return {
      width: interpolate(d, [0, 1], [fullWidth.get(), PILL_SIZE]),
      backgroundColor: interpolateColor(d, [0, 1], [ACTIVE_BG, INACTIVE_BG]),
    };
  });
  const labelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(Math.abs(progress.get() - index), [0, 0.6], [1, 0], 'clamp'),
  }));
  const activeIconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(Math.abs(progress.get() - index), [0, 1], [1, 0], 'clamp'),
  }));

  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      accessibilityRole="tab"
      accessibilityLabel={item.title}
      accessibilityState={{ selected }}
    >
      <Animated.View style={[styles.pill, pillStyle]}>
        {/* Ряд с иконкой и подписью не сжимается: его обрезает таблетка (overflow hidden). */}
        <View style={styles.pillRow}>
          <View style={styles.iconBox}>
            <Icon name={item.icon} size={ICON} color={COLORS.muted} />
            <Animated.View style={[StyleSheet.absoluteFill, activeIconStyle]}>
              <Icon name={item.icon} size={ICON} color={COLORS.text} strokeWidth={2} />
            </Animated.View>
          </View>
          <Animated.Text
            style={[styles.label, labelStyle]}
            numberOfLines={1}
            onLayout={(e) => fullWidth.set(PAD + ICON + GAP + e.nativeEvent.layout.width + PAD + 4)}
          >
            {item.title}
          </Animated.Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

export function TopBar({
  tabs,
  index,
  progress,
  initial,
  onSelect,
  onAvatar,
}: {
  tabs: TabItem[];
  index: number;
  progress: SharedValue<number>;
  initial?: string; // первая буква имени для аватара
  onSelect: (i: number) => void;
  onAvatar: () => void;
}) {
  return (
    <View style={styles.bar}>
      <Pressable
        onPress={onAvatar}
        style={styles.avatar}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel="Меню: профиль и настройки"
      >
        {initial ? <Text style={styles.avatarText}>{initial}</Text> : <Icon name="user" size={20} color={COLORS.muted} />}
      </Pressable>
      <View style={styles.pills} accessibilityRole="tablist">
        {tabs.map((t, i) => (
          <Pill key={t.key} item={t} index={i} selected={i === index} progress={progress} onPress={() => onSelect(i)} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 6 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 17, fontWeight: '600', color: COLORS.text },
  pills: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  pill: { height: PILL_SIZE, borderRadius: PILL_SIZE / 2, overflow: 'hidden' },
  pillRow: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: GAP,
    paddingLeft: PAD,
  },
  iconBox: { width: ICON, height: ICON },
  label: { fontSize: 15, fontWeight: '600', color: COLORS.text },
});
