// Настройки намаза (меню аватара, docs/spec/prayer-profile.md): метод расчёта, мазхаб,
// поправка хиджры и город.

import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import dayjs from 'dayjs';

import { Text } from '../components/themed';
import { useAppData } from '../lib/AppDataContext';
import type { MadhabId } from '../lib/types';
import { CALCULATION_METHODS as METHODS } from '../lib/calcMethods';
import { formatHijri, toHijri } from '../lib/hijri';
import { LocationSection } from '../components/LocationSection';
import { COLORS, tagBackground } from '../theme/colors';

const HIJRI_OFFSETS = [-2, -1, 0, 1, 2];

const MADHABS: { id: MadhabId; title: string }[] = [
  { id: 'Shafi', title: 'Шафии (стандартный Аср)' },
  { id: 'Hanafi', title: 'Ханафи (поздний Аср)' },
];

export default function PrayerSettingsScreen() {
  const { settings, updateSettings } = useAppData();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <Text style={styles.sectionLabel}>Метод расчёта намаза</Text>
      <View style={styles.block}>
        {METHODS.map((m) => (
          <Pressable
            key={m.id}
            style={styles.optionRow}
            onPress={() => updateSettings({ ...settings, calculationMethod: m.id })}
          >
            <Text style={styles.optionText}>{m.title}</Text>
            {settings.calculationMethod === m.id ? <Text style={styles.checkmark}>✓</Text> : null}
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionLabel}>Мазхаб (для времени Аср)</Text>
      <View style={styles.block}>
        {MADHABS.map((m) => (
          <Pressable
            key={m.id}
            style={styles.optionRow}
            onPress={() => updateSettings({ ...settings, madhab: m.id })}
          >
            <Text style={styles.optionText}>{m.title}</Text>
            {settings.madhab === m.id ? <Text style={styles.checkmark}>✓</Text> : null}
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionLabel}>Дата по хиджре</Text>
      <View style={styles.block}>
        <Text style={styles.blockText}>
          Сегодня: {formatHijri(toHijri(dayjs().format('YYYY-MM-DD'), settings.hijriOffset ?? 0))}
        </Text>
        <View style={styles.offsetRow}>
          {HIJRI_OFFSETS.map((o) => {
            const active = (settings.hijriOffset ?? 0) === o;
            return (
              <Pressable
                key={o}
                style={[styles.offsetChip, active && styles.offsetChipActive]}
                onPress={() => updateSettings({ ...settings, hijriOffset: o })}
                accessibilityRole="button"
                accessibilityLabel={`Поправка ${o} дн.`}
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.offsetText, active && styles.offsetTextActive]}>{o > 0 ? `+${o}` : o}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.hint}>
          Расчёт по календарю Умм аль-Кура. Если в вашей стране месяц начался на день раньше или позже — поправьте здесь.
        </Text>
      </View>
      <Text style={styles.sectionLabel}>Город</Text>
      <LocationSection />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  sectionLabel: { fontSize: 12, fontWeight: '500', color: COLORS.tertiary, marginBottom: 6, marginTop: 18 },
  block: { backgroundColor: COLORS.card, borderRadius: 8, padding: 4, overflow: 'hidden' },
  blockText: { fontSize: 15, color: COLORS.text, padding: 8 },
  errorText: { fontSize: 12, color: COLORS.danger, paddingHorizontal: 8 },
  refreshButton: { margin: 8, backgroundColor: COLORS.text, borderRadius: 6, paddingVertical: 10, alignItems: 'center' },
  refreshButtonText: { color: COLORS.onAccent, fontWeight: '600' },
  hint: { fontSize: 12, color: COLORS.muted, paddingHorizontal: 8, paddingBottom: 8 },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.separator,
  },
  optionText: { fontSize: 15, color: COLORS.text },
  cityBox: { paddingHorizontal: 8, paddingBottom: 8 },
  cityInput: { backgroundColor: COLORS.hover, borderRadius: 6, padding: 10, fontSize: 15, color: COLORS.text },
  cityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.separator,
  },
  offsetRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 8, paddingBottom: 8 },
  offsetChip: { flex: 1, paddingVertical: 7, borderRadius: 6, backgroundColor: COLORS.hover, alignItems: 'center' },
  offsetChipActive: { backgroundColor: tagBackground(COLORS.primary) },
  offsetText: { fontSize: 14, color: COLORS.muted, fontWeight: '500' },
  offsetTextActive: { color: COLORS.primary },
  checkmark: { color: COLORS.primary, fontWeight: '600' },
});
