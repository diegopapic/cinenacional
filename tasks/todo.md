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

### 9e. MOUNT_EFFECT → useMountEffect

- [ ] `admin/festivals/FestivalScreeningForm.tsx:110` — `loadVenues()`. Usar `useMountEffect`
- [ ] `admin/people/PersonFormFields/NationalitiesField.tsx:34` — `loadCountries()`. Usar `useMountEffect`

### 9f. DOM_SYNC → usar hooks existentes

- [ ] `admin/festivals/FestivalForm.tsx:87` — click outside. Usar `useClickOutside`
- [ ] `admin/festivals/FestivalScreeningForm.tsx:125` — click outside. Usar `useClickOutside`
- [ ] `admin/people/PersonFormFields/LocationFields.tsx:84` — click outside. Usar `useClickOutside`

### 9g. DOM_SYNC → extraer o mantener (focus, scroll, keyboard)

- [ ] `layout/Header.tsx:35` — focus input desktop al expandir. Mover a callback de `setDesktopSearchExpanded`
- [ ] `layout/Header.tsx:42` — focus input mobile al abrir. Mover a callback de `setSearchOpen`
- [ ] `listados/estrenos/EstrenosDecadeSelector.tsx:48` — cierra dropdown on scroll. Crear `useScrollClose` o inline
- [ ] `movies/ImageGallery.tsx:74` — scroll/resize listeners para overflow check. Mantener (DOM setup/cleanup legítimo)
- [ ] `movies/ImageGallery.tsx:122` — Escape + flechas en lightbox. Crear `useKeyboardNavigation` o mantener

### 9h. LEGITIMATE — mantener como useEffect

- [ ] `home/HeroSection.tsx:235` — interval de rotación de carousel. Legítimo (timer setup/cleanup)
- [ ] `FilmReleasesByYear.tsx:130` — scroll-into-view de elemento activo. Legítimo (DOM post-paint)
- [ ] `listados/estrenos/EstrenosYearBar.tsx:26` — scroll-into-view. Legítimo (DOM post-paint)
- [ ] `hooks/usePageView.ts:105` — tracking de page view. Legítimo (fire-and-forget side effect)
- [ ] `hooks/useMovieForm.ts:240` — watch subscription de RHF. Legítimo (external subscription setup/cleanup)
- [ ] `admin/movies/MovieModal/tabs/ImagesTab/MultiImageUpload.tsx:41` — cleanup de timeout. Legítimo (infrastructure cleanup)

---

## Post-refactor: Migración a Next.js 16.2 / React 19.2

- [ ] Migrar a React 19.2 / Next.js 16.2
- [ ] Convertir páginas públicas con fetch (home, efemérides, obituarios, estrenos) a Server Components
