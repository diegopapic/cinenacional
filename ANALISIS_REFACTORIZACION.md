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

### 1.1 ViewToggle — 100% idéntico ✅ HECHO

**Resuelto:** Se creó `src/components/shared/ViewToggle.tsx` con el tipo `ViewMode` exportado. Se eliminaron los dos archivos duplicados de `peliculas/` y `personas/`. Se actualizaron los imports en `PeliculasContent.tsx`, `PersonasContent.tsx`, `PeliculasGrid.tsx` y `PersonasGrid.tsx`. Se eliminó `ViewMode` de `movieListTypes.ts` y `personListTypes.ts`.

---

### 1.2 Grids — ~85% similares ✅ HECHO

**Resuelto:** Se creó `src/components/shared/ListGrid.tsx`, un componente genérico `ListGrid<T>` que encapsula la estructura compartida: loading skeleton → empty state → compact/detailed render. Recibe `items`, `isLoading`, `viewMode`, `renderCompact`/`renderDetailed`, clases de grid, skeletons, `emptyMessage` y `keyExtractor`. `PeliculasGrid.tsx` y `PersonasGrid.tsx` ahora son wrappers delgados (~50 líneas cada uno) que definen sus skeletons y render functions específicos.

---

### 1.3 Content wrappers — ~90% similares ✅ HECHO

**Resuelto:** Se creó `src/hooks/useListPage.ts` (hook genérico con estado de filtros, paginación, viewMode, sincronización URL y todos los handlers) y `src/components/shared/ListToolbar.tsx` (toolbar compartido con sort, filtros y toggle de vista). `PeliculasContent.tsx` y `PersonasContent.tsx` pasaron de ~287 líneas cada uno a ~110 líneas, delegando toda la lógica compartida al hook. La paginación ya estaba extraída previamente en `src/components/shared/Pagination.tsx`.

---

### 1.4 FilterSelect / FilterInput — componentes locales duplicados ✅ HECHO

**Resuelto:** Se crearon `src/components/shared/filters/FilterSelect.tsx` y `FilterInput.tsx` con barrel export en `index.ts`. `FilterSelect` soporta ambos patrones: `options` array (usado por PeliculasFilters) y `children` (usado por PersonasFilters), con "Todos" auto-prepended. `FilterInput` unifica las versiones con soporte de `min`/`max`/`placeholder`. `DateInput` se mantiene local en PeliculasFilters (específico de películas). Se eliminaron las 4 definiciones locales duplicadas (-134 / +93 líneas netas).

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
1. ~~Mover `buildPageNumbers`, `generateYearOptions` a `src/lib/shared/listUtils.ts`~~ ✅ Movidos
2. ~~Mover `formatPartialDate` a `src/lib/shared/dateUtils.ts` (o verificar si ya existe ahí)~~ ✅ Ya existía, las duplicadas ahora delegan
3. ~~Crear funciones genéricas `filtersToSearchParams<T>`, `searchParamsToFilters<T>`, etc., que usen un esquema de filtros configurable en vez de hardcodear cada campo~~ ✅ Se creó `src/lib/shared/filterUtils.ts` con `createFilterHelpers<T>()` factory. Ambos módulos definen un esquema declarativo de campos y delegan las 6 funciones + `getDefaultSortOrder` a la factory. Resultado: -238 líneas netas (301 eliminadas, 63 agregadas en utils + filterUtils).

### 2.2 Types — tipos duplicados ✅ HECHO

**Resuelto:** Se creó `src/lib/shared/listTypes.ts` con los tipos compartidos: `ViewMode`, `SortOrder`, `FilterOption`, `PaginatedResponse<T>` y `PaginationState`. Se actualizaron `movieListTypes.ts`, `personListTypes.ts`, `peopleTypes.ts`, `rolesTypes.ts` e `imageTypes.ts` para usar `PaginatedResponse<T>` en vez de interfaces duplicadas. `FilterOption` se importa y re-exporta desde los módulos de movies y people. `ViewMode` se define en shared y se re-exporta desde `ViewToggle.tsx`. `PaginationState` inline eliminado de `PeliculasContent.tsx` y `PersonasContent.tsx`. Resultado: 9 archivos modificados, -62 / +45 líneas.

