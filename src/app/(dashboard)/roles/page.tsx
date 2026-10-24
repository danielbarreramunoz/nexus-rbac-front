'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Lock, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { RoleBadge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { CardsSkeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/auth-context';
import { matchesTenantView, useTenantView } from '@/context/tenant-view-context';
import { notifyApiError, notifySuccess } from '@/lib/notify';
import { ApiError, apiClient } from '@/services/api-client';
import type { PermissionRef, RoleRow } from '@/types/rbac';

interface RoleForm {
  name: string;
  description: string;
  permissionIds: string[];
}

const EMPTY_FORM: RoleForm = { name: '', description: '', permissionIds: [] };

export default function RolesPage(): React.JSX.Element {
  const { user, isLoading: authLoading } = useAuth();
  const { view } = useTenantView();
  const canCreate = user?.permissions.includes('roles:create') ?? false;
  const canUpdate = user?.permissions.includes('roles:update') ?? false;
  const canDelete = user?.permissions.includes('roles:delete') ?? false;

  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [permissions, setPermissions] = useState<PermissionRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<RoleForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [pendingDelete, setPendingDelete] = useState<RoleRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const reload = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const [r, p] = await Promise.all([
        apiClient.get<RoleRow[]>('/roles'),
        apiClient.get<PermissionRef[]>('/permissions'),
      ]);
      setRoles(r);
      setPermissions(p);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cargar.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // No pedir datos hasta resolver la sesión (evita 401 con el shell precargado).
    if (authLoading || !user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial desde la API: sincronización intencional con sistema externo
    void reload();
  }, [authLoading, user, reload]);

  function togglePermission(id: string): void {
    setForm((f) => ({
      ...f,
      permissionIds: f.permissionIds.includes(id)
        ? f.permissionIds.filter((x) => x !== id)
        : [...f.permissionIds, id],
    }));
  }

  function startEdit(r: RoleRow): void {
    setEditingId(r.id);
    setForm({
      name: r.name,
      description: r.description ?? '',
      permissionIds: r.permissions.map((p) => p.id),
    });
    setFormError(null);
  }

  function cancelEdit(): void {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      if (editingId) {
        await apiClient.patch<RoleRow>(`/roles/${editingId}`, {
          name: form.name,
          description: form.description || undefined,
          permissionIds: form.permissionIds,
        });
        notifySuccess('Rol actualizado.');
      } else {
        await apiClient.post<RoleRow>('/roles', {
          name: form.name,
          description: form.description || undefined,
          permissionIds: form.permissionIds,
        });
        notifySuccess('Rol creado.');
      }
      cancelEdit();
      await reload();
    } catch (err) {
      setFormError(notifyApiError(err, 'No se pudo guardar.'));
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete(): Promise<void> {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await apiClient.remove(`/roles/${pendingDelete.id}`);
      notifySuccess('Rol eliminado.');
      setPendingDelete(null);
      await reload();
    } catch (err) {
      setError(notifyApiError(err, 'No se pudo eliminar.'));
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return roles
      .filter((r) => matchesTenantView(r.tenantId, view))
      .filter((r) => {
        if (!q) return true;
        return `${r.name} ${r.description ?? ''}`.toLowerCase().includes(q);
      });
  }, [roles, query, view]);

  const inputCls =
    'mt-1 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-zinc-700';

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 md:px-6">
      <h1 className="text-2xl font-semibold">Roles y permisos</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Define roles y asígnales permisos del sistema.
      </p>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {(canCreate || editingId) && (
        <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-base font-medium">
            {editingId ? 'Editar rol' : 'Nuevo rol'}
          </h2>
          <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="text-sm">
              Nombre
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
            </label>
            <label className="text-sm">
              Descripción
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} />
            </label>
            <fieldset className="text-sm sm:col-span-2">
              <legend className="font-medium">Permisos</legend>
              <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {permissions.map((p) => (
                  <label key={p.id} className="flex cursor-pointer items-center gap-1.5">
                    <input type="checkbox" checked={form.permissionIds.includes(p.id)} onChange={() => togglePermission(p.id)} className="accent-indigo-600" />
                    <span className="font-mono text-xs">{p.code}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            {formError && (
              <p role="alert" className="text-sm text-red-600 sm:col-span-2 dark:text-red-400">
                {formError}
              </p>
            )}
            <div className="flex gap-2 sm:col-span-2">
              <button type="submit" disabled={saving} className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
                <Plus size={15} aria-hidden />
                {saving ? 'Guardando…' : editingId ? 'Guardar' : 'Crear'}
              </button>
              {editingId && (
                <button type="button" onClick={cancelEdit} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700">
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </section>
      )}

      <div className="mt-6 mb-3 flex items-center gap-2">
        <div className="relative w-full max-w-sm">
          <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-zinc-400" aria-hidden />
          <input
            type="search"
            aria-label="Buscar roles por nombre"
            placeholder="Buscar roles…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white py-2 pr-8 pl-9 text-sm outline-none focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-900"
          />
          {query && (
            <button
              type="button"
              aria-label="Limpiar búsqueda"
              onClick={() => setQuery('')}
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-zinc-400 hover:text-zinc-600"
            >
              <X size={14} aria-hidden />
            </button>
          )}
        </div>
      </div>

      <section className="mt-1 grid grid-cols-1 gap-4 md:grid-cols-2">
        {loading ? (
          <div className="md:col-span-2">
            <CardsSkeleton count={4} />
          </div>
        ) : visible.length === 0 ? (
          <p className="py-6 text-center text-sm text-zinc-500 md:col-span-2">
            Sin resultados para esta búsqueda o vista de tenant.
          </p>
        ) : (
          visible.map((r) => (
            <article key={r.id} className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="flex items-center gap-2 font-medium">
                    <RoleBadge name={r.name} />
                  </h2>
                  <p className="mt-0.5 text-xs text-zinc-500">{r.description ?? '—'}</p>
                </div>
                {(canUpdate || canDelete) && (
                  <div className="flex shrink-0 gap-2">
                    {r.isProtected ? (
                      <span title="Rol demo protegido" className="flex items-center gap-1 text-xs text-zinc-400">
                        <Lock size={13} aria-hidden /> protegido
                      </span>
                    ) : (
                      <>
                        {canUpdate && (
                          <button type="button" onClick={() => startEdit(r)} className="flex items-center gap-1 rounded border border-zinc-300 px-2 py-1 text-xs hover:border-indigo-400 hover:text-indigo-600 dark:border-zinc-700">
                            <Pencil size={12} aria-hidden />
                            Editar
                          </button>
                        )}
                        {canDelete && (
                          <button type="button" onClick={() => setPendingDelete(r)} className="flex items-center gap-1 rounded border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950">
                            <Trash2 size={12} aria-hidden />
                            Eliminar
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {r.permissions.length > 0 ? (
                  r.permissions.map((p) => (
                    <span key={p.id} className="rounded-full bg-zinc-100 px-2 py-0.5 font-mono text-xs dark:bg-zinc-800">
                      {p.code}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-zinc-400">Sin permisos</span>
                )}
              </div>
            </article>
          ))
        )}
      </section>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Eliminar rol"
        description={pendingDelete ? `¿Eliminar el rol ${pendingDelete.name}? Esta acción no se puede deshacer.` : ''}
        loading={deleting}
        onClose={() => !deleting && setPendingDelete(null)}
        onConfirm={() => void confirmDelete()}
      />
    </main>
  );
}
