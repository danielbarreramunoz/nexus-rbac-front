'use client';

import { useEffect, useState } from 'react';
import { Building2 } from 'lucide-react';
import { useTenantView, type TenantView } from '@/context/tenant-view-context';
import { apiClient } from '@/services/api-client';

interface TenantOption {
  id: string;
  name: string;
  slug: string;
}

const GLOBAL_VALUE = 'global';
const ALL_VALUE = 'all';

/**
 * Selector de vista por tenant. Filtro 100% local: no re-autentica ni cambia
 * el aislamiento del backend (JWT). Para SUPER_ADMIN permite demostrar cómo
 * cambian las tablas al filtrar por tenant.
 */
export function TenantSwitcher(): React.JSX.Element {
  const { view, setView } = useTenantView();
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get<TenantOption[]>('/tenants')
      .then((data) => {
        if (!cancelled) setTenants(data);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <label
      className="flex items-center gap-2 text-sm"
      title="Filtro visual local: el API sigue aislado por tu JWT"
    >
      <Building2 size={16} className="shrink-0 text-zinc-400" aria-hidden />
      <span className="hidden text-zinc-500 lg:inline">Vista:</span>
      <select
        aria-label="Vista por tenant (filtro local)"
        value={view}
        onChange={(e) => setView(e.target.value as TenantView)}
        className="max-w-44 cursor-pointer rounded-lg border border-zinc-300 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-indigo-500 dark:border-zinc-700"
      >
        <option value={ALL_VALUE}>Todos (API)</option>
        <option value={GLOBAL_VALUE}>Global</option>
        {tenants.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
        {failed && <option disabled>(sin conexión a /tenants)</option>}
      </select>
    </label>
  );
}
