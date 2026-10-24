import { Lock } from 'lucide-react';
import { RoleBadge, StatusBadge } from '@/components/ui/badge';
import type { UserRow } from '@/types/rbac';

export function UsersTable({ users }: { users: UserRow[] }): React.JSX.Element {
  if (users.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-zinc-500">
        No hay usuarios en este tenant.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
            <th className="py-2 pr-4 font-medium">Email</th>
            <th className="py-2 pr-4 font-medium">Nombre</th>
            <th className="py-2 pr-4 font-medium">Roles</th>
            <th className="py-2 font-medium">Estado</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr
              key={u.id}
              className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
            >
              <td className="py-2 pr-4">
                <span className="flex items-center gap-1.5">
                  {u.email}
                  {u.isProtected && (
                    <Lock size={13} className="shrink-0 text-zinc-400" aria-label="Cuenta protegida" />
                  )}
                </span>
              </td>
              <td className="py-2 pr-4">
                {[u.firstName, u.lastName].filter(Boolean).join(' ') || '—'}
              </td>
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
              <td className="py-2">
                <StatusBadge active={u.isActive} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
