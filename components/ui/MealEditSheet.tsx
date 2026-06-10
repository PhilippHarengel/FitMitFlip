import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Modal, SafeAreaView, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { Sheet } from './Sheet';
import { SwipeRow } from './SwipeRow';
import { useTheme } from '../../theme';
import { lookupBarcode, searchByName, type ProductResult } from '../../api/openFoodFacts';
import {
  createMeal, getFoodByBarcode, getMealWithItems, setMealItems, today, updateMeal, upsertFood,
} from '../../db/queries';

type PendingItem = {
  food_id: number;
  food_name: string;
  serving_g: number;
  kcal_per_100g: number | null;
};

export function MealEditSheet({
  mealId,
  visible,
  onClose,
  onSaved,
}: {
  mealId: number | 'new' | null;
  visible: boolean;
  onClose: () => void;
  onSaved: (id: number) => void;
}) {
  const t = useTheme();
  const [name, setName] = useState('');
  const [items, setItems] = useState<PendingItem[]>([]);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProductResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [pending, setPending] = useState<ProductResult | null>(null);
  const [servingText, setServingText] = useState('100');
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editServing, setEditServing] = useState('');

  const [showCamera, setShowCamera] = useState(false);
  const scanningRef = useRef(false);
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    if (!visible) {
      setQuery(''); setResults([]); setPending(null); setServingText('100');
      setEditIdx(null); setShowCamera(false);
      return;
    }
    if (mealId === 'new' || mealId == null) {
      setName(''); setItems([]);
    } else {
      getMealWithItems(mealId).then(m => {
        if (!m) return;
        setName(m.name);
        setItems(m.items.map(i => ({
          food_id: i.food_id,
          food_name: i.name,
          serving_g: i.serving_g,
          kcal_per_100g: i.kcal_per_100g,
        })));
      });
    }
  }, [visible, mealId]);

  useEffect(() => {
    if (!showCamera) scanningRef.current = false;
  }, [showCamera]);

  async function handleSearch() {
    if (!query.trim()) return;
    setSearching(true);
    setResults([]);
    const r = await searchByName(query.trim());
    setResults(r);
    setSearching(false);
  }

  async function handleOpenCamera() {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert('Camera required', 'Allow camera access in Settings to scan barcodes.');
        return;
      }
    }
    setShowCamera(true);
  }

  async function handleBarcode({ data }: BarcodeScanningResult) {
    if (scanningRef.current) return;
    scanningRef.current = true;
    setShowCamera(false);
    const cached = await getFoodByBarcode(data);
    if (cached) {
      setPending({ barcode: cached.barcode, name: cached.name, nutriments: { kcal_per_100g: cached.kcal_per_100g, protein_g: cached.protein_g, carbs_g: cached.carbs_g, fat_g: cached.fat_g, incomplete: false } });
      return;
    }
    const product = await lookupBarcode(data);
    if (product) { setPending(product); return; }
    Alert.alert('Not found', `"${data}" is not in OpenFoodFacts.`);
  }

  function handleSelectResult(product: ProductResult) {
    setResults([]); setQuery('');
    setPending(product);
    setServingText('100');
  }

  async function handleAddPending() {
    if (!pending) return;
    const g = parseFloat(servingText);
    if (!g || g <= 0) { Alert.alert('Invalid serving', 'Enter a value greater than 0.'); return; }
    const foodId = await upsertFood({
      barcode: pending.barcode,
      name: pending.name,
      kcal_per_100g: pending.nutriments.kcal_per_100g,
      protein_g: pending.nutriments.protein_g,
      carbs_g: pending.nutriments.carbs_g,
      fat_g: pending.nutriments.fat_g,
      cached_at: today(),
      source: 'api',
    });
    setItems(prev => [...prev, {
      food_id: foodId,
      food_name: pending.name,
      serving_g: g,
      kcal_per_100g: pending.nutriments.kcal_per_100g,
    }]);
    setPending(null);
    setServingText('100');
  }

  function removeItem(idx: number) {
    setItems(prev => prev.filter((_, i) => i !== idx));
  }

  function startEditItem(idx: number) {
    setEditIdx(idx);
    setEditServing(String(items[idx].serving_g));
  }

  function saveEditItem() {
    if (editIdx == null) return;
    const g = parseFloat(editServing);
    if (!g || g <= 0) { Alert.alert('Invalid serving', 'Enter a value greater than 0.'); return; }
    setItems(prev => prev.map((item, i) => i === editIdx ? { ...item, serving_g: g } : item));
    setEditIdx(null);
  }

  async function handleSave() {
    if (!name.trim()) { Alert.alert('Name required', 'Enter a meal name.'); return; }
    if (items.length === 0) { Alert.alert('No items', 'Add at least one food item.'); return; }
    let id: number;
    if (mealId === 'new' || mealId == null) {
      id = await createMeal(name.trim());
    } else {
      await updateMeal(mealId, name.trim());
      id = mealId;
    }
    await setMealItems(id, items.map(i => ({ food_id: i.food_id, serving_g: i.serving_g })));
    onSaved(id);
  }

  return (
    <>
      <Sheet
        visible={visible}
        title={mealId === 'new' || mealId == null ? 'New Meal' : 'Edit Meal'}
        onClose={onClose}
        actionLabel="Save"
        onAction={handleSave}
      >
        {/* Meal name */}
        <View>
          <Text style={{ fontSize: 13, color: t.colors.secondaryLabel, marginBottom: 4 }}>Meal name</Text>
          <TextInput
            style={{ backgroundColor: t.colors.card, color: t.colors.label, borderRadius: t.radius.control, padding: 12, fontSize: 16 }}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            placeholder="e.g. Breakfast"
            placeholderTextColor={t.colors.secondaryLabel}
          />
        </View>

        {/* Item list */}
        {items.length > 0 && (
          <View style={{ gap: 0 }}>
            <Text style={{ fontSize: 13, color: t.colors.secondaryLabel, marginBottom: 4 }}>Items</Text>
            {items.map((item, idx) => {
              const kcal = item.kcal_per_100g != null ? Math.round((item.serving_g / 100) * item.kcal_per_100g) : null;
              if (editIdx === idx) {
                return (
                  <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }}>
                    <Text style={{ flex: 1, fontSize: 15, color: t.colors.label }} numberOfLines={1}>{item.food_name}</Text>
                    <TextInput
                      style={{ width: 80, backgroundColor: t.colors.card, color: t.colors.label, borderRadius: t.radius.control, padding: 8, fontSize: 15, textAlign: 'right' }}
                      value={editServing}
                      onChangeText={setEditServing}
                      keyboardType="decimal-pad"
                      autoFocus
                      selectTextOnFocus
                    />
                    <TouchableOpacity onPress={saveEditItem}>
                      <Text style={{ color: t.colors.accent, fontWeight: '600', fontSize: 15 }}>Done</Text>
                    </TouchableOpacity>
                  </View>
                );
              }
              return (
                <SwipeRow key={idx} onDelete={() => removeItem(idx)}>
                  <TouchableOpacity
                    onPress={() => startEditItem(idx)}
                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: t.spacing.lg, backgroundColor: t.colors.card }}
                  >
                    <Text style={{ flex: 1, fontSize: 15, color: t.colors.label }} numberOfLines={1}>{item.food_name}</Text>
                    <Text style={{ fontSize: 14, color: t.colors.secondaryLabel }}>
                      {item.serving_g}g{kcal != null ? ` · ${kcal} kcal` : ''}
                    </Text>
                  </TouchableOpacity>
                </SwipeRow>
              );
            })}
          </View>
        )}

        {/* Food search */}
        {pending ? (
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 14, color: t.colors.label }} numberOfLines={1}>{pending.name}</Text>
            <View>
              <Text style={{ fontSize: 13, color: t.colors.secondaryLabel, marginBottom: 4 }}>Serving (g)</Text>
              <TextInput
                style={{ backgroundColor: t.colors.card, color: t.colors.label, borderRadius: t.radius.control, padding: 12, fontSize: 16 }}
                value={servingText}
                onChangeText={setServingText}
                keyboardType="decimal-pad"
                autoFocus
                selectTextOnFocus
              />
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                onPress={handleAddPending}
                style={{ flex: 1, backgroundColor: t.colors.accent, borderRadius: t.radius.control, height: 40, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15 }}>Add</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setPending(null)}
                style={{ flex: 1, backgroundColor: t.colors.card, borderRadius: t.radius.control, height: 40, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ color: t.colors.label, fontSize: 15 }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                style={{ flex: 1, backgroundColor: t.colors.card, color: t.colors.label, borderRadius: t.radius.control, paddingHorizontal: t.spacing.md, height: 44, fontSize: 16 }}
                placeholder="Search food…"
                placeholderTextColor={t.colors.secondaryLabel}
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
              />
              <TouchableOpacity
                onPress={handleOpenCamera}
                style={{ width: 44, height: 44, borderRadius: t.radius.control, backgroundColor: t.colors.accent, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ color: '#fff', fontSize: 18 }}>⌗</Text>
              </TouchableOpacity>
            </View>
            {searching && <ActivityIndicator color={t.colors.secondaryLabel} />}
            {results.map((r, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => handleSelectResult(r)}
                style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: t.colors.separator }}
              >
                <Text style={{ flex: 1, fontSize: 15, color: t.colors.label }} numberOfLines={1}>{r.name}</Text>
                {r.nutriments.kcal_per_100g != null && (
                  <Text style={{ fontSize: 13, color: t.colors.secondaryLabel }}>{Math.round(r.nutriments.kcal_per_100g)} kcal/100g</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </Sheet>

      <Modal visible={showCamera} animationType="slide" onRequestClose={() => setShowCamera(false)}>
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'] }}
          onBarcodeScanned={handleBarcode}
        >
          <SafeAreaView style={{ flex: 1, justifyContent: 'space-between', alignItems: 'center', padding: 24 }}>
            <TouchableOpacity
              style={{ alignSelf: 'flex-start', backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 }}
              onPress={() => setShowCamera(false)}
            >
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>✕  Close</Text>
            </TouchableOpacity>
            <View style={{ width: 240, height: 160, borderWidth: 2, borderColor: '#fff', borderRadius: 8 }} />
            <Text style={{ color: '#fff', fontSize: 14, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 }}>
              Point at a barcode
            </Text>
          </SafeAreaView>
        </CameraView>
      </Modal>
    </>
  );
}
