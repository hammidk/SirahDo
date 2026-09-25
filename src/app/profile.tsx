// Профиль: местоположение, метод расчёта намаза, мазхаб, поправка хиджры.
// Открывается шестерёнкой в шапке «Сегодня».

import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '../components/themed';
import * as Location from 'expo-location';
import dayjs from 'dayjs';

import { useAppData } from '../lib/AppDataContext';
import type { CalculationMethodId, MadhabId } from '../lib/types';
import { formatHijri, toHijri } from '../lib/hijri';
import { searchCities } from '../lib/cities';
import { COLORS } from '../theme/colors';
import { tagBackground } from '../theme/colors';

const METHODS: { id: CalculationMethodId; title: string }[] = [
  { id: 'MuslimWorldLeague', title: 'Muslim World League' },
  { id: 'Egyptian', title: 'Egyptian' },
  { id: 'Karachi', title: 'Karachi' },
  { id: 'UmmAlQura', title: 'Umm al-Qura' },
  { id: 'Dubai', title: 'Dubai' },
  { id: 'MoonsightingCommittee', title: 'Moonsighting Committee' },
  { id: 'NorthAmerica', title: 'ISNA (North America)' },
  { id: 'Turkey', title: 'Turkey (Diyanet)' },
];

/** Ручной выбор города: сначала встроенный офлайн-список, иначе — системный геокодер. */
function CityPicker({ onPick }: { onPick: (label: string, latitude: number, longitude: number) => void }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const matches = searchCities(query);

  const geocode = async () => {
    const q = query.trim();
    if (!q) return;
    setStatus('Ищем…');
    try {
      const [hit] = await Location.geocodeAsync(q);
      if (!hit) {
        setStatus('Город не найден. Попробуйте написать иначе.');
        return;
      }
      onPick(q, hit.latitude, hit.longitude);
      setQuery('');
      setStatus(null);
    } catch {
      setStatus(
        Platform.OS === 'web'
          ? 'Поиск по названию работает в приложении на телефоне. Выберите город из списка.'
          : 'Не удалось найти город — проверьте интернет или выберите из списка.'
      );
    }
  };

  return (
    <View style={styles.cityBox}>
      <TextInput
        style={styles.cityInput}
        placeholder="Или введите город вручную"
       
        value={query}
        onChangeText={(t) => {
          setQuery(t);
          setStatus(null);
        }}
        onSubmitEditing={() => (matches[0] ? onPick(`${matches[0].name}, ${matches[0].country}`, matches[0].latitude, matches[0].longitude) : geocode())}
        returnKeyType="search"
        accessibilityLabel="Город"
      />
      {matches.map((c) => (
        <Pressable
          key={`${c.name}_${c.country}`}
          style={styles.cityRow}
          onPress={() => {
            onPick(`${c.name}, ${c.country}`, c.latitude, c.longitude);
            setQuery('');
          }}
          accessibilityRole="button"
        >
          <Text style={styles.optionText}>{c.name}</Text>
          <Text style={styles.hint}>{c.country}</Text>
        </Pressable>
      ))}
      {query.trim() && matches.length === 0 ? (
        <Pressable style={styles.cityRow} onPress={geocode} accessibilityRole="button">
          <Text style={[styles.optionText, { color: COLORS.primary }]}>Найти «{query.trim()}»</Text>
        </Pressable>
      ) : null}
      {status ? <Text style={styles.hint}>{status}</Text> : null}
    </View>
  );
}

const HIJRI_OFFSETS = [-2, -1, 0, 1, 2];

const MADHABS: { id: MadhabId; title: string }[] = [
  { id: 'Shafi', title: 'Шафии (стандартный Аср)' },
  { id: 'Hanafi', title: 'Ханафи (поздний Аср)' },
];

export default function ProfileScreen() {
  const { settings, updateSettings, requestLocation, locationError } = useAppData();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.sectionLabel}>Местоположение</Text>
      <View style={styles.block}>
        <Text style={styles.blockText}>
          {settings.latitude != null
            ? `${settings.locationLabel ? `${settings.locationLabel} · ` : ''}${settings.latitude.toFixed(3)}, ${settings.longitude?.toFixed(3)}`
            : 'Не определено'}
        </Text>
        {locationError ? <Text style={styles.errorText}>{locationError}</Text> : null}
        <Pressable style={styles.refreshButton} onPress={requestLocation} accessibilityRole="button">
          <Text style={styles.refreshButtonText}>Определить по GPS</Text>
        </Pressable>
        <CityPicker
          onPick={(label, latitude, longitude) => updateSettings({ ...settings, latitude, longitude, locationLabel: label })}
        />
      </View>

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