### 2.3 Constantes duplicadas con valores inconsistentes ✅ HECHO

**Resuelto:** Se unificaron las constantes en `movieConstants.ts` como fuente de verdad única:

- **`SOUND_TYPES`**: Corregido — ahora tiene `'Sonora'`, `'Muda'`, `'Sonorizada'` (se reemplazó `'n/d'` por `'Sonorizada'`).
- **`MOVIE_STAGES`**: Completado — ahora tiene los 8 valores del enum de Prisma (se agregó `EN_PRODUCCION` que faltaba). Se agregó `EN_PRODUCCION` a `STAGE_COLORS`.
- **`TIPOS_DURACION`**: Ya estaba correcto con `'largometraje'`, `'mediometraje'`, `'cortometraje'`.
- Eliminadas las constantes duplicadas `SOUND_TYPE_OPTIONS`, `DURATION_TYPE_OPTIONS` y `STAGE_OPTIONS` de `movieListTypes.ts` (no las usaba nadie).
- `getStageLabel` en `movieListUtils.ts` y `MovieHero.tsx` ahora usan `MOVIE_STAGES` en vez de switches hardcodeados.
- `formatStage`, `formatSoundType` y `formatDurationType` en `/api/movies/filters` ahora usan las constantes centralizadas.
- Eliminada la referencia a `NO_ESTRENADA` (no existe en el enum; el valor correcto es `INEDITA`).

### 2.4 `formatDuration` triplicada ✅ HECHO

**Resuelto:** Se creó `src/lib/shared/listUtils.ts` con la versión mejorada (que maneja `hours===0` y `mins===0`). `movieListUtils.ts` y `utils.ts` ahora importan y re-exportan desde shared. Las versiones inline en componentes (`MovieSidebar`, `FilmTechnical`) se mantienen porque tienen lógica específica del componente (incluyen segundos, etc.).

### 2.5 `formatPartialDate` triplicada ✅ HECHO

**Resuelto:** `personListUtils.formatPartialDate` y `movieListUtils.formatReleaseDate` ahora delegan a `dateUtils.formatPartialDate` (la versión más completa con `PartialDate` y opciones). Se mantienen las funciones wrapper con la misma firma para compatibilidad de imports existentes.

### 2.6 `calculateAge` duplicada ✅ HECHO

**Resuelto:** Las 3 implementaciones de `calculateAge` (`personListUtils`, `obituariosUtils`, `peopleUtils`) ahora delegan a `calculateYearsBetween` de `dateUtils.ts`. Se mantienen funciones wrapper con las firmas originales para compatibilidad de imports existentes.

### 2.7 `PaginatedResponse` definida 5 veces ✅ HECHO

**Resuelto:** Se creó `PaginatedResponse<T>` en `src/lib/shared/listTypes.ts`. Las 5 interfaces duplicadas ahora son type aliases: `PaginatedMovieListResponse = PaginatedResponse<MovieListItem>`, `PaginatedPersonListResponse = PaginatedResponse<PersonWithMovie>`, `PaginatedPeopleResponse = PaginatedResponse<PersonWithRelations>`, `PaginatedRolesResponse = PaginatedResponse<Role>`, `PaginatedImagesResponse = PaginatedResponse<ImageWithRelations>`. Los nombres existentes se mantienen como re-exports para no romper imports.

---

## 3. API routes con boilerplate repetido

### 3.1 CRUD idéntico para entidades simples ✅ HECHO

