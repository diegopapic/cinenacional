# 5.6 Migrar listados a Server Components

**Objetivo:** Convertir `/listados/peliculas` y `/listados/personas` de 100% client-side (spinner + React Query) a Server Components con data fetching directo via Prisma. Mejora SEO (HTML indexable sin JS) y LCP.

**Patrón de referencia:** `listados/peliculas/genero/[genreSlug]/page.tsx` y `listados/obituarios/[year]/page.tsx` ya siguen este patrón.

---

## Fase A: Películas (`/listados/peliculas`)

### ~~A1. Crear funciones de query Prisma para películas~~ ✅ COMPLETADO
- [x] Crear `src/lib/queries/peliculas.ts` con:
  - `getMovies(filters, page, limit)` — replicar la lógica de `/api/movies/list` (full-text search, filtros, sort con `unaccent`, paginación)
  - `getMovieFilters()` — replicar `/api/movies/filters` (géneros, países, ratings, etc. con counts)
- [x] Reusar la lógica existente de los API routes, no reimplementar

### ~~A2. Crear componente client de filtros~~ ✅ COMPLETADO
- [x] Crear `src/components/listados/peliculas/PeliculasFilterBar.tsx` ('use client')
  - Recibe las opciones de filtros como props (server las fetchea)
  - Recibe los filtros activos como props (desde searchParams)
  - Al cambiar un filtro: navega con `router.push()` actualizando searchParams, reseteando page a 1
  - Incluye toggle de vista (grid/compact) como searchParam `view`
  - Incluye toggle show/hide filtros (estado local del client component)

### ~~A3. Convertir page.tsx a Server Component~~ ✅ COMPLETADO
- [x] Reescribir `src/app/(site)/listados/peliculas/page.tsx`:
  - Quitar `'use client'`
  - Recibir `searchParams` como prop async
  - Parsear filtros desde searchParams
  - Llamar `getMovies()` y `getMovieFilters()` en paralelo con `Promise.all`
  - Renderizar la grilla de películas como HTML del server
  - Usar `ServerPagination` con `buildHref`
  - Pasar filtros como props a `<PeliculasFilterBar />`
- [x] Agregar `generateMetadata()` con título y descripción (resuelve 1.7)
- [x] Agregar canonical a `/listados/peliculas` (resuelve 1.6)
- [x] Agregar `export const dynamic = 'force-dynamic'`

### ~~A4. Limpiar código obsoleto de películas~~ ✅ COMPLETADO
- [x] Eliminar `PeliculasContent.tsx` (ya no se usa)
- [x] `PeliculasGrid.tsx` se reutiliza tal cual desde el server component (con `isLoading=false`)
- [x] `/api/movies/list` y `/api/movies/filters` se mantienen (el admin los usa via React Query)

### ~~A5. Testing películas~~ ✅ COMPLETADO
- [x] `npm run lint` pasa
- [x] `npm run build` pasa — `/listados/peliculas` es `ƒ (Dynamic)`
- [ ] Verificar en producción: HTML tiene contenido real (no spinner) — *pendiente deploy*
- [ ] Verificar que todos los filtros funcionan — *pendiente deploy*
- [ ] Verificar paginación con links (no JS) — *pendiente deploy*
- [ ] Verificar búsqueda — *pendiente deploy*

---

## Fase B: Personas (`/listados/personas`)

### B1. Crear funciones de query Prisma para personas
- [ ] Crear `src/lib/queries/personas.ts` con:
  - `getPeople(filters, page, limit)` — replicar lógica de `/api/people/list` (búsqueda multi-término, ubicaciones con CTE recursivo, sort con `unaccent`)
  - `getPeopleFilters()` — replicar `/api/people/filters`

### B2. Crear componente client de filtros
- [ ] Crear `src/components/listados/personas/PersonasFilterBar.tsx` ('use client')
  - Mismo patrón que PeliculasFilterBar
  - Filtros: gender, role, nationality, birth/death location, birth/death year range, sort

### B3. Convertir page.tsx a Server Component
- [ ] Reescribir `src/app/(site)/listados/personas/page.tsx`:
  - Mismo patrón que películas
  - Parsear filtros desde searchParams
  - Query Prisma directo
  - `ServerPagination`
- [ ] Agregar `generateMetadata()` (resuelve 1.7)
- [ ] Agregar canonical a `/listados/personas` (resuelve 1.6)

### B4. Limpiar código obsoleto de personas
- [ ] Eliminar `PersonasContent.tsx`
- [ ] Verificar `PersonasGrid.tsx` / `PersonCardDetailed.tsx`

### B5. Testing personas
- [ ] Mismas verificaciones que A5

---

## Fase C: Cleanup general

### C1. Hook useListPage
- [ ] Verificar si `useListPage.ts` se usa en otro lado. Si no, eliminar.

### C2. Actualizar roadmap
- [ ] Marcar 5.6 como completado en `tasks/seo-roadmap.md`
- [ ] Marcar 1.6 (canonicals listados) como completado
- [ ] Marcar 1.7 (generateMetadata listados) como completado

---

## Notas técnicas

- **Search**: La búsqueda full-text usa raw SQL con `unaccent` y `ts_rank`. Hay que replicar esa lógica en las funciones de query, no simplificar.
- **Sort alfabético**: Usa raw SQL para ignorar artículos ("El", "La", "Los", etc.) y acentos. Copiar de `/api/movies/list`.
- **View mode**: Mover a searchParam `view=grid|compact` para que sea server-compatible.
- **API routes**: No eliminar — el admin puede usarlos vía React Query.
- **Página de estrenos y búsqueda**: Fuera de scope de esta tarea.
