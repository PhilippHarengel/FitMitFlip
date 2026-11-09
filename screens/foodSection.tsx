import React, { createContext, useContext, useState } from 'react';

export type FoodSectionName = 'Cookbook' | 'Plan' | 'List';

const Ctx = createContext<{
  section: FoodSectionName;
  setSection: (section: FoodSectionName) => void;
} | null>(null);

export function FoodSectionProvider({ children }: { children: React.ReactNode }) {
  const [section, setSection] = useState<FoodSectionName>('Cookbook');
  return <Ctx.Provider value={{ section, setSection }}>{children}</Ctx.Provider>;
}

export function useFoodSection() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useFoodSection must be used within a FoodSectionProvider');
  return ctx;
}