**Archivos afectados:**
- `src/app/api/genres/route.ts` + `[id]/route.ts` ✅
- `src/app/api/themes/route.ts` + `[id]/route.ts` ✅
- `src/app/api/roles/route.ts` + `[id]/route.ts` ✅
- `src/app/api/calificaciones/route.ts` + `[id]/route.ts` ✅
- `src/app/api/screening-venues/route.ts` + `[id]/route.ts` ✅

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

**Acción:** Crear una factory de CRUD routes, dividido en 7 subtareas secuenciales:

#### Subtarea 3.1.1 — Helpers base ✅ HECHO (integrado en factory)

**Resuelto:** Los helpers se crearon como parte de `src/lib/api/crud-factory.ts` (exportados para uso independiente):

- **`parseId(idStr)`** — parsea y valida ID numérico, retorna `number | null`.
- **`makeUniqueSlug(name, modelDelegate, excludeId?)`** — genera slug único verificando colisiones con `findFirst`. Acepta `excludeId` para PUT (regenerar slug excluyendo el registro actual).
- El error handling y auth check están integrados en los handlers generados por la factory.

#### Subtarea 3.1.2 — Factory CRUD (`src/lib/api/crud-factory.ts`) ✅ HECHO

**Resuelto:** Se creó `src/lib/api/crud-factory.ts` con dos funciones factory:

- **`createListAndCreateHandlers(config)`** — genera `{ GET, POST }` para `route.ts`. Soporta: `orderBy`, `include`, `search` (campos configurables con `?search=`), `sort` (dinámico con `?sortBy=`/`?sortOrder=`), `pagination` (con `?page=`/`?limit=`), `extraFilters` (filtros adicionales desde searchParams), `formatResponse` (para transformar items), `buildCreateData`.
- **`createItemHandlers(config)`** — genera `{ GET, PUT, DELETE }` para `[id]/route.ts`. Soporta: `include`, `includeOnDetail` (si GET by id necesita include diferente), `buildUpdateData`, `regenerateSlugOnUpdate`, `deleteCheck` (relación, mensaje, status code, `extraResponse`), `formatResponse`.

Ambas funciones internamente manejan: auth check, validación de nombre, error handling con logging, generación de slug único, parseo de ID, y respuestas consistentes (201 para create, 204 para delete, 400/404/500 para errores).

#### Subtarea 3.1.3 — Migrar `genres` ✅ HECHO

**Resuelto:** `genres/route.ts` pasó de 78 a 15 líneas, `genres/[id]/route.ts` de 180 a 18 líneas. Usa la factory sin search, sin paginación, sin slug regen.

#### Subtarea 3.1.4 — Migrar `calificaciones` ✅ HECHO

**Resuelto:** `calificaciones/route.ts` pasó de 72 a 16 líneas, `calificaciones/[id]/route.ts` de 173 a 17 líneas. Incluye campo extra `abbreviation` en `buildCreateData`/`buildUpdateData`.

#### Subtarea 3.1.5 — Migrar `themes` ✅ HECHO

**Resuelto:** `themes/route.ts` pasó de 93 a 20 líneas, `themes/[id]/route.ts` de 195 a 40 líneas. Usa `search`, `sort`, `formatResponse` (para `movieCount`), `includeOnDetail` (para relación de movies), y `regenerateSlugOnUpdate: true`. Se corrigió de paso que themes POST no hacía `.trim()` del nombre.

#### Subtarea 3.1.6 — Migrar `roles` ✅ HECHO

**Resuelto:** `roles/[id]/route.ts` pasó de 203 a 20 líneas usando la factory con `zodSchema`, `regenerateSlugOnUpdate` y `deleteCheck`. `roles/route.ts` pasó de 333 a 185 líneas: el POST usa `makeUniqueSlug` de la factory + Zod validation; el GET se mantiene custom por su complejidad (unaccent search, CSV export, sort-by-usage) pero fue refactorizado para eliminar duplicación interna (helpers `respondWithRoles` y `buildCsvResponse`). Se reemplazó `generateSlug` por `createSlug` (vía `makeUniqueSlug`). Se agregó soporte para `zodSchema` en la factory (`ListCreateConfig` e `ItemConfig`) con manejo de `ZodError` → 400.

