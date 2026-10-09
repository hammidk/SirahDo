// Меню аватара (docs/spec/navigation.md): поповер под аватаром в стиле Notion —
// тёмная карточка с радиусом 24 и тонкой обводкой, крупные пункты, без теней,
// затемнение экрана. Закрывается тапом вне поповера или свайпом вниз.

import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import type { Href } from 'expo-router';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useAdvancedMode, useAppData } from '../../lib/AppDataContext';
import { COLORS } from '../../theme/colors';
import { Icon } from '../Icon';
import type { IconName } from '../Icon';
import { Switch, Text } from '../themed';

const CLOSE_DISTANCE = 60;

function MenuItem({
  icon,
  title,
  subtitle,
  onPress,
  right,
  disabled,
}: {
  icon: IconName;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.item, pressed && !disabled && styles.itemPressed, disabled && styles.itemDisabled]}
      onPress={onPress}
      disabled={disabled || !onPress}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      accessibilityState={{ disabled: !!disabled }}
    >
      <Icon name={icon} size={20} color={COLORS.muted} />
      <View style={styles.itemText}>
        <Text style={styles.itemTitle}>{title}</Text>
        {subtitle ? (
          <Text style={styles.itemSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </Pressable>
  );
}

export function AvatarMenu({ visible, top, onClose }: { visible: boolean; top: number; onClose: () => void }) {
  const { settings, updateSettings } = useAppData();
  const advanced = useAdvancedMode();
  const dy = useSharedValue(0);

  const open = (href: Href) => {
    onClose();
    router.push(href);
  };

  // Свайп вниз по поповеру закрывает меню.
  const swipeDown = Gesture.Pan()
    .activeOffsetY(10)
    .onUpdate((e) => {
      dy.set(Math.max(0, e.translationY));
    })
    .onEnd((e) => {
      if (e.translationY > CLOSE_DISTANCE || e.velocityY > 600) scheduleOnRN(onClose);
      dy.set(withSpring(0, { damping: 20, stiffness: 240 }));
    });
  const popoverStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: dy.get() }],
    opacity: 1 - Math.min(0.5, dy.get() / 300),
  }));

  const place = settings.locationLabel ?? (settings.latitude != null ? 'Координаты заданы' : 'Город не выбран');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/* Модалка — отдельное окно: жестам нужен свой корень gesture-handler. */}
      <GestureHandlerRootView style={styles.flex}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Закрыть меню" />
        <GestureDetector gesture={swipeDown}>
          <Animated.View style={[styles.popover, { top }, popoverStyle]} accessibilityViewIsModal>
            <MenuItem
              icon="user"
              title={settings.userName?.trim() || 'Профиль'}
              subtitle={place}
              onPress={() => open('/profile')}
            />
            <View style={styles.separator} />
            <MenuItem icon="compass" title="Настройки намаза" subtitle="Метод расчёта, мазхаб, город" onPress={() => open('/prayer-settings')} />
            <MenuItem
              icon="options"
              title="Расширенный режим"
              subtitle={advanced ? 'Разделы, Намерение, фильтры и теги' : 'Выключен — всё самое нужное'}
              // Переключатель — единственный элемент управления строки (без вложенных кнопок).
              right={
                <Switch
                  value={advanced}
                  onValueChange={(v) => updateSettings({ ...settings, advancedMode: v })}
                  accessibilityLabel="Расширенный режим"
                />
              }
            />
            <MenuItem icon="bell" title="Уведомления" subtitle="Разрешение и напоминания" onPress={() => open('/notifications')} />
            {/* Корзина: мягкое удаление пока не сделано — пункт неактивен (docs/spec/navigation.md). */}
            <MenuItem icon="trash" title="Корзина" subtitle="Скоро" disabled />
            <MenuItem icon="help" title="Помощь" onPress={() => open('/help')} />
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: COLORS.overlay },
  popover: {
    position: 'absolute',
    left: 12,
    width: 320,
    maxWidth: '94%',
    backgroundColor: COLORS.card,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.subtle,
    paddingVertical: 8,
    overflow: 'hidden',
  },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, paddingHorizontal: 18 },
  itemPressed: { backgroundColor: COLORS.hover },
  itemDisabled: { opacity: 0.45 },
  itemText: { flex: 1 },
  itemTitle: { fontSize: 17, color: COLORS.text },
  itemSubtitle: { fontSize: 13, color: COLORS.muted, marginTop: 1 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.separator, marginVertical: 6, marginHorizontal: 18 },
});
