// Онбординг первого запуска (docs/spec/navigation.md): приветствие → местоположение →
// метод расчёта (предвыбран по стране, можно пропустить). Дальше — «Сегодня» в
// простом режиме. Про расширенный режим здесь не говорим.

import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppData } from '../lib/AppDataContext';
import { CALCULATION_METHODS, suggestMethod } from '../lib/calcMethods';
import type { CalculationMethodId } from '../lib/types';
import { COLORS } from '../theme/colors';
import { CityPicker } from './LocationSection';
import { Icon } from './Icon';
import { Text } from './themed';

type Step = 'welcome' | 'location' | 'method';
const STEPS: Step[] = ['welcome', 'location', 'method'];

export function Onboarding() {
  const insets = useSafeAreaInsets();
  const { settings, updateSettings, requestLocation, locationError } = useAppData();
  const [step, setStep] = useState<Step>('welcome');
  const [manual, setManual] = useState(false);
  const [busy, setBusy] = useState(false);

  const detect = async () => {
    setBusy(true);
    const ok = await requestLocation();
    setBusy(false);
    if (ok) setStep('method');
  };

  const finish = (calculationMethod: CalculationMethodId) =>
    updateSettings({ ...settings, calculationMethod, onboardingDone: true });

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.dots}>
        {STEPS.map((s) => (
          <View key={s} style={[styles.dot, s === step && styles.dotActive]} />
        ))}
      </View>

      {step === 'welcome' ? (
        <View style={styles.body}>
          <View style={styles.center}>
            <Text style={styles.brand}>SirahDo</Text>
            <Text style={styles.headline}>День, построенный вокруг намаза</Text>
            <Text style={styles.lead}>Время намазов, задачи и привычки — в одном спокойном месте.</Text>
          </View>
          <Pressable style={styles.primary} onPress={() => setStep('location')} accessibilityRole="button">
            <Text style={styles.primaryText}>Начать</Text>
          </Pressable>
        </View>
      ) : null}

      {step === 'location' ? (
        <ScrollView style={styles.body} contentContainerStyle={styles.scrollBody} keyboardShouldPersistTaps="handled">
          <Icon name="location" size={32} color={COLORS.warning} />
          <Text style={styles.title}>Где вы находитесь?</Text>
          <Text style={styles.lead}>По месту считается время намазов. Всё считается на телефоне, без интернета.</Text>
          <Pressable style={[styles.primary, busy && styles.disabled]} onPress={detect} disabled={busy} accessibilityRole="button">
            <Text style={styles.primaryText}>{busy ? 'Определяем…' : 'Определить автоматически'}</Text>
          </Pressable>
          {locationError ? <Text style={styles.error}>{locationError}</Text> : null}
          {manual ? (
            <View style={styles.cityBox}>
              <CityPicker
                onPick={async (label, latitude, longitude) => {
                  await updateSettings({ ...settings, latitude, longitude, locationLabel: label });
                  setStep('method');
                }}
              />
            </View>
          ) : (
            <Pressable style={styles.secondary} onPress={() => setManual(true)} accessibilityRole="button">
              <Text style={styles.secondaryText}>Выбрать город вручную</Text>
            </Pressable>
          )}
          <Pressable style={styles.skip} onPress={() => setStep('method')} accessibilityRole="button">
            <Text style={styles.skipText}>Позже</Text>
          </Pressable>
        </ScrollView>
      ) : null}

      {step === 'method' ? (
        <MethodStep
          // Метод предвыбран по стране из подписи места (без места — Muslim World League).
          initial={suggestMethod(settings.locationLabel)}
          place={settings.locationLabel}
          onDone={finish}
        />
      ) : null}
    </View>
  );
}

function MethodStep({
  initial,
  place,
  onDone,
}: {
  initial: CalculationMethodId;
  place?: string;
  onDone: (m: CalculationMethodId) => void;
}) {
  const [method, setMethod] = useState(initial);
  return (
    <View style={styles.body}>
      <ScrollView contentContainerStyle={styles.scrollBody}>
        <Text style={styles.title}>Метод расчёта</Text>
        <Text style={styles.lead}>
          {place ? `Для «${place}» обычно используют выбранный вариант.` : 'Подходит для большинства стран.'} Его всегда можно сменить в
          настройках намаза.
        </Text>
        <View style={styles.list}>
          {CALCULATION_METHODS.map((m) => (
            <Pressable
              key={m.id}
              style={styles.option}
              onPress={() => setMethod(m.id)}
              accessibilityRole="radio"
              accessibilityState={{ checked: method === m.id }}
            >
              <Text style={styles.optionText}>{m.title}</Text>
              {method === m.id ? <Icon name="check" size={18} color={COLORS.text} /> : null}
            </Pressable>
          ))}
        </View>
      </ScrollView>
      <Pressable style={styles.primary} onPress={() => onDone(method)} accessibilityRole="button">
        <Text style={styles.primaryText}>Готово</Text>
      </Pressable>
      <Pressable style={styles.skip} onPress={() => onDone(initial)} accessibilityRole="button">
        <Text style={styles.skipText}>Пропустить</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: 20 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 16 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.separator },
  dotActive: { width: 18, backgroundColor: COLORS.text },
  body: { flex: 1 },
  scrollBody: { paddingBottom: 16 },
  center: { flex: 1, justifyContent: 'center' },
  brand: { fontSize: 15, fontWeight: '600', color: COLORS.warning, marginBottom: 12 },
  headline: { fontSize: 30, fontWeight: '700', color: COLORS.text, lineHeight: 36 },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.text, marginTop: 12 },
  lead: { fontSize: 15, color: COLORS.muted, marginTop: 10, lineHeight: 21 },
  primary: { backgroundColor: COLORS.text, borderRadius: 8, paddingVertical: 15, alignItems: 'center', marginTop: 20 },
  primaryText: { color: COLORS.onAccent, fontSize: 16, fontWeight: '600' },
  disabled: { opacity: 0.6 },
  secondary: { borderWidth: 1, borderColor: COLORS.separator, borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 10 },
  secondaryText: { color: COLORS.text, fontSize: 16, fontWeight: '500' },
  skip: { alignItems: 'center', paddingVertical: 14 },
  skipText: { color: COLORS.muted, fontSize: 15 },
  error: { color: COLORS.danger, fontSize: 13, marginTop: 8 },
  cityBox: { backgroundColor: COLORS.card, borderRadius: 8, paddingTop: 8, marginTop: 10 },
  list: { backgroundColor: COLORS.card, borderRadius: 8, marginTop: 16, overflow: 'hidden' },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.separator,
  },
  optionText: { fontSize: 16, color: COLORS.text },
});