#### Subtarea 3.1.7 — Migrar `screening-venues` ✅ HECHO

**Resuelto:** `screening-venues/route.ts` pasó de 144 a 50 líneas, `screening-venues/[id]/route.ts` de 191 a 47 líneas. Se extendió la factory con tres nuevas capacidades:

- **`pagination`** — soporte de paginación en GET list (vía `?page=` y `?limit=`), retorna `{ [itemsKey]: items, pagination: { page, limit, total, totalPages } }`.
- **`extraFilters`** — función que recibe `searchParams` y retorna filtros adicionales para el `where` (usado para `?type=` e `?isActive=`).
- **`deleteCheck.extraResponse`** — función que recibe el count y retorna campos extra para la respuesta de error de DELETE (usado para `moviesCount`).

El formato de respuesta se mantiene idéntico al original (`{ venues, pagination }`) para no romper el frontend existente. DELETE sigue retornando 409 con `moviesCount`.

### 3.2 Patrón de error handling repetido ✅ HECHO

**Resuelto en dos fases:**

**Fase 1 — CRUD factory (5 entidades):** El error handling está integrado en los handlers generados por `crud-factory.ts` (genres, calificaciones, themes, roles, screening-venues).

**Fase 2 — `apiHandler` wrapper (37 archivos restantes):** Se creó `src/lib/api/api-handler.ts` con dos funciones:
- **`apiHandler(handler, action)`** — wrapper que envuelve un handler en try/catch, maneja `ZodError` → 400, y todo lo demás → `console.error` + 500. Elimina el boilerplate try/catch del handler.
- **`handleApiError(error, action)`** — función standalone para usar en catch blocks que necesitan lógica custom antes del fallback 500 (ej: `images/route.ts` POST con check de P2002).

**Archivos migrados a `apiHandler`:**
- `locations/` (5 archivos: route, [id], countries, search, check-slug)
- `images/` (3 archivos: route GET, [id] GET/PUT/DELETE, hero)
- `festivals/` (8 archivos: festivals, [id], editions, festival-editions/[id], sections, screenings, festival-screenings/[id], festival-sections/[id])
- `movies/` (3 archivos: route POST, [id] PUT, filters, list)
- `people/` (7 archivos: route POST, [id] PUT/DELETE, filters, list, review-names, slug/[slug], merge, merge/preview)
- Otros (6 archivos: color-types, first-name-gender, companies/distribution, companies/production, analytics/pageview, admin/stats, metrics/database, search, search/full)

**No migrados (error handling custom):**
- Routes con stale-cache fallback (movies GET, movies/[id] GET, people GET, people/[id] GET, efemerides, home-feed, people/death-years, people/filmography)
- `movies/[id] DELETE` (manejo de Prisma P2003 con campo `detail`)
- `health/` routes (retornan 503, no 500)
- `stats/route.ts` (retorna zeros en vez de error)

### 3.3 Inconsistencias entre API routes ✅ HECHO

**Fase 1 — isNaN + DELETE format (10 archivos):**

**Validación `isNaN(id)` agregada a:**
- `calificaciones/[id]/route.ts` — GET, PUT, DELETE
- `images/[id]/route.ts` — GET, PUT, DELETE
- `screening-venues/[id]/route.ts` — GET, PUT, DELETE
- `themes/[id]/route.ts` — GET, PUT, DELETE
- `movies/[id]/route.ts` — PUT, DELETE (GET usa regex `/^\d+$/` para slug/id)
- `people/[id]/route.ts` — GET, PUT, DELETE
- `people/[id]/filmography/route.ts` — GET
- `locations/[id]/route.ts` — PUT, DELETE (GET ya tenía)

