# Eliminar `no-explicit-any` — 400 errores en 64 archivos

Objetivo: llevar ESLint a 0 errores eliminando todos los `any` explícitos.

Estrategia: agrupar por dominio funcional para tipar de forma coherente (los tipos fluyen entre archivos del mismo dominio). Orden de prioridad: primero los tipos base y servicios, después los componentes que los consumen.

---

## Fase A: Tipos base, servicios y API client (34 any)

Archivos de infraestructura que definen tipos consumidos por el resto del codebase. Tiparlos primero desbloquea los demás.

### A1. API client y helpers (8 any)

- [ ] `src/services/api-client.ts` (6): tipar `ApiClient` genérics, respuestas y errores
- [ ] `src/lib/api/api-handler.ts` (2): tipar `apiHandler` wrapper y `handleApiError`

### A2. Services (20 any)

- [ ] `src/services/movies.service.ts` (14): tipar payloads y respuestas de CRUD de películas
- [ ] `src/services/people.service.ts` (6): tipar payloads y respuestas de CRUD de personas

### A3. CRUD factory (36 any)

- [ ] `src/lib/api/crud-factory.ts` (36): tipar los generics del factory de rutas CRUD. Es el archivo con más densidad de `any` — definir interfaces genéricas para `ListCreateConfig`, `GetUpdateDeleteConfig`, filtros y respuestas.

### A4. Prisma y auth (4 any)

- [ ] `src/lib/prisma.ts` (3): tipar el retry extension y error handling
- [ ] `src/auth.ts` (1): tipar el cast de `user.role` en el callback JWT
- [ ] `src/lib/auth.ts` (1): tipar el cast de `session` en `requireAuth()`

### A5. Utilidades de dominio (9 any)

- [ ] `src/lib/movies/movieUtils.ts` (2): tipar funciones de transformación de películas
- [ ] `src/lib/people/peopleUtils.ts` (5): tipar funciones de transformación de personas
- [ ] `src/lib/roles/roleUtils.ts` (2): tipar mapas de departamentos/colores
- [ ] `src/lib/estrenos/estrenosTypes.ts` (1): tipar tipo de estreno
- [ ] `src/hooks/usePageView.ts` (1): tipar `extraData` en `PageViewOptions`

---

## Fase B: API routes de películas (25 any)

### B1. Rutas principales

- [ ] `src/app/api/movies/route.ts` (11): tipar query params, filtros y respuesta de listado
- [ ] `src/app/api/movies/[id]/route.ts` (10): tipar payload de update, relaciones y cast/crew
- [ ] `src/app/api/movies/list/route.ts` (4): tipar query params y respuesta

---

## Fase C: API routes de personas (26 any)

### C1. Rutas principales

- [ ] `src/app/api/people/route.ts` (10): tipar query params y respuesta de listado
- [ ] `src/app/api/people/[id]/route.ts` (7): tipar payload de update y relaciones
- [ ] `src/app/api/people/list/route.ts` (2): tipar query params
- [ ] `src/app/api/people/merge/route.ts` (4): tipar payload y lógica de merge
- [ ] `src/app/api/people/merge/preview/route.ts` (3): tipar respuesta de preview

---

## Fase D: Otras API routes (25 any)

### D1. Búsqueda

- [ ] `src/app/api/search/route.ts` (3): tipar resultados de búsqueda
- [ ] `src/app/api/search/full/route.ts` (4): tipar resultados de búsqueda full

### D2. Festivales y locations

- [ ] `src/app/api/festival-editions/[id]/screenings/route.ts` (4): tipar payload de screenings
- [ ] `src/app/api/festivals/route.ts` (1): tipar creación de festival
- [ ] `src/app/api/festivals/[id]/editions/route.ts` (1): tipar creación de edición
- [ ] `src/app/api/locations/route.ts` (2): tipar creación de location
- [ ] `src/app/api/locations/[id]/route.ts` (1): tipar update de location
- [ ] `src/app/api/locations/check-slug/route.ts` (1): tipar query params

### D3. Otros

- [ ] `src/app/api/roles/route.ts` (6): tipar CRUD de roles
- [ ] `src/app/api/images/route.ts` (2): tipar upload de imágenes
- [ ] `src/app/api/analytics/pageview/route.ts` (2): tipar payload de analytics
- [ ] `src/app/api/metrics/database/route.ts` (4): tipar métricas de DB
- [ ] `src/app/api/people/death-years/route.ts` (1): tipar respuesta
- [ ] `src/app/api/screening-venues/route.ts` (1): tipar creación de venue

---

## Fase E: Movie form system (157 any) ⚠️ la más grande

El sistema de formulario de películas es el más complejo. Los tipos fluyen entre `useMovieForm` → `MovieModalContext` → `MovieFormEnhanced` → tabs del modal.

