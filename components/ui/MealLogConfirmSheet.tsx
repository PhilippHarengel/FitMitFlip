import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Sheet } from './Sheet';
import { useTheme } from '../../theme';
import { getMealWithItems, logMeal, type MealWithItems } from '../../db/queries';

export function MealLogConfirmSheet({
  mealId,
  date,
  onClose,
  onLogged,
}: {
  mealId: number | null;
  date: string;
  onClose: () => void;
  onLogged: () => void;
}) {
  const t = useTheme();
  const [meal, setMeal] = useState<MealWithItems | null>(null);

  useEffect(() => {
    if (mealId == null) { setMeal(null); return; }
    getMealWithItems(mealId).then(setMeal);
  }, [mealId]);

  async function handleLog() {
    if (mealId == null) return;
    await logMeal(date, mealId);
    onLogged();
  }

  const totalKcal = meal?.items.reduce((sum, item) => {
    if (item.kcal_per_100g == null) return sum;
    return sum + (item.serving_g / 100) * item.kcal_per_100g;
  }, 0) ?? 0;

  return (
    <Sheet
      visible={mealId != null}
      title={meal?.name ?? 'Meal'}
      onClose={onClose}
      actionLabel="Add to log"
      onAction={handleLog}
    >
      {meal?.items.map(item => {
        const kcal = item.kcal_per_100g != null ? Math.round((item.serving_g / 100) * item.kcal_per_100g) : null;
        return (
          <View
            key={item.id}
            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: t.colors.separator }}
          >
            <Text style={{ flex: 1, fontSize: 16, color: t.colors.label }} numberOfLines={1}>{item.name}</Text>
            <Text style={{ fontSize: 14, color: t.colors.secondaryLabel }}>
              {item.serving_g}g{kcal != null ? ` · ${kcal} kcal` : ''}
            </Text>
          </View>
        );
      })}
      {totalKcal > 0 && (
        <Text style={{ fontSize: 15, color: t.colors.secondaryLabel, marginTop: 8, textAlign: 'right' }}>
          Total: {Math.round(totalKcal)} kcal
        </Text>
      )}
    </Sheet>
  );
}
