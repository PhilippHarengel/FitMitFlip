import {
  absencesFromSkips,
  planWindow,
  skipDayLabel,
  stepDayCount,
  toggleSkipDay,
  toggleSkipMeal,
} from '../shoppingPlan';

describe('plan skip days', () => {
  const anchor = '2026-11-08';

  it('lists the typed window and steps the day count', () => {
    const window = planWindow(anchor, 3, false);
    expect(window.map((day) => day.date)).toEqual(['2026-11-09', '2026-11-10', '2026-11-11']);
    expect(skipDayLabel(window[0])).toBe('Mon 9');
    expect(planWindow(anchor, 7, true)[0]).toEqual({ date: '2026-11-08', weekday: 'Sunday' });
    expect(stepDayCount('7', 1)).toBe('8');
    expect(stepDayCount('1', -1)).toBe('1');
    expect(stepDayCount('', 1)).toBe('8');
  });

  it('fills an empty day and clears it when every meal is already on', () => {
    const date = '2026-11-09';
    const filled = toggleSkipDay({}, date);
    expect(filled[date]).toEqual(['Breakfast', 'Lunch', 'Dinner']);
    expect(toggleSkipDay(filled, date)[date]).toBeUndefined();
  });

  it('skips Monday breakfast and Wednesday dinner independently', () => {
    const monday = toggleSkipMeal({}, '2026-11-09', 'Breakfast');
    const both = toggleSkipMeal(monday, '2026-11-11', 'Dinner');
    expect(absencesFromSkips(planWindow(anchor, 7, false), both)).toEqual([
      { tag: 'Montag', mahlzeit: 'Frühstück' },
      { tag: 'Mittwoch', mahlzeit: 'Abendessen' },
    ]);
    expect(toggleSkipMeal(both, '2026-11-09', 'Breakfast')['2026-11-09']).toBeUndefined();
  });
});