### E1. Hook y context (109 any)

- [ ] `src/hooks/useMovieForm.ts` (78): tipar el hook completo — form state, mutations, handlers de cast/crew/images/media. Es el archivo con más `any` del proyecto.
- [ ] `src/contexts/MovieModalContext.tsx` (31): tipar el context provider — depende de los tipos de `useMovieForm`

### E2. Componentes del formulario (48 any)

- [ ] `src/components/admin/MovieFormEnhanced.tsx` (48): tipar props, handlers y state del formulario legacy
- [ ] `src/components/admin/movies/MovieModal/tabs/CastTab.tsx` (11): tipar cast entries y handlers
- [ ] `src/components/admin/movies/MovieModal/tabs/CrewTab.tsx` (6): tipar crew entries y handlers
- [ ] `src/components/admin/movies/MovieModal/tabs/ImagesTab/index.tsx` (2): tipar image entries
- [ ] `src/components/admin/movies/MovieModal/tabs/ImagesTab/MultiImageUpload.tsx` (1): tipar upload handler
- [ ] `src/components/admin/movies/MovieModal/MovieModalFooter.tsx` (1): tipar props
- [ ] `src/components/admin/movies/MovieModal/index.tsx` (1): tipar modal props

---

## Fase F: People form system y admin pages (16 any)

### F1. People form

- [ ] `src/components/admin/people/PersonForm.tsx` (2): tipar form state
- [ ] `src/components/admin/people/PersonFormFields/BasicInfoFields.tsx` (2): tipar props
- [ ] `src/components/admin/people/PersonFormFields/LinksSection.tsx` (1): tipar links array
- [ ] `src/components/admin/people/PeopleTable.tsx` (2): tipar table props
- [ ] `src/hooks/usePeopleForm.ts` (1): tipar form hook

### F2. Admin pages

- [ ] `src/app/admin/people/merge/page.tsx` (8): tipar merge state y comparación
- [ ] `src/app/admin/roles/page.tsx` (1): tipar roles state

---

## Fase G: Componentes del sitio público (33 any)

### G1. Página de película

- [ ] `src/app/(site)/pelicula/[slug]/page.tsx` (21): tipar datos del server component (movie, cast, crew, images, reviews)
- [ ] `src/app/(site)/pelicula/[slug]/MoviePageClient.tsx` (1): tipar props del client component

### G2. Búsqueda y listados

- [ ] `src/app/(site)/buscar/page.tsx` (3): tipar resultados de búsqueda
- [ ] `src/app/(site)/listados/personas/PersonCardDetailed.tsx` (2): tipar props

### G3. Otros componentes

- [ ] `src/components/home/ObituariosSection.tsx` (3): tipar datos de obituarios
- [ ] `src/components/admin/shared/PersonSearchInput.tsx` (2): tipar search results
- [ ] `src/components/admin/CloudinaryUploadWidget.tsx` (2): tipar widget callbacks
- [ ] `src/components/listados/estrenos/EstrenosYearBar.tsx` (1): tipar props
- [ ] `src/components/movies/ImageGallery.tsx` (1): tipar image data
- [ ] `src/components/layout/SearchBar.tsx` (0 — ya migrado, verificar)

### G4. Festival forms

- [ ] `src/app/admin/festival-editions/[id]/sections/new/FestivalSectionForm.tsx` (1): tipar form state
- [ ] `src/components/admin/festivals/FestivalEditionForm.tsx` (1): tipar form state
- [ ] `src/components/admin/festivals/FestivalForm.tsx` (1): tipar form state
- [ ] `src/components/admin/festivals/FestivalScreeningForm.tsx` (1): tipar form state

---

## Resumen por fase

| Fase | Archivos | `any` | Descripción |
|------|----------|-------|-------------|
| A | 12 | 34 | Tipos base, servicios, API client |
| B | 3 | 25 | API routes películas |
| C | 5 | 26 | API routes personas |
| D | 14 | 25 | Otras API routes |
| E | 8 | 157 | Movie form system (⚠️ la más grande) |
| F | 7 | 16 | People form + admin pages |
| G | 14 | 33 | Componentes sitio público + festival forms |
| **Total** | **64** | **400** | |

## Orden recomendado

```
Fase A (tipos base) → desbloquea todo
  ↓
Fase B (API movies) + Fase C (API people) ← pueden hacerse en paralelo
  ↓
Fase D (otras API routes)
  ↓
Fase E (movie form system) ← la más grande, depende de A+B
  ↓
Fase F (people form + admin)
  ↓
Fase G (sitio público)
```

Cada fase es deployable independientemente. La Fase E es la más compleja y puede subdividirse en E1 (hook+context) y E2 (componentes).
