import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { useFocusEffect } from '@react-navigation/native';
import { lookupBarcode, searchByName, type ProductResult } from '../api/openFoodFacts';
import {
  deleteFoodLogEntry,
  getFoodByBarcode,
  getFoodLogForDate,
  logFood,
  toDateString,
  upsertFood,
  type FoodLogEntry,
  type Food,
} from '../db/queries';
import { today } from '../db/queries';

// A product staged for the serving modal, with where it came from so the DB
// write records the right source ('manual' entries never expire from cache).
type PendingFood = ProductResult & { source: 'api' | 'manual' };

// ─── Manual entry modal ──────────────────────────────────────────────────────

type ManualEntryProps = {
  visible: boolean;
  onClose: () => void;
  onSave: (result: ProductResult) => void;
  prefillName?: string;
  barcode?: string | null;
};

function ManualEntryModal({ visible, onClose, onSave, prefillName = '', barcode = null }: ManualEntryProps) {
  const [name, setName] = useState(prefillName);
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');

  // Reset the form whenever it reopens for a different product.
  useEffect(() => {
    if (visible) {
      setName(prefillName);
      setKcal(''); setProtein(''); setCarbs(''); setFat('');
    }
  }, [visible, prefillName]);

  function handleSave() {
    if (!name.trim()) {
      Alert.alert('Name required', 'Enter a product name.');
      return;
    }
    onSave({
      barcode,   // carry the scanned barcode so future scans find this entry
      name: name.trim(),
      nutriments: {
        kcal_per_100g: kcal ? parseFloat(kcal) : null,
        protein_g: protein ? parseFloat(protein) : null,
        carbs_g: carbs ? parseFloat(carbs) : null,
        fat_g: fat ? parseFloat(fat) : null,
        incomplete: !kcal || !protein || !carbs || !fat,
      },
    });
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <SafeAreaView style={ms.safe}>
        <View style={ms.header}>
          <TouchableOpacity onPress={onClose}><Text style={ms.cancel}>Cancel</Text></TouchableOpacity>
          <Text style={ms.title}>Add Manually</Text>
          <TouchableOpacity onPress={handleSave}><Text style={ms.save}>Save</Text></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={ms.body} keyboardShouldPersistTaps="handled">
          <Text style={ms.label}>Product name</Text>
          <TextInput style={ms.input} value={name} onChangeText={setName} autoFocus autoCapitalize="words" />
          {barcode ? <Text style={ms.hint}>Barcode {barcode} — saved so the next scan finds it instantly.</Text> : null}
          <Text style={ms.hint}>Values per 100g</Text>
          <View style={ms.row}>
            <View style={ms.field}>
              <Text style={ms.label}>kcal</Text>
              <TextInput style={ms.input} value={kcal} onChangeText={setKcal} keyboardType="decimal-pad" />
            </View>
            <View style={ms.field}>
              <Text style={ms.label}>Protein (g)</Text>
              <TextInput style={ms.input} value={protein} onChangeText={setProtein} keyboardType="decimal-pad" />
            </View>
          </View>
          <View style={ms.row}>
            <View style={ms.field}>
              <Text style={ms.label}>Carbs (g)</Text>
              <TextInput style={ms.input} value={carbs} onChangeText={setCarbs} keyboardType="decimal-pad" />
            </View>
            <View style={ms.field}>
              <Text style={ms.label}>Fat (g)</Text>
              <TextInput style={ms.input} value={fat} onChangeText={setFat} keyboardType="decimal-pad" />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Serving modal ───────────────────────────────────────────────────────────

type ServingProps = {
  visible: boolean;
  product: ProductResult | null;
  onClose: () => void;
  onConfirm: (serving: number) => void;
};

function ServingModal({ visible, product, onClose, onConfirm }: ServingProps) {
  const [serving, setServing] = useState('100');
  if (!product) return null;

  const g = parseFloat(serving) || 0;
  const kcal = product.nutriments.kcal_per_100g != null ? (g / 100) * product.nutriments.kcal_per_100g : null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <SafeAreaView style={ms.safe}>
        <View style={ms.header}>
          <TouchableOpacity onPress={onClose}><Text style={ms.cancel}>Cancel</Text></TouchableOpacity>
          <Text style={ms.title} numberOfLines={1}>{product.name}</Text>
          <TouchableOpacity onPress={() => { if (g > 0) { onConfirm(g); setServing('100'); } else { Alert.alert('Invalid serving', 'Enter a value greater than 0.'); } }}>
            <Text style={ms.save}>Add</Text>
          </TouchableOpacity>
        </View>
        <View style={ms.body}>
          {product.nutriments.incomplete && (
            <Text style={ms.warning}>⚠ Some nutrition data is missing for this product.</Text>
          )}
          <Text style={ms.label}>Serving (g — use gram equivalent for liquids, e.g. 200 for 200ml)</Text>
          <TextInput
            style={ms.input}
            value={serving}
            onChangeText={setServing}
            keyboardType="decimal-pad"
            autoFocus
            selectTextOnFocus
          />
          {kcal != null && (
            <Text style={ms.preview}>{Math.round(kcal)} kcal for {g}g</Text>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function FoodScreen() {
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [foodLog, setFoodLog] = useState<(FoodLogEntry & Food)[]>([]);

  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ProductResult[]>([]);
  const [searching, setSearching] = useState(false);

  const [showCamera, setShowCamera] = useState(false);
  const scanningRef = useRef(false);
  const [permission, requestPermission] = useCameraPermissions();

  // Reset scan lock whenever the camera closes.
  useEffect(() => {
    if (!showCamera) scanningRef.current = false;
  }, [showCamera]);

  const [manualVisible, setManualVisible] = useState(false);
  const [manualPrefill, setManualPrefill] = useState('');
  const [manualBarcode, setManualBarcode] = useState<string | null>(null);
  const [servingProduct, setServingProduct] = useState<PendingFood | null>(null);

  const dateStr = toDateString(date);
  const isToday = dateStr === today();

  const load = useCallback(async () => {
    const fl = await getFoodLogForDate(dateStr);
    setFoodLog(fl);
  }, [dateStr]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // ── Search ──────────────────────────────────────────────────────────────────
  async function handleSearch() {
    if (!query.trim()) return;
    setSearching(true);
    setSearchResults([]);
    const results = await searchByName(query.trim());
    setSearchResults(results);
    setSearching(false);
  }

  // ── Barcode scan ────────────────────────────────────────────────────────────
  async function handleOpenCamera() {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) { Alert.alert('Camera required', 'Allow camera access in Settings to scan barcodes.'); return; }
    }
    setShowCamera(true);
  }

  async function handleBarcode({ data }: BarcodeScanningResult) {
    if (scanningRef.current) return;
    scanningRef.current = true;   // synchronous — blocks all subsequent callbacks immediately
    setShowCamera(false);

    // 1. Local cache first — your own manual entries and recent API results.
    //    Instant, works offline, and the whole point of this feature.
    const cached = await getFoodByBarcode(data);
    if (cached) {
      setServingProduct({
        barcode: cached.barcode,
        name: cached.name,
        nutriments: {
          kcal_per_100g: cached.kcal_per_100g,
          protein_g: cached.protein_g,
          carbs_g: cached.carbs_g,
          fat_g: cached.fat_g,
          incomplete: [cached.kcal_per_100g, cached.protein_g, cached.carbs_g, cached.fat_g].some(v => v == null),
        },
        source: cached.source,
      });
      return;
    }

    // 2. Not cached — ask OpenFoodFacts.
    const product = await lookupBarcode(data);
    if (product) {
      setServingProduct({ ...product, source: 'api' });
      return;
    }

    // 3. Nobody has it — let the user enter it once, saved against this barcode.
    Alert.alert('Not found', `"${data}" is not in OpenFoodFacts. Add it once and the next scan finds it instantly.`, [
      { text: 'Add manually', onPress: () => { setManualPrefill(''); setManualBarcode(data); setManualVisible(true); } },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  // ── Add product to log ──────────────────────────────────────────────────────
  function handleSelectProduct(product: ProductResult) {
    setSearchResults([]);
    setQuery('');
    setServingProduct({ ...product, source: 'api' });
  }

  function handleManualSave(product: ProductResult) {
    setServingProduct({ ...product, source: 'manual' });
    setManualBarcode(null);
  }

  async function handleConfirmServing(servingG: number) {
    if (!servingProduct) return;
    const foodId = await upsertFood({
      barcode: servingProduct.barcode,
      name: servingProduct.name,
      kcal_per_100g: servingProduct.nutriments.kcal_per_100g,
      protein_g: servingProduct.nutriments.protein_g,
      carbs_g: servingProduct.nutriments.carbs_g,
      fat_g: servingProduct.nutriments.fat_g,
      cached_at: today(),
      source: servingProduct.source,
    });
    await logFood(dateStr, foodId, servingG);
    setServingProduct(null);
    await load();
  }

  async function handleDelete(id: number, name: string) {
    Alert.alert('Remove from log?', name, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => { await deleteFoodLogEntry(id); await load(); } },
    ]);
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Date navigator */}
        <View style={s.dateRow}>
          <TouchableOpacity onPress={() => setDate(d => { const n = new Date(d); n.setDate(n.getDate() - 1); return n; })}>
            <Text style={s.arrow}>‹</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowDatePicker(true)}>
            <Text style={s.dateLabel}>{isToday ? 'Today' : date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setDate(d => { const n = new Date(d); n.setDate(n.getDate() + 1); return n; })}>
            <Text style={s.arrow}>›</Text>
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display="spinner"
            maximumDate={new Date()}
            onChange={(_, d) => { setShowDatePicker(false); if (d) setDate(d); }}
          />
        )}

        {/* Search bar + scan button */}
        <View style={s.searchRow}>
          <TextInput
            style={s.searchInput}
            placeholder="Search food…"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          <TouchableOpacity style={s.scanBtn} onPress={handleOpenCamera}>
            <Text style={s.scanIcon}>⊡</Text>
          </TouchableOpacity>
        </View>

        {/* Search results */}
        {searching && <ActivityIndicator style={{ marginTop: 12 }} />}
        {searchResults.length > 0 && (
          <View style={s.resultsBox}>
            <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 220 }}>
              {searchResults.map((r, i) => (
                <TouchableOpacity key={i} style={s.resultRow} onPress={() => handleSelectProduct(r)}>
                  <Text style={s.resultName} numberOfLines={1}>{r.name}</Text>
                  {r.nutriments.kcal_per_100g != null && (
                    <Text style={s.resultKcal}>{Math.round(r.nutriments.kcal_per_100g)} kcal/100g</Text>
                  )}
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={[s.resultRow, { borderTopWidth: 1, borderTopColor: '#eee' }]}
                onPress={() => { setSearchResults([]); setManualPrefill(query); setManualBarcode(null); setManualVisible(true); }}>
                <Text style={[s.resultName, { color: '#007aff' }]}>+ Add "{query}" manually</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}

        {/* Food log */}
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          {foodLog.length === 0 ? (
            <Text style={s.empty}>No food logged yet. Search or scan to add entries.</Text>
          ) : (
            foodLog.map(entry => {
              const kcal = entry.kcal_per_100g != null
                ? Math.round((entry.serving_g / 100) * entry.kcal_per_100g)
                : null;
              return (
                <TouchableOpacity key={entry.id} style={s.logRow}
                  onLongPress={() => handleDelete(entry.id, entry.name)}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.logName} numberOfLines={1}>{entry.name}</Text>
                    <Text style={s.logDetail}>{entry.serving_g}g{kcal != null ? ` · ${kcal} kcal` : ''}</Text>
                  </View>
                  <Text style={s.logDelete}>✕</Text>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>

        {/* Camera modal */}
        <Modal visible={showCamera} animationType="slide" onRequestClose={() => setShowCamera(false)}>
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'] }}
            onBarcodeScanned={handleBarcode}
          >
            <SafeAreaView style={s.cameraOverlay}>
              <TouchableOpacity style={s.closeBtn} onPress={() => setShowCamera(false)}>
                <Text style={s.closeText}>✕  Close</Text>
              </TouchableOpacity>
              <View style={s.scanFrame} />
              <Text style={s.scanHint}>Point at a barcode</Text>
            </SafeAreaView>
          </CameraView>
        </Modal>

        {/* Modals */}
        <ManualEntryModal
          visible={manualVisible}
          prefillName={manualPrefill}
          barcode={manualBarcode}
          onClose={() => setManualVisible(false)}
          onSave={handleManualSave}
        />
        <ServingModal
          visible={!!servingProduct}
          product={servingProduct}
          onClose={() => setServingProduct(null)}
          onConfirm={handleConfirmServing}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  scroll: { padding: 16, gap: 8, paddingBottom: 40 },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 20 },
  arrow: { fontSize: 28, color: '#333', paddingHorizontal: 8 },
  dateLabel: { fontSize: 17, fontWeight: '600', color: '#111' },
  searchRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  searchInput: { flex: 1, backgroundColor: '#f2f2f2', borderRadius: 10, padding: 10, fontSize: 15 },
  scanBtn: { backgroundColor: '#111', borderRadius: 10, width: 44, alignItems: 'center', justifyContent: 'center' },
  scanIcon: { color: '#fff', fontSize: 20 },
  resultsBox: { marginHorizontal: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10, marginBottom: 8 },
  resultRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8 },
  resultName: { flex: 1, fontSize: 14, color: '#222' },
  resultKcal: { fontSize: 12, color: '#888' },
  logRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f8f8', borderRadius: 10, padding: 12 },
  logName: { fontSize: 14, fontWeight: '500', color: '#222' },
  logDetail: { fontSize: 12, color: '#888', marginTop: 2 },
  logDelete: { color: '#ccc', fontSize: 16, paddingLeft: 8 },
  empty: { fontSize: 13, color: '#aaa', fontStyle: 'italic', marginTop: 4 },
  cameraOverlay: { flex: 1, justifyContent: 'space-between', alignItems: 'center', padding: 24 },
  closeBtn: { alignSelf: 'flex-start', backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  closeText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  scanFrame: { width: 240, height: 160, borderWidth: 2, borderColor: '#fff', borderRadius: 8 },
  scanHint: { color: '#fff', fontSize: 14, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
});

const ms = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#ddd' },
  title: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '600', color: '#111', marginHorizontal: 8 },
  cancel: { fontSize: 15, color: '#666' },
  save: { fontSize: 15, color: '#007aff', fontWeight: '600' },
  body: { padding: 20, gap: 8 },
  label: { fontSize: 13, color: '#666', marginBottom: 4, marginTop: 8 },
  hint: { fontSize: 13, color: '#aaa', marginTop: 4 },
  input: { backgroundColor: '#f2f2f2', borderRadius: 8, padding: 10, fontSize: 15 },
  row: { flexDirection: 'row', gap: 12 },
  field: { flex: 1 },
  preview: { fontSize: 14, color: '#555', marginTop: 8 },
  warning: { fontSize: 13, color: '#e67e00', backgroundColor: '#fff8ee', borderRadius: 8, padding: 10, marginBottom: 8 },
});
