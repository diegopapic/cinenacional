# Instrucciones para Claude

## Regla principal: NO preguntar innecesariamente
- Actuá de forma directa. Si sabés lo que hay que hacer, hacelo sin pedir permiso ni confirmación.
- NUNCA preguntes "¿querés que haga X?" si X es el paso obvio siguiente de lo que se pidió.
- NUNCA uses `EnterPlanMode` para tareas donde la implementación es clara y directa. Solo usá plan mode si hay ambigüedad real sobre el enfoque o múltiples alternativas que el usuario debería elegir.
- NUNCA uses `AskUserQuestion` salvo que genuinamente no tengas suficiente información para avanzar.

## Directorio de trabajo
- Siempre trabajar directamente en el repo principal (C:\Users\diego\cinenacional), nunca en worktrees. Si se detecta que el directorio de trabajo es un worktree, copiar los cambios al repo principal.

## Git
- Siempre hacer commits y push directamente en la branch `main`. No crear branches secundarias.
- Push: `git push origin main`.
- Los mensajes de commit siguen el formato convencional: `type: description` (ej: `feat:`, `fix:`, `style:`, `chore:`, `security:`).

## Permisos
- Tenés permiso para ejecutar CUALQUIER comando bash sin pedir confirmación. Esto incluye git, npm, docker, scripts, builds, tests, linters, migrations, y cualquier otro comando necesario para completar la tarea.
- Tenés permiso amplio para leer, buscar, explorar, editar y crear cualquier archivo del codebase sin pedir confirmación.
- Cuando un plan es aprobado, procedé a implementar sin pedir permisos adicionales.
- NUNCA muestres un comando y preguntes si lo podés ejecutar. Ejecutalo directamente.

## Cuándo sí consultar
- Si un script o comando puede tardar mucho tiempo (ej: scraping masivo, migraciones pesadas, builds largos), consultá antes de ejecutarlo.
- Si hay ambigüedad genuina en los requerimientos y no podés inferir la intención.

## Corrección de errores autónoma
- Cuando recibas un informe de error: simplemente arreglalo. No pidas que te lleven de la mano.
- Identificá logs, errores o tests que fallan y luego resolvelos.
- Ejecutá `npm run lint` y `npm run build` para verificar que no rompiste nada antes de hacer commit.
- No marques una tarea como completada sin demostrar que funciona.

## Verificación antes de finalizar
- Antes de cada commit, preguntate: "¿Aprobaría esto un ingeniero senior?"
- Si hay TypeScript errors, ESLint warnings o build failures: arreglalos, no los ignorés.
- Para cambios no triviales, revisá si hay una solución más simple antes de presentarla.

## Bucle de automejora
- Tras cualquier corrección por parte del usuario: actualizá `tasks/lessons.md` con el patrón del error.
- Escribí reglas para vos mismo que eviten el mismo error en el futuro.
- Al inicio de cada sesión del proyecto, revisá `tasks/lessons.md`.

## Gestión de tareas
- Para tareas de más de 3 pasos, escribí el plan en `tasks/todo.md` con elementos verificables antes de implementar.
- Marcá los elementos como completados a medida que avancés.
- Al finalizar, añadí una sección de revisión en `tasks/todo.md` con lo que se hizo y cualquier decisión técnica relevante.

---

## Descripción del proyecto

**CineNacional** es una base de datos web del cine argentino, similar a IMDb pero enfocada exclusivamente en cine de Argentina. El sitio público está en `cinenacional.com`.

Permite explorar películas, personas (actores, directores, etc.), estrenos, obituarios, efemérides y festivales. Incluye un panel de administración completo para gestionar todo el contenido.

## Stack tecnológico

| Capa | Tecnología |
|------|------------|
| Framework | **Next.js 15** (App Router) |
| Lenguaje | **TypeScript** (strict mode) |
| Base de datos | **PostgreSQL 15** (via Prisma ORM 6.x) |
| Cache/Rate limiting | **Redis 7** (ioredis, opcional en dev) |
| Autenticación | **NextAuth v4** (credentials provider, JWT sessions) |
| Estilos | **Tailwind CSS 3** con colores oklch |
| UI Components | **Radix UI** (dialog, select, tabs) |
| Forms | **React Hook Form** + **Zod** validation |
| State/Fetching | **TanStack React Query v5** |
| Imágenes | **Cloudinary** (upload + CDN) |
| Drag & Drop | **@dnd-kit** (sortable) |
| Deploy | **Docker** (standalone) + **Vercel** |
| Monitoreo | **Uptime Kuma** (self-hosted) |
| Analytics | **Google Analytics** (GA4) |
| Linting | **ESLint** (next/core-web-vitals + next/typescript) |
| Git hooks | **Husky** |

