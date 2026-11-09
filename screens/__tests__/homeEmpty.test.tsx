import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { DateProvider } from '../../components/DateContext';
import HomeScreen from '../HomeScreen';
import { getDailyMacros, getFoodLogForDate, getTargets } from '../../db/queries';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('expo-symbols', () => ({ SymbolView: () => null }));

jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));

jest.mock('expo-file-system', () => ({ File: class File {} }));

jest.mock('../../db/backup', () => ({ backupToFile: jest.fn() }));

jest.mock('@react-navigation/native', () => {
  const React = require('react');
  return {
    useNavigation: () => ({ navigate: jest.fn() }),
    useFocusEffect: (effect: () => void | (() => void)) => {
      React.useEffect(() => effect(), [effect]);
    },
  };
});

jest.mock('../../db/queries', () => ({
  toDateString: (d: Date) => {
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
  },
  today: () => '2026-11-08',
  getDailyMacros: jest.fn(),
  getFoodLogForDate: jest.fn(),
  getTargets: jest.fn(),
  getPlannedType: jest.fn(async () => 'Rest'),
  isDone: jest.fn(async () => false),
  setTargets: jest.fn(),
}));

function flatten(children: unknown): string {
  if (children == null || typeof children === 'boolean') return '';
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(flatten).join('');
  return '';
}

async function renderHome() {
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(
      <DateProvider>
        <HomeScreen />
      </DateProvider>,
    );
  });
  await act(async () => {
    await Promise.resolve();
  });
  return renderer.root.findAllByType(Text).map((node) => flatten(node.props.children)).join('\n');
}

describe('home empty hint', () => {
  it('says Open the cookbook and keeps the day navigator', async () => {
    (getTargets as jest.Mock).mockResolvedValue({ kcal: null, protein_g: 150, carbs_g: 200, fat_g: 70 });
    (getFoodLogForDate as jest.Mock).mockResolvedValue([]);
    (getDailyMacros as jest.Mock).mockResolvedValue({ kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });
    const text = await renderHome();
    expect(text).toContain('Open the cookbook');
    expect(text).not.toContain('Log your first meal');
    expect(text).toContain('Today');
    expect(getDailyMacros).toHaveBeenCalled();
  });

  it('shows the sum from the day entries', async () => {
    (getTargets as jest.Mock).mockResolvedValue({ kcal: null, protein_g: 150, carbs_g: 200, fat_g: 70 });
    (getFoodLogForDate as jest.Mock).mockResolvedValue([{ id: 1 }]);
    (getDailyMacros as jest.Mock).mockResolvedValue({ kcal: 432, protein_g: 20, carbs_g: 50, fat_g: 10 });
    const text = await renderHome();
    expect(text).toContain('432');
    expect(text).not.toContain('Open the cookbook');
    expect(text).not.toContain('Log your first meal');
  });
});
