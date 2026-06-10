import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, SafeAreaView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useFocusEffect } from '@react-navigation/native';
import DateNavigator from '../components/DateNavigator';
import { useSelectedDate } from '../components/DateContext';
import { Screen, Card, ListSection, ListRow, Sheet, SwipeRow, Icon } from '../components/ui';
import { useTheme, type Theme } from '../theme';
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

// A product staged for the serving sheet, with where it came from so the DB
// write records the right source ('manual' entries never expire from cache).
type PendingFood = ProductResult & { source: 'api' | 'manual' };

export default function FoodScreen() {
  const t = useTheme();
  const { date, setDate } = useSelectedDate();
  const [foodLog, setFoodLog] = useState<(FoodLogEntry & Food)[]>([]);

  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ProductResult[]>([]);
  const [searching, setSearching] = useState(false);

  const [showCamera, setShowCamera] = useState(false);
  const scanningRef = useRef(false);
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    if (!showCamera) scanningRef.current = false;
  }, [showCamera]);

  const [manualVisible, setManualVisible] = useState(false);
  const [manualPrefill, setManualPrefill] = useState('');
  const [manualBarcode, setManualBarcode] = useState<string | null>(null);
  const [servingProduct, setServingProduct] = useState<PendingFood | null>(null);

  const dateStr = toDateString(date);

  const load = useCallback(async () => {
    setFoodLog(await getFoodLogForDate(dateStr));
  }, [dateStr]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // ── Search ────────────────────────────────────────────────────────────────
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
    scanningRef.current = true; // synchronous — blocks subsequent callbacks immediately
    setShowCamera(false);

    // 1. Local cache first — your own manual entries and recent API results.
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

  // Swipe-to-delete: a deliberate gesture + tap on Delete, so no extra confirm.
  async function removeEntry(id: number) {
    await deleteFoodLogEntry(id);
    await load();
  }

  return (
    <Screen topSafeArea header={<DateNavigator date={date} onChange={setDate} maximumDate={new Date()} />}>
      {/* Search + scan */}
      <View style={{ flexDirection: 'row', gap: t.spacing.sm }}>
        <TextInput
          style={{ flex: 1, backgroundColor: t.colors.card, color: t.colors.label, borderRadius: t.radius.control, paddingHorizontal: t.spacing.md, height: 44, fontSize: 16 }}
          placeholder="Search food…"
          placeholderTextColor={t.colors.secondaryLabel}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <Pressable
          onPress={handleOpenCamera}
          style={({ pressed }) => ({ width: 44, height: 44, borderRadius: t.radius.control, backgroundColor: t.colors.accent, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.85 : 1 })}
        >
          <Icon name="barcode.viewfinder" color="#FFFFFF" size={24} />
        </Pressable>
      </View>

      {searching && <ActivityIndicator color={t.colors.secondaryLabel} />}

      {/* Search results */}
      {searchResults.length > 0 && (
        <ListSection header="Results">
          {searchResults.map((r, i) => (
            <ListRow
              key={i}
              title={r.name}
              value={r.nutriments.kcal_per_100g != null ? `${Math.round(r.nutriments.kcal_per_100g)} kcal/100g` : undefined}
              onPress={() => handleSelectProduct(r)}
              chevron={false}
            />
          ))}
          <ListRow
            title={`Add "${query}" manually`}
            iconColor={t.colors.accent}
            icon="plus"
            chevron={false}
            onPress={() => { setSearchResults([]); setManualPrefill(query); setManualBarcode(null); setManualVisible(true); }}
          />
        </ListSection>
      )}

      {/* Food log */}
      {foodLog.length === 0 ? (
        <Card>
          <Text style={{ fontSize: 15, color: t.colors.secondaryLabel, textAlign: 'center' }}>
            No food logged yet.{'\n'}Search or scan a barcode to add entries.
          </Text>
        </Card>
      ) : (
        <ListSection header="Logged today">
          {foodLog.map(entry => {
            const kcal = entry.kcal_per_100g != null ? Math.round((entry.serving_g / 100) * entry.kcal_per_100g) : null;
            return (
              <SwipeRow key={entry.id} onDelete={() => removeEntry(entry.id)}>
                <View style={{ paddingVertical: 12, paddingHorizontal: t.spacing.lg, minHeight: 48, justifyContent: 'center' }}>
                  <Text style={{ fontSize: 16, color: t.colors.label }} numberOfLines={1}>{entry.name}</Text>
                  <Text style={{ fontSize: 13, color: t.colors.secondaryLabel, marginTop: 2 }}>
                    {entry.serving_g}g{kcal != null ? ` · ${kcal} kcal` : ''}
                  </Text>
                </View>
              </SwipeRow>
            );
          })}
        </ListSection>
      )}

      {/* Camera */}
      <Modal visible={showCamera} animationType="slide" onRequestClose={() => setShowCamera(false)}>
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'] }}
          onBarcodeScanned={handleBarcode}
        >
          <SafeAreaView style={{ flex: 1, justifyContent: 'space-between', alignItems: 'center', padding: 24 }}>
            <TouchableOpacity style={{ alignSelf: 'flex-start', backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 }} onPress={() => setShowCamera(false)}>
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>✕  Close</Text>
            </TouchableOpacity>
            <View style={{ width: 240, height: 160, borderWidth: 2, borderColor: '#fff', borderRadius: 8 }} />
            <Text style={{ color: '#fff', fontSize: 14, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: t.radius.control }}>Point at a barcode</Text>
          </SafeAreaView>
        </CameraView>
      </Modal>

      <ManualEntrySheet
        visible={manualVisible}
        prefillName={manualPrefill}
        barcode={manualBarcode}
        onClose={() => setManualVisible(false)}
        onSave={handleManualSave}
      />
      <ServingSheet
        product={servingProduct}
        onClose={() => setServingProduct(null)}
        onConfirm={handleConfirmServing}
      />
    </Screen>
  );
}

