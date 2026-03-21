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

### Fase 2: Efemérides (`/efemerides/[[...date]]`)

La página tiene selectores de mes/día interactivos. Estrategia: `searchParams` para mes/día, server component fetchea datos, client component para los selectores.

- [ ] Convertir `src/app/(site)/efemerides/[[...date]]/page.tsx` a Server Component async.
- [ ] Leer mes/día de los params de la URL (`params.date` array) — la lógica de parsing ya existe.
- [ ] Llamar a `getEfemerides(month, day)` de `lib/queries/efemerides.ts`.
- [ ] Paginar server-side (recibir `searchParams.page`, calcular slice).
- [ ] Extraer selectores de fecha a `EfemeridesDateSelector` client component — usa `router.push` para navegar a nueva fecha.
- [ ] Extraer paginación a `EfemeridePagination` client component (o reutilizar `Pagination` existente con links `<Link>`).
- [ ] Agregar `generateMetadata()` con la fecha actual.
- [ ] Agregar `revalidate = 86400` (24h, igual al cache actual).

**Decisión clave:** La paginación puede ser con `<Link>` (server-side navigation) o `router.push` (client-side). Usar `<Link>` con `searchParams.page` para que sea RSC puro.

---

### Fase 3: Obituarios (`/listados/obituarios`)

Tiene selector de año y paginación. Ambos se manejan con searchParams.

- [ ] Convertir `src/app/(site)/listados/obituarios/page.tsx` a Server Component async.
- [ ] Mover lógica de `ObituariosContent.tsx` al page server component.
- [ ] Leer `searchParams.year` y `searchParams.page` — si no hay year, usar el año actual.
- [ ] Llamar a `getDeathYears()` + `getObituarios(year, page)` en paralelo.
- [ ] Extraer selector de año a `ObituariosYearSelector` client component — usa `router.push` o `<Link>` para cambiar año.
- [ ] Paginación con `<Link>` + searchParams (RSC puro, sin JS para paginar).
- [ ] Agregar `generateMetadata()` con el año seleccionado.
- [ ] `revalidate`: 3600 (1h) para año actual, 86400 (24h) para años pasados. Usar `dynamic = 'force-dynamic'` si no se puede diferenciar en build time, o condicional en el fetch.

**Nota:** La página actual hace `force-dynamic`. Evaluar si se puede usar ISR con revalidate condicional.

---

### Fase 4: Estrenos (`/listados/estrenos/[year]`)

Ya es híbrida (server wrapper + client content). Completar la conversión moviendo el fetch del client al server.

- [ ] Mover fetch de `EstrenosContent.tsx` (useQuery a `/api/movies`) al page server component `[year]/page.tsx`.
- [ ] Llamar a `getEstrenos(year)` de `lib/queries/estrenos.ts` — la transformación a `ReleaseEntry[]` se hace server-side.
- [ ] Pasar `releases` como prop a `EstrenosContent` (que se convierte en presentacional).
- [ ] Evaluar si `EstrenosContent` puede dejar de ser `'use client'` — depende de si tiene interactividad (decade selector, year bar). Si sí, mantener client pero sin fetch propio.
- [ ] El JSON-LD schema ya se genera server-side — verificar que sigue funcionando.
- [ ] Agregar `revalidate = 3600` (1h).
- [ ] Verificar `generateMetadata()` existente.

---

### Fase 5: Limpieza y verificación

- [ ] Eliminar imports de React Query (`useQuery`) de los componentes públicos convertidos.
- [ ] Verificar que `QueryProvider` ya no se necesita en el layout público — si solo lo usa el admin, moverlo al layout de admin. Si alguna página pública todavía lo necesita (búsqueda, listados de películas/personas), dejarlo.
- [ ] Ejecutar `npm run build` — verificar que no hay errores.
- [ ] Ejecutar `npm run lint` — verificar que no hay warnings nuevos.
- [ ] Comparar bundle size antes/después con `npx @next/bundle-analyzer` o similar.
- [ ] Test manual: home, efemérides (navegar fechas), obituarios (cambiar año, paginar), estrenos (cambiar año/década).
- [ ] Verificar que las API routes siguen funcionando para el admin y otros consumidores.
- [ ] Opcional: refactorear API routes de home-feed, efemerides, people para que importen las funciones de `lib/queries/` en vez de duplicar queries.

---

### Post-conversión: Migración a React 19.2 / Next.js 16.2

- [ ] Migrar a React 19.2 / Next.js 16.2 (scope separado)