**DELETE normalizado a `204 No Content` en:**
- `calificaciones/[id]`, `genres/[id]`, `movies/[id]`, `screening-venues/[id]`, `themes/[id]`, `locations/[id]`, `people/[id]`
- Todos usan ahora `return new NextResponse(null, { status: 204 })` (consistente con `roles/[id]`, `festivals/[id]`, etc.)

**Errores normalizados:**
- `people/[id]` — todos los `{ message: '...' }` cambiados a `{ error: '...' }` para consistencia
- `locations/[id]` GET — error en inglés `'Invalid ID'` cambiado a `'ID inválido'`

**Frontend actualizado:**
- `LocationTree.tsx` — `confirmDelete` actualizado para manejar 204 sin llamar `.json()` (que fallaría sin body)
- `api-client.ts` ya manejaba 204 correctamente (retorna `null`)

**Fase 2 — Tabla de pendientes restantes (6 items resueltos):**

- **`_count` raw → `movieCount` mapeado:** Se agregó `formatResponse` a `genres/route.ts`, `genres/[id]/route.ts`, `calificaciones/route.ts` y `calificaciones/[id]/route.ts` para transformar `_count.movies` → `movieCount`, consistente con themes. Se actualizaron `admin/genres/page.tsx` y `admin/calificaciones/page.tsx` para usar `movieCount` en vez de `_count?.movies`.

- **Validación Zod unificada:** Se agregaron schemas Zod a genres (`genreSchema`: name requerido max 100 + description opcional) y calificaciones (`ratingSchema`: name + abbreviation max 10 + description). Se activó `zodSchema` en la factory para POST y PUT, y `regenerateSlugOnUpdate: true` en los handlers de `[id]`. Ahora todas las entidades CRUD usan validación Zod consistente.

- **Funciones de slug unificadas:** Se migraron 5 archivos de `generateSlug`/`generateUniqueSlug` (de `@/lib/utils/slugs`) a `createSlug` (de `@/lib/utils`) y `makeUniqueSlug` (de `@/lib/api/crud-factory`):
  - `locations/route.ts`, `locations/[id]/route.ts` — `generateUniqueSlug` → `makeUniqueSlug`
  - `locations/check-slug/route.ts` — `generateSlug` → `createSlug`
  - `movies/route.ts` — `generateUniqueSlug` → `makeUniqueSlug`
  - `roles/seed/route.ts` — `generateSlug` → `createSlug`
  - Se mejoró `createSlug` con fallback de hash para slugs vacíos/cortos (edge case de títulos sin chars alfanuméricos).
  - Se eliminó `src/lib/utils/slugs.ts` (126 líneas, ya no tiene importadores).

- **Error swallowing en `stats/route.ts`:** Cambiado de retornar `{ zeros... }` con status 200 a retornar `{ error: '...' }` con status 500. `HeaderStats.tsx` actualizado para verificar `res.ok` antes de parsear JSON.

- **Semicolons normalizados:** `roles/seed/route.ts` migrado al estilo sin semicolons consistente con el resto del codebase.

- **GET list diferente en roles:** Se mantiene intencional — roles requiere paginación server-side, unaccent search y CSV export, lo que justifica el formato `{ data, totalCount, page, totalPages, hasMore }` diferente al array plano de entidades simples.

---

## 4. Iconos SVG duplicados

### 4.1 ExternalLinks — copias casi idénticas ✅ HECHO

**Resuelto:** Se creó `src/components/shared/ExternalLinks.tsx` con el superset de iconos y labels de ambos componentes. Se eliminaron `FilmExternalLinks.tsx` y `PersonExternalLinks.tsx`. Se actualizaron los imports en `MoviePageClient.tsx` y `persona/[slug]/page.tsx`. Resultado: -85 líneas netas.

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

## 6. Endpoints de debug/test en producción ✅ HECHO

### 6.1 Archivos que NO deberían estar en producción ✅

