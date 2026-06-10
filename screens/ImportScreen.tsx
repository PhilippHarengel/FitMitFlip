import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { parseNotes, type ParseResult, type ParsedSet } from '../db/importNotes';
import { importSessions } from '../db/queries';

// Compact set summary: "12, 12, 12 @ 55kg" when one weight, else "20@120, 16@180".
function formatSets(sets: ParsedSet[]): string {
  const weights = new Set(sets.map(s => s.weightKg));
  if (weights.size === 1) {
    const w = sets[0].weightKg;
    return `${sets.map(s => s.reps).join(', ')}${w != null ? ` @ ${w}kg` : ' (bodyweight)'}`;
  }
  return sets.map(s => `${s.reps}@${s.weightKg != null ? s.weightKg + 'kg' : 'bw'}`).join(', ');
}

const PLACEHOLDER = `2026-05-01: upper body
pull ups   8, 8, 6 - bodyweight
incline dumbbell press   10, 10, 10 - 22kg
lat pulldown   12, 12, 12 - 77kg

2026-05-03: leg day
leg curls   12, 12, 12 - 40kg
...`;

export default function ImportScreen({ visible, onClose, onImported }: {
  visible: boolean;
  onClose: () => void;
  onImported: () => void;
}) {
  const [text, setText] = useState('');
  const [preview, setPreview] = useState<ParseResult | null>(null);
  const [importing, setImporting] = useState(false);

  function handlePreview() {
    const result = parseNotes(text);
    setPreview(result);
    if (result.sessions.length === 0) {
      Alert.alert('Nothing parsed', 'No dated session headers found. Each session must start with e.g. "2026-05-01: upper body".');
    }
  }

  async function handleImport() {
    if (!preview || preview.sessions.length === 0) return;
    setImporting(true);
    try {
      const { workouts, sets } = await importSessions(preview.sessions);
      setImporting(false);
      Alert.alert('Imported', `${workouts} sessions, ${sets} sets added.`, [
        { text: 'OK', onPress: () => { setText(''); setPreview(null); onImported(); onClose(); } },
      ]);
    } catch (e: any) {
      setImporting(false);
      Alert.alert('Import failed', e?.message ?? 'Unknown error');
    }
  }

  function reset() {
    setText('');
    setPreview(null);
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={reset}>
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <TouchableOpacity onPress={reset}><Text style={s.cancel}>Cancel</Text></TouchableOpacity>
          <Text style={s.title}>Import past data</Text>
          <TouchableOpacity onPress={handlePreview}><Text style={s.preview}>Preview</Text></TouchableOpacity>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
            <Text style={s.hint}>
              Paste your notes. Each session starts with a date header like{'\n'}
              <Text style={s.mono}>2026-05-01: upper body</Text>{'\n'}
              then one exercise per line: name, reps (comma-separated), then " - " and the weight.
            </Text>

            <TextInput
              style={s.input}
              value={text}
              onChangeText={setText}
              placeholder={PLACEHOLDER}
              placeholderTextColor="#bbb"
              multiline
              autoCapitalize="none"
              autoCorrect={false}
            />

            {preview && (
              <View style={s.previewBox}>
                <Text style={s.previewTitle}>
                  {preview.sessions.length} sessions · {preview.totalSets} sets
                </Text>

                {preview.sessions.map((sess, i) => (
                  <View key={i} style={s.sessRow}>
                    <Text style={s.sessHead}>
                      {sess.date} · {sess.split}{sess.splitMapped ? '' : ' ⚠'}
                    </Text>
                    {sess.exercises.map((ex, j) => (
                      <Text key={j} style={s.exLine}>
                        {ex.mapped ? '' : '⚠ '}{ex.name} — {formatSets(ex.sets)}
                      </Text>
                    ))}
                  </View>
                ))}

                {preview.warnings.length > 0 && (
                  <View style={s.warnBox}>
                    <Text style={s.warnTitle}>⚠ {preview.warnings.length} warnings</Text>
                    {preview.warnings.map((w, i) => (
                      <Text key={i} style={s.warnLine}>{w}</Text>
                    ))}
                  </View>
                )}

                <TouchableOpacity
                  style={[s.importBtn, (importing || preview.sessions.length === 0) && s.importBtnDisabled]}
                  onPress={handleImport}
                  disabled={importing || preview.sessions.length === 0}
                >
                  <Text style={s.importBtnText}>
                    {importing ? 'Importing…' : `Import ${preview.sessions.length} sessions`}
                  </Text>
                </TouchableOpacity>
                <Text style={s.safeNote}>Re-importing the same data is safe — it overwrites, never duplicates.</Text>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#ddd' },
  title: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '600', color: '#111', marginHorizontal: 8 },
  cancel: { fontSize: 15, color: '#666' },
  preview: { fontSize: 15, color: '#007aff', fontWeight: '600' },
  body: { padding: 16, gap: 12, paddingBottom: 48 },
  hint: { fontSize: 13, color: '#777', lineHeight: 19 },
  mono: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: '#111' },
  input: { backgroundColor: '#f7f7f7', color: '#111', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 18, padding: 12, fontSize: 14, minHeight: 200, textAlignVertical: 'top', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  previewBox: { gap: 10, marginTop: 8 },
  previewTitle: { fontSize: 15, fontWeight: '700', color: '#111' },
  sessRow: { backgroundColor: '#f8f8f8', borderRadius: 18, padding: 12 },
  sessHead: { fontSize: 14, fontWeight: '700', color: '#222', marginBottom: 6 },
  exLine: { fontSize: 13, color: '#555', paddingVertical: 1 },
  warnBox: { backgroundColor: '#fff8ee', borderRadius: 18, padding: 12 },
  warnTitle: { fontSize: 13, fontWeight: '700', color: '#e67e00', marginBottom: 4 },
  warnLine: { fontSize: 12, color: '#a06000', paddingVertical: 1 },
  importBtn: { backgroundColor: '#111', borderRadius: 18, padding: 14, alignItems: 'center', marginTop: 4 },
  importBtnDisabled: { backgroundColor: '#bbb' },
  importBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  safeNote: { fontSize: 12, color: '#999', textAlign: 'center' },
});
