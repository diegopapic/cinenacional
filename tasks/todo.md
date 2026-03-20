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

- [ ] Crear `useClickOutside(ref, callback)` y reemplazar en: Header, SearchBar, DateInput, PersonSearchInput, LocationForm, EstrenosDecadeSelector
- [ ] Crear `useEscapeKey(callback)` y reemplazar en: Header, MovieHero
- [ ] Revisar scroll-to-element effects (FilmReleasesByYear, EstrenosYearBar) — considerar `scrollIntoView()` en click handler

---

## Fase 7: Caso especial — `MovieFormEnhanced.tsx`

11 useEffects (líneas 104-222), la mayor concentración del proyecto. Todos sincronizan props → estado local.

- [ ] Refactorizar a componente controlado usando primitivas de React Hook Form (`watch`, `setValue` en callbacks)

---

## Fase 8: Validación final

- [ ] Ejecutar `npm run lint` — sin warnings nuevos
- [ ] Ejecutar `npm run build` — sin errores
- [ ] Test manual del admin (movies modal, people form, festivals)
- [ ] Test manual del sitio público (home, búsqueda, listados, fichas)
- [ ] Verificar que no hay loops infinitos ni re-renders innecesarios (React DevTools Profiler)

---

## Post-refactor: Migración a Next.js 16.2 / React 19.2

- [ ] Migrar a React 19.2 / Next.js 16.2
- [ ] Convertir páginas públicas con fetch (home, efemérides, obituarios, estrenos) a Server Components
