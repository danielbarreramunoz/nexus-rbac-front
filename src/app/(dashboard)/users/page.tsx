'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Lock, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { RoleBadge, StatusBadge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { TableSkeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/auth-context';
import { matchesTenantView, useTenantView } from '@/context/tenant-view-context';
import { notifyApiError, notifySuccess } from '@/lib/notify';
import { ApiError, apiClient } from '@/services/api-client';
import type { RoleRef, UserRow } from '@/types/rbac';

interface UserForm {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  roleIds: string[];
  isActive: boolean;
}

const EMPTY_FORM: UserForm = {
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  roleIds: [],
  isActive: true,
};

export default function UsersPage(): React.JSX.Element {
  const { user, isLoading: authLoading } = useAuth();
  const { view } = useTenantView();
  const canCreate = user?.permissions.includes('users:create') ?? false;
  const canUpdate = user?.permissions.includes('users:update') ?? false;
  const canDelete = user?.permissions.includes('users:delete') ?? false;
  const canReadRoles = user?.permissions.includes('roles:read') ?? false;

  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<RoleRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<UserForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [pendingDelete, setPendingDelete] = useState<UserRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const reload = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const [u, r] = await Promise.all([
        apiClient.get<UserRow[]>('/users'),
        canReadRoles
          ? apiClient.get<RoleRef[]>('/roles')
          : Promise.resolve([] as RoleRef[]),
      ]);
      setUsers(u);
      setRoles(r);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cargar.');
    } finally {
      setLoading(false);
    }
  }, [canReadRoles]);

  useEffect(() => {
    // No pedir datos hasta resolver la sesión (evita 401 con el shell precargado).
    if (authLoading || !user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial desde la API: sincronización intencional con sistema externo
    void reload();
  }, [authLoading, user, reload]);

  function toggleRole(roleId: string): void {
    setForm((f) => ({
      ...f,
      roleIds: f.roleIds.includes(roleId)
        ? f.roleIds.filter((id) => id !== roleId)
        : [...f.roleIds, roleId],
    }));
  }

  function startEdit(u: UserRow): void {
    setEditingId(u.id);
    setForm({
      email: u.email,
      password: '',
      firstName: '',
      lastName: '',
      roleIds: u.roles.map((r) => r.id),
      isActive: u.isActive,
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
        await apiClient.patch<UserRow>(`/users/${editingId}`, {
          firstName: form.firstName || undefined,
          lastName: form.lastName || undefined,
          isActive: form.isActive,
          roleIds: canReadRoles ? form.roleIds : undefined,
        });
        notifySuccess('Usuario actualizado.');
      } else {
        await apiClient.post<UserRow>('/users', {
          email: form.email,
          password: form.password,
          firstName: form.firstName || undefined,
          lastName: form.lastName || undefined,
          roleIds: canReadRoles ? form.roleIds : undefined,
        });
        notifySuccess('Usuario creado.');
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
      await apiClient.remove(`/users/${pendingDelete.id}`);
      notifySuccess('Usuario eliminado.');
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
    return users
      .filter((u) => matchesTenantView(u.tenantId, view))
      .filter((u) => {
        if (!q) return true;
        const full = `${u.email} ${u.firstName ?? ''} ${u.lastName ?? ''}`.toLowerCase();
        return full.includes(q);
      });
  }, [users, query, view]);

  const inputCls =
    'mt-1 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-zinc-700';

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 md:px-6">
      <h1 className="text-2xl font-semibold">Usuarios</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Alta, edición y baja de usuarios del tenant activo.
      </p>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {(canCreate || editingId) && (
        <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-base font-medium">
            {editingId ? 'Editar usuario' : 'Nuevo usuario'}
          </h2>
          <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {!editingId && (
              <>
                <label className="text-sm">
                  Email
                  <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} />
                </label>
                <label className="text-sm">
                  Contraseña (min 8)
                  <input required minLength={8} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={inputCls} />
                </label>
              </>
            )}
            <label className="text-sm">
              Nombre
              <input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className={inputCls} />
            </label>
            <label className="text-sm">
              Apellido
              <input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className={inputCls} />
            </label>
            {canReadRoles && roles.length > 0 && (
              <fieldset className="text-sm sm:col-span-2">
                <legend className="font-medium">Roles</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {roles.map((r) => (
                    <label key={r.id} className="flex cursor-pointer items-center gap-1.5">
                      <input type="checkbox" checked={form.roleIds.includes(r.id)} onChange={() => toggleRole(r.id)} className="accent-indigo-600" />
                      <RoleBadge name={r.name} />
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            {editingId && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="accent-indigo-600" />
                Activo
              </label>
            )}
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

      <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-3 flex items-center gap-2">
          <div className="relative w-full max-w-sm">
            <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-zinc-400" aria-hidden />
            <input
              type="search"
              aria-label="Buscar usuarios por nombre o correo"
              placeholder="Buscar por nombre o correo…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-transparent py-2 pr-8 pl-9 text-sm outline-none focus:border-indigo-500 dark:border-zinc-700"
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
        {loading ? (
          <TableSkeleton rows={6} cols={4} />
        ) : visible.length === 0 ? (
          <p className="py-6 text-center text-sm text-zinc-500">
            {users.length === 0 ? 'No hay usuarios en este tenant.' : 'Sin resultados para esta búsqueda o vista de tenant.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
                  <th className="py-2 pr-4 font-medium">Email</th>
                  <th className="py-2 pr-4 font-medium">Roles</th>
                  <th className="py-2 pr-4 font-medium">Estado</th>
                  {(canUpdate || canDelete) && <th className="py-2 font-medium">Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {visible.map((u) => (
                  <tr key={u.id} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800">
                    <td className="py-2 pr-4">{u.email}</td>
                    <td className="py-2 pr-4">
                      {u.roles.length > 0 ? (
                        <span className="inline-flex flex-wrap gap-1">
                          {u.roles.map((r) => (
                            <RoleBadge key={r.id} name={r.name} />
                          ))}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-2 pr-4">
                      <StatusBadge active={u.isActive} />
                    </td>
                    {(canUpdate || canDelete) && (
                      <td className="py-2">
                        {u.isProtected ? (
                          <span title="Cuenta demo protegida" className="flex items-center gap-1 text-xs text-zinc-400">
                            <Lock size={13} aria-hidden /> protegida
                          </span>
                        ) : (
                          <div className="flex gap-2">
                            {canUpdate && (
                              <button type="button" onClick={() => startEdit(u)} className="flex items-center gap-1 rounded border border-zinc-300 px-2 py-1 text-xs hover:border-indigo-400 hover:text-indigo-600 dark:border-zinc-700">
                                <Pencil size={12} aria-hidden />
                                Editar
                              </button>
                            )}
                            {canDelete && (
                              <button type="button" onClick={() => setPendingDelete(u)} className="flex items-center gap-1 rounded border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950">
                                <Trash2 size={12} aria-hidden />
                                Eliminar
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Eliminar usuario"
        description={pendingDelete ? `¿Eliminar a ${pendingDelete.email}? Esta acción no se puede deshacer.` : ''}
        loading={deleting}
        onClose={() => !deleting && setPendingDelete(null)}
        onConfirm={() => void confirmDelete()}
      />
    </main>
  );
}