| Archivo | Problema | Estado |
|---|---|---|
| `src/app/api/search/test/route.ts` | Endpoint de test que expone conteos y samples de la DB. No tiene auth. | ✅ Eliminado |
| `src/app/api/project-structure/route.ts` | Escanea el filesystem del servidor y devuelve la estructura completa del proyecto. Tiene auth pero es un riesgo de información. | ✅ Eliminado |
| `src/app/test/page.tsx` | Página que solo renderiza `<div>Test</div>`. | ✅ Eliminado |

**Resuelto:** Los 3 archivos fueron eliminados junto con sus directorios.

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

### 7.4 Archivos root-level innecesarios ✅ HECHO

**Resuelto:** Los 10 archivos fueron movidos a `_basura/`:
`database-structure-meta.json`, `project-structure.json`, `raw_urls_detailed.json`, `raw_urls.md`, `admin-code.txt`, `compiled-code.txt`, `database-structure.txt`, `PROJECT_DOCS.md`, `INSTALACION_SERVIDOR_CINENACIONAL.md`, `TODO.md`.

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

## 9. Tipos duplicados entre módulos ✅ HECHO

**Resuelto:** Todos los tipos duplicados fueron extraídos a `src/lib/shared/listTypes.ts`:
- `ViewMode` — ahora definido en shared, re-exportado desde `ViewToggle.tsx`
- `FilterOption` — definido en shared con `id: number | string`, re-exportado desde `movieListTypes.ts` y `personListTypes.ts`
- `PaginatedResponse<T>` — genérico en shared, usado por las 5 interfaces de respuesta paginada
- `PaginationState` — definido en shared, eliminado de `PeliculasContent.tsx` y `PersonasContent.tsx`
- `SortOrder` — tipo adicional extraído (`'asc' | 'desc'`)

---

## 10. Paginación duplicada ✅ HECHO

**Resuelto:** Se creó `src/components/shared/Pagination.tsx` con `buildPageNumbers` incluido. Se reemplazó la paginación inline en 5 archivos: `PeliculasContent`, `PersonasContent`, `EfemeridesPage`, `FilmReleasesByYear` y `ObituariosContent`. Se eliminó `buildPageNumbers` de `movieListUtils.ts` y `personListUtils.ts`, y las copias locales en `efemerides/page.tsx` y `FilmReleasesByYear.tsx`. ObituariosContent migrado de estilo prev/next simple al estilo unificado con números de página. Resultado: -191 líneas netas.

---

## 11. Console.logs de debug en producción ✅ HECHO

**Archivo:** `src/hooks/useMovieForm.ts`

**Resuelto:** Se eliminaron los 10 `console.log` de debug (con emojis 👥🎭🎬📍📤) del hook. No queda ningún console.log en el archivo.

---

## 12. Inconsistencia en servicios ✅ HECHO

**Resuelto:** Se completó la migración de ambos servicios a `apiClient`.

**api-client.ts** — Se agregaron dos nuevas capacidades:
- **`ApiError`** — clase de error con `status` y `data` (body de la respuesta), reemplazando el `Error` genérico. Permite manejo tipado de errores HTTP (ej: 409 Conflict con datos de conflictos).
- **`getBlob()`** — método para descargas de archivos binarios (CSV exports), ya que `handleResponse` siempre parsea JSON.

**people.service.ts** — 5 funciones migradas:
- `getAll` → `apiClient.get` (con soporte de `AbortSignal` via options)
- `search` → `apiClient.get` (con params)
- `create` → `apiClient.post` (con catch de `ApiError` para re-lanzar `ExternalIdConflictError` en 409)
- `update` → `apiClient.put` (mismo manejo de 409)
- `exportToCSV` → `apiClient.getBlob`
- `checkSlugAvailability` — ya usaba apiClient pero con query string manual; migrado a usar `params` de apiClient

**movies.service.ts** — Todas las funciones migradas (10):
- `getAll`, `getById`, `getByIdForEdit`, `create`, `update`, `delete`, `search`, `checkSlugAvailability`, `getStats`, `exportToCSV`
- Eliminado `console.log` de debug en `update()`

