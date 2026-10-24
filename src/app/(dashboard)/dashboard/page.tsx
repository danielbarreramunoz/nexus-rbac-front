'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, FolderKanban, Lock, ShieldCheck, Users } from 'lucide-react';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { UsersTable } from '@/components/dashboard/users-table';
import { KpisSkeleton, TableSkeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/auth-context';
import { matchesTenantView, useTenantView } from '@/context/tenant-view-context';
import { notifyApiError } from '@/lib/notify';
import { ApiError, apiClient } from '@/services/api-client';
import type { UserRow } from '@/types/rbac';

export default function DashboardPage(): React.JSX.Element {
  const { user, isLoading: authLoading } = useAuth();
  const { view } = useTenantView();
  const canReadUsers = user?.permissions.includes('users:read') ?? false;

  const modules = [
    { label: 'Usuarios', href: '/users', perm: 'users:read', Icon: Users },
    { label: 'Roles', href: '/roles', perm: 'roles:read', Icon: ShieldCheck },
    { label: 'Proyectos', href: '/projects', perm: 'projects:read', Icon: FolderKanban },
  ];

  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // No pedir datos hasta resolver la sesión (evita 401 con el shell precargado).
    if (authLoading || !user || !canReadUsers) return;
    let cancelled = false;
    apiClient
      .get<UserRow[]>('/users')
      .then((data) => {
        if (!cancelled) setUsers(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = notifyApiError(err, 'No se pudieron cargar los usuarios.');
        setError(err instanceof ApiError ? message : 'No se pudieron cargar los usuarios.');
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, user, canReadUsers]);

  const visible = (users ?? []).filter((u) => matchesTenantView(u.tenantId, view));
  const total = visible.length;
  const active = visible.filter((u) => u.isActive).length;
  const distinctRoles = new Set(visible.flatMap((u) => u.roles.map((r) => r.name)));

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 md:px-6">
      <h1 className="text-2xl font-semibold">Panel de control</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Tenant activo:{' '}
        <span className="font-mono">{user?.tenantId ?? 'global'}</span>
        {view !== 'all' && (
          <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200">
            vista filtrada
          </span>
        )}
      </p>

      {authLoading || (canReadUsers && users === null && !error) ? (
        <div className="mt-6">
          <KpisSkeleton />
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <KpiCard label="Usuarios del tenant" value={canReadUsers ? total : '—'} />
          <KpiCard label="Usuarios activos" value={canReadUsers ? active : '—'} />
          <KpiCard label="Roles asignados" value={canReadUsers ? distinctRoles.size : user?.roles.length ?? 0} />
        </div>
      )}

      <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-base font-medium">Módulos y accesos de tu rol</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Entra con cada cuenta demo (admin / manager / viewer) y compara.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {modules.map((m) => {
            const allowed = user?.permissions.includes(m.perm) ?? false;
            return allowed ? (
              <Link key={m.perm} href={m.href} className="rounded-xl border border-zinc-200 p-4 hover:border-indigo-300 hover:bg-indigo-50/50 dark:border-zinc-800 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/30">
                <p className="flex items-center gap-1.5 font-medium">
                  <m.Icon size={16} aria-hidden /> {m.label}{' '}
                  <CheckCircle2 size={15} className="text-emerald-600" aria-hidden />
                </p>
                <p className="mt-1 font-mono text-xs text-green-600 dark:text-green-400">{m.perm}</p>
              </Link>
            ) : (
              <div key={m.perm} title={`Sin permiso: ${m.perm}`} className="cursor-not-allowed rounded-xl border border-dashed border-zinc-300 p-4 opacity-60 dark:border-zinc-700">
                <p className="flex items-center gap-1.5 font-medium">
                  <m.Icon size={16} aria-hidden /> {m.label}{' '}
                  <Lock size={14} className="text-zinc-400" aria-hidden />
                </p>
                <p className="mt-1 font-mono text-xs text-red-600 dark:text-red-400">requiere {m.perm}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-base font-medium">Usuarios del tenant</h2>
        {authLoading ? (
          <div className="mt-3">
            <TableSkeleton rows={5} cols={4} />
          </div>
        ) : !canReadUsers ? (
          <p className="mt-2 flex items-center gap-1.5 text-sm text-zinc-500">
            <Lock size={14} aria-hidden /> Tu rol no tiene el permiso <span className="font-mono">users:read</span>.
          </p>
        ) : error ? (
          <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        ) : users === null ? (
          <div className="mt-3">
            <TableSkeleton rows={5} cols={4} />
          </div>
        ) : (
          <div className="mt-3">
            <UsersTable users={visible} />
          </div>
        )}
      </section>
    </main>
  );
}
