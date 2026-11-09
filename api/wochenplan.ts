import {
  isShoppingPlan,
  type CookbookRecipe,
  type PlanRequest,
  type ShoppingPlan,
} from '../lib/shoppingPlan';

export const WOCHENPLAN_URL =
  process.env.EXPO_PUBLIC_WOCHENPLAN_URL || 'https://wochenplan-essen-plan.philipp-harengel.workers.dev';

export type WochenplanConfig = {
  url: string;
  secret: string;
  fetchImpl?: typeof fetch;
};

export function wochenplanConfig(): WochenplanConfig {
  return {
    url: WOCHENPLAN_URL,
    secret: process.env.EXPO_PUBLIC_WEBHOOK_SECRET || '',
  };
}

function failureText(body: unknown, fallback: string): string | null {
  if (!body || typeof body !== 'object') return fallback;
  const row = body as { fehler?: unknown; telegramText?: unknown };
  if (typeof row.fehler === 'string' && row.fehler) return row.fehler;
  if (typeof row.telegramText === 'string' && row.telegramText) return row.telegramText;
  return null;
}

async function post(config: WochenplanConfig, payload: unknown): Promise<unknown> {
  let response: Response;
  try {
    response = await (config.fetchImpl ?? fetch)(config.url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-webhook-secret': config.secret,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    return { fehler: 'The request failed.' };
  }
  const text = await response.text();
  if (!text) return { fehler: 'The request failed.' };
  try {
    return JSON.parse(text);
  } catch {
    return { fehler: 'The request failed.' };
  }
}

export async function loadCookbook(
  config: WochenplanConfig,
): Promise<{ rezepte: CookbookRecipe[] } | { fehler: string }> {
  const body = await post(config, { action: 'rezepte' });
  const failed = failureText(body, 'The cookbook could not be loaded.');
  if (failed) return { fehler: failed };
  const row = body as { rezepte?: unknown };
  if (!Array.isArray(row.rezepte)) return { fehler: 'The cookbook could not be loaded.' };
  return { rezepte: row.rezepte as CookbookRecipe[] };
}

export async function requestPlan(
  config: WochenplanConfig,
  payload: PlanRequest,
): Promise<ShoppingPlan | { fehler: string }> {
  const body = await post(config, payload);
  if (isShoppingPlan(body)) return body;
  return { fehler: failureText(body, 'The plan could not be created.') ?? 'The plan could not be created.' };
}