// ── Manual entry sheet ────────────────────────────────────────────────────────
function ManualEntrySheet({ visible, onClose, onSave, prefillName = '', barcode = null }: {
  visible: boolean; onClose: () => void; onSave: (r: ProductResult) => void; prefillName?: string; barcode?: string | null;
}) {
  const t = useTheme();
  const [name, setName] = useState(prefillName);
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');

  useEffect(() => {
    if (visible) {
      setName(prefillName);
      setKcal(''); setProtein(''); setCarbs(''); setFat('');
    }
  }, [visible, prefillName]);

  function handleSave() {
    if (!name.trim()) { Alert.alert('Name required', 'Enter a product name.'); return; }
    onSave({
      barcode,
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
    <Sheet visible={visible} title="Add Manually" onClose={onClose} actionLabel="Save" onAction={handleSave}>
      <Field theme={t} label="Product name" value={name} onChange={setName} autoFocus autoCapitalize="words" keyboard="default" />
      {barcode ? <Text style={{ fontSize: 13, color: t.colors.secondaryLabel }}>Barcode {barcode} — saved so the next scan finds it instantly.</Text> : null}
      <Text style={{ fontSize: 13, color: t.colors.secondaryLabel, marginTop: t.spacing.xs }}>Values per 100g</Text>
      <View style={{ flexDirection: 'row', gap: t.spacing.md }}>
        <View style={{ flex: 1 }}><Field theme={t} label="kcal" value={kcal} onChange={setKcal} /></View>
        <View style={{ flex: 1 }}><Field theme={t} label="Protein (g)" value={protein} onChange={setProtein} /></View>
      </View>
      <View style={{ flexDirection: 'row', gap: t.spacing.md }}>
        <View style={{ flex: 1 }}><Field theme={t} label="Carbs (g)" value={carbs} onChange={setCarbs} /></View>
        <View style={{ flex: 1 }}><Field theme={t} label="Fat (g)" value={fat} onChange={setFat} /></View>
      </View>
    </Sheet>
  );
}

// ── Serving sheet ─────────────────────────────────────────────────────────────
function ServingSheet({ product, onClose, onConfirm }: {
  product: ProductResult | null; onClose: () => void; onConfirm: (serving: number) => void;
}) {
  const t = useTheme();
  const [serving, setServing] = useState('100');

  useEffect(() => { if (product) setServing('100'); }, [product]);

  if (!product) return null;

  const g = parseFloat(serving) || 0;
  const kcal = product.nutriments.kcal_per_100g != null ? (g / 100) * product.nutriments.kcal_per_100g : null;

  function confirm() {
    if (g > 0) { onConfirm(g); } else { Alert.alert('Invalid serving', 'Enter a value greater than 0.'); }
  }

  return (
    <Sheet visible={!!product} title={product.name} onClose={onClose} actionLabel="Add" onAction={confirm}>
      {product.nutriments.incomplete && (
        <Text style={{ fontSize: 13, color: t.colors.warning, backgroundColor: t.colors.card, borderRadius: t.radius.control, padding: t.spacing.md }}>
          ⚠ Some nutrition data is missing for this product.
        </Text>
      )}
      <Field theme={t} label="Serving (g — use gram equivalent for liquids, e.g. 200 for 200ml)" value={serving} onChange={setServing} autoFocus selectTextOnFocus />
      {kcal != null && <Text style={{ fontSize: 15, color: t.colors.secondaryLabel }}>{Math.round(kcal)} kcal for {g}g</Text>}
    </Sheet>
  );
}

// ── Themed input field ────────────────────────────────────────────────────────
function Field({ theme, label, value, onChange, keyboard = 'decimal-pad', autoFocus, autoCapitalize = 'none', selectTextOnFocus }: {
  theme: Theme; label: string; value: string; onChange: (v: string) => void;
  keyboard?: 'decimal-pad' | 'default'; autoFocus?: boolean; autoCapitalize?: 'none' | 'words'; selectTextOnFocus?: boolean;
}) {
  return (
    <View>
      <Text style={{ fontSize: 13, color: theme.colors.secondaryLabel, marginBottom: 4 }}>{label}</Text>
      <TextInput
        style={{ backgroundColor: theme.colors.card, color: theme.colors.label, borderRadius: theme.radius.control, padding: 12, fontSize: 16 }}
        value={value}
        onChangeText={onChange}
        keyboardType={keyboard}
        autoFocus={autoFocus}
        autoCapitalize={autoCapitalize}
        selectTextOnFocus={selectTextOnFocus}
        placeholderTextColor={theme.colors.secondaryLabel}
      />
    </View>
  );
}
