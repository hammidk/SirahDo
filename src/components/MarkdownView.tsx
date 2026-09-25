// Отображение лёгкого markdown (см. lib/markdown.ts): жирный, курсив, ссылки, списки.

import { Linking, StyleSheet, View } from 'react-native';
import { Text } from './themed';
import type { StyleProp, TextStyle } from 'react-native';

import type { InlineNode } from '../lib/markdown';
import { parseMarkdown } from '../lib/markdown';
import { COLORS } from './ui';

function openLink(url: string) {
  // Открываем только http(s) и mailto — прочие схемы из текста не трогаем.
  if (/^(https?:|mailto:)/i.test(url)) Linking.openURL(url).catch(() => undefined);
}

function Inline({ nodes }: { nodes: InlineNode[] }) {
  return (
    <>
      {nodes.map((n, i) => {
        switch (n.type) {
          case 'text':
            return <Text key={i}>{n.text}</Text>;
          case 'bold':
            return (
              <Text key={i} style={styles.bold}>
                <Inline nodes={n.children} />
              </Text>
            );
          case 'italic':
            return (
              <Text key={i} style={styles.italic}>
                <Inline nodes={n.children} />
              </Text>
            );
          case 'link':
            return (
              <Text key={i} style={styles.link} onPress={() => openLink(n.url)} accessibilityRole="link">
                {n.text}
              </Text>
            );
        }
      })}
    </>
  );
}

export function MarkdownView({ text, style }: { text: string; style?: StyleProp<TextStyle> }) {
  const blocks = parseMarkdown(text);
  return (
    <View style={styles.container}>
      {blocks.map((b, i) => {
        if (b.type === 'paragraph') {
          return (
            <Text key={i} style={[styles.text, style]}>
              {b.inline.length > 0 ? <Inline nodes={b.inline} /> : ' '}
            </Text>
          );
        }
        return (
          <View key={i} style={styles.listRow}>
            <Text style={[styles.text, styles.marker, style]}>{b.type === 'bullet' ? '•' : `${b.index}.`}</Text>
            <Text style={[styles.text, styles.listText, style]}>
              <Inline nodes={b.inline} />
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 2 },
  text: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
  bold: { fontWeight: '700' },
  italic: { fontStyle: 'italic' },
  link: { color: COLORS.primary, textDecorationLine: 'underline' },
  listRow: { flexDirection: 'row', gap: 6, paddingLeft: 4 },
  marker: { minWidth: 16, color: COLORS.muted },
  listText: { flex: 1 },
});
