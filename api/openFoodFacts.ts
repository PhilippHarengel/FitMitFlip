const BASE = 'https://world.openfoodfacts.org';

// OpenFoodFacts asks every client to identify itself. Requests without a
// User-Agent are throttled or rejected.
const USER_AGENT = 'FitMitFlip/1.0 (personal fitness tracker)';

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

// AbortSignal.timeout() does not exist in the Hermes runtime, so use a manual
// AbortController + setTimeout — supported everywhere. (The old version threw
// synchronously inside the try, which the catch swallowed, making every lookup
// silently return "not found.")
async function fetchWithTimeout(url: string, ms = 8000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    });
  } finally {
    clearTimeout(timer);
  }
}

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
    const res = await fetchWithTimeout(
      `${BASE}/api/v2/product/${encodeURIComponent(barcode)}.json?fields=product_name,product_name_de,nutriments`
    );
    if (!res.ok) {
      console.warn(`[OpenFoodFacts] barcode ${barcode}: HTTP ${res.status}`);
      return null;
    }
    const data = await res.json();
    if (data.status !== 1 || !data.product) return null;

    const p = data.product;
    const name: string = p.product_name_de || p.product_name || 'Unknown product';
    return { barcode, name, nutriments: parseNutriments(p.nutriments ?? {}) };
  } catch (e) {
    console.warn(`[OpenFoodFacts] barcode ${barcode} lookup failed:`, e);
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
    const res = await fetchWithTimeout(`${BASE}/cgi/search.pl?${params}`);
    if (!res.ok) {
      console.warn(`[OpenFoodFacts] search "${query}": HTTP ${res.status}`);
      return [];
    }
    const data = await res.json();
    return (data.products ?? [])
      .filter((p: any) => p.product_name || p.product_name_de)
      .map((p: any) => ({
        barcode: p.code ?? null,
        name: p.product_name_de || p.product_name,
        nutriments: parseNutriments(p.nutriments ?? {}),
      }));
  } catch (e) {
    console.warn(`[OpenFoodFacts] search "${query}" failed:`, e);
    return [];
  }
}
