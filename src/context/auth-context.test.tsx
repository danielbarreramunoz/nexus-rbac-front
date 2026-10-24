import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act, useEffect } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth, type SessionUser } from './auth-context';

vi.mock('@/services/api-client', () => ({
  apiClient: { post: vi.fn() },
  setToken: vi.fn(),
  clearToken: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
}));

import { apiClient, clearToken, setToken } from '@/services/api-client';

const post = vi.mocked(apiClient.post);
const mockSetToken = vi.mocked(setToken);
const mockClearToken = vi.mocked(clearToken);

function fakeJwt(payload: Record<string, unknown>): string {
  const b64 = (obj: unknown): string =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64({ alg: 'HS256' })}.${b64(payload)}.sig`;
}

const payload = {
  sub: 'u1',
  email: 'admin@acme.com',
  tenantId: 't1',
  roles: ['ADMIN'],
  permissions: ['users:read'],
  exp: Math.floor(Date.now() / 1000) + 3600,
};

function Probe({ onReady }: { onReady: (u: SessionUser | null) => void }): React.JSX.Element {
  const { user } = useAuth();
  onReady(user);
  return <div data-testid="probe">{user ? user.email : 'anonymous'}</div>;
}

describe('AuthProvider', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  it('restaura la sesión desde localStorage al montar', async () => {
    window.localStorage.setItem('nexus:token', fakeJwt(payload));
    let seen: SessionUser | null | undefined;
    render(
      <AuthProvider>
        <Probe onReady={(u) => { seen = u; }} />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('probe')).toHaveTextContent('admin@acme.com'));
    expect(seen?.tenantId).toBe('t1');
    expect(seen?.permissions).toContain('users:read');
  });

  it('ignora un token expirado y lo limpia', async () => {
    window.localStorage.setItem(
      'nexus:token',
      fakeJwt({ ...payload, exp: Math.floor(Date.now() / 1000) - 10 }),
    );
    render(
      <AuthProvider>
        <Probe onReady={() => {}} />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('probe')).toHaveTextContent('anonymous'));
    expect(window.localStorage.getItem('nexus:token')).toBeNull();
  });

  it('login guarda el token y publica el usuario', async () => {
    post.mockResolvedValue({ accessToken: fakeJwt(payload) });
    const captured: { login?: (email: string, password: string) => Promise<void> } = {};
    function Capture(): React.JSX.Element {
      const { login } = useAuth();
      useEffect(() => {
        captured.login = login;
      }, [login]);
      return <div />;
    }
    render(
      <AuthProvider>
        <Capture />
        <Probe onReady={() => {}} />
      </AuthProvider>,
    );
    await act(async () => {
      await captured.login!('admin@acme.com', 'Password123');
    });
    expect(post).toHaveBeenCalledWith('/auth/login', {
      email: 'admin@acme.com',
      password: 'Password123',
    });
    expect(mockSetToken).toHaveBeenCalled();
    expect(screen.getByTestId('probe')).toHaveTextContent('admin@acme.com');
  });

  it('logout limpia la sesión', async () => {
    window.localStorage.setItem('nexus:token', fakeJwt(payload));
    const captured: { logout?: () => void } = {};
    function Capture(): React.JSX.Element {
      const ctx = useAuth();
      useEffect(() => {
        captured.logout = ctx.logout;
      }, [ctx.logout]);
      return <div data-testid="state">{ctx.user ? 'in' : 'out'}</div>;
    }
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <Capture />
        <button type="button" onClick={() => captured.logout?.()}>salir</button>
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('in'));
    await user.click(screen.getByRole('button', { name: 'salir' }));
    expect(mockClearToken).toHaveBeenCalled();
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('out'));
  });
});
