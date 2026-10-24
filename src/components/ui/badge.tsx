export function roleBadgeClass(name: string): string {
  const base =
    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset';
  switch (name) {
    case 'SUPER_ADMIN':
      return `${base} bg-purple-100 text-purple-800 ring-purple-600/20 dark:bg-purple-950 dark:text-purple-200 dark:ring-purple-400/20`;
    case 'TENANT_ADMIN':
      return `${base} bg-blue-100 text-blue-800 ring-blue-600/20 dark:bg-blue-950 dark:text-blue-200 dark:ring-blue-400/20`;
    case 'VIEWER':
      return `${base} bg-zinc-100 text-zinc-600 ring-zinc-500/20 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-400/20`;
    default:
      return `${base} bg-zinc-100 text-zinc-700 ring-zinc-500/20 dark:bg-zinc-800 dark:text-zinc-200 dark:ring-zinc-400/20`;
  }
}

export function RoleBadge({ name }: { name: string }): React.JSX.Element {
  return <span className={roleBadgeClass(name)}>{name}</span>;
}

export function StatusBadge({ active }: { active: boolean }): React.JSX.Element {
  return (
    <span
      className={
        active
          ? 'inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-950 dark:text-emerald-200'
          : 'inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500 ring-1 ring-inset ring-zinc-500/20 dark:bg-zinc-800 dark:text-zinc-400'
      }
    >
      {active ? 'Activo' : 'Inactivo'}
    </span>
  );
}