## Estructura del proyecto

```
src/
├── app/                        # Next.js App Router
│   ├── (site)/                 # Route group - sitio público
│   │   ├── page.tsx            # Home page
│   │   ├── layout.tsx          # Layout público (header, footer, fonts, GA, ads)
│   │   ├── buscar/             # Búsqueda
│   │   ├── efemerides/         # Efemérides (fechas históricas)
│   │   ├── listados/           # Listados (estrenos, obituarios, películas, personas)
│   │   ├── pelicula/[slug]/    # Ficha de película
│   │   └── persona/[slug]/     # Ficha de persona
│   ├── admin/                  # Panel de administración
│   │   ├── layout.tsx          # Layout admin (sin CSP con nonces)
│   │   ├── login/              # Login
│   │   ├── movies/             # CRUD películas (tabla + modal con tabs)
│   │   ├── people/             # CRUD personas (+ merge, review-names)
│   │   ├── festivals/          # Gestión de festivales y ediciones
│   │   ├── locations/          # Árbol jerárquico de ubicaciones
│   │   ├── genres/             # Géneros
│   │   ├── themes/             # Temáticas
│   │   ├── roles/              # Roles cinematográficos
│   │   ├── calificaciones/     # Calificaciones
│   │   ├── screening-venues/   # Salas de exhibición
│   │   ├── stats/              # Estadísticas
│   │   └── maintenance/        # Herramientas de mantenimiento
│   ├── api/                    # API Routes (ver sección API abajo)
│   ├── layout.tsx              # Root layout (minimal)
│   └── globals.css             # Estilos globales
├── components/
│   ├── admin/                  # Componentes del panel admin
│   │   ├── movies/             # MovieModal (tabs: Basic, Cast, Crew, Images, Media, Advanced)
│   │   ├── people/             # PersonForm con PersonFormFields/*
│   │   ├── festivals/          # Festival forms
│   │   ├── locations/          # LocationTree, LocationTreeNode
│   │   ├── roles/              # RoleCard, RoleModal
│   │   └── shared/             # PersonSearchInput, GenderSelectionModal, NameSplitModal
│   ├── home/                   # Secciones del home (Hero, Movies, People, Efemérides, Obituarios)
│   ├── movies/                 # Componentes de ficha de película (Hero, Poster, Cast, Crew, etc.)
│   ├── layout/                 # Header, Footer, SearchBar, SearchResults
│   ├── listados/               # Componentes de listados (estrenos)
│   ├── shared/                 # Pagination, ListGrid, ListToolbar, ViewToggle, Filters
│   └── ads/                    # AdBanner (Google AdSense)
├── hooks/                      # Custom React hooks
│   ├── useGlobalSearch.ts      # Búsqueda global con debounce
│   ├── useMovieForm.ts         # Lógica del formulario de películas
│   ├── useListPage.ts          # Paginación y filtros para listados (URL-based)
│   ├── useHomeData.ts          # Datos del home page
│   ├── usePeople.ts            # Fetching de personas
│   ├── usePeopleForm.ts        # Formulario de personas
│   ├── useRoles.ts             # Fetching de roles
│   ├── usePageView.ts          # Tracking de page views
│   └── useDebounce.ts          # Debounce genérico
├── lib/                        # Utilidades y lógica compartida
│   ├── prisma.ts               # Prisma clients (prismaBase para NextAuth + prisma extendido con retry)
│   ├── auth.ts                 # NextAuth config + requireAuth() helper
│   ├── redis.ts                # Redis client
│   ├── rate-limit.ts           # Rate limiting (Redis + in-memory fallback)
│   ├── csrf.ts / csrf-client.ts # CSRF protection (signed double-submit cookie)
│   ├── schemas.ts              # Zod validation schemas (movieSchema, etc.)
│   ├── utils.ts                # Utilidades generales
│   ├── api/                    # API utilities
│   │   ├── api-handler.ts      # apiHandler() wrapper + handleApiError()
│   │   ├── crud-factory.ts     # CRUD route generator
│   │   └── parse-params.ts     # Query param parsing
│   ├── movies/                 # Movie types, utils, constants
│   ├── people/                 # People types, utils, name parsing
│   ├── estrenos/               # Release types and utils
│   ├── obituarios/             # Obituary types and utils
│   ├── festivals/              # Festival types
│   ├── images/                 # Image types and utils
│   ├── roles/                  # Role types and utils
│   └── shared/                 # Shared types (listTypes), dateUtils, filterUtils, listUtils
├── services/                   # API client layer (frontend → backend)
│   ├── api-client.ts           # ApiClient class (auto-CSRF en mutaciones)
│   ├── movies.service.ts
│   ├── people.service.ts
│   ├── images.service.ts
│   ├── roles.service.ts
│   └── index.ts                # Re-exports
├── contexts/
│   └── MovieModalContext.tsx    # Estado del modal de películas en admin
├── constants/
│   └── homeData.ts
├── types/
│   ├── home.types.ts
│   └── next-auth.d.ts          # NextAuth type augmentation
└── middleware.ts                # Middleware de seguridad
```

