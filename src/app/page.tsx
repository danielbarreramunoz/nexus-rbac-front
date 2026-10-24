'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home(): React.JSX.Element {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-zinc-500">Redirigiendo…</p>
    </main>
  );
}
