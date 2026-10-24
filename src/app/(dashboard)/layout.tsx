'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { FolderKanban, LayoutDashboard, LogOut, ShieldCheck, Users } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { TenantSwitcher } from '@/components/ui/tenant-switcher';
import { TenantViewProvider } from '@/context/tenant-view-context';
import { useAuth } from '@/context/auth-context';

function Shell({ children }: { children: ReactNode }): React.JSX.Element {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const links = [
    { href: '/dashboard', label: 'Panel', Icon: LayoutDashboard, show: true },
    { href: '/users', label: 'Usuarios', Icon: Users, show: user?.permissions.includes('users:read') ?? false },
    { href: '/roles', label: 'Roles', Icon: ShieldCheck, show: user?.permissions.includes('roles:read') ?? false },
    { href: '/projects', label: 'Proyectos', Icon: FolderKanban, show: user?.permissions.includes('projects:read') ?? false },
  ];

  function handleLogout(): void {
    logout();
    router.replace('/login');
  }

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-zinc-200 bg-white p-4 md:flex dark:border-zinc-800 dark:bg-zinc-900">
        <p className="px-2 text-sm font-semibold">Nexus RBAC</p>
        <nav className="mt-6 flex flex-col gap-1 text-sm">
          {links
            .filter((l) => l.show)
            .map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={
                  pathname === l.href
                    ? 'flex items-center gap-2 rounded-lg bg-indigo-50 px-3 py-2 font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200'
                    : 'flex items-center gap-2 rounded-lg px-3 py-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }
              >
                <l.Icon size={16} aria-hidden />
                {l.label}
              </Link>
            ))}
        </nav>
        <div className="mt-auto px-2 text-xs text-zinc-500">
          <p className="truncate">{user?.email}</p>
          <p className="mt-0.5 truncate">{user?.roles.join(', ') || 'sin roles'}</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-zinc-200 bg-white px-4 py-3 md:px-6 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="hidden truncate text-sm sm:block">
            <span className="text-zinc-500">Tenant: </span>
            <span className="font-mono">{user?.tenantId ?? 'global'}</span>
          </p>
          <div className="flex items-center gap-3">
            <TenantSwitcher />
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <LogOut size={15} aria-hidden />
              Cerrar sesión
            </button>
          </div>
        </header>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  return (
    <ProtectedRoute>
      <TenantViewProvider>
        <Shell>{children}</Shell>
      </TenantViewProvider>
    </ProtectedRoute>
  );
}
