import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '@/context/auth-context';
import { ProtectedRoute } from './protected-route';

const replace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
}));

function fakeJwt(payload: Record<string, unknown>): string {
  const b64 = (obj: unknown): string =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64({ alg: 'HS256' })}.${b64(payload)}.sig`;
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    window.localStorage.clear();
    replace.mockClear();
  });

  it('redirige a /login cuando no hay sesión', async () => {
    render(
      <AuthProvider>
        <ProtectedRoute>
          <p>secreto</p>
        </ProtectedRoute>
      </AuthProvider>,
    );
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login'));
    expect(screen.queryByText('secreto')).toBeNull();
  });

  it('renderiza el contenido cuando hay sesión válida', async () => {
    window.localStorage.setItem(
      'nexus:token',
      fakeJwt({
        sub: 'u1',
        email: 'admin@acme.com',
        tenantId: 't1',
        roles: ['ADMIN'],
        permissions: ['users:read'],
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    );
    render(
      <AuthProvider>
        <ProtectedRoute>
          <p>secreto</p>
        </ProtectedRoute>
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByText('secreto')).toBeInTheDocument());
    expect(replace).not.toHaveBeenCalled();
  });
});
