// Местоположение для расчёта намазов (docs/spec/prayer-profile.md): текущая подпись,
// «Определить по GPS» и ручной выбор города (офлайн-список, иначе системный геокодер).
// Используется в Профиле, Настройках намаза и онбординге.

import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import * as Location from 'expo-location';

import { useAppData } from '../lib/AppDataContext';
import { searchCities } from '../lib/cities';
import { COLORS } from '../theme/colors';
import { Text, TextInput } from './themed';

/** Ручной выбор города: сначала встроенный офлайн-список, иначе — системный геокодер. */
export function CityPicker({ onPick }: { onPick: (label: string, latitude: number, longitude: number) => void }) {
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


/** Блок «Местоположение»: подпись, GPS и выбор города. onChanged — после успешной смены. */
export function LocationSection({ onChanged }: { onChanged?: () => void }) {
  const { settings, updateSettings, requestLocation, locationError } = useAppData();
  const [busy, setBusy] = useState(false);

  const detect = async () => {
    setBusy(true);
    const ok = await requestLocation();
    setBusy(false);
    if (ok) onChanged?.();
  };

  return (
    <View style={styles.block}>
      <Text style={styles.blockText}>
        {settings.latitude != null
          ? `${settings.locationLabel ? `${settings.locationLabel} · ` : ''}${settings.latitude.toFixed(3)}, ${settings.longitude?.toFixed(3)}`
          : 'Не определено'}
      </Text>
      {locationError ? <Text style={styles.errorText}>{locationError}</Text> : null}
      <Pressable style={styles.refreshButton} onPress={detect} disabled={busy} accessibilityRole="button">
        <Text style={styles.refreshButtonText}>{busy ? 'Определяем…' : 'Определить по GPS'}</Text>
      </Pressable>
      <CityPicker
        onPick={async (label, latitude, longitude) => {
          await updateSettings({ ...settings, latitude, longitude, locationLabel: label });
          onChanged?.();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  block: { backgroundColor: COLORS.card, borderRadius: 8, padding: 4, overflow: 'hidden' },
  blockText: { fontSize: 15, color: COLORS.text, padding: 8 },
  errorText: { fontSize: 12, color: COLORS.danger, paddingHorizontal: 8 },
  refreshButton: { margin: 8, backgroundColor: COLORS.text, borderRadius: 6, paddingVertical: 10, alignItems: 'center' },
  refreshButtonText: { color: COLORS.onAccent, fontWeight: '600' },
  hint: { fontSize: 12, color: COLORS.muted, paddingHorizontal: 8, paddingBottom: 8 },
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
});
