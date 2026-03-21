# Refactor: Eliminar useEffect innecesarios

Basado en la recomendación de [Factory (Alvin Sng)](https://x.com/alvinsng/status/2033969062834045089): ban de `useEffect` directo. Preparación para migración a Next.js 16.2 / React 19.2.

---

## Fase 1: Crear helper `useMountEffect`

- [x] Crear `src/hooks/useMountEffect.ts` — wrapper de `useEffect(fn, [])` con eslint-disable

---

## Fase 2: DERIVED_STATE → `useMemo` / cómputo inline

Cambios mecánicos: eliminar `useEffect` + `setState` y reemplazar por `useMemo` o cálculo directo.

- [x] `components/movies/MovieInfo.tsx` — filtrar directores → `useMemo`
- [x] `components/layout/SearchBar.tsx` — showResults → mover a `handleQueryChange`
- [x] `components/admin/shared/NameSplitModal.tsx` — words → `useMemo` + reset en render
- [x] `components/admin/locations/LocationTree.tsx` — filtrar ubicaciones → `useMemo`
- [x] `components/admin/ScreeningVenueSelector.tsx` — filtrar venues → `useMemo`
- [x] `components/admin/ui/DateInput.tsx` — sincronizar displayValue → patrón render + helpers extraídos
- [x] `components/admin/CloudinaryUploadWidget.tsx` — sincronizar imageUrl → patrón render
- [x] `components/listados/estrenos/EstrenosDecadeSelector.tsx` — posición dropdown → calcular en click handler
- [x] `app/admin/maintenance/review-names/page.tsx` — form con caso actual → patrón render con ref
- [x] `components/admin/people/PersonForm.tsx` — nacionalidades → patrón render (initialData queda en useEffect por depender de estado externo)
- [x] `hooks/useMovieForm.ts:241` — ya usa watch subscription de RHF correctamente, no requiere cambio

---

## Fase 3: EVENT_SYNC → mover a handlers

Mover la lógica al event handler que dispara el cambio de estado.

- [x] `hooks/useRoles.ts:105` — eliminado useEffect redundante (updateFilter ya resetea page)
- [x] `hooks/useListPage.ts:148` — viewMode → limit movido a `setViewMode()` wrapper
- [x] `components/admin/TriviaManager.tsx:25` — onChange llamado en handleAdd/handleDelete/handleMoveUp/handleMoveDown
- [x] `components/admin/AlternativeTitlesManager.tsx:29` — onChange llamado en handleAdd/handleDelete
- [x] `app/admin/roles/page.tsx:44,48,53,58` — 3 useEffects eliminados (department, isActive, isMainRole → onChange directo). 1 retenido (debouncedSearch, necesario por timer async). Eliminado estado local redundante.
- [x] `app/(site)/listados/obituarios/ObituariosContent.tsx:53` — reset página movido a handleYearChange
- [x] `app/(site)/listados/obituarios/ObituariosContent.tsx:65` — actualización URL movida a handleYearChange
- [x] `components/layout/Header.tsx:48` — Escape movido a onKeyDown del input de búsqueda
- [ ] `components/layout/Header.tsx:60` — click outside → pasa a Fase 6 (requiere crear `useClickOutside` reutilizable)

---

## Fase 4: DATA_FETCH → React Query

Migrar fetch manuales (`useEffect` + `useState` loading/data/error) a `useQuery`/`useMutation` de TanStack Query v5.

### 4a. Hooks compartidos (máximo impacto)

- [x] `hooks/useHomeData.ts` — useQuery para datos del home
- [x] `hooks/useGlobalSearch.ts` — useQuery con debounce + enabled
- [x] `hooks/useListPage.ts` — useQuery para filtros e items
- [x] `hooks/usePeople.ts` — useQuery + useMutation (3 hooks)
- [x] `hooks/usePeopleForm.ts` — useQuery para carga de persona
- [x] `hooks/useRoles.ts` — useQuery + useMutation
- [x] `hooks/useMovieForm.ts` — useQuery para metadata
- [ ] `contexts/MovieModalContext.tsx:124` — auto-load movie data (diferido a Fase 5, es prop-sync no data fetch)

### 4b. Componentes

- [x] `components/layout/HeaderStats.tsx` — useQuery para stats públicas
- [x] `components/admin/shared/PersonSearchInput.tsx` — useQuery para búsqueda
- [x] `components/admin/locations/LocationForm.tsx` — useQuery para ubicaciones padre
- [x] `components/admin/movies/MovieModal/tabs/ReviewsTab.tsx` — useQuery para críticas
- [x] `components/admin/ScreeningVenueSelector.tsx` — useQuery para venues

### 4c. Páginas admin

- [x] `app/admin/themes/page.tsx` — useQuery + invalidación
- [x] `app/admin/stats/page.tsx` — useQuery + refetch
- [x] `app/admin/screening-venues/page.tsx` — useQuery con filtros
- [x] `app/admin/movies/page.tsx` — useQuery + invalidación
- [x] `app/admin/genres/page.tsx` — useQuery + invalidación
- [x] `app/admin/media-outlets/page.tsx` — useQuery + invalidación
- [x] `app/admin/festivals/page.tsx` — useQuery
- [x] `app/admin/calificaciones/page.tsx` — useQuery + invalidación
- [x] `app/admin/maintenance/review-names/page.tsx` — useQuery + local state para filtrado

### 4d. Páginas públicas

- [x] `app/(site)/page.tsx` — 3 useQuery (hero, obituarios, efemérides)
- [x] `app/(site)/buscar/page.tsx` — useQuery con enabled
- [x] `app/(site)/efemerides/[...date]/page.tsx` — useQuery + URL-derived state
- [x] `app/(site)/listados/obituarios/ObituariosContent.tsx` — 2 useQuery (años + personas)
- [x] `app/(site)/listados/estrenos/EstrenosContent.tsx` — useQuery

### Infraestructura

- [x] Crear `QueryProvider` en `src/components/providers/QueryProvider.tsx`
- [x] Agregar QueryProvider al root layout (`src/app/layout.tsx`)

---

## Fase 5: MOUNT_EFFECT → wrappear con `useMountEffect`

- [x] `components/ads/AdBanner.tsx` — push ad a AdSense + fix hooks condicionales
- [x] `components/listados/estrenos/EstrenosDecadeSelector.tsx` — flag mounted para hydration
- [x] `components/admin/CloudinaryUploadWidget.tsx` — cleanup al desmontar
- [x] `components/admin/locations/LocationTree.tsx` — carga árbol
- [x] `components/admin/locations/LocationForm.tsx` — carga padre inicial
- [N/A] `hooks/usePeople.ts` — ya migrado a React Query en Fase 4
- [N/A] `hooks/useListPage.ts:105` — no es mount effect (tiene deps `[filters, router]`)
- [N/A] `app/(site)/listados/obituarios/ObituariosContent.tsx` — ya migrado a React Query en Fase 4

---

## Fase 6: DOM_SYNC — extraer hooks reutilizables

- [x] Crear `useClickOutside(refs, callback, enabled)` y reemplazar en: Header, SearchBar, DateInput, PersonSearchInput, LocationForm, EstrenosDecadeSelector, RoleSelector
- [x] Crear `useEscapeKey(callback, enabled)` y reemplazar en: MovieHero (Header usa onKeyDown inline, ImageGallery maneja múltiples teclas)
- [x] Revisar scroll-to-element effects (FilmReleasesByYear, EstrenosYearBar) — son reacciones legítimas a cambios de estado, se mantienen como useEffect

---

## Fase 7: Caso especial — `MovieFormEnhanced.tsx`

11 useEffects eliminados (0 restantes).

- [x] Mount fetch (`fetchInitialData`) → `useMountEffect`
- [x] 2 useEffects de initialData sync → patrón "ajustar durante render" con `prevInitialDataRef`
- [x] 8 useEffects de parent notification → wrappers (`updateGenres`, `updateCast`, etc.) que hacen setState + onChange en un solo paso

---

## Fase 8: Validación final

- [x] Ejecutar `npm run lint` — sin warnings nuevos (todos preexistentes: `no-explicit-any`, `no-unescaped-entities`)
- [x] Ejecutar `npm run build` — sin errores
- [ ] Test manual del admin (movies modal, people form, festivals)
- [ ] Test manual del sitio público (home, búsqueda, listados, fichas)
- [x] Análisis estático de loops/re-renders: sin problemas reales (React Query usa deep comparison en queryKeys). Fix: consolidar double query en usePeopleForm

### Resultado del refactor

- **useEffect totales**: 46 (en 31 archivos)
  - 5 en hooks de infraestructura (`useMountEffect`, `useClickOutside`, `useEscapeKey`, `useDebounce`)
  - 41 restantes son efectos legítimos (focus, scroll sync, keyboard handlers, prop-sync necesarios)
- **Eliminados**: ~60 useEffects innecesarios a lo largo de las 7 fases
- **Hooks reutilizables creados**: `useMountEffect`, `useClickOutside`, `useEscapeKey`
- **Infraestructura agregada**: QueryProvider + TanStack React Query v5

---

## Fase 9: Eliminar useEffects restantes (46 → 5 infraestructura)

Solo deben quedar los 5 useEffect dentro de hooks de infraestructura (`useMountEffect`, `useClickOutside`, `useEscapeKey`, `useDebounce`).

### 9a. PROP_SYNC → ajustar durante render

- [x] `admin/maintenance/review-names/page.tsx` — prevValue ref para currentCase sync
- [x] `admin/festivals/FestivalForm.tsx` — prevValue ref para festival.location
- [x] `admin/movies/MovieModal/tabs/ImagesTab/ImageEditModal.tsx` — useState initializer + prevValue ref
- [x] `admin/people/PersonForm.tsx` — adjust during render con ref flag
- [x] `admin/people/PersonFormFields/BasicInfoFields.tsx` — prevValue ref para partial dates
- [x] `admin/shared/PersonSearchInput.tsx` — prevValue ref para initialPersonName y loadedPerson (2 useEffects eliminados)
- [x] `admin/roles/RoleModal.tsx` — prevValue ref para role → RHF reset()

### 9b. DERIVED_STATE → useMemo / cómputo inline

- [x] `admin/festivals/FestivalEditionForm.tsx` — year derivado inline en handleChange
- [x] `admin/festivals/FestivalForm.tsx` — slug derivado inline en handleChange
- [x] `admin/locations/LocationForm.tsx` — eliminado estado `suggestions`, derivado del query
- [x] `admin/people/PersonFormFields/NationalitiesField.tsx` — selectedCountries derivado con useMemo
- [x] `hooks/useMovieForm.ts` — metadataResult sync con adjust-during-render
- [x] `hooks/usePeopleForm.ts` — 2 useEffects consolidados en adjust-during-render

### 9c. EVENT_SYNC → mover a handlers

- [x] `app/admin/roles/page.tsx` — eliminado useEffect+useDebounce duplicado, sync directo en handleSearchChange
- [x] `hooks/useListPage.ts` — URL sync movido a `setFiltersAndSync` helper, eliminado useEffect
- [x] `admin/locations/LocationForm.tsx` — slug check reemplazado por useQuery + useDebounce, eliminados checkSlugAvailability + isCheckingSlug state

### 9d. DATA_FETCH → React Query

- [x] `admin/festivals/FestivalForm.tsx` — useQuery para location search + useClickOutside (3 useEffects eliminados)
- [x] `admin/festivals/FestivalScreeningForm.tsx` — useQuery para venues + movie search + useClickOutside (3 useEffects eliminados)
- [x] `admin/movies/MovieModal/tabs/ImagesTab/index.tsx` — useQuery para imágenes y personas (1 useEffect eliminado)
- [x] `admin/movies/RoleSelector.tsx` — useQuery para load + search roles (2 useEffects eliminados)
- [x] `admin/people/PersonFormFields/LocationFields.tsx` — useQuery para location por ID + useClickOutside (2 useEffects eliminados)
- [x] `contexts/MovieModalContext.tsx` — adjust-during-render con fire-and-forget async (1 useEffect eliminado)

### 9e. MOUNT_EFFECT → useMountEffect / useQuery

- [N/A] `admin/festivals/FestivalScreeningForm.tsx` — ya migrado a useQuery en 9d
- [x] `admin/people/PersonFormFields/NationalitiesField.tsx` — loadCountries → useQuery

### 9f. DOM_SYNC → usar hooks existentes

- [N/A] `admin/festivals/FestivalForm.tsx` — ya migrado a useClickOutside en 9d
- [N/A] `admin/festivals/FestivalScreeningForm.tsx` — ya migrado a useClickOutside en 9d
- [N/A] `admin/people/PersonFormFields/LocationFields.tsx` — ya migrado a useClickOutside en 9d

### 9g. DOM_SYNC → extraer o mantener (focus, scroll, keyboard)

- [x] `layout/Header.tsx` — 2 focus useEffects eliminados, movidos a callbacks con rAF
- [x] `listados/estrenos/EstrenosDecadeSelector.tsx` — scroll close extraído a `useWindowEvent`
- [x] `movies/ImageGallery.tsx` — overflow check extraído a `useMountEffect` + `useWindowEvent`, keyboard a `useKeydown`

### 9h. DOM_SYNC restantes → extraer a hooks custom

- [x] `home/HeroSection.tsx` — carousel interval extraído a `useInterval`
- [x] `FilmReleasesByYear.tsx` — scroll-into-view extraído a `useScrollIntoView`
- [x] `listados/estrenos/EstrenosYearBar.tsx` — scroll-into-view extraído a `useScrollIntoView`
- [x] `admin/movies/MovieModal/tabs/ImagesTab/MultiImageUpload.tsx` — cleanup extraído a `useMountEffect`
- [OK] `hooks/usePageView.ts` — ya es hook custom, useEffect encapsulado
- [OK] `hooks/useMovieForm.ts` — ya es hook custom, useEffect encapsulado

### Resultado final

**0 useEffect directos en componentes, páginas o contextos.**

useEffect solo existe dentro de 10 hooks de infraestructura:
`useMountEffect`, `useClickOutside`, `useEscapeKey`, `useDebounce`, `useInterval`, `useWindowEvent`, `useKeydown`, `useScrollIntoView`, `usePageView`, `useMovieForm`

---

## Conversión de páginas públicas a Server Components

Objetivo: mover el data fetching de React Query (client) a Prisma directo (server) en las 4 páginas públicas que todavía son client components. Esto elimina waterfalls client→API→DB, reduce bundle JS público, y prepara para React 19.2 / Next.js 16.2.

**Principios:**
- Cada fase es independiente y deployable por separado.
- Las API routes siguen funcionando (el admin y otros consumidores las usan).
- Interactividad (selectores, paginación) se maneja con `searchParams` + client components pequeños.
- Caching: `revalidate` de Next.js reemplaza Redis/memory cache para estas páginas.
- Metadata (`generateMetadata`) se genera server-side en todas las páginas convertidas.

---

### Fase 0: Infraestructura — funciones de data fetching server-side ✅

Funciones reutilizables en `src/lib/queries/` que encapsulan las queries Prisma de los API routes.

- [x] `src/lib/queries/home.ts` — `getHomeFeed()`: 7 queries en paralelo (últimos/próximos estrenos, últimas películas, últimas personas, hero images, obituarios recientes, efemérides del día).
- [x] `src/lib/queries/efemerides.ts` — `getEfemerides(month, day)`: 5 queries paralelas (estrenos, rodajes inicio/fin, nacimientos, muertes) + `formatearEfemeride()`.
- [x] `src/lib/queries/obituarios.ts` — `getDeathYears()` + `getObituarios(year, page, limit)`: años únicos + personas paginadas.
- [x] `src/lib/queries/estrenos.ts` — `getEstrenos(mode)`: query por año/década/upcoming + transformación a `ReleaseEntry[]`.

**Notas:**
- Reutilizar los `select` y `where` exactos de los API routes para no cambiar la forma de los datos.
- Las funciones reciben parámetros tipados y retornan tipos explícitos (no `any`).
- No duplicar lógica: los API routes pueden importar estas mismas funciones para evitar drift.

---

### Fase 1: Home page (`/`) ✅

- [x] Convertir `src/app/(site)/page.tsx` de `'use client'` a Server Component async.
- [x] Llamar a `getHomeFeed()` con `Promise.all` interno (7 queries paralelas).
- [x] Pasar datos como props a los componentes de sección.
- [x] HeroSection ya es `'use client'` (useState + useInterval) — no requirió cambios.
- [x] Agregar `'use client'` a RecentMoviesSection y RecentPeopleSection (onError handlers en `<img>`).
- [x] Eliminar `useHomeData` hook y las 3 llamadas `useQuery` del home.
- [x] Agregar `export const revalidate = 300` (5 min ISR).
- [x] Verificar componentes: MoviesGrid, MovieCard, ObituariosSection, EfemeridesSection → server-compatible, sin `'use client'`.

**Resultado:** Home JS bundle bajó a 4.35 kB (First Load). React Query, useHomeData, y 4 fetch calls eliminados del bundle público.

---

### Fase 2: Efemérides (`/efemerides/[[...date]]`) ✅

- [x] Convertir `page.tsx` de `'use client'` a Server Component async.
- [x] Leer mes/día de `params.date` y `searchParams.page` (Next.js 15 Promises).
- [x] Llamar a `getEfemerides(month, day)` server-side (5 queries paralelas).
- [x] Paginar server-side (slice sobre resultados ordenados por año).
- [x] Crear `EfemeridesDateSelector` client component (select mes/día, prev/next, hoy).
- [x] Crear `ServerPagination` reutilizable con `<Link>` (0 JS, sin `'use client'`).
- [x] Agregar `generateMetadata()` con fecha dinámica.
- [x] Agregar `revalidate = 86400` (24h).

**Resultado:** Efemérides JS bundle bajó de 5.24 kB a 1.78 kB First Load. React Query, useState, useMemo eliminados. Paginación con Links (0 JS).

---

### Fase 3: Obituarios (`/listados/obituarios`) ✅

- [x] Convertir `page.tsx` de `'use client'` a Server Component async.
- [x] Mover lógica de `ObituariosContent.tsx` al page — eliminar `ObituariosContent.tsx`.
- [x] Leer `searchParams.year` y `searchParams.page` (Next.js 15 Promises).
- [x] Llamar a `getDeathYears()` + `getObituarios(year, page)` en paralelo.
- [x] Crear `ObituariosYearSelector` client component (select año con `router.push`).
- [x] Paginación con `ServerPagination` (Links, 0 JS).
- [x] Agregar `generateMetadata()` con año dinámico.
- [x] Agregar `revalidate = 3600` (1h ISR, reemplaza `force-dynamic`).
- [x] Eliminar `'use client'` innecesario de `PersonCard` y `ObituariosGrid`.

**Resultado:** Obituarios JS bundle bajó de 6.34 kB a 1.44 kB First Load. Eliminados: React Query, useState, Suspense wrapper, ObituariosContent.

---

### Fase 4: Estrenos (`/listados/estrenos/[year]`) ✅

- [x] Mover fetch de `EstrenosContent.tsx` al page server component `[year]/page.tsx`.
- [x] Llamar a `getEstrenos(mode)` server-side — transformación a `ReleaseEntry[]` en server.
- [x] Pasar `entries` como prop directo a `FilmReleasesByYear` (eliminando capa intermedia).
- [x] `FilmReleasesByYear` mantiene `'use client'` (decade selector, year bar, pagination interactiva).
- [x] Eliminar `EstrenosContent.tsx` (lógica de fetch movida al page).
- [x] JSON-LD schema y `generateMetadata()` existentes siguen funcionando — ahora fetch en paralelo con `Promise.all`.
- [x] Agregar `revalidate = 3600` (1h ISR). Eliminar `Suspense` wrapper (data disponible al renderizar).

**Resultado:** Estrenos bundle bajó de 13.2 kB a 12.6 kB First Load. React Query y fetch client-side eliminados. Fetch de releases + schema en paralelo.

---

### Fase 5: Limpieza y verificación ✅

- [x] Verificar que `useQuery` ya no se usa en componentes públicos convertidos (home, efemérides, obituarios, estrenos).
- [x] `QueryProvider` se queda en root layout — `/buscar` y `HeaderStats.tsx` todavía usan React Query.
- [x] `npm run build` — sin errores. Todas las rutas públicas compilan correctamente.
- [x] `npm run lint` — sin errores nuevos en archivos modificados (solo warnings preexistentes de `<img>`).
- [x] Bundle size comparado (ver tabla abajo).
- [ ] Test manual pendiente: home, efemérides, obituarios, estrenos.
- [x] API routes no fueron modificados — siguen funcionando para admin y otros consumidores.
- [ ] Opcional (futuro): refactorear API routes para importar funciones de `lib/queries/` en vez de duplicar queries.

**Bundle size final (First Load JS por página):**

| Página | Antes | Después | Reducción |
|--------|-------|---------|-----------|
| `/` (home) | ~14 kB | 4.35 kB | -69% |
| `/efemerides` | 5.24 kB | 1.78 kB | -66% |
| `/listados/obituarios` | 6.34 kB | 1.44 kB | -77% |
| `/listados/estrenos/[year]` | 13.2 kB | 12.6 kB | -5% |

**Eliminado del bundle público:** React Query fetch calls (4 en home, 1 en efemérides, 1 en obituarios, 1 en estrenos), `useHomeData`, `EstrenosContent`, `ObituariosContent`, hooks de estado (useState, useMemo) en páginas convertidas.

---

### Post-conversión: Migración a React 19.2 / Next.js 16.2

- [ ] Migrar a React 19.2 / Next.js 16.2 (scope separado)
