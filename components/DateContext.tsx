import React, { createContext, useContext, useState } from 'react';

// One selected date shared across all tabs. In-memory only — resets to today
// on app restart. Each screen reads/writes this instead of its own useState,
// so navigating the date on one tab carries over to the others.
type DateCtx = { date: Date; setDate: (d: Date) => void };

const Ctx = createContext<DateCtx | null>(null);

export function DateProvider({ children }: { children: React.ReactNode }) {
  const [date, setDate] = useState(new Date());
  return <Ctx.Provider value={{ date, setDate }}>{children}</Ctx.Provider>;
}

export function useSelectedDate(): DateCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSelectedDate must be used within a DateProvider');
  return ctx;
}
