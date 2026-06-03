const BASE = 'https://world.openfoodfacts.org';

export type NutrimentData = {
  kcal_per_100g: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  incomplete: boolean;
};

export type ProductResult = {
  barcode: string | null;
  name: string;
  nutriments: NutrimentData;
};

// Tries multiple field names because OpenFoodFacts data quality is variable.
// Returns null (not 0) when a field is genuinely missing — callers can show
// a warning badge so the user knows the value wasn't tracked.
function parseNutriments(n: Record<string, unknown>): NutrimentData {
  const get = (...keys: string[]): number | null => {
    for (const k of keys) {
      const v = n?.[k];
      if (typeof v === 'number' && isFinite(v)) return v;
    }
    return null;
  };

  const kcal = get('energy-kcal_100g', 'energy-kcal', 'energy_100g');
  const protein = get('proteins_100g', 'proteins');
  const carbs = get('carbohydrates_100g', 'carbohydrates');
  const fat = get('fat_100g', 'fat');

  return {
    kcal_per_100g: kcal,
    protein_g: protein,
    carbs_g: carbs,
    fat_g: fat,
    incomplete: [kcal, protein, carbs, fat].some(v => v === null),
  };
}

export async function lookupBarcode(barcode: string): Promise<ProductResult | null> {
  try {
    const res = await fetch(
      `${BASE}/api/v2/product/${encodeURIComponent(barcode)}.json?fields=product_name,product_name_de,nutriments`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== 1 || !data.product) return null;

    const p = data.product;
    const name: string = p.product_name_de || p.product_name || 'Unknown product';
    return { barcode, name, nutriments: parseNutriments(p.nutriments ?? {}) };
  } catch {
    return null;
  }
}

export async function searchByName(query: string): Promise<ProductResult[]> {
  try {
    const params = new URLSearchParams({
      search_terms: query,
      json: '1',
      page_size: '15',
      fields: 'product_name,product_name_de,nutriments,code',
    });
    const res = await fetch(`${BASE}/cgi/search.pl?${params}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.products ?? [])
      .filter((p: any) => p.product_name || p.product_name_de)
      .map((p: any) => ({
        barcode: p.code ?? null,
        name: p.product_name_de || p.product_name,
        nutriments: parseNutriments(p.nutriments ?? {}),
      }));
  } catch {
    return [];
  }
}