**Resultado:** -125 líneas netas (211 eliminadas, 86 agregadas). Ambos servicios ahora usan exclusivamente `apiClient` para todas las llamadas HTTP.

---

## 13. Patrón de procesamiento de fechas repetido en servicios ✅ HECHO

**Resuelto:** Se crearon dos helpers en `src/lib/shared/dateUtils.ts`:

- **`processPartialDateForAPI(isPartial, partialDate, fullDate)`** — Convierte fecha parcial o completa del formulario al formato `{ year, month, day }` de la API. Elimina las 5 copias del bloque if/else-if/else en `formatMovieDataForAPI` (3 bloques) y `formatPersonDataForAPI` (2 bloques).
- **`processPartialDateFromAPI(year, month, day)`** — Convierte campos year/month/day de la API al formato del formulario (`{ date, isPartial, partialDate }`). Elimina las 5 copias del bloque if/partialFieldsToDate en `formatMovieFromAPI` (3 bloques) y `formatPersonFromAPI` (2 bloques).

Se eliminó también el import no usado de `PartialDate` en `movies.service.ts` y los imports de `dateToPartialFields`/`partialFieldsToDate` de ambos servicios (ahora encapsulados en los helpers). Resultado: -80 líneas netas.

---

## Resumen de impacto

### Archivos que se pueden eliminar (limpieza)

| Categoría | Cantidad aprox | Descripción |
|---|---|---|
| `_basura/` completo | ~90 archivos | Código muerto de migraciones WP |
| Scripts one-shot | ~10 archivos | Scripts ya ejecutados |
| ~~Archivos root innecesarios~~ | ~~10 archivos~~ | ~~JSONs, TXTs de desarrollo~~ ✅ Movidos a `_basura/` |
| ~~Endpoints de test~~ | ~~3 archivos~~ | ~~`/api/search/test`, `/api/project-structure`, `/test`~~ ✅ Eliminados |
| `uploads/` | ~15 archivos | Logs de importación WP |
| **Total eliminable** | **~126 archivos** | |

### Componentes refactorizables (consolidación)

| Refactorización | Archivos afectados | Líneas eliminadas aprox |
|---|---|---|
| ~~ViewToggle unificado~~ | ~~2 → 1~~ | ~~~45 líneas~~ ✅ Unificado |
| ~~ExternalLinks unificado~~ | ~~2 → 1~~ | ~~~90 líneas (SVGs duplicados)~~ ✅ Unificado |
| ~~Pagination compartido~~ | ~~3 → 1~~ | ~~~90 líneas~~ ✅ Unificado en 5 archivos |
| ~~ListGrid genérico~~ | ~~2 → 1~~ | ~~~40 líneas~~ ✅ Creado `src/components/shared/ListGrid.tsx` |
| ~~Hook useListPage~~ | ~~2 Content → 1 hook + 2 thin wrappers~~ | ~~~250 líneas~~ ✅ Extraído a `useListPage.ts` + `ListToolbar.tsx` |
| ~~FilterSelect/FilterInput compartidos~~ | ~~4 definiciones → 2 componentes~~ | ~~~60 líneas~~ ✅ Extraídos a `src/components/shared/filters/` |
| ~~Tipos compartidos (ViewMode, etc)~~ | ~~4+ archivos → 1 shared~~ | ~~~30 líneas~~ ✅ Extraídos a `src/lib/shared/listTypes.ts` |
| ~~Utils compartidos (buildPageNumbers, etc)~~ | ~~2 → 1 shared + 2 specific~~ | ~~~50 líneas~~ ✅ Movidos a `src/lib/shared/listUtils.ts` |
| ~~formatDuration unificado~~ | ~~3 → 1~~ | ~~~20 líneas~~ ✅ Unificado en `listUtils.ts` |
| ~~formatPartialDate unificado~~ | ~~3 → 1~~ | ~~~40 líneas~~ ✅ Delegado a `dateUtils.ts` |
| ~~calculateAge unificado~~ | ~~2 → 1~~ | ~~~30 líneas~~ ✅ Delegado a `calculateYearsBetween` de `dateUtils.ts` |
| ~~PaginatedResponse genérico~~ | ~~5 → 1~~ | ~~~25 líneas~~ ✅ Unificado en `PaginatedResponse<T>` |
| ~~CRUD factory (genres, calificaciones, themes, roles, screening-venues)~~ | ~~10 archivos → factory + thin configs~~ | ~~500+ líneas~~ ✅ Creado `src/lib/api/crud-factory.ts` |
| ~~Procesamiento de fechas en servicios~~ | ~~10 bloques → 2 helpers~~ | ~~80 líneas~~ ✅ Extraídos a `dateUtils.ts` |
| ~~Console.logs de debug~~ | ~~eliminación directa~~ | ~~~30 líneas~~ ✅ Eliminados |
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
   - ~~Eliminar endpoints de test (`/api/search/test`, `/api/project-structure`, `/test`)~~ ✅ Eliminados
   - ~~Eliminar archivos root innecesarios~~ ✅ Movidos 10 archivos a `_basura/`
   - ~~Eliminar console.logs de debug en `useMovieForm.ts`~~ ✅ Eliminados (10 console.logs)
   - ~~Unificar constantes con valores inconsistentes (SOUND_TYPES, STAGE, DURATION)~~ ✅ Unificadas en movieConstants.ts

