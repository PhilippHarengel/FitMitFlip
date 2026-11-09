import { loadCookbook, requestPlan, type WochenplanConfig } from '../wochenplan';
import type { ShoppingPlan } from '../../lib/shoppingPlan';

const recipe = {
  id: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  name: 'Haferporridge',
  mahlzeiten: ['Frühstück'],
  kategorien: [] as string[],
  zutaten: '50 g Haferflocken',
  anleitung: 'Hafer kochen.',
  kcal: 400,
  protein: 20,
  kohlenhydrate: 50,
  fett: 10,
};

const plan: ShoppingPlan = {
  tage: [
    {
      datum: '2026-11-09',
      wochentag: 'Montag',
      fruehstueck: { id: recipe.id, name: recipe.name },
      mittagessen: { ausgelassen: true },
      abendessen: { ausgelassen: true },
    },
  ],
  einkauf: [{ kategorie: 'Trockenware', name: 'Haferflocken', menge: 50, einheit: 'g' }],
  nichtLesbar: [],
  summen: { kcal: 400, protein: 20, kohlenhydrate: 50, fett: 10 },
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function config(fetchImpl: WochenplanConfig['fetchImpl']): WochenplanConfig {
  return { url: 'https://wochenplan-essen-plan.philipp-harengel.workers.dev', secret: 'hook-secret', fetchImpl };
}

describe('wochenplan client', () => {
  it('loads the cookbook with the webhook secret and no recipe book in the body', async () => {
    const fetchImpl = jest.fn(async () => json({ rezepte: [recipe] }));
    const out = await loadCookbook(config(fetchImpl));
    expect(out).toEqual({ rezepte: [recipe] });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, { headers: Record<string, string>; body: string }];
    expect(url).toBe('https://wochenplan-essen-plan.philipp-harengel.workers.dev');
    expect(init.headers['x-webhook-secret']).toBe('hook-secret');
    expect(init.body).toBe(JSON.stringify({ action: 'rezepte' }));
    expect(init.body).not.toContain('Haferporridge');
    expect(init.body).not.toContain('Zutaten');
  });

  it('shows the worker text when the secret is rejected', async () => {
    const fetchImpl = jest.fn(async () => json({
      speichern: 'nein',
      telegramText: 'Der Geheimschlüssel stimmt nicht.',
    }));
    await expect(loadCookbook(config(fetchImpl))).resolves.toEqual({
      fehler: 'Der Geheimschlüssel stimmt nicht.',
    });
    await expect(requestPlan(config(fetchImpl), {
      action: 'planen',
      tage: 7,
      startHeute: false,
      ausfaelle: [],
      hinweis: '',
      datum: '2026-11-08',
      letzterPlan: null,
    })).resolves.toEqual({ fehler: 'Der Geheimschlüssel stimmt nicht.' });
  });

  it('returns a cookbook error without a list', async () => {
    const fetchImpl = jest.fn(async () => json({
      fehler: 'Das Rezeptbuch ist nicht erreichbar.',
      rezepte: [{ name: 'Erfundenes Gericht' }],
    }));
    const out = await loadCookbook(config(fetchImpl));
    expect(out).toEqual({ fehler: 'Das Rezeptbuch ist nicht erreichbar.' });
    expect(out).not.toHaveProperty('rezepte');
    expect(JSON.stringify(out)).not.toContain('Erfundenes Gericht');
  });

  it('sends the plan form and accepts the plan JSON', async () => {
    const payload = {
      action: 'planen' as const,
      tage: 5,
      startHeute: true,
      ausfaelle: [{ tag: 'Mittwoch', mahlzeit: 'Abendessen' }],
      hinweis: 'wenig Zwiebeln',
      datum: '2026-11-08',
      letzterPlan: plan,
    };
    const fetchImpl = jest.fn(async () => json(plan));
    const out = await requestPlan(config(fetchImpl), payload);
    expect(out).toEqual(plan);
    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, { headers: Record<string, string>; body: string }];
    expect(init.headers['x-webhook-secret']).toBe('hook-secret');
    expect(JSON.parse(init.body)).toEqual(payload);
    expect(init.body).not.toContain('"zutaten"');
    expect(init.body).not.toContain('anleitung');
  });

  it('returns a plan error without a new list', async () => {
    const fetchImpl = jest.fn(async () => json({
      fehler: 'Unbekannte Rezept-ID.',
      einkauf: [{ kategorie: 'Sonstiges', name: 'Neu', menge: 1, einheit: 'g' }],
      tage: [],
      nichtLesbar: [],
    }));
    const out = await requestPlan(config(fetchImpl), {
      action: 'planen',
      tage: 7,
      startHeute: false,
      ausfaelle: [],
      hinweis: '',
      datum: '2026-11-08',
      letzterPlan: null,
    });
    expect(out).toEqual({ fehler: 'Unbekannte Rezept-ID.' });
    expect(out).not.toHaveProperty('einkauf');
    expect(JSON.stringify(out)).not.toContain('Neu');
  });
});
