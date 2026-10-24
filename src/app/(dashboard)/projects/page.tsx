'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Lock, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { TableSkeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/auth-context';
import { matchesTenantView, useTenantView } from '@/context/tenant-view-context';
import { notifyApiError, notifySuccess } from '@/lib/notify';
import { ApiError, apiClient } from '@/services/api-client';
import type { ProjectRow } from '@/types/rbac';

export default function ProjectsPage(): React.JSX.Element {
  const { user, isLoading: authLoading } = useAuth();
  const { view } = useTenantView();
  const canCreate = user?.permissions.includes('projects:create') ?? false;
  const canUpdate = user?.permissions.includes('projects:update') ?? false;
  const canDelete = user?.permissions.includes('projects:delete') ?? false;

  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [pendingDelete, setPendingDelete] = useState<ProjectRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const reload = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      setProjects(await apiClient.get<ProjectRow[]>('/projects'));
    } catch (err) {
      setError(err instanceof ApiError ? `Error ${err.status}: ${err.message}` : 'No se pudo cargar.');
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

  function startEdit(p: ProjectRow): void {
    setEditingId(p.id);
    setName(p.name);
    setDescription(p.description ?? '');
    setFormError(null);
  }

  function cancelEdit(): void {
    setEditingId(null);
    setName('');
    setDescription('');
    setFormError(null);
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setFormError(null);
    if (!name.trim()) {
      setFormError('El nombre es obligatorio.');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await apiClient.patch<ProjectRow>(`/projects/${editingId}`, {
          name: name.trim(),
          description: description.trim() || undefined,
        });
        notifySuccess('Proyecto actualizado.');
      } else {
        await apiClient.post<ProjectRow>('/projects', {
          name: name.trim(),
          description: description.trim() || undefined,
        });
        notifySuccess('Proyecto creado.');
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
      await apiClient.remove(`/projects/${pendingDelete.id}`);
      notifySuccess('Proyecto eliminado.');
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
    return projects
      .filter((p) => matchesTenantView(p.tenantId, view))
      .filter((p) => {
        if (!q) return true;
        return `${p.name} ${p.description ?? ''}`.toLowerCase().includes(q);
      });
  }, [projects, query, view]);

  const inputCls =
    'mt-1 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-zinc-700';

  function gated(
    allowed: boolean,
    perm: string,
    node: React.ReactNode,
  ): React.ReactNode {
    if (allowed) return node;
    return (
      <span title={`Sin permiso: ${perm}`} className="cursor-not-allowed opacity-50">
        {node}
      </span>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 md:px-6">
      <h1 className="text-2xl font-semibold">Proyectos</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Módulo de demostración: cada acción exige su permiso (
        <span className="font-mono">projects:create / update / delete</span>).
      </p>

      {(canCreate || editingId) ? (
        <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-base font-medium">{editingId ? 'Editar proyecto' : 'Nuevo proyecto'}</h2>
          <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="text-sm">
              Nombre
              <input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
            </label>
            <label className="text-sm">
              Descripción
              <input value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} />
            </label>
            {formError && (
              <p role="alert" className="text-sm text-red-600 sm:col-span-2 dark:text-red-400">{formError}</p>
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
      ) : authLoading ? (
        <div className="mt-6">
          <TableSkeleton rows={2} cols={2} />
        </div>
      ) : (
        <p className="mt-6 flex items-center gap-1.5 rounded-2xl border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700">
          <Lock size={15} aria-hidden /> Sin permiso <span className="font-mono">projects:create</span>: el formulario de alta está oculto para tu rol.
        </p>
      )}

      <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-3 flex items-center gap-2">
          <div className="relative w-full max-w-sm">
            <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-zinc-400" aria-hidden />
            <input
              type="search"
              aria-label="Buscar proyectos por nombre"
              placeholder="Buscar proyectos…"
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
          <TableSkeleton rows={5} cols={3} />
        ) : error ? (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : visible.length === 0 ? (
          <p className="py-6 text-center text-sm text-zinc-500">
            {projects.length === 0 ? 'No hay proyectos en este tenant.' : 'Sin resultados para esta búsqueda o vista de tenant.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
                  <th className="py-2 pr-4 font-medium">Nombre</th>
                  <th className="py-2 pr-4 font-medium">Descripción</th>
                  <th className="py-2 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((p) => (
                  <tr key={p.id} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800">
                    <td className="py-2 pr-4">{p.name}</td>
                    <td className="py-2 pr-4">{p.description ?? '—'}</td>
                    <td className="py-2">
                      <div className="flex gap-2">
                        {gated(
                          canUpdate,
                          'projects:update',
                          <button
                            type="button"
                            disabled={!canUpdate}
                            onClick={() => canUpdate && startEdit(p)}
                            className="flex items-center gap-1 rounded border border-zinc-300 px-2 py-1 text-xs hover:border-indigo-400 hover:text-indigo-600 disabled:cursor-not-allowed dark:border-zinc-700"
                          >
                            <Pencil size={12} aria-hidden />
                            Editar
                          </button>,
                        )}
                        {gated(
                          canDelete,
                          'projects:delete',
                          <button
                            type="button"
                            disabled={!canDelete}
                            onClick={() => canDelete && setPendingDelete(p)}
                            className="flex items-center gap-1 rounded border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:cursor-not-allowed dark:border-red-800 dark:hover:bg-red-950"
                          >
                            <Trash2 size={12} aria-hidden />
                            Eliminar
                          </button>,
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Eliminar proyecto"
        description={pendingDelete ? `¿Eliminar el proyecto ${pendingDelete.name}? Esta acción no se puede deshacer.` : ''}
        loading={deleting}
        onClose={() => !deleting && setPendingDelete(null)}
        onConfirm={() => void confirmDelete()}
      />
    </main>
  );
}
