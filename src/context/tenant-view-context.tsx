'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export type TenantView = 'all' | 'global' | string;

interface TenantViewValue {
  view: TenantView;
  setView: (v: TenantView) => void;
}

const TenantViewContext = createContext<TenantViewValue | null>(null);
const STORAGE_KEY = 'nexus:tenant-view';

/**
 * Filtro visual de tenant (solo cliente).
 * No cambia el JWT ni el aislamiento del API: el backend sigue filtrando
 * por `actor.tenantId` (users.service.ts `scope()`). Sirve para que
 * SUPER_ADMIN (tenantId null, ve todo) demuestre el aislamiento filtrando
 * localmente la tabla ya cargada.
 */
export function TenantViewProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [view, setViewState] = useState<TenantView>(() => {
    try {
      if (typeof window === 'undefined') return 'all';
      return (window.localStorage.getItem(STORAGE_KEY) as TenantView) || 'all';
    } catch {
      return 'all';
    }
  });

  function setView(v: TenantView): void {
    setViewState(v);
    try {
      window.localStorage.setItem(STORAGE_KEY, v);
    } catch {
      /* noop */
    }
  }

  const value = useMemo(() => ({ view, setView }), [view]);
  return <TenantViewContext.Provider value={value}>{children}</TenantViewContext.Provider>;
}

export function useTenantView(): TenantViewValue {
  const ctx = useContext(TenantViewContext);
  if (!ctx) throw new Error('useTenantView debe usarse dentro de <TenantViewProvider>');
  return ctx;
}

/** Filtra filas con `tenantId` según la vista seleccionada. */
export function matchesTenantView(tenantId: string | null, view: TenantView): boolean {
  if (view === 'all') return true;
  if (view === 'global') return tenantId === null;
  return tenantId === view;
}
