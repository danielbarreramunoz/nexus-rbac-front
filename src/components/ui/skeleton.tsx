export function Skeleton({ className = '' }: { className?: string }): React.JSX.Element {
  return <div aria-hidden className={`animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800 ${className}`} />;
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }): React.JSX.Element {
  return (
    <div role="status" aria-label="Cargando datos" className="w-full">
      <div className="flex flex-col gap-2">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-2">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className={`h-8 ${c === 0 ? 'w-1/3' : 'flex-1'}`} />
            ))}
          </div>
        ))}
      </div>
      <span className="sr-only">Cargando datos…</span>
    </div>
  );
}

export function CardsSkeleton({ count = 4 }: { count?: number }): React.JSX.Element {
  return (
    <div role="status" aria-label="Cargando datos" className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="mt-2 h-4 w-2/3" />
          <div className="mt-3 flex gap-1.5">
            <Skeleton className="h-5 w-16 !rounded-full" />
            <Skeleton className="h-5 w-20 !rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function KpisSkeleton(): React.JSX.Element {
  return (
    <div role="status" aria-label="Cargando métricas" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="mt-2 h-8 w-1/4" />
        </div>
      ))}
    </div>
  );
}
