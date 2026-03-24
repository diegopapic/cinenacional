# Informe de errores de tipos (`tsc --noEmit`)

**Fecha:** 2026-03-23
**Total de errores:** 117
**ESLint:** 0 errores (limpio)

---

## Resumen por categoría

| Categoría | Errores | Causa raíz |
|-----------|---------|------------|
| `Movie` type incompleto en `useMovieForm.ts` | ~45 | `moviesService.getById()` retorna `Promise<Movie>` pero la API devuelve datos completos (cast, crew, fechas parciales, etc.) que `Movie` no modela |
| Prisma client extendido vs base | 3 | `splitFullName()` acepta `PrismaClient` pero recibe el cliente extendido con retry |
| Interfaces duplicadas/inconsistentes | ~15 | Múltiples definiciones de `CastMember`, `Role`, `FestivalScreening` con campos diferentes |
| Prisma `where` clauses tipadas | ~10 | Filtros dinámicos con tipos union incompatibles |
| Scripts locales desactualizados | 4 | Campos renombrados (`letterboxdWatchesUpdatedAt` -> `popularityUpdatedAt`) |
| Variables usadas antes de declaración | 4 | `formData` y `formatLocationDisplay` en `LocationForm.tsx` |
| Otros (Cloudinary, NextRequest.ip, etc.) | ~10 | Librerías externas con tipos actualizados |

---

## Detalle por archivo

### 1. `src/hooks/useMovieForm.ts` (~45 errores) — PRIORIDAD ALTA

**Causa raíz:** `moviesService.getById()` retorna `Promise<Movie>`, pero el tipo `Movie` (en `movieTypes.ts`) es un tipo simple para listados que NO incluye:
- Campos de la DB: `cast`, `crew`, `alternativeTitles`, `trivia`, `links`, `screenings`, `themes`, `movieCountries`, `productionCompanies`, `distributionCompanies`
- Campos de fechas parciales: `releaseYear`, `releaseMonth`, `releaseDay`, `filmingStartYear/Month/Day`, `filmingEndYear/Month/Day`
- Campos técnicos: `durationSeconds`, `posterPublicId`, `certificateNumber`, `aspectRatio`, `filmFormat`, `metaDescription`, `metaKeywords`
- Campo `ratingId`, `colorType`

**Fix recomendado:** Crear un tipo `MovieFull` o `MovieDetail` que extienda `Movie` con todos los campos que devuelve `GET /api/movies/[id]`. Usarlo como retorno de `getById()`.

```typescript
// En movieTypes.ts
export interface MovieDetail extends Movie {
  cast: RawCastEntry[]
  crew: RawCrewEntry[]
  alternativeTitles: AlternativeTitle[]
  trivia: TriviaEntry[]
  links: MovieLink[]
  // ... etc
  releaseYear: number | null
  releaseMonth: number | null
  releaseDay: number | null
  // ... etc
}
```

---

### 2. `src/components/admin/locations/LocationForm.tsx` (4 errores)

**Errores:**
- `formData` usado antes de declaración (línea 52 usa `formData.name`, declarado en línea 57)
- `formatLocationDisplay` usado antes de declaración

**Fix:** Reordenar declaraciones — mover `useDebounce` después del `useState`, o extraer el valor inicial.

---

### 3. Prisma client extendido (3 errores)

**Archivos:**
- `src/app/api/people/route.ts:665`
- `src/app/api/review-search/resolve-authors/route.ts:87`
- `src/app/api/review-search/save/route.ts:165`

**Causa:** `splitFullName(name, prisma)` — la función acepta `PrismaClient` pero `prisma` es el cliente extendido con `.$extends()`. El tipo retornado por `.$extends()` no es asignable a `PrismaClient`.

**Fix:** Cambiar el tipo del parámetro en `splitFullName` a algo más permisivo:
```typescript
// Opción A: usar typeof
import { prisma } from '@/lib/prisma'
function splitFullName(name: string, db: typeof prisma): ...

// Opción B: usar una interfaz mínima con solo los métodos que usa
interface PrismaLike {
  firstNameGender: { findFirst: (...) => ... }
}
```

---

### 4. Interfaces `CastMember` duplicadas (2 errores)

**Archivos con definiciones diferentes:**
- `src/app/(site)/pelicula/[slug]/page.tsx` → `character: string | null`
- `src/app/(site)/pelicula/[slug]/MoviePageClient.tsx` → `character: string | null` (ya arreglado)
- `src/components/movies/CastSection.tsx` → `character: string | null` (ya arreglado)
- `src/components/admin/movies/CastList.tsx` → `characterName?: string` (diferente nombre!)

**Errores restantes en:**
- `CastTab.tsx:177` — `LocalCastMember[]` no asignable a `CastMember[]`
- `MovieFormEnhanced.tsx:660` — idem

**Fix:** Unificar en un solo tipo exportado desde `movieTypes.ts` y usarlo en todos los archivos.

---

### 5. Interface `Role` duplicada (1 error)

**Archivo:** `src/app/admin/roles/page.tsx:251`

**Causa:** `RoleCard` importa `Role` de su propio archivo (`rolesTypes.ts`) que incluye `slug`, `createdAt`, `updatedAt`, pero la página le pasa un `Role` con tipo diferente.

**Fix:** Usar un solo tipo `Role` importado de `rolesTypes.ts` en ambos archivos.

---

### 6. `FestivalScreening` incompleto (1 error)

**Archivo:** `src/app/admin/festival-screenings/[id]/edit/page.tsx:116`

**Causa:** `screeningForForm` no tiene `createdAt` ni `updatedAt` que `FestivalScreening` requiere.