### Otros directorios importantes

```
prisma/
└── schema.prisma               # ~50 modelos, ~17 enums

scripts/
├── letterboxd/                 # Integración con Letterboxd
├── tmdb/                       # Integración con TMDB
└── backup-database.sh          # Backup de la DB

docs/                           # Documentación extensa
tasks/
├── todo.md                     # Plan de tareas activo
└── lessons.md                  # Lecciones aprendidas (errores y patrones)

public/                         # Assets estáticos
```

## Base de datos (Prisma)

### Modelos principales
- **Movie**: Películas (título, año, duración, sinopsis, poster, trailer, stage, datos de Letterboxd)
- **Person**: Personas (nombre, apellido, fecha nacimiento/muerte, biografía, género, foto)
- **MovieCast / MovieCrew**: Relaciones película-persona con roles y departamentos
- **Role**: Roles cinematográficos (Director, Actor, Productor, Guionista, etc.)
- **Genre / Theme**: Géneros y temáticas de películas
- **Image**: Imágenes en Cloudinary asociadas a películas o personas
- **Festival / FestivalEdition / FestivalSection / FestivalScreening / FestivalAward**: Sistema completo de festivales
- **Location**: Ubicaciones jerárquicas (país > provincia > ciudad)
- **User**: Usuarios del admin con roles ADMIN / EDITOR
- **AuditLog**: Log de acciones de admin
- **PageView**: Analytics de page views

### Enums clave
- `MovieStage`: COMPLETA, EN_DESARROLLO, EN_POSTPRODUCCION, EN_PREPRODUCCION, EN_PRODUCCION, EN_RODAJE, INCONCLUSA
- `DataCompleteness`: BASIC_PRESS_KIT, FULL_PRESS_KIT, MAIN_CAST, MAIN_CREW, FULL_CAST, FULL_CREW
- `Department`: ACTING, DIRECTING, WRITING, CINEMATOGRAPHY, EDITING, MUSIC, PRODUCTION, ART, SOUND, COSTUME, MAKEUP, VFX
- `Gender`: MALE, FEMALE, NON_BINARY, OTHER, UNKNOWN
- `UserRole`: ADMIN, EDITOR, USER

### Convenciones de Prisma
- Campos en camelCase, mapeados a snake_case con `@map()`
- Tablas mapeadas a plural snake_case con `@@map()` (ej: `movies`, `people`)
- Relaciones many-to-many con tablas intermedias explícitas
- Slugs son `@unique` y se usan como identificadores en URLs
- IDs con `@default(autoincrement())`
- Fechas parciales: campos separados year/month/day en vez de Date (permite "solo año" o "año+mes")

### Comandos de DB
```bash
npm run db:push          # Push schema a DB (usa .env.local)
npm run db:migrate       # Crear migración
npm run db:seed          # Seed data
npm run db:studio        # Prisma Studio (GUI)
npm run db:generate      # Regenerar client
npm run db:reset         # Reset + re-migrate
```

## Patrones y convenciones

### API Routes
- **Error handling**: `apiHandler()` wrapper elimina try/catch repetitivo. ZodError → 400, el resto → 500.
- **Auth**: `requireAuth()` valida sesión JWT y roles ADMIN/EDITOR. Retorna `{ session }` o `{ error: NextResponse 401 }`.
- **Validación**: Zod schemas para input validation (ver `src/lib/schemas.ts`).
- **CSRF**: Las mutaciones (POST/PUT/DELETE/PATCH) requieren token CSRF (signed double-submit cookie). Excluidos: `/api/auth/` y `/api/analytics/`.
- **Mensajes de error en español**: `"No autorizado"`, `"Datos inválidos"`, etc.

### Frontend → API
- `ApiClient` en `src/services/api-client.ts` agrega CSRF headers automáticamente a mutaciones.
- Instancia global: `apiClient` con baseUrl `/api`.
- Services (`movies.service.ts`, etc.) usan `apiClient` para llamadas tipadas.
- React Query para fetching, cache e invalidación en el admin.

