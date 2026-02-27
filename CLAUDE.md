# CLAUDE.md — cinenacional.com

## Proyecto

Base de datos del cine argentino. Sitio web público + panel de administración para gestionar películas, personas, festivales, estrenos y más. Disponible en [cinenacional.com](https://cinenacional.com).

## Stack Tecnológico

- **Framework**: Next.js 14 (App Router) con React 18, TypeScript
- **Base de datos**: PostgreSQL 15 (via Prisma ORM 6.x)
- **Caché**: Redis 7 (ioredis) con fallback a caché en memoria
- **Estilos**: Tailwind CSS 3.4 con tema custom (oklch color system)
- **Auth**: NextAuth 4 con CredentialsProvider + JWT (24h), roles ADMIN/EDITOR
- **Imágenes**: Cloudinary (upload + optimización)
- **Validación**: Zod (schemas en `src/lib/schemas.ts`)
- **Formularios**: React Hook Form + @hookform/resolvers
- **Data fetching (client)**: TanStack React Query 5
- **UI**: Lucide icons, Radix UI primitives (Dialog, Select, Tabs), react-hot-toast
- **Drag & drop**: @dnd-kit (reordenar cast/crew)
- **Deploy**: Docker (standalone output) en VPS + GitHub Actions CI/CD
- **Node**: 20 (Alpine)

## Estructura del Proyecto

```
src/
├── app/
│   ├── (site)/              # Sitio público (route group)
│   │   ├── page.tsx          # Homepage (client component)
│   │   ├── layout.tsx        # Layout público (fonts, header, footer, GA)
│   │   ├── buscar/           # Búsqueda
│   │   ├── pelicula/[slug]/  # Detalle de película (SSR con Prisma directo)
│   │   ├── persona/[slug]/   # Detalle de persona
│   │   ├── efemerides/       # Efemérides
│   │   └── listados/         # Listados (estrenos, obituarios, películas, personas)
│   ├── admin/                # Panel de administración (client components)
│   │   ├── layout.tsx        # Layout admin (sidebar, navegación)
│   │   ├── movies/           # CRUD películas
│   │   ├── people/           # CRUD personas (incluyendo merge)
│   │   ├── festivals/        # Gestión de festivales y ediciones
│   │   ├── locations/        # Gestión de lugares (árbol jerárquico)
│   │   ├── genres/           # Géneros
│   │   ├── roles/            # Roles técnicos
│   │   ├── themes/           # Temas/tags
│   │   ├── calificaciones/   # Calificaciones INCAA
│   │   ├── stats/            # Estadísticas
│   │   └── maintenance/      # Herramientas de mantenimiento
│   └── api/                  # API Routes (Next.js Route Handlers)
│       ├── movies/           # CRUD + listados + filtros + home-feed
│       ├── people/           # CRUD + merge + filmography + review-names
│       ├── festivals/        # Festivales, ediciones, secciones, screenings
│       ├── locations/        # CRUD + árbol jerárquico + búsqueda
│       ├── genres/           # CRUD
│       ├── roles/            # CRUD + seed
│       ├── themes/           # CRUD
│       ├── search/           # Búsqueda global (con unaccent)
│       ├── images/           # Gestión de imágenes + hero
│       ├── auth/[...nextauth]/ # NextAuth endpoint
│       ├── health/           # Health checks (app + DB)
│       ├── metrics/          # Métricas de base de datos
│       └── analytics/        # Page views tracking
├── components/
│   ├── admin/                # Componentes del panel admin
│   │   ├── movies/MovieModal/ # Modal principal de edición de películas (tabs)
│   │   ├── people/           # Formularios de personas
│   │   ├── festivals/        # Componentes de festivales
│   │   ├── locations/        # Gestión de lugares
│   │   ├── shared/           # Componentes admin compartidos
│   │   └── ui/               # Primitivos UI del admin
│   ├── home/                 # Componentes del homepage
│   ├── film/                 # Componentes de detalle de película
│   ├── layout/               # Header, Footer, SearchBar
│   ├── shared/               # Componentes compartidos (Pagination, filters, etc.)
│   ├── ads/                  # Banners publicitarios (Google AdSense)
│   └── listados/             # Componentes de páginas de listados
├── lib/
│   ├── prisma.ts             # Cliente Prisma (con retry logic + slow query logging)
│   ├── redis.ts              # Cliente Redis singleton (con fallback graceful)
│   ├── auth.ts               # Config NextAuth + helper requireAuth()
│   ├── schemas.ts            # Zod schemas (movieSchema, etc.)
│   ├── utils.ts              # Utilidades generales
│   ├── api/                  # Helpers para API routes
│   ├── movies/               # Lógica de negocio de películas
│   ├── people/               # Lógica de negocio de personas
│   ├── estrenos/             # Lógica de estrenos
│   ├── obituarios/           # Lógica de obituarios
│   ├── festivals/            # Lógica de festivales
│   ├── images/               # Lógica de imágenes
│   ├── roles/                # Lógica de roles
│   ├── shared/               # Utilidades compartidas (dateUtils, etc.)
│   └── utils/                # Utilidades (slugs, etc.)
├── services/                 # API client-side services
│   ├── api-client.ts         # ApiClient class (wrapper fetch con error handling)
│   ├── movies.service.ts     # Servicio de películas
│   ├── people.service.ts     # Servicio de personas
│   ├── images.service.ts     # Servicio de imágenes
│   └── roles.service.ts      # Servicio de roles
├── hooks/                    # Custom React hooks
│   ├── useHomeData.ts        # Datos del homepage
│   ├── useMovieForm.ts       # Form state de películas
│   ├── useListPage.ts        # Lógica de páginas de listados
│   ├── useGlobalSearch.ts    # Búsqueda global
│   ├── useDebounce.ts        # Debounce genérico
│   └── usePageView.ts        # Analytics page view tracking
├── contexts/
│   └── MovieModalContext.tsx  # Context para modal de edición de película
├── constants/
│   └── homeData.ts           # Datos estáticos del home
├── types/
│   ├── home.types.ts         # Tipos del homepage
│   └── next-auth.d.ts        # Extensión de tipos NextAuth (role, id)
└── middleware.ts              # Middleware: auth admin, security headers, rate limiting, CSRF, CORS
```

## Base de Datos (Prisma)

**Schema**: `prisma/schema.prisma` (~1178 líneas, ~50 modelos)

### Modelos Principales
- `Movie` — Película con todos sus metadatos (título, año, duración, sinopsis, stage, etc.)
- `Person` — Persona (actor, director, técnico) con datos biográficos
- `MovieCast` / `MovieCrew` — Relaciones película-persona (con billingOrder, characterName, alternativeName)
- `Genre`, `Theme`, `Role`, `Rating`, `ColorType` — Catálogos
- `Location` — Lugares jerárquicos (país > provincia > ciudad)
- `ProductionCompany` / `DistributionCompany` — Empresas
- `Festival`, `FestivalEdition`, `FestivalSection`, `FestivalScreening`, `FestivalAward` — Sistema completo de festivales
- `Image`, `ImagePerson` — Imágenes con tagging de personas
- `ScreeningVenue`, `MovieScreening` — Pantallas de estreno
- `User` — Usuarios admin (roles ADMIN/EDITOR)
- `AuditLog` — Log de auditoría

### Enums Clave
- `MovieStage`: COMPLETA, EN_DESARROLLO, EN_POSTPRODUCCION, EN_PREPRODUCCION, EN_PRODUCCION, EN_RODAJE, INCONCLUSA
- `UserRole`: ADMIN, EDITOR, USER
- `Gender`: MALE, FEMALE, NON_BINARY, OTHER, UNKNOWN
- `Department`: DIRECTING, WRITING, PRODUCTION, CINEMATOGRAPHY, ART, EDITING, SOUND, MUSIC, VISUAL_EFFECTS, COSTUME, MAKEUP, STUNTS, OTHER

### Conexión
- `DATABASE_URL` para Prisma (con connection pooling)
- `DIRECT_URL` para migraciones directas
- El cliente Prisma tiene retry logic integrado para errores P1001/P1002/P2024

## Patrones Arquitectónicos

### Data Fetching
- **Páginas públicas de detalle** (película, persona): SSR con Prisma directo (`force-dynamic`, `revalidate: 3600`)
- **Homepage**: Client component con `useEffect` + fetch a API routes
- **Admin**: Client components con React Query + servicios (`src/services/`)
- **Listados públicos**: Client components con hooks (`useListPage`)

### Caching (API Routes)
- Patrón de 3 capas: Redis → memoria (Map) → base de datos
- TTL diferenciado: estrenos (15min), históricos (24h), default (1h)
- Cache headers: `Cache-Control: public, s-maxage=X, stale-while-revalidate=2X`
- Invalidación automática en mutaciones (POST/PUT/DELETE limpian claves `movies:list:*`)

### Autenticación
- NextAuth con CredentialsProvider (email/password con bcrypt)
- JWT strategy, sesiones de 24 horas
- Middleware protege `/admin/*` (excepto `/admin/login`)
- Helper `requireAuth()` en API routes para verificar ADMIN/EDITOR
- `prismaBase` (sin extensiones) se usa para NextAuth adapter

### Seguridad (middleware.ts)
- CSP headers completos
- HSTS en producción (2 años)
- Rate limiting por IP (1000 req/min API, 500 req/min search, 10 req/5min auth)
- CSRF protection para mutaciones API
- CORS restringido a cinenacional.com
- Bot blocking (excepto Googlebot, Bingbot, etc.)

### Búsqueda
- Búsqueda con `unaccent()` de PostgreSQL para ignorar acentos
- Ranking por coincidencia exacta → prefijo → parcial
- Búsqueda global en `/api/search/full`

## Comandos

```bash
# Desarrollo
npm run dev                    # Next.js dev server (localhost:3000)
npm run build                  # prisma generate + next build
npm run lint                   # ESLint (next/core-web-vitals + next/typescript)

# Base de datos
npm run db:push                # Prisma db push (con .env.local)
npm run db:migrate             # Prisma migrate dev
npm run db:seed                # Prisma db seed
npm run db:studio              # Prisma Studio GUI
npm run db:generate            # Prisma generate
npm run db:reset               # Prisma migrate reset

# Performance
npm run perf:test              # Test de rendimiento
npm run perf:test:local        # Test local
npm run perf:test:prod         # Test producción

# Documentación
npm run docs:build             # Generar docs API (markdown)
```

## Docker

```bash
docker compose up -d           # Producción (postgres + redis + app + uptime-kuma)
docker compose -f docker-compose.dev.yml up  # Desarrollo
docker compose -f docker-compose.staging.yml up  # Staging
```

Servicios:
- `postgres`: PostgreSQL 15 Alpine (puerto 5432, max 200 conexiones)
- `redis`: Redis 7 Alpine (puerto 6379, 512MB max, LRU eviction)
- `app`: Next.js standalone (puerto 3000)
- `uptime-kuma`: Monitoreo (puerto 3001)

## Deploy (CI/CD)

- Push a `main` → GitHub Actions → SSH al VPS → `docker compose build app` → `docker compose up -d --no-deps app`
- Build se hace antes de bajar contenedores (minimiza downtime)
- Health check post-deploy via `/api/health`
- Producción: https://cinenacional.com

## Variables de Entorno

```
DATABASE_URL                    # PostgreSQL connection string (con pooling)
DIRECT_URL                      # PostgreSQL direct connection (migraciones)
REDIS_URL                       # Redis connection (opcional en dev)
NEXTAUTH_SECRET                 # Secret para JWT
NEXTAUTH_URL                    # URL base para NextAuth
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME  # Cloudinary cloud name
NEXT_PUBLIC_GA_ID               # Google Analytics measurement ID
NEXT_PUBLIC_ADS_ENABLED         # Habilitar Google AdSense
```

## Convenciones de Código

### Generales
- TypeScript estricto (`strict: true`)
- Path alias: `@/*` → `./src/*`
- Idioma del código: nombres de variables/funciones en inglés, contenido y comentarios en español
- Componentes React: PascalCase, archivos .tsx
- API routes: `route.ts` con funciones GET/POST/PUT/DELETE exportadas
- Zod para validación de entrada en API routes
- Slugs para URLs amigables (películas y personas)

### Estilos
- Tailwind CSS con tema custom
- Colores principales: sistema oklch (background, foreground, muted, border, accent)
- Fuentes: Libre Franklin (sans), Libre Caslon Display (serif)
- Tema oscuro por defecto (dark UI)
- Admin usa tema light separado (`admin.css`)

### Base de datos
- Prisma con `@map()` para snake_case en columnas SQL
- Relaciones many-to-many via tablas intermedias explícitas (MovieGenre, MovieCast, etc.)
- `billingOrder` para ordenar cast/crew
- Fechas parciales: campos separados (year, month, day) en vez de Date completo
- Soft deletes no se usan; se usa `isActive` en algunos modelos

### API Routes
- Patrón consistente: validar con Zod → ejecutar query → formatear respuesta
- `requireAuth()` al inicio de rutas protegidas
- Paginación: `{ data/movies/people, pagination: { page, limit, total, totalPages } }`
- Errores: `{ error: string, details?: any }` con status codes apropiados
- Cache headers en GETs públicos

## Instrucciones para Claude

### Regla principal: NO preguntar innecesariamente
- Actuá de forma directa. Si sabés lo que hay que hacer, hacelo sin pedir permiso ni confirmación.
- NUNCA preguntes "¿querés que haga X?" si X es el paso obvio siguiente de lo que se pidió.
- NUNCA uses `EnterPlanMode` para tareas donde la implementación es clara y directa. Solo usá plan mode si hay ambigüedad real sobre el enfoque o múltiples alternativas que el usuario debería elegir.
- NUNCA uses `AskUserQuestion` salvo que genuinamente no tengas suficiente información para avanzar.

### Directorio de trabajo
- Siempre trabajar directamente en el repo principal, nunca en worktrees. Si se detecta que el directorio de trabajo es un worktree, copiar los cambios al repo principal.

### Git
- Siempre hacer commits y push directamente en la branch `main`. No crear branches secundarias.
- Push: `git push origin main`.

### Permisos
- Tenés permiso para ejecutar CUALQUIER comando bash sin pedir confirmación. Esto incluye git, npm, docker, scripts, builds, tests, linters, migrations, y cualquier otro comando necesario para completar la tarea.
- Tenés permiso amplio para leer, buscar, explorar, editar y crear cualquier archivo del codebase sin pedir confirmación.
- Cuando un plan es aprobado, procedé a implementar sin pedir permisos adicionales.
- NUNCA muestres un comando y preguntes si lo podés ejecutar. Ejecutalo directamente.

### Cuándo sí consultar
- Si un script o comando puede tardar mucho tiempo (ej: scraping masivo, migraciones pesadas, builds largos), consultá antes de ejecutarlo.
- Si hay ambigüedad genuina en los requerimientos y no podés inferir la intención.
