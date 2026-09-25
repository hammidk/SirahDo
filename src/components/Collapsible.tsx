// Сворачиваемая секция в духе секций Todoist: заголовок со счётчиком («Без времени · 4»),
// шеврон поворачивается, высота содержимого меняется плавно. Действие справа
// (например, «Перенести на сегодня») — сосед заголовка, не вложенная кнопка.

import { useState } from 'react';
import type { ReactNode } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';

import { COLORS } from '../theme/colors';
import { Text } from './themed';
import { Icon } from './Icon';

export function CollapsibleSection({
  title,
  count,
  defaultOpen = true,
  right,
  children,
}: {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  right?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [progress] = useState(() => new Animated.Value(defaultOpen ? 1 : 0));
  const [contentHeight, setContentHeight] = useState(0);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    Animated.timing(progress, {
      toValue: next ? 1 : 0,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // анимируется высота
    }).start();
  };

  const rotate = progress.interpolate({ inputRange: [0, 1], outputRange: ['-90deg', '0deg'] });
  const height = progress.interpolate({ inputRange: [0, 1], outputRange: [0, contentHeight] });

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.toggle, pressed && styles.pressed]}
          onPress={toggle}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          accessibilityLabel={`${title}${count != null ? `, ${count}` : ''}. ${open ? 'Свернуть' : 'Развернуть'}`}
        >
          <Animated.View style={{ transform: [{ rotate }] }}>
            <Icon name="chevron-down" size={16} color={COLORS.muted} />
          </Animated.View>
          <Text style={styles.title}>{title}</Text>
          {count != null ? <Text style={styles.count}>· {count}</Text> : null}
        </Pressable>
        {right}
      </View>
      <Animated.View style={[styles.body, { height }]}>
        {/* Содержимое меряется в абсолютном слое, чтобы знать высоту и в свёрнутом виде. */}
        <View
          style={[styles.measure, { pointerEvents: open ? 'auto' : 'none' }]}
          onLayout={(e) => setContentHeight(e.nativeEvent.layout.height)}
          accessibilityElementsHidden={!open}
          importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}
        >
          {children}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 10 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingRight: 8, borderRadius: 6 },
  pressed: { backgroundColor: COLORS.hover },
  title: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  count: { fontSize: 14, color: COLORS.tertiary },
  body: { overflow: 'hidden' },
  measure: { position: 'absolute', left: 0, right: 0, top: 0 },
});
