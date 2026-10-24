import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LoginPage from './page';

const replace = vi.fn();
const login = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
}));

vi.mock('@/context/auth-context', () => ({
  useAuth: () => ({ login }),
}));

vi.mock('@/services/api-client', () => ({
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
}));

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra error si se envía sin completar', async () => {
    render(<LoginPage />);
    // fireEvent.submit evita la validación nativa (required) para probar el guard del handler
    fireEvent.submit(screen.getByRole('button', { name: /ingresar/i }).closest('form')!);
    expect(await screen.findByRole('alert')).toHaveTextContent(/email y contraseña/i);
    expect(login).not.toHaveBeenCalled();
  });

  it('login exitoso redirige a /dashboard', async () => {
    const user = userEvent.setup();
    login.mockResolvedValue(undefined);
    render(<LoginPage />);
    await user.type(screen.getByLabelText(/email/i), 'admin@acme.com');
    await user.type(screen.getByLabelText(/contraseña/i), 'Password123');
    await user.click(screen.getByRole('button', { name: /ingresar/i }));
    await waitFor(() => expect(login).toHaveBeenCalledWith('admin@acme.com', 'Password123'));
    expect(replace).toHaveBeenCalledWith('/dashboard');
  });

  it('muestra mensaje ante 401 del backend', async () => {
    const { ApiError } = await import('@/services/api-client');
    const user = userEvent.setup();
    login.mockRejectedValue(new ApiError(401, 'Unauthorized'));
    render(<LoginPage />);
    await user.type(screen.getByLabelText(/email/i), 'admin@acme.com');
    await user.type(screen.getByLabelText(/contraseña/i), 'Password123');
    await user.click(screen.getByRole('button', { name: /ingresar/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/credenciales inválidas/i);
    expect(replace).not.toHaveBeenCalled();
  });
});
