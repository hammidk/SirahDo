// Профиль (меню аватара): имя (первая буква — на аватаре) и местоположение.

import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { Text, TextInput } from '../components/themed';
import { useAppData } from '../lib/AppDataContext';
import { LocationSection } from '../components/LocationSection';
import { COLORS } from '../theme/colors';

export default function ProfileScreen() {
  const { settings, updateSettings } = useAppData();
  const [name, setName] = useState(settings.userName ?? '');

  const saveName = () => {
    const next = name.trim() || undefined;
    if (next !== settings.userName) updateSettings({ ...settings, userName: next });
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <Text style={styles.sectionLabel}>Имя</Text>
      <TextInput
        style={styles.input}
        placeholder="Как к вам обращаться"
        value={name}
        onChangeText={setName}
        onBlur={saveName}
        onSubmitEditing={saveName}
        returnKeyType="done"
        autoCapitalize="words"
        accessibilityLabel="Имя"
      />
      <Text style={styles.hint}>Первая буква имени появится на аватаре.</Text>

      <Text style={styles.sectionLabel}>Местоположение</Text>
      <LocationSection />
      <Text style={styles.hint}>По нему считается время намазов. Метод расчёта и мазхаб — в «Настройках намаза».</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  sectionLabel: { fontSize: 12, fontWeight: '500', color: COLORS.tertiary, marginBottom: 6, marginTop: 18 },
  input: { fontSize: 16, backgroundColor: COLORS.card, borderRadius: 8, padding: 12, color: COLORS.text },
  hint: { fontSize: 12, color: COLORS.muted, marginTop: 6 },
});