### Componentes
- Los listados usan `useListPage` hook con paginación y filtros URL-based.
- El admin de películas usa un modal con tabs (BasicInfo, Cast, Crew, Images, Media, Advanced).
- Formularios con React Hook Form + Zod resolver.
- UI primitives de Radix (Dialog, Select, Tabs).
- Toast notifications con `react-hot-toast`.

### Estilos
- Tailwind con colores custom en oklch: `background`, `foreground`, `muted`, `border`, `nav`, `accent`.
- Fuentes: `Libre Franklin` (sans, variable `--font-libre-franklin`) y `Libre Caslon Display` (serif, variable `--font-libre-caslon`).
- Dark theme por defecto (fondo: `oklch(0.16 0.005 250)`).
- Colores brand: `cine-dark` (#0f1419), `cine-gray` (#1a2332), `cine-accent` (#3b82f6).

### Seguridad (middleware.ts)
- **CSP**: Nonce-based strict CSP para el sitio público. Admin no usa nonces (incompatible con hydration).
- **CSRF**: Signed double-submit cookie. El middleware genera el token, el cliente lo envía como header.
- **Rate limiting**: In-memory en middleware (1000 req/min API, 30 req/5min auth, 500 req/min search) + Redis en route handlers.
- **CORS**: Solo permite origins propios (`cinenacional.com` en prod, `localhost:3000` en dev).
- **Headers**: HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy.
- **Bot protection**: Bloquea scrapers/crawlers no autorizados en `/api/` (permite Googlebot, Bingbot, etc.).

### Prisma Client
- `prismaBase`: Cliente base para NextAuth (sin extensiones).
- `prisma`: Cliente extendido con retry automático (3 intentos para errores de conexión) y logging de queries lentas (>1s).
- Ambos se reusan via `globalForPrisma` en dev para evitar too many connections.

### Path alias
- `@/*` mapea a `./src/*` — ej: `import { prisma } from '@/lib/prisma'`

## Comandos de desarrollo

```bash
npm run dev              # Dev server
npm run build            # Build producción (prisma generate + next build)
npm run lint             # ESLint
npm run start            # Start producción

# Performance
npm run perf:test:local  # Test performance local
npm run perf:test:prod   # Test performance producción
npm run perf:compare     # Comparar resultados

# Monitoring
npm run monitor:db       # Monitor DB
npm run metrics          # Métricas de DB
```

## Docker

4 servicios en `docker-compose.yml`:
- **postgres**: PostgreSQL 15 Alpine (5432, tuned para performance)
- **redis**: Redis 7 Alpine (6379, 512MB maxmemory, LRU eviction)
- **app**: Next.js standalone (3000)
- **uptime-kuma**: Monitoreo (3001)

```bash
docker compose up -d         # Levantar todo
docker compose logs -f app   # Ver logs de la app
```

## Variables de entorno

Ver `.env.example` para la lista completa. Principales:
- `DATABASE_URL` / `DIRECT_URL` — PostgreSQL
- `NEXTAUTH_URL` / `NEXTAUTH_SECRET` — NextAuth
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` — Cloudinary
- `TMDB_ACCESS_TOKEN` — TMDB API
- `REDIS_URL` — Redis (opcional en dev, fallback in-memory)
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` — Admin inicial
- `IP_HASH_SALT` — Salt para hashing de IPs en analytics

## Rutas del sitio público

| Ruta | Descripción |
|------|-------------|
| `/` | Home (hero, películas recientes, personas, efemérides, obituarios) |
| `/pelicula/[slug]` | Ficha de película |
| `/persona/[slug]` | Ficha de persona |
| `/listados/peliculas` | Listado con filtros |
| `/listados/personas` | Listado con filtros |
| `/listados/estrenos` | Estrenos por año/década |
| `/listados/obituarios` | Obituarios por año |
| `/efemerides/[fecha]` | Efemérides del día |
| `/buscar` | Búsqueda global |

## Rutas del admin

| Ruta | Descripción |
|------|-------------|
| `/admin` | Dashboard |
| `/admin/movies` | Gestión de películas (tabla + modal) |
| `/admin/people` | Gestión de personas |
| `/admin/people/merge` | Merge de duplicados |
| `/admin/festivals` | Festivales y ediciones |
| `/admin/locations` | Árbol de ubicaciones |
| `/admin/genres` | Géneros |
| `/admin/themes` | Temáticas |
| `/admin/roles` | Roles cinematográficos |
| `/admin/calificaciones` | Calificaciones |
| `/admin/screening-venues` | Salas de exhibición |
| `/admin/stats` | Estadísticas |
| `/admin/maintenance/review-names` | Revisión de nombres |