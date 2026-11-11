import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getPreference, setPreference } from '../db/queries';

const PREFERENCE_KEY = 'cookbookLargeTiles';

type CookbookTilesValue = {
  largeTiles: boolean;
  setLargeTiles: (on: boolean) => Promise<void>;
};

const CookbookTilesContext = createContext<CookbookTilesValue>({
  largeTiles: false,
  setLargeTiles: async () => {},
});

export function CookbookTilesProvider({ children }: { children: React.ReactNode }) {
  const [largeTiles, setLargeTilesState] = useState(false);

  useEffect(() => {
    getPreference(PREFERENCE_KEY).then((value) => {
      if (value === '1') setLargeTilesState(true);
    }).catch(() => {});
  }, []);

  const setLargeTiles = useCallback(async (on: boolean) => {
    setLargeTilesState(on);
    await setPreference(PREFERENCE_KEY, on ? '1' : '0');
  }, []);

  const value = useMemo(() => ({ largeTiles, setLargeTiles }), [largeTiles, setLargeTiles]);

  return <CookbookTilesContext.Provider value={value}>{children}</CookbookTilesContext.Provider>;
}

export function useCookbookTiles(): CookbookTilesValue {
  return useContext(CookbookTilesContext);
}
