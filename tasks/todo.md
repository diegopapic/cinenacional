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

- [ ] `hooks/useRoles.ts:105` — reset página al cambiar filtros → hacer `setPage(1)` dentro de `updateFilter()`
- [ ] `hooks/useListPage.ts:148` — cambiar limit según viewMode → hacer en `setViewMode()`
- [ ] `components/admin/TriviaManager.tsx:25` — notificar onChange → llamar en `handleAdd`/`handleDelete`
- [ ] `components/admin/AlternativeTitlesManager.tsx:29` — notificar onChange → llamar en handlers
- [ ] `app/admin/roles/page.tsx:44,48,53,58` — 4 useEffects sincronizando filtros → llamar `updateFilter` en onChange
- [ ] `app/(site)/listados/obituarios/ObituariosContent.tsx:53` — reset página al cambiar año → hacer en handler
- [ ] `app/(site)/listados/obituarios/ObituariosContent.tsx:65` — actualizar URL → hacer en handler
- [ ] `components/layout/Header.tsx:48` — Escape cierra búsqueda → mover a onKeyDown del input
- [ ] `components/layout/Header.tsx:60` — click outside → usar `useClickOutside` hook reutilizable

---

## Fase 4: DATA_FETCH → React Query

Migrar fetch manuales (`useEffect` + `useState` loading/data/error) a `useQuery`/`useMutation` de TanStack Query v5.

### 4a. Hooks compartidos (máximo impacto)

- [ ] `hooks/useHomeData.ts:85` — carga datos del home
- [ ] `hooks/useGlobalSearch.ts:75` — búsqueda global con debounce
- [ ] `hooks/useListPage.ts:87,112` — carga filtros e items
- [ ] `hooks/usePeople.ts:106,219,256` — carga personas, búsqueda, fetch individual
- [ ] `hooks/usePeopleForm.ts:42` — carga persona para edición
- [ ] `hooks/useRoles.ts:100` — carga roles
- [ ] `hooks/useMovieForm.ts:208` — carga metadata (ratings, color types)
- [ ] `contexts/MovieModalContext.tsx:124` — auto-load movie data

### 4b. Componentes admin

- [ ] `components/layout/HeaderStats.tsx:33` — fetch stats
- [ ] `components/admin/shared/PersonSearchInput.tsx:209,248` — carga persona y búsqueda
- [ ] `components/admin/locations/LocationForm.tsx:70` — busca ubicaciones padre
- [ ] `components/admin/movies/MovieModal/tabs/ReviewsTab.tsx:120` — carga críticas
- [ ] `components/admin/ScreeningVenueSelector.tsx:50` — carga venues

### 4c. Páginas admin

- [ ] `app/admin/themes/page.tsx:83` — carga themes
- [ ] `app/admin/stats/page.tsx:59` — carga estadísticas
- [ ] `app/admin/screening-venues/page.tsx:123` — carga venues con filtros
- [ ] `app/admin/movies/page.tsx:52` — carga películas
- [ ] `app/admin/genres/page.tsx:65` — carga géneros
- [ ] `app/admin/media-outlets/page.tsx:108` — carga medios
- [ ] `app/admin/festivals/page.tsx:31` — carga festivales
- [ ] `app/admin/calificaciones/page.tsx:67` — carga calificaciones
- [ ] `app/admin/maintenance/review-names/page.tsx:33` — carga casos

### 4d. Páginas públicas

- [ ] `app/(site)/page.tsx:54,78` — carga hero images y obituarios
- [ ] `app/(site)/buscar/page.tsx:104` — búsqueda
- [ ] `app/(site)/efemerides/[...date]/page.tsx:64` — carga efemérides
- [ ] `app/(site)/listados/obituarios/ObituariosContent.tsx:59` — carga personas
- [ ] `app/(site)/listados/estrenos/EstrenosContent.tsx:51` — carga películas

---

## Fase 5: MOUNT_EFFECT → wrappear con `useMountEffect`

- [ ] `hooks/usePeople.ts:97` — cleanup al desmontar
- [ ] `hooks/useListPage.ts:105` — inicializar filtros desde URL
- [ ] `components/ads/AdBanner.tsx:65` — push ad a AdSense
- [ ] `components/listados/estrenos/EstrenosDecadeSelector.tsx:27` — flag mounted para hydration
- [ ] `components/admin/CloudinaryUploadWidget.tsx:54` — cleanup al desmontar
- [ ] `components/admin/locations/LocationTree.tsx:34` — carga árbol
- [ ] `components/admin/locations/LocationForm.tsx:63` — carga padre inicial
- [ ] `app/(site)/listados/obituarios/ObituariosContent.tsx:33,38` — carga años y parsea URL

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