**Fix:** Hacer `createdAt`/`updatedAt` opcionales en el tipo de props de `FestivalScreeningForm`, o usar `Omit<FestivalScreening, 'createdAt' | 'updatedAt'>`.

---

### 7. `PersonLink.lastChecked` — `Date` vs `string` (1 error)

**Archivo:** `src/app/(site)/persona/[slug]/page.tsx:607`

**Causa:** Prisma retorna `Date | null` pero `PersonSchema.tsx` espera `string | null`.

**Fix:** Cambiar el tipo en `PersonSchema` a `Date | null`, o serializar la fecha antes de pasarla.

---

### 8. Reviews — falta `language` (1 error)

**Archivo:** `src/app/(site)/pelicula/[slug]/page.tsx:808`

**Causa:** El select de Prisma no incluye `language` pero `MoviePageClientProps` lo requiere.

**Fix:** Agregar `language: true` al select de reviews en la query de Prisma, o hacer `language` opcional en la interfaz.

---

### 9. Search API — falta `real_name` (1 error)

**Archivo:** `src/app/api/search/route.ts:258`

**Causa:** `PersonSearchRow` requiere `real_name` pero el map no lo incluye.

**Fix:** Agregar `real_name` al map, o hacerlo opcional en la interfaz.

---

### 10. Cloudinary callback (1 error)

**Archivo:** `src/components/admin/CloudinaryUploadWidget.tsx:310`

**Causa:** `handleUploadSuccess` tiene tipo `(result: { info?: {...} }) => void` pero `next-cloudinary` espera `CldUploadEventCallback` donde `info` puede ser `string | CloudinaryUploadWidgetInfo | undefined`.

**Fix:** Tipar usando el tipo de la librería:
```typescript
import type { CloudinaryUploadWidgetResults } from 'next-cloudinary'
const handleUploadSuccess = (result: CloudinaryUploadWidgetResults) => {
  if (typeof result.info === 'object' && result.info) { ... }
}
```

---

### 11. `NextRequest.ip` (1 error)

**Archivo:** `src/app/api/analytics/pageview/route.ts`

**Causa:** `NextRequest.ip` ya no existe en versiones recientes de Next.js.

**Fix:** Usar `request.headers.get('x-forwarded-for')` o `request.headers.get('x-real-ip')`.

---

### 12. Prisma `where` clauses dinámicas (~10 errores)

**Archivos:**
- `src/app/api/movies/list/route.ts` (7 errores)
- `src/app/api/festival-editions/[id]/screenings/route.ts` (2 errores)

**Causa:** Filtros construidos dinámicamente con tipos que no matchean los tipos estrictos de Prisma (ej: `number | IntNullableFilter` no es asignable a `number | null`).

**Fix:** Tipar los objetos `where` explícitamente con `Prisma.MovieWhereInput` o usar type assertions al construir los filtros dinámicos.

---

### 13. `MovieModalContext` (1 error)

**Archivo:** `src/contexts/MovieModalContext.tsx:164`

**Causa:** El objeto de contexto no matchea `MovieModalContextValue` por diferencias acumuladas en la interfaz.

**Fix:** Sincronizar la interfaz con lo que realmente se pasa al provider.

---

### 14. `PersonForm` / `usePeopleForm` (3 errores)

**Archivos:**
- `src/components/admin/people/PersonForm.tsx:83` — `PersonWithRelations` no asignable a `Record<string, unknown>`
- `src/hooks/usePeopleForm.ts:42-43` — campos faltantes

**Fix:** Usar tipos más específicos en vez de `Record<string, unknown>`.

---

### 15. `ImagesTab` (3 errores)

**Archivo:** `src/components/admin/movies/MovieModal/tabs/ImagesTab/index.tsx`

**Causa:** `ImageWithRelations[] | null` necesita null check, y tipo `never` en un label.

**Fix:** Agregar null checks y corregir el tipo del array.

---

### 16. API routes de movies (5 errores)

**Archivos:**
- `src/app/api/movies/route.ts` — crew map retorna tipos incompatibles, create data no matchea `Exact<>`
- `src/app/api/movies/[id]/route.ts` — links createMany y crew createMany con tipos incompatibles

**Causa:** Prisma 6.x usa `Exact<>` wrapper que es más estricto con los tipos literales.

**Fix:** Tipar explícitamente los datos de `createMany` con los tipos de Prisma:
```typescript
import { Prisma } from '@prisma/client'
const crewData: Prisma.MovieCrewCreateManyInput[] = crew.map(...)
```

---

### 17. Scripts locales (4 errores)

**Archivos:**
- `scripts/letterboxd/import-letterboxd-watches.ts` — `letterboxdWatchesUpdatedAt` → usar `popularityUpdatedAt`
- `scripts/letterboxd/sync-letterboxd-watches.ts` — idem
- `scripts/letterboxd/scrape-letterboxd-stats.ts` — `fans` → `likes` (ya arreglado)

**Fix:** Ya arreglados en esta sesión.

---

## Plan de acción sugerido (por impacto)

1. ~~**Crear `MovieDetail` type** — resuelve ~45 errores de un golpe~~ ✅ COMPLETADO (31ead06)
2. ~~**Fix `splitFullName` param type** — 3 errores~~ ✅ COMPLETADO (see next commit)
3. **Unificar `CastMember` type** — ~5 errores
4. **Reordenar `LocationForm.tsx`** — 4 errores
5. **Tipar Prisma `where` clauses** — ~10 errores
6. **Fixes menores** (Cloudinary, NextRequest.ip, reviews, etc.) — ~10 errores restantes
