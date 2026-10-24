'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { useAuth } from '@/context/auth-context';
import { ApiError, apiClient } from '@/services/api-client';

const DEMO_EMAIL = process.env.NEXT_PUBLIC_DEMO_EMAIL ?? 'admin@nexus.demo';
const DEMO_PASSWORD = process.env.NEXT_PUBLIC_DEMO_PASSWORD ?? 'Demo1234';

export default function LoginPage(): React.JSX.Element {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    await doLogin(email.trim(), password);
  }

  async function handleDemoLogin(): Promise<void> {
    await doLogin(DEMO_EMAIL, DEMO_PASSWORD);
  }

  async function handleResetDemo(): Promise<void> {
    setResetMsg(null);
    setError(null);
    try {
      const res = await apiClient.post<{ users: string[] }>('/demo/reset', {});
      setResetMsg(`Demo restaurada: ${res.users.join(', ')}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo restablecer la demo.');
    }
  }

  async function doLogin(emailValue: string, passwordValue: string): Promise<void> {
    setError(null);
    if (!emailValue || !passwordValue) {
      setError('Ingresa tu email y contraseña.');
      return;
    }
    setIsLoading(true);
    try {
      await login(emailValue, passwordValue);
      router.replace('/dashboard');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Credenciales inválidas. Verifica tu email y contraseña.');
      } else if (err instanceof ApiError && err.status === 400) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('No se pudo iniciar sesión. Intenta de nuevo.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      >
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Nexus RBAC
        </h1>
        <p className="mt-1 text-sm text-zinc-500">Inicia sesión para continuar</p>

        <label
          htmlFor="email"
          className="mt-6 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@acme.com"
          className="mt-1 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700"
        />

        <label
          htmlFor="password"
          className="mt-4 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="mt-1 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700"
        />

        {error && (
          <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="mt-6 w-full rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
        >
          {isLoading ? 'Ingresando…' : 'Ingresar'}
        </button>

        <button
          type="button"
          disabled={isLoading}
          onClick={handleDemoLogin}
          className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300"
        >
          Probar con cuenta demo
        </button>
        <button
          type="button"
          disabled={isLoading}
          onClick={handleResetDemo}
          className="mt-2 w-full rounded-lg px-3 py-2 text-xs text-zinc-500 underline-offset-2 hover:underline disabled:opacity-50"
        >
          {resetMsg ?? 'Restablecer datos demo'}
        </button>
        <p className="mt-3 text-center text-xs text-zinc-500">
          Demo: {DEMO_EMAIL} · manager@nexus.demo · viewer@nexus.demo
        </p>
      </form>
    </main>
  );
}
