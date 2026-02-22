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

### 1.3 Content wrappers — ~90% similares ✅ HECHO

**Resuelto:** Se creó `src/hooks/useListPage.ts` (hook genérico con estado de filtros, paginación, viewMode, sincronización URL y todos los handlers) y `src/components/shared/ListToolbar.tsx` (toolbar compartido con sort, filtros y toggle de vista). `PeliculasContent.tsx` y `PersonasContent.tsx` pasaron de ~287 líneas cada uno a ~110 líneas, delegando toda la lógica compartida al hook. La paginación ya estaba extraída previamente en `src/components/shared/Pagination.tsx`.

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
1. ~~Mover `buildPageNumbers`, `generateYearOptions` a `src/lib/shared/listUtils.ts`~~ ✅ Movidos
2. ~~Mover `formatPartialDate` a `src/lib/shared/dateUtils.ts` (o verificar si ya existe ahí)~~ ✅ Ya existía, las duplicadas ahora delegan
3. Crear funciones genéricas `filtersToSearchParams<T>`, `searchParamsToFilters<T>`, etc., que usen un esquema de filtros configurable en vez de hardcodear cada campo

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

### 3.3 Inconsistencias entre API routes ✅ HECHO (parcial)

**Resuelto (isNaN + DELETE format):** Se normalizaron las dos inconsistencias más críticas en 10 archivos:

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

**Pendiente:**
| Problema | Dónde |
|---|---|
| **GET list responde diferente** | `roles` devuelve `{ data, totalCount, page, totalPages, hasMore }`; los demás devuelven array plano |
| **Validación mixta** | `roles` usa Zod schema; los demás usan `if (!body.name)` manual |
| **Dos funciones de slug** | `roles` importa `generateSlug` de `@/lib/utils/slugs`; los demás usan `createSlug` de `@/lib/utils` |
| **Error swallowing** | `stats/route.ts` devuelve zeros con status 200 en vez de 500 en caso de error |
| **themes GET** | Agrega `movieCount` mapeado; genres/calificaciones devuelven `_count` raw de Prisma |
| **Estilo de código** | roles usa semicolons; genres/themes/calificaciones no — inconsistente |

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
| ListGrid genérico | 2 → 1 | ~40 líneas |
| ~~Hook useListPage~~ | ~~2 Content → 1 hook + 2 thin wrappers~~ | ~~~250 líneas~~ ✅ Extraído a `useListPage.ts` + `ListToolbar.tsx` |
| FilterSelect/FilterInput compartidos | 4 definiciones → 2 componentes | ~60 líneas |
| ~~Tipos compartidos (ViewMode, etc)~~ | ~~4+ archivos → 1 shared~~ | ~~~30 líneas~~ ✅ Extraídos a `src/lib/shared/listTypes.ts` |
| ~~Utils compartidos (buildPageNumbers, etc)~~ | ~~2 → 1 shared + 2 specific~~ | ~~~50 líneas~~ ✅ Movidos a `src/lib/shared/listUtils.ts` |
| ~~formatDuration unificado~~ | ~~3 → 1~~ | ~~~20 líneas~~ ✅ Unificado en `listUtils.ts` |
| ~~formatPartialDate unificado~~ | ~~3 → 1~~ | ~~~40 líneas~~ ✅ Delegado a `dateUtils.ts` |
| ~~calculateAge unificado~~ | ~~2 → 1~~ | ~~~30 líneas~~ ✅ Delegado a `calculateYearsBetween` de `dateUtils.ts` |
| ~~PaginatedResponse genérico~~ | ~~5 → 1~~ | ~~~25 líneas~~ ✅ Unificado en `PaginatedResponse<T>` |
| Procesamiento de fechas en servicios | 5 bloques → 1 helper | ~50 líneas |
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
   - Crear factory de CRUD API routes
   - Crear ListGrid genérico
   - Unificar FilterSelect/FilterInput
   - Completar migración de servicios a `apiClient`
   - Extraer helper `processPartialDateForAPI` en servicios

4. **Limpieza general:**
   - Eliminar directorio `_basura/`
   - Mover scripts one-shot fuera del directorio activo
   - Limpiar `uploads/` y `dumps/`
