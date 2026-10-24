# Nexus RBAC · Frontend

[![CI](https://github.com/danielbarreramunoz/nexus-rbac-front/actions/workflows/ci.yml/badge.svg)](https://github.com/danielbarreramunoz/nexus-rbac-front/actions/workflows/ci.yml)

Panel web del sistema multi-tenant con RBAC, construido con **Next.js 16 (App Router)**, **React 19**, **Tailwind CSS 4**, iconos **lucide-react** y notificaciones **sonner**. Consume la API `nexus-rbac-backend` con un cliente `fetch` tipado y JWT guardado en `localStorage`.

## Tecnologías

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16.4.2 (App Router, Turbopack, `cacheComponents`) |
| UI | React 19, Tailwind CSS 4, lucide-react (iconos), sonner (toasts) |
| Lenguaje | TypeScript 5 estricto |
| Data fetching | Cliente propio `fetch` (`services/api-client.ts`) + `NEXT_PUBLIC_API_URL` |
| Estado | React Context (`auth-context`, `tenant-view-context`); estado local por página |
| Tests | Vitest 5 + Testing Library + user-event + jsdom |
| Lint | ESLint 9 (`eslint-config-next`) |

## Arquitectura

```
src/
├── app/
│   ├── layout.tsx            # Root layout: AuthProvider + <Toaster/>
│   ├── page.tsx              # Raíz
│   ├── (auth)/login/         # Login + botón "probar con cuenta demo" + reset demo
│   └── (dashboard)/          # Rutas protegidas por <ProtectedRoute>
│       ├── layout.tsx        # Shell: sidebar con iconos, TenantSwitcher, logout
│       ├── dashboard/        # Panel: KPIs, módulos por permiso, tabla de usuarios
│       ├── users/            # CRUD usuarios + búsqueda + modal de confirmación
│       ├── roles/            # CRUD roles + asignación de permisos + búsqueda
│       └── projects/         # CRUD proyectos demo + búsqueda
├── components/
│   ├── auth/protected-route.tsx   # Redirige a /login si no hay sesión
│   ├── dashboard/                 # KpiCard, UsersTable (badges de rol/estado)
│   └── ui/                        # badge, skeleton, confirm-dialog, tenant-switcher
├── context/
│   ├── auth-context.tsx           # Sesión: login/logout, decodifica el JWT
│   └── tenant-view-context.tsx    # Filtro visual de tenant (solo cliente)
├── services/api-client.ts    # get/post/patch/remove + ApiError(status, message)
├── lib/notify.ts             # Helpers de toast (éxito / error / "sin permiso")
└── types/rbac.ts             # UserRow, RoleRow, ProjectRow, PermissionRef…
```

**Flujo de autenticación:** `login(email, password)` → `POST /auth/login` → guarda `accessToken` en `localStorage` (`nexus:token`) → decodifica el payload (sin verificar firma, solo lectura) para obtener `tenantId`, `roles` y `permissions`, que gobiernan qué menús, botones y formularios se muestran.

**Filtro de vista por tenant:** el header incluye un `TenantSwitcher` que lista los tenants de `GET /tenants` y filtra localmente las tablas ya cargadas. Es solo visual: el aislamiento real lo impone el backend desde el JWT (ver README del backend). Permite a `SUPER_ADMIN` demostrar cómo cambian los datos por tenant.

## Requisitos

- Node.js 20+ (se recomienda Node 24 + npm 11, igual que el CI)
- Backend `nexus-rbac-backend` corriendo (por defecto en `http://localhost:3003`)

## Instalación

```bash
cd nexus-rbac-front
npm install

# (opcional) crear .env.local para apuntar a la API y demo
# NEXT_PUBLIC_API_URL=http://localhost:3003
# NEXT_PUBLIC_DEMO_EMAIL=admin@nexus.demo
# NEXT_PUBLIC_DEMO_PASSWORD=Demo1234

npm run dev
# App en http://localhost:3002
```

### Variables de entorno

| Variable | Valor por defecto | Descripción |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3003` | URL base de la API |
| `NEXT_PUBLIC_DEMO_EMAIL` | `admin@nexus.demo` | Email del botón "probar con cuenta demo" |
| `NEXT_PUBLIC_DEMO_PASSWORD` | `Demo1234` | Password del botón demo |

## Cuentas demo

| Email | Password | Rol | Qué verás |
|---|---|---|---|
| `admin@nexus.demo` | `Demo1234` | SUPER_ADMIN | Todo: usuarios, roles, proyectos de todos los tenants |
| `manager@nexus.demo` | `Demo1234` | TENANT_ADMIN | Gestión del tenant `demo` (sin crear tenants) |
| `viewer@nexus.demo` | `Demo1234` | VIEWER | Solo lectura; formularios y botones de acción ocultos o bloqueados |

La página de login incluye "Restablecer datos demo" (`POST /demo/reset`) para restaurar las cuentas protegidas.

## Scripts

| Comando | Descripción |
|---|---|
| `npm run dev` | Desarrollo en puerto `3002` |
| `npm run build` | Build de producción |
| `npm run start` | Sirve el build (`next start`) |
| `npm run lint` | ESLint |
| `npm run test` / `test:watch` | Vitest (run / watch) |

## Integración continua

Workflow [`.github/workflows/ci.yml`](.github/workflows/ci.yml) (GitHub Actions, `ubuntu-latest`, Node 24 + npm 11). Se ejecuta en cada `push` y `pull_request`:

| Paso | Comando | Descripción |
|---|---|---|
| Install | `npm ci` | Instalación reproducible desde `package-lock.json` (requiere npm 11: el lock se genera con npm 11 y con npm 10 la resolución del árbol difiere) |
| Lint | `npm run lint` | ESLint (`eslint-config-next`) |
| Typecheck | `npx tsc --noEmit` | Verificación de tipos sin emitir |
| Unit tests | `npm test -- --run` | Vitest + Testing Library + jsdom (9 tests) |
| Build | `npm run build` | Build de producción Next.js (usa valores por defecto si no hay `.env`) |

## Convenciones UI

- Acento primario índigo (`bg-indigo-600`) en acciones principales; rojo para eliminaciones.
- `RoleBadge`: SUPER_ADMIN morado, TENANT_ADMIN azul, VIEWER gris.
- Skeletons con `animate-pulse` durante cargas; toasts `sonner` en cada mutación y en errores 401/403 ("Sin permiso").
- Confirmación modal (`ConfirmDialog`) antes de eliminar usuarios, roles y proyectos.
