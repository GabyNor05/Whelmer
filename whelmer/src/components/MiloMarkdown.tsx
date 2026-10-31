// src/components/MiloMarkdown.tsx
// Renders the markdown Milo replies with (headings, lists, bold, italics, code) as native text.
import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Colors } from '../constants/Colors';
import { normalizeMiloText } from '../utils/miloText';

// Renders the inline markdown Milo uses: **bold**, *italic* / _italic_, `code`
const renderInline = (line: string, keyPrefix: string) => {
  const tokens = line.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*|_[^_\s][^_]*_)/g);
  return tokens.map((tok, i) => {
    const key = `${keyPrefix}-${i}`;
    if (tok.startsWith('**') && tok.endsWith('**') && tok.length > 4) {
      return <Text selectable key={key} style={styles.boldText}>{tok.slice(2, -2)}</Text>;
    }
    if (tok.startsWith('`') && tok.endsWith('`') && tok.length > 2) {
      return <Text selectable key={key} style={styles.codeText}>{tok.slice(1, -1)}</Text>;
    }
    if ((tok.startsWith('*') && tok.endsWith('*')) || (tok.startsWith('_') && tok.endsWith('_'))) {
      if (tok.length > 2) return <Text selectable key={key} style={styles.italicText}>{tok.slice(1, -1)}</Text>;
    }
    // Strip any stray markdown symbols left over
    return tok.replace(/\*\*/g, '').replace(/`/g, '');
  });
};

// Block-level markdown: headings, bullet and numbered lists, rules, paragraphs
export const FormattedMiloText = ({ text }: { text: string }) => {
  // Clean up tables, <br> and emoji numbers before rendering
  const lines = normalizeMiloText(text).split('\n');

  return (
    <View>
      {lines.map((raw, idx) => {
        const line = raw.trim();
        const key = `l${idx}`;

        if (!line) return <View key={key} style={styles.mdSpacer} />;

        // Horizontal rule: ---, ***, ___
        if (/^([-*_])\1{2,}$/.test(line)) return <View key={key} style={styles.mdRule} />;

        // Headings: # to ######
        const heading = line.match(/^(#{1,6})\s+(.*)$/);
        if (heading) {
          const level = heading[1].length;
          const content = heading[2].replace(/#+\s*$/, '').replace(/\*\*/g, '');
          return (
            <Text selectable key={key} style={[styles.miloText, level <= 2 ? styles.mdH1 : styles.mdH3]}>
              {renderInline(content, key)}
            </Text>
          );
        }

        // Bullets: -, *, +, •
        const bullet = raw.match(/^(\s*)[-*+•]\s+(.*)$/);
        if (bullet) {
          const indent = Math.min(Math.floor(bullet[1].replace(/\t/g, '  ').length / 2), 3);
          return (
            <View key={key} style={[styles.mdListRow, { paddingLeft: indent * 14 }]}>
              <Text style={[styles.miloText, styles.mdMarker]}>•</Text>
              <Text selectable style={[styles.miloText, styles.mdListText]}>{renderInline(bullet[2], key)}</Text>
            </View>
          );
        }

        // Numbered: 1. or 1)
        const numbered = raw.match(/^(\s*)(\d+)[.)]\s+(.*)$/);
        if (numbered) {
          const indent = Math.min(Math.floor(numbered[1].length / 2), 3);
          return (
            <View key={key} style={[styles.mdListRow, { paddingLeft: indent * 14 }]}>
              <Text style={[styles.miloText, styles.mdMarker, styles.boldText]}>{numbered[2]}.</Text>
              <Text selectable style={[styles.miloText, styles.mdListText]}>{renderInline(numbered[3], key)}</Text>
            </View>
          );
        }

        // Blockquote
        const quote = line.match(/^>\s?(.*)$/);
        if (quote) {
          return (
            <Text selectable key={key} style={[styles.miloText, styles.italicText]}>
              {renderInline(quote[1], key)}
            </Text>
          );
        }

        return (
          <Text selectable key={key} style={styles.miloText}>
            {renderInline(line, key)}
          </Text>
        );
      })}
    </View>
  );
};

export default FormattedMiloText;

const styles = StyleSheet.create({
  miloText: { fontSize: 15, lineHeight: 22, color: Colors.textDark },
  boldText: { fontWeight: '700', color: Colors.textDark },
  italicText: { fontStyle: 'italic' },
  codeText: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 14, backgroundColor: '#F9FAF3' },
  mdH1: { fontSize: 18, lineHeight: 24, fontWeight: '700', marginTop: 4, marginBottom: 2 },
  mdH3: { fontSize: 16, lineHeight: 22, fontWeight: '700', marginTop: 4, marginBottom: 2 },
  mdListRow: { flexDirection: 'row', alignItems: 'flex-start', marginVertical: 2 },
  mdMarker: { width: 22 },
  mdListText: { flex: 1 },
  mdSpacer: { height: 6 },
  mdRule: { height: 1, backgroundColor: 'rgba(0,0,0,0.08)', marginVertical: 8 },
});
