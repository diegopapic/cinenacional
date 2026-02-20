# Análisis de Refactorización y Optimización

> Fecha: 2026-02-20
> Objetivo: Identificar código duplicado, obsoleto, y oportunidades de refactorización.
> **Este documento es solo de análisis. No se modificó ningún archivo.**

---

## Índice

1. [Componentes duplicados](#1-componentes-duplicados)
2. [Lógica de listados duplicada (Content/Utils/Types)](#2-lógica-de-listados-duplicada)
3. [API routes con boilerplate repetido](#3-api-routes-con-boilerplate-repetido)
4. [Iconos SVG duplicados entre componentes](#4-iconos-svg-duplicados)
5. [Dependencias no usadas o reemplazables](#5-dependencias-no-usadas-o-reemplazables)
6. [Endpoints de debug/test en producción](#6-endpoints-de-debugtest-en-producción)
7. [Archivos y directorios obsoletos](#7-archivos-y-directorios-obsoletos)
8. [Componentes Ad triviales eliminables](#8-componentes-ad-triviales)
9. [Tipos duplicados entre módulos](#9-tipos-duplicados-entre-módulos)
10. [Paginación duplicada en componentes](#10-paginación-duplicada)
11. [Resumen de impacto](#11-resumen-de-impacto)

---

## 1. Componentes duplicados

### 1.1 ViewToggle — 100% idéntico

**Archivos:**
- `src/app/(site)/listados/peliculas/ViewToggle.tsx`
- `src/app/(site)/listados/personas/ViewToggle.tsx`

**Problema:** Son exactamente el mismo componente, línea por línea. La única diferencia es el import del tipo `ViewMode`, que es idéntico en ambos módulos.

**Acción:** Crear un único `src/components/shared/ViewToggle.tsx` que acepte un tipo genérico `ViewMode = 'compact' | 'detailed'`. Eliminar ambos archivos actuales y actualizar los imports en `PeliculasContent.tsx` y `PersonasContent.tsx`.

---

### 1.2 Grids — ~85% similares

**Archivos:**
- `src/app/(site)/listados/peliculas/PeliculasGrid.tsx`
- `src/app/(site)/listados/personas/PersonasGrid.tsx`

**Problema:** Misma estructura: loading skeleton → empty state → compact/detailed render. Solo cambian:
- El tipo de datos (`MovieListItem[]` vs `PersonWithMovie[]`)
- Las columnas del grid (`grid-cols-3` vs `grid-cols-2`)
- Los skeletons (poster rectangular vs retrato circular)
- Los card components que renderizan

**Acción:** Crear un componente genérico `ListGrid<T>` que reciba:
- `items: T[]`
- `isLoading: boolean`
- `viewMode: ViewMode`
- `renderCompact: (item: T) => ReactNode`
- `renderDetailed: (item: T) => ReactNode`
- `gridClassCompact / gridClassDetailed`
- `skeletonCompact / skeletonDetailed: ReactNode`
- `emptyMessage: string`

---

### 1.3 Content wrappers — ~90% similares

**Archivos:**
- `src/app/(site)/listados/peliculas/PeliculasContent.tsx` (333 líneas)
- `src/app/(site)/listados/personas/PersonasContent.tsx` (334 líneas)

**Problema:** Son prácticamente copias espejo. Comparten exactamente la misma lógica de:
- Inicialización de filtros desde URL (`useState`, `useEffect` para searchParams)
- Sincronización filtros ↔ URL (`router.replace`)
- Carga de datos con fetch (`loadFiltersData`, `loadMovies`/`loadPeople`)
- Handlers idénticos: `handleFilterChange`, `handleClearFilters`, `handleSortByChange`, `handleToggleSortOrder`, `handlePageChange`
- Limit dinámico por viewMode (24 compact / 12 detailed)
- Toolbar idéntico (sort select, sort direction, filters button, clear filters, spacer, ViewToggle)
- Paginación idéntica con `buildPageNumbers`

La interfaz `PaginationState` está definida inline e idéntica en ambos archivos:
```ts
interface PaginationState {
  page: number;
  totalPages: number;
  totalCount: number;
}
```

**Acción:** Extraer un hook `useListPage<TFilters, TItem>` que encapsule toda la lógica compartida:
- Estado de filtros, paginación, loading, viewMode
- Sincronización URL ↔ filtros
- Carga de datos genérica (recibe `apiEndpoint` y `filtersEndpoint`)
- Todos los handlers

Además, extraer un componente `ListToolbar` para la toolbar compartida y un componente `Pagination` para la paginación.

---

### 1.4 FilterSelect / FilterInput — componentes locales duplicados

**Archivos:**
- `PeliculasFilters.tsx` define `FilterSelect` y `FilterInput` como funciones locales
- `PersonasFilters.tsx` define `FilterSelect` y `FilterInput` como funciones locales

**Problema:** Ambos definen componentes `FilterSelect` y `FilterInput` con la misma estructura visual (label + select/input con estilos idénticos). Las diferencias menores:
- `PeliculasFilters.FilterSelect` recibe `options[]` y renderiza internamente
- `PersonasFilters.FilterSelect` recibe `children` como React nodes
- `PeliculasFilters` tiene un `DateInput` adicional que no existe en personas

**Acción:** Extraer a `src/components/shared/filters/FilterSelect.tsx` y `FilterInput.tsx`. Unificar la API usando el patrón con `options` + render prop opcional.

---

## 2. Lógica de listados duplicada

### 2.1 Utils — funciones idénticas entre módulos

**Archivos:**
- `src/lib/movies/movieListUtils.ts` (397 líneas)
- `src/lib/people/personListUtils.ts` (401 líneas)

**Funciones 100% idénticas (misma lógica, distintos tipos):**

| Función | movieListUtils | personListUtils |
|---------|---------------|-----------------|
| `buildPageNumbers()` | ✅ Idéntica | ✅ Idéntica |
| `generateYearOptions()` | ✅ Idéntica | ✅ Idéntica |
| `hasActiveFilters()` | ✅ Idéntica | ✅ Idéntica |
| `clearFilters()` | ✅ Idéntica (misma estructura) | ✅ Idéntica |
| `filtersToSearchParams()` | Mismo patrón, distintos campos | Mismo patrón, distintos campos |
| `searchParamsToFilters()` | Mismo patrón, distintos campos | Mismo patrón, distintos campos |
| `filtersToApiParams()` | Mismo patrón, distintos campos | Mismo patrón, distintos campos |
| `countActiveFilters()` | Mismo patrón, distintos campos | Mismo patrón, distintos campos |

Además, `formatPartialDate()` en personListUtils y `formatReleaseDate()` en movieListUtils hacen exactamente lo mismo (formatear fecha parcial con meses en español).

**Acción:**
1. Mover `buildPageNumbers`, `generateYearOptions` a `src/lib/shared/listUtils.ts`
2. Mover `formatPartialDate` a `src/lib/shared/dateUtils.ts` (o verificar si ya existe ahí)
3. Crear funciones genéricas `filtersToSearchParams<T>`, `searchParamsToFilters<T>`, etc., que usen un esquema de filtros configurable en vez de hardcodear cada campo

### 2.2 Types — tipos duplicados

**Archivos:**
- `src/lib/movies/movieListTypes.ts`
- `src/lib/people/personListTypes.ts`

**Tipos idénticos:**
- `ViewMode = 'compact' | 'detailed'` — definido en ambos archivos
- `FilterOption { id, name, count? }` — definido en ambos (con leve diferencia: `id: number | string` vs `id: number`)
- `PaginatedResponse { data, totalCount, page, totalPages, hasMore }` — misma estructura

**Acción:** Extraer a `src/lib/shared/listTypes.ts`:
```ts
export type ViewMode = 'compact' | 'detailed';
export type SortOrder = 'asc' | 'desc';
export interface FilterOption { id: number | string; name: string; count?: number }
export interface PaginatedResponse<T> { data: T[]; totalCount: number; page: number; totalPages: number; hasMore: boolean }
export interface PaginationState { page: number; totalPages: number; totalCount: number }
```

### 2.3 Constantes duplicadas con valores inconsistentes

**Archivos:**
- `src/lib/movies/movieListTypes.ts` — constantes para UI de listados
- `src/lib/movies/movieConstants.ts` — constantes para el admin/forms

| Constante en listTypes | Constante en movieConstants | Problema |
|---|---|---|
| `SOUND_TYPE_OPTIONS` con valores `'SONORA'`, `'MUDA'`, `'SONORIZADA'` | `SOUND_TYPES` con valores `'Sonora'`, `'Muda'`, `'n/d'` | **Casing diferente** (`SONORA` vs `Sonora`), opciones diferentes |
| `STAGE_OPTIONS` con 5 stages | `MOVIE_STAGES` con 7 stages (incluye `EN_PREPRODUCCION`, `EN_DESARROLLO`, `INEDITA`) | **Lista incompleta** en listTypes |
| `DURATION_TYPE_OPTIONS` con valores `'LARGO'`, `'MEDIO'`, `'CORTO'` | `TIPOS_DURACION` con valores `'largometraje'`, `'mediometraje'`, `'cortometraje'` | **Valores completamente distintos** para lo mismo |

**Acción:** Unificar cada constante en una sola fuente de verdad en `movieConstants.ts`. Los listados y el admin deben usar los mismos valores.

### 2.4 `formatDuration` triplicada

Existen **3 implementaciones** de `formatDuration`:

1. `src/lib/utils.ts:45` — versión simple, siempre muestra `Xh Ymin` (produce `0h 45min` para 45 minutos)
2. `src/lib/movies/movieListUtils.ts:118` — versión mejorada, maneja `hours===0` y `mins===0`
3. Posible uso inline en componentes

**Acción:** Mantener solo la versión de `movieListUtils` (la más completa) y moverla a `src/lib/shared/formatters.ts`. Eliminar la de `utils.ts`.

### 2.5 `formatPartialDate` triplicada

3 implementaciones que producen lo mismo (`"5 de marzo de 2020"`):

1. `src/lib/shared/dateUtils.ts:93` — versión más completa, acepta `PartialDate` con opciones
2. `src/lib/movies/movieListUtils.ts:143` — `formatReleaseDate(year, month, day)`
3. `src/lib/people/personListUtils.ts:127` — `formatPartialDate(year, month, day)`

Todas hardcodean el mismo array de meses en español.

**Acción:** Usar solo la versión de `dateUtils.ts` y eliminar las otras dos.

### 2.6 `calculateAge` duplicada

- `src/lib/people/personListUtils.ts:156` — `calculateAge(birthYear, birthMonth, birthDay, deathYear, deathMonth, deathDay)`
- `src/lib/shared/dateUtils.ts:147` — `calculateYearsBetween(from: PartialDate, to: PartialDate)`

Misma lógica de ajuste de cumpleaños, API diferente.

**Acción:** Usar solo `calculateYearsBetween` de dateUtils y crear un wrapper si se necesita la API con 6 parámetros.

### 2.7 `PaginatedResponse` definida 5 veces

La misma interfaz `{ data: T[], totalCount, page, totalPages, hasMore }` está definida en:

1. `src/lib/movies/movieListTypes.ts` → `PaginatedMovieListResponse`
2. `src/lib/people/personListTypes.ts` → `PaginatedPersonListResponse`
3. `src/lib/people/peopleTypes.ts` → variante
4. `src/lib/roles/rolesTypes.ts` → variante
5. `src/lib/images/imageTypes.ts` → variante

**Acción:** Crear un genérico `PaginatedResponse<T>` en `src/lib/shared/listTypes.ts`.

---

## 3. API routes con boilerplate repetido

### 3.1 CRUD idéntico para entidades simples

**Archivos afectados:**
- `src/app/api/genres/route.ts` + `[id]/route.ts`
- `src/app/api/themes/route.ts` + `[id]/route.ts`
- `src/app/api/roles/route.ts` + `[id]/route.ts`
- `src/app/api/calificaciones/route.ts` + `[id]/route.ts`
- `src/app/api/screening-venues/route.ts` + `[id]/route.ts`

**Problema:** Todos siguen exactamente el mismo patrón:

```ts
// GET list
export async function GET() {
  try {
    const items = await prisma.model.findMany({ ... })
    return NextResponse.json(items)
  } catch (error) {
    console.error('Error fetching X:', error)
    return NextResponse.json({ error: 'Error al obtener X' }, { status: 500 })
  }
}

// POST create
export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if (auth.error) return auth.error
  try {
    const body = await request.json()
    if (!body.name) return NextResponse.json({ error: '...' }, { status: 400 })
    // generar slug único (mismo loop en todos)
    let slug = createSlug(body.name)
    let slugExists = await prisma.model.findUnique({ where: { slug } })
    let counter = 1
    while (slugExists) { ... }
    const item = await prisma.model.create({ data: { ... } })
    return NextResponse.json(item, { status: 201 })
  } catch { ... }
}

// [id]/route.ts — GET by id, PUT update, DELETE
// Mismo patrón: parseInt(params.id), isNaN check, findUnique, not found 404, etc.
```

**Patrón de slug único** repetido en: genres, themes, roles (al menos 3 archivos).

**Acción:** Crear una factory de CRUD routes:
```ts
// src/lib/api/crud-factory.ts
export function createCrudHandlers(config: {
  model: string;
  entityName: string;
  include?: object;
  validateCreate?: (body) => string | null;
  ...
})
```

Alternativamente, al menos extraer:
1. `generateUniqueSlug(model, name)` → reutilizable
2. `withAuth(handler)` → wrapper de auth
3. `withErrorHandler(handler, entityName)` → wrapper try/catch
4. `parseIdParam(params)` → validación de ID numérico

### 3.2 Patrón de error handling repetido

En TODOS los API routes se repite:
```ts
try {
  // lógica
} catch (error) {
  console.error('Error ...:', error)
  return NextResponse.json({ error: 'Error al ...' }, { status: 500 })
}
```

**Acción:** Crear un wrapper `withErrorHandler`:
```ts
export function withErrorHandler(handler: Function, context: string) {
  return async (...args) => {
    try {
      return await handler(...args);
    } catch (error) {
      console.error(`Error ${context}:`, error);
      return NextResponse.json({ error: `Error al ${context}` }, { status: 500 });
    }
  }
}
```

### 3.3 Inconsistencias entre API routes

Además de la duplicación, hay inconsistencias que habría que normalizar:

| Problema | Dónde |
|---|---|
| **Falta validación `isNaN(id)`** en GET | `themes/[id]/route.ts` — no valida, puede pasar NaN a Prisma |
| **DELETE responde diferente** | `roles/[id]` usa `204 No Content`; los demás usan `200 + JSON message` |
| **GET list responde diferente** | `roles` devuelve `{ data, totalCount, page, totalPages, hasMore }`; los demás devuelven array plano |
| **Validación mixta** | `roles` usa Zod schema; los demás usan `if (!body.name)` manual |
| **Dos funciones de slug** | `roles` importa `generateSlug` de `@/lib/utils/slugs`; los demás usan `createSlug` de `@/lib/utils` |
| **Error swallowing** | `stats/route.ts` devuelve zeros con status 200 en vez de 500 en caso de error |
| **Stack trace leak** | `search/test/route.ts` incluye `errorStack` en la respuesta de error |
| **themes GET** | Agrega `movieCount` mapeado; genres/calificaciones devuelven `_count` raw de Prisma |
| **Estilo de código** | roles usa semicolons; genres/themes/calificaciones no — inconsistente |

**Acción:** Al refactorizar las API routes, normalizar:
- Siempre validar `isNaN(id)` en rutas `[id]`
- Unificar formato de respuesta DELETE (preferir 204 o 200 con mensaje, pero elegir uno)
- Usar Zod para validación en todos los endpoints, no solo roles
- Unificar a una sola función de slug (`createSlug` o `generateSlug`)
- No devolver stack traces en ningún endpoint

---

## 4. Iconos SVG duplicados

### 4.1 ExternalLinks — copias casi idénticas

**Archivos:**
- `src/components/movies/FilmExternalLinks.tsx` (91 líneas)
- `src/components/people/PersonExternalLinks.tsx` (141 líneas)

**Problema:**
- Los SVGs de redes sociales (Instagram, Twitter, Facebook, TikTok, YouTube) son **100% idénticos** en ambos archivos — son copias verbatim de los mismos paths SVG.
- El componente de renderizado es idéntico: mismo JSX, mismos estilos.
- `PersonExternalLinks` tiene más tipos (LinkedIn, Vimeo, Letterboxd, Spotify, IMDb, Wikipedia, Podcast) que `FilmExternalLinks` no tiene.
- Los tipos `ExternalLinkEntry` y `PersonExternalLinkEntry` son idénticos: `{ type: string; url: string }`.

**Acción:** Crear un único componente `src/components/shared/ExternalLinks.tsx` con:
- Un diccionario unificado de ICONS (superset de ambos)
- Un diccionario unificado de LABELS
- Un tipo único `ExternalLinkEntry = { type: string; url: string }`
- Reutilizar en ambas páginas (película y persona)

Esto elimina ~90 líneas de SVGs duplicados.

### 4.2 react-icons vs lucide-react ✅ HECHO

**Problema:** El proyecto usa `lucide-react` en toda la app excepto en `Footer.tsx` que importa `FaInstagram, FaFacebook, FaYoutube` de `react-icons/fa`. Esto agrega toda la dependencia `react-icons` por solo 3 iconos.

**Resuelto:** Se reemplazó `FaInstagram` con `Instagram` de lucide-react en Footer.tsx y se eliminó `react-icons` de package.json.

---

## 5. Dependencias no usadas o reemplazables ✅ HECHO

### 5.1 Dependencias sin imports en src/ ✅

| Dependencia | Importada en src/ | Usada en scripts/ | Acción | Estado |
|---|---|---|---|---|
| `@supabase/supabase-js` | **NO** | Posiblemente en _basura | **Eliminar** | ✅ Eliminada |
| `mysql2` | **NO** | Posiblemente en _basura | **Eliminar** | ✅ Eliminada |
| `php-unserialize` | **NO** | Posiblemente en _basura | **Eliminar** | ✅ Eliminada |
| `node-fetch` | **NO** | No verificado | **Eliminar** (Next.js tiene fetch nativo) | ✅ Eliminada |
| `csv-parser` | **NO** | No verificado | **Mover a devDependencies** o eliminar | ✅ Eliminada |
| `axios` | **NO** | No verificado | **Eliminar** (el proyecto usa fetch y tiene api-client.ts) | ✅ Eliminada |

### 5.2 Dependencias usadas mínimamente ✅ (parcial)

| Dependencia | Uso | Acción | Estado |
|---|---|---|---|
| `react-icons` | Solo en `Footer.tsx` (3 iconos) | Reemplazar con lucide-react y **eliminar** | ✅ Reemplazada con `Instagram` de lucide-react, dep eliminada |
| `lodash` | Solo en `LocationFields.tsx` (`debounce`) | Reemplazar con `setTimeout` manual. **Eliminar lodash** | ✅ Reemplazada con setTimeout + useRef, dep eliminada (+ `@types/lodash`) |
| `date-fns` | Solo en 3 archivos admin | Evaluar si se puede reemplazar con funciones nativas o las utils propias de fecha | Pendiente |
| `isomorphic-dompurify` | En 3 archivos (persona page, MovieHero, MovieInfo) | Mantener — se usa para sanitizar HTML | N/A — se mantiene |

### 5.3 Impacto estimado → Resultado real

Se eliminaron 9 dependencias (las 8 previstas + `@types/lodash`), resultando en **42 paquetes removidos** de node_modules. Build verificado exitoso.

---

## 6. Endpoints de debug/test en producción

### 6.1 Archivos que NO deberían estar en producción

| Archivo | Problema |
|---|---|
| `src/app/api/search/test/route.ts` | Endpoint de test que expone conteos y samples de la DB. No tiene auth. |
| `src/app/api/project-structure/route.ts` | Escanea el filesystem del servidor y devuelve la estructura completa del proyecto. Tiene auth pero es un riesgo de información. |
| `src/app/test/page.tsx` | Página que solo renderiza `<div>Test</div>`. |

**Acción:** Eliminar los 3 archivos. Si se necesitan para desarrollo, protegerlos con `process.env.NODE_ENV !== 'production'` guard.

---

## 7. Archivos y directorios obsoletos

### 7.1 Directorio `_basura/` — código muerto

Contiene 90+ archivos de scripts de migración WordPress → Supabase/Prisma, componentes muertos, docs obsoletos, y reportes de performance antiguos. Todo esto ya fue procesado y no se necesita.

**Acción:** Eliminar todo el directorio `_basura/` o al menos sacarlo del repo y mantenerlo como backup externo.

### 7.2 Directorio `uploads/` — datos de WordPress

Contiene logs de importación de WordPress (`wp-import-export-lite`). No tiene relación con la app Next.js.

**Acción:** Verificar si está en `.gitignore`. Si no, agregarlo. Si está trackeado, eliminar del repo.

### 7.3 Directorio `dumps/` — SQL y JSON dumps

Contiene dumps de WordPress y archivos de migración. No se necesitan en el repo.

**Acción:** Agregar a `.gitignore` si no está, o eliminar del tracking de git.

### 7.4 Archivos root-level innecesarios

| Archivo | Problema |
|---|---|
| `database-structure-meta.json` | Snapshot viejo de la estructura de DB |
| `project-structure.json` | Generado por el endpoint `/api/project-structure` |
| `raw_urls_detailed.json` | Datos de desarrollo/scraping |
| `raw_urls.md` | Lista de URLs de desarrollo |
| `admin-code.txt` | Código exportado/compilado viejo |
| `compiled-code.txt` | Código compilado viejo |
| `database-structure.txt` | Estructura de DB en texto |
| `PROJECT_DOCS.md` | Docs viejos (hay versiones más nuevas en `docs/`) |
| `INSTALACION_SERVIDOR_CINENACIONAL.md` | Guía de instalación del servidor |
| `TODO.md` | Lista de TODOs vieja |

**Acción:** Mover a `_basura/` o eliminar. Mantener solo `README.md`, `CLAUDE.md`, `ANALISIS_REFACTORIZACION.md`.

### 7.5 Scripts one-shot ya ejecutados

| Script | Propósito |
|---|---|
| `scripts/fix-nicknames.js` | Fix de nicknames — ya ejecutado |
| `scripts/fix-nicknames-quotes-parens.js` | Fix de quotes en nicknames — ya ejecutado |
| `scripts/fix-null-lastnames.js` | Fix de apellidos null — ya ejecutado |
| `scripts/restore-directors-interactive.js` | Restaurar directores — ya ejecutado |
| `scripts/restore-missing-directors.js` | Restaurar directores faltantes — ya ejecutado |
| `scripts/review-incaa-ratings.js` | Revisión de calificaciones INCAA — ya ejecutado |
| `scripts/scrape-incaa-ratings.js` | Scraping de INCAA — ya ejecutado |
| `scripts/incaa-ratings-*.json` | Datos de INCAA ya procesados |

**Acción:** Mover a `_basura/scripts-muertos/` para mantener como referencia histórica sin contaminar el directorio activo.

---

## 8. Componentes Ad triviales

**Archivos:**
- `src/components/ads/HomeBottomBanner.tsx` (4 líneas útiles)
- `src/components/ads/HomeMiddleBanner.tsx` (4 líneas útiles)

**Problema:** Cada archivo es un wrapper de una sola línea sobre `AdBanner`:
```tsx
export default function HomeBottomBanner() {
  return <AdBanner slot="1192731540" format="horizontal" className="my-12" />
}
```

Estos componentes no agregan valor. Se podrían usar directamente `<AdBanner slot="..." format="horizontal" className="my-12" />` donde se necesiten.

**Acción:** Evaluar si eliminarlos y usar `AdBanner` directamente, o mantenerlos por claridad semántica (el nombre del componente documenta dónde va). **Baja prioridad.**

---

## 9. Tipos duplicados entre módulos

### 9.1 `ViewMode` definido 2 veces

- `src/lib/movies/movieListTypes.ts:109` → `export type ViewMode = 'compact' | 'detailed'`
- `src/lib/people/personListTypes.ts:97` → `export type ViewMode = 'compact' | 'detailed'`

### 9.2 `FilterOption` definido 2 veces

- `movieListTypes.ts:77` → `{ id: number | string; name: string; count?: number }`
- `personListTypes.ts:54` → `{ id: number; name: string; count?: number }`

### 9.3 `PaginatedResponse` definido 2 veces

- `movieListTypes.ts:100` → `PaginatedMovieListResponse`
- `personListTypes.ts:88` → `PaginatedPersonListResponse`
Misma estructura, distinto nombre.

### 9.4 `PaginationState` definido inline 2 veces

- `PeliculasContent.tsx:31-35`
- `PersonasContent.tsx:31-35`
Idéntico `{ page, totalPages, totalCount }`.

**Acción:** Mover todos a `src/lib/shared/listTypes.ts` y re-exportar desde los módulos específicos para no romper imports existentes.

---

## 10. Paginación duplicada

**Archivos:**
- `PeliculasContent.tsx:285-329` — componente de paginación
- `PersonasContent.tsx:285-329` — componente de paginación (idéntico)
- `ObituariosContent.tsx:174-208` — paginación diferente (estilo distinto, más simple)

**Problema:** El componente de paginación de películas y personas es idéntico (mismo JSX, mismos estilos). Obituarios tiene otra variante con estilo diferente que rompe la consistencia visual.

**Acción:**
1. Extraer `src/components/shared/Pagination.tsx` con el diseño actual de películas/personas
2. Reemplazar la paginación inline en ambos Content components
3. Migrar ObituariosContent a usar el mismo componente `Pagination` para consistencia visual

---

## 11. Console.logs de debug en producción

**Archivo:** `src/hooks/useMovieForm.ts` (1047 líneas)

Contiene múltiples `console.log` con emojis de debug que no deberían estar en producción:
- Líneas ~275-289, ~314, ~738-762, ~798-802, ~834-840, ~876-879, ~914

Ejemplo: `console.log('🎬 Saving movie data:', data)`

**Acción:** Eliminar todos los `console.log` de debug de este hook.

---

## 12. Inconsistencia en servicios

**Archivo:** `src/services/people.service.ts`

Mezcla `apiClient` (para `getById`, `delete`, `checkSlugAvailability`, `getStats`) con `fetch()` raw (para `getAll`, `search`, `create`, `update`, `exportToCSV`). Esto sugiere una migración incompleta a `apiClient`.

**Archivo:** `src/services/movies.service.ts` — usa `fetch()` raw para todo.

**Acción:** Completar la migración de ambos servicios a `apiClient` para consistencia. El `apiClient` ya provee manejo de errores, building de URLs, y Content-Type headers automáticos.

---

## 13. Patrón de procesamiento de fechas repetido en servicios

**Archivos:**
- `src/services/movies.service.ts` — `formatMovieDataForAPI()` repite el mismo bloque de 12 líneas **3 veces** (release, filmingStart, filmingEnd)
- `src/services/people.service.ts` — `formatPersonDataForAPI()` repite el mismo bloque **2 veces** (birth, death)

Patrón repetido:
```ts
if (data.isPartialX && data.partialX) {
  apiData.XYear = data.partialX.year;
  apiData.XMonth = data.partialX.month;
  apiData.XDay = data.partialX.day;
} else if (data.X) {
  const partial = dateToPartialFields(data.X);
  // ...
} else {
  apiData.XYear = null; apiData.XMonth = null; apiData.XDay = null;
}
```

**Acción:** Extraer un helper `processPartialDateForAPI(isPartial, partialDate, fullDate)` que elimine las 5 copias.

---

## Resumen de impacto

### Archivos que se pueden eliminar (limpieza)

| Categoría | Cantidad aprox | Descripción |
|---|---|---|
| `_basura/` completo | ~90 archivos | Código muerto de migraciones WP |
| Scripts one-shot | ~10 archivos | Scripts ya ejecutados |
| Archivos root innecesarios | ~8 archivos | JSONs, TXTs de desarrollo |
| Endpoints de test | 3 archivos | `/api/search/test`, `/api/project-structure`, `/test` |
| `uploads/` | ~15 archivos | Logs de importación WP |
| **Total eliminable** | **~126 archivos** | |

### Componentes refactorizables (consolidación)

| Refactorización | Archivos afectados | Líneas eliminadas aprox |
|---|---|---|
| ViewToggle unificado | 2 → 1 | ~45 líneas |
| ExternalLinks unificado | 2 → 1 | ~90 líneas (SVGs duplicados) |
| Pagination compartido | 3 → 1 | ~90 líneas |
| ListGrid genérico | 2 → 1 | ~40 líneas |
| Hook useListPage | 2 Content → 1 hook + 2 thin wrappers | ~250 líneas |
| FilterSelect/FilterInput compartidos | 4 definiciones → 2 componentes | ~60 líneas |
| Tipos compartidos (ViewMode, etc) | 4+ archivos → 1 shared | ~30 líneas |
| Utils compartidos (buildPageNumbers, etc) | 2 → 1 shared + 2 specific | ~50 líneas |
| formatDuration unificado | 3 → 1 | ~20 líneas |
| formatPartialDate unificado | 3 → 1 | ~40 líneas |
| calculateAge unificado | 2 → 1 | ~30 líneas |
| PaginatedResponse genérico | 5 → 1 | ~25 líneas |
| Procesamiento de fechas en servicios | 5 bloques → 1 helper | ~50 líneas |
| Console.logs de debug | eliminación directa | ~30 líneas |
| **Total consolidable** | | **~900 líneas** |

### Dependencias eliminables

| Dependencia | Tamaño aprox |
|---|---|
| `@supabase/supabase-js` | ~200KB |
| `mysql2` | ~500KB |
| `php-unserialize` | ~10KB |
| `node-fetch` | ~50KB |
| `csv-parser` | ~30KB |
| `axios` | ~100KB |
| `react-icons` | ~500KB |
| `lodash` | ~600KB (o ~25KB para debounce alone) |
| **Total** | **~2MB en node_modules** |

### Prioridades sugeridas

1. **Alta prioridad / Fácil:**
   - ~~Eliminar dependencias no usadas de package.json (8 deps)~~ ✅ 9 deps eliminadas
   - Eliminar endpoints de test (`/api/search/test`, `/api/project-structure`, `/test`)
   - Eliminar archivos root innecesarios
   - Eliminar console.logs de debug en `useMovieForm.ts`
   - Unificar constantes con valores inconsistentes (SOUND_TYPES, STAGE, DURATION)

2. **Media prioridad / Medio esfuerzo:**
   - Unificar ViewToggle → un componente shared
   - Unificar ExternalLinks → un componente shared (elimina ~90 líneas de SVGs)
   - Extraer Pagination compartido
   - Extraer tipos compartidos a `src/lib/shared/` (ViewMode, FilterOption, PaginatedResponse)
   - Mover funciones duplicadas a shared (buildPageNumbers, generateYearOptions, formatDuration, formatPartialDate, calculateAge)
   - Normalizar inconsistencias de API routes (isNaN check, formato DELETE, validación Zod)

3. **Baja prioridad / Alto esfuerzo (pero alto impacto):**
   - Crear hook `useListPage` genérico (elimina ~250 líneas duplicadas)
   - Crear factory de CRUD API routes
   - Crear ListGrid genérico
   - Unificar FilterSelect/FilterInput
   - Completar migración de servicios a `apiClient`
   - Extraer helper `processPartialDateForAPI` en servicios

4. **Limpieza general:**
   - Eliminar directorio `_basura/`
   - Mover scripts one-shot fuera del directorio activo
   - Limpiar `uploads/` y `dumps/`