2. **Media prioridad / Medio esfuerzo:**
   - ~~Unificar ViewToggle → un componente shared~~ ✅ Unificado en `src/components/shared/ViewToggle.tsx`
   - ~~Unificar ExternalLinks → un componente shared (elimina ~90 líneas de SVGs)~~ ✅ Unificado en `src/components/shared/ExternalLinks.tsx`
   - ~~Extraer Pagination compartido~~ ✅ Extraído en `src/components/shared/Pagination.tsx`
   - ~~Extraer tipos compartidos a `src/lib/shared/` (ViewMode, FilterOption, PaginatedResponse)~~ ✅ Extraídos a `src/lib/shared/listTypes.ts`
   - ~~Mover funciones duplicadas a shared (buildPageNumbers, generateYearOptions, formatDuration, formatPartialDate, calculateAge)~~ ✅ Movidas a `src/lib/shared/listUtils.ts` y delegadas a `dateUtils.ts`
   - ~~Normalizar inconsistencias de API routes (isNaN check, formato DELETE)~~ ✅ Normalizado en 10 archivos (validación Zod pendiente)

3. **Baja prioridad / Alto esfuerzo (pero alto impacto):**
   - ~~Crear hook `useListPage` genérico (elimina ~250 líneas duplicadas)~~ ✅ Creado `src/hooks/useListPage.ts` + `src/components/shared/ListToolbar.tsx`
   - ~~Crear factory de CRUD API routes (subtareas 3.1.1–3.1.7)~~ ✅ Creado `src/lib/api/crud-factory.ts`, migrados genres, calificaciones, themes, roles, screening-venues
   - ~~Crear ListGrid genérico~~ ✅ Creado `src/components/shared/ListGrid.tsx`
   - ~~Unificar FilterSelect/FilterInput~~ ✅ Extraídos a `src/components/shared/filters/`
   - ~~Completar migración de servicios a `apiClient`~~ ✅ Migrados movies.service.ts y people.service.ts
   - ~~Extraer helper `processPartialDateForAPI` en servicios~~ ✅ Extraídos `processPartialDateForAPI` y `processPartialDateFromAPI` en `dateUtils.ts`

4. **Limpieza general:**
   - Eliminar directorio `_basura/`
   - Mover scripts one-shot fuera del directorio activo
   - Limpiar `uploads/` y `dumps/`
