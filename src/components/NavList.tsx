// Группы строк-ссылок в стиле Notion (Обзор, «Фильтры и теги»): иконка, название,
// счётчик. Все строки одного уровня выровнены по одной сетке отступов; вложенность
// проектов — сдвиг на indent. Кнопка сворачивания ветки — сосед строки справа
// (trailing), а не внутри неё: вложенные кнопки ломают доступность.

import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { COLORS } from '../theme/colors';
import { Text } from './themed';
import { Icon } from './Icon';
import type { IconName } from './Icon';

const ROW_PADDING = 14;
const INDENT_STEP = 18;

export function NavRow({
  icon,
  iconColor,
  title,
  right,
  onPress,
  indent = 0,
  trailing,
}: {
  icon: IconName;
  iconColor?: string;
  title: string;
  right?: string;
  onPress: () => void;
  indent?: number;
  trailing?: ReactNode;
}) {
  return (
    <View style={[styles.rowOuter, { paddingLeft: ROW_PADDING + indent * INDENT_STEP }]}>
      <Pressable
        style={({ pressed }) => [styles.row, { paddingRight: trailing ? 6 : ROW_PADDING }, pressed && styles.pressed]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={right ? `${title}, ${right}` : title}
      >
        <Icon name={icon} size={18} color={iconColor ?? COLORS.muted} />
        <Text style={styles.rowTitle} numberOfLines={1}>
          {title}
        </Text>
        {right ? <Text style={styles.rowCount}>{right}</Text> : null}
      </Pressable>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </View>
  );
}

export function NavGroup({ children }: { children: ReactNode }) {
  return <View style={styles.group}>{children}</View>;
}

export function NavSeparator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  group: { backgroundColor: COLORS.card, borderRadius: 8, overflow: 'hidden', marginBottom: 8 },
  rowOuter: { flexDirection: 'row', alignItems: 'center' },
  row: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  pressed: { opacity: 0.7 },
  rowTitle: { flex: 1, fontSize: 15, color: COLORS.text },
  rowCount: { fontSize: 14, color: COLORS.muted },
  trailing: { paddingRight: 12, paddingLeft: 4 },
  // Линия начинается от текста строки: 14 (отступ) + 18 (иконка) + 10 (зазор).
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.separator, marginLeft: ROW_PADDING + 18 + 10 },
});
