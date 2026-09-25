// Тёмные версии базовых элементов RN. Импортируются вместо react-native, чтобы
// текст по умолчанию был светлым, у полей ввода — тёмная клавиатура, приглушённые
// плейсхолдеры и тонкая синяя обводка в фокусе (как в Notion), а у переключателей —
// цвета темы.

import { useState } from 'react';
import type { Ref } from 'react';
import { Platform, Text as RNText, TextInput as RNTextInput, Switch as RNSwitch, StyleSheet } from 'react-native';
import type { SwitchProps, TextInputProps, TextProps } from 'react-native';

import { COLORS, RADIUS } from '../theme/colors';

export function Text({ style, ...props }: TextProps) {
  return <RNText {...props} style={[styles.text, style]} />;
}

export function TextInput({
  style,
  onFocus,
  onBlur,
  plain = false,
  ref,
  ...props
}: TextInputProps & {
  /** Без обводки в фокусе — для «встроенных» полей (заголовок, пункт чек-листа). */
  plain?: boolean;
  ref?: Ref<RNTextInput>;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <RNTextInput
      ref={ref}
      placeholderTextColor={COLORS.tertiary}
      selectionColor={COLORS.primary}
      cursorColor={COLORS.primary}
      keyboardAppearance="dark"
      {...props}
      style={[styles.input, style, !plain && styles.ring, !plain && focused && styles.ringFocused]}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
    />
  );
}

export function Switch(props: SwitchProps) {
  return (
    <RNSwitch
      trackColor={{ false: COLORS.hover, true: COLORS.success }}
      thumbColor={COLORS.text}
      ios_backgroundColor={COLORS.hover}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  text: { color: COLORS.text },
  input: {
    color: COLORS.text,
    // Браузерная обводка фокуса на вебе заменяется своей.
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none', outlineWidth: 0 } as object) : null),
  },
  ring: { borderWidth: 1, borderColor: 'transparent', borderRadius: RADIUS.md },
  ringFocused: { borderColor: COLORS.primary },
});
