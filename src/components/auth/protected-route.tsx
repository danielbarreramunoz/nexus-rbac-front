'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useAuth } from '@/context/auth-context';

export function ProtectedRoute({ children }: { children: ReactNode }): React.JSX.Element | null {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, user, router]);

  // Se renderizan los hijos también durante la carga para no bloquear el
  // shell estático (navegación instantánea / prerender). Las páginas esperan
  // a que la sesión se resuelva antes de pedir datos a la API.
  if (!isLoading && !user) return null;
  return <>{children}</>;
}
