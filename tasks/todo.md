# Eliminar `no-explicit-any` — 400 errores en 64 archivos

Objetivo: llevar ESLint a 0 errores eliminando todos los `any` explícitos.

Estrategia: agrupar por dominio funcional para tipar de forma coherente (los tipos fluyen entre archivos del mismo dominio). Orden de prioridad: primero los tipos base y servicios, después los componentes que los consumen.

---

## Fase A: Tipos base, servicios y API client ✅ COMPLETADA

### A1. API client y helpers ✅

- [x] `src/services/api-client.ts`: `ApiError.data` → `Record<string, unknown>`, `errorData` tipado, `post/put/patch` data → `unknown`
- [x] `src/lib/api/api-handler.ts`: `apiHandler` generic constraint con `Parameters<T>`

### A2. Services ✅

- [x] `src/services/movies.service.ts`: interfaces `MovieApiPayload`, `MovieApiResponse`, tipado de todos los métodos del service
- [x] `src/services/people.service.ts`: interface `PersonApiPayload`, `NationalityEntry`, tipado de formatters y error handling

### A3. CRUD factory ✅

- [x] `src/lib/api/crud-factory.ts`: `PrismaArgs`, `PrismaRecord`, `PrismaInclude`, `PrismaOrderBy` types. 36→1 `any` (el restante es `Record<string, any>` para `PrismaRecord` con eslint-disable justificado — boundary type para Prisma dynamic models)

### A4. Prisma y auth ✅

- [x] `src/lib/prisma.ts`: `declare global` para `BigInt.toJSON`, `lastError: unknown`, Prisma error typed via assertion
- [x] `src/auth.ts`: `user.role as string` (type augmentation en next-auth.d.ts lo soporta)
- [x] `src/lib/auth.ts`: explicit session type cast en vez de `as any`

### A5. Utilidades de dominio ✅

- [x] `src/lib/movies/movieUtils.ts`: `prepared: Record<string, unknown>`, `getErrorMessage(error: unknown)`
- [x] `src/lib/people/peopleUtils.ts`: `LocationWithParent`, `PersonBirthData`, `PersonSummaryData` interfaces, nationality filter typed
- [x] `src/lib/roles/roleUtils.ts`: `sortRolesByDepartment(roles: Role[])`
- [x] `src/lib/estrenos/estrenosTypes.ts`: `EstrenoMovie` interface para reemplazar `any[]`
- [x] `src/hooks/usePageView.ts`: `extraData: Record<string, unknown>`

---

## Fase B: API routes de películas ✅ COMPLETADA

También se tipó `src/lib/schemas.ts` (6 `z.array(z.any())` → schemas tipados para cast, crew, alternativeTitles, trivia, links).

- [x] `src/app/api/movies/route.ts`: `RawMovieSearchResult` interface, typed where clause, typed relation map callbacks, `makeUniqueSlug` cast
- [x] `src/app/api/movies/[id]/route.ts`: typed memory cache, filter callbacks `unknown`, relation map callbacks tipados, DELETE error typed
- [x] `src/app/api/movies/list/route.ts`: `RawAlphabeticMovie` interface, typed params array, Prisma where casts

---

## Fase C: API routes de personas ✅ COMPLETADA

- [x] `src/app/api/people/route.ts`: `RawPersonSearchResult` interface, typed where/orderBy, `personData` tipado, callbacks de links/trivia/alternativeNames tipados
- [x] `src/app/api/people/[id]/route.ts`: typed memory cache, `updateData` tipado, callbacks de links/trivia/alternativeNames tipados
- [x] `src/app/api/people/list/route.ts`: `PersonWithLocations` interface para `addFeaturedMovies`
- [x] `src/app/api/people/merge/route.ts`: generic `resolveValue<T>`, `updateData` tipado
- [x] `src/app/api/people/merge/preview/route.ts`: `LocationNode` interface, `FieldComparison` con `unknown`

---

## Fase D: Otras API routes ✅ COMPLETADA

- [x] `search/route.ts`: `MovieSearchRow`, `PersonSearchRow` interfaces para raw SQL
- [x] `search/full/route.ts`: `FullMovieSearchRow`, `FullPersonSearchRow` interfaces
- [x] `festival-editions/[id]/screenings/route.ts`: typed screeningsData y results/errors
- [x] `festivals/route.ts`, `festivals/[id]/editions/route.ts`: typed body
- [x] `locations/route.ts`, `locations/[id]/route.ts`, `locations/check-slug/route.ts`: typed where/body, makeUniqueSlug cast
- [x] `roles/route.ts`: `RoleWithCount` interface, typed orderBy y callbacks
- [x] `images/route.ts`: typed error handling
- [x] `analytics/pageview/route.ts`: `Record<string, unknown>` para extraData
- [x] `metrics/database/route.ts`: interfaces para pg_stat queries
- [x] `people/death-years/route.ts`: typed memory cache
- [x] `screening-venues/route.ts`: typed extraFilters

---

## Fase E: Movie form system (157 any) ⚠️ la más grande

El sistema de formulario de películas es el más complejo. Los tipos fluyen entre `useMovieForm` → `MovieModalContext` → `MovieFormEnhanced` → tabs del modal.

### E1. Hook y context ✅ COMPLETADA

- [x] `src/hooks/useMovieForm.ts` (78→0): Interfaces exportadas: `CastMemberEntry`, `CrewMemberEntry`, `AlternativeTitleEntry`, `TriviaEntry`, `MovieLinkEntry`. React Hook Form methods tipados via `UseFormReturn<MovieFormData>`. Todas las relaciones, callbacks y estados tipados.
- [x] `src/contexts/MovieModalContext.tsx` (31→0): Context value tipado con las mismas interfaces. Eliminados todos los `any` de la interfaz del context.

### E2. Componentes del formulario ✅ COMPLETADA

- [x] `MovieFormEnhanced.tsx` (48→0): props tipadas con interfaces de useMovieForm, RHF methods, callbacks
- [x] `CastTab.tsx` (11→0): usa `CastMemberEntry`, genre filter tipado
- [x] `CrewTab.tsx` (6→0): usa `CrewMemberEntry`, role type union
- [x] `ImagesTab/index.tsx` (2→0): typed image/people queries
- [x] `MultiImageUpload.tsx` (1→0): typed Cloudinary callback
- [x] `MovieModalFooter.tsx` (1→0): typed formState access
- [x] `MovieModal/index.tsx` (1→0): typed submit handler

---

## Fase F: People form system y admin pages ✅ COMPLETADA

### F1. People form ✅

- [x] `PersonForm.tsx` (2→0): nationality map callbacks tipados
- [x] `BasicInfoFields.tsx` (2→0): `value: string` en partial date handlers
- [x] `LinksSection.tsx` (1→0): `PersonLink['type']` cast
- [x] `PeopleTable.tsx` (2→0): typed delete handler, `PersonFilters['gender']` cast
- [x] `usePeopleForm.ts` (1→0): typed nationality map, trivia access via Record cast

### F2. Admin pages ✅

- [x] `merge/page.tsx` (8→0): location types, `unknown` para field values, typed error handling
- [x] `roles/page.tsx` (1→0): `Role` type para editingRole state

---

## Fase G: Componentes del sitio público ✅ COMPLETADA

### G1. Página de película ✅

- [x] `page.tsx` (21→0): interfaces para Prisma query results, typed cast/crew/review shapes
- [x] `MoviePageClient.tsx` (1→0): typed movie prop interface

### G2. Búsqueda y listados ✅

- [x] `buscar/page.tsx` (3→0): typed callbacks usando `SearchPageResult` indexed access
- [x] `PersonCardDetailed.tsx` (2→0): intersection type para location paths

### G3. Otros componentes ✅

- [x] `ObituariosSection.tsx` (3→0): `ObituarioPerson` interface
- [x] `PersonSearchInput.tsx` (2→0): typed query result, removed callback `any`
- [x] `CloudinaryUploadWidget.tsx` (2→0): typed upload result and error callback
- [x] `EstrenosYearBar.tsx` (1→0): removed `null as any`
- [x] `ImageGallery.tsx` (1→0): `ImageWithRelations['type']` cast

### G4. Festival forms ✅

- [x] `FestivalSectionForm.tsx` (1→0): `string | number | boolean` value type
- [x] `FestivalEditionForm.tsx` (1→0): indexed access value type
- [x] `FestivalForm.tsx` (1→0): indexed access value type
- [x] `FestivalScreeningForm.tsx` (1→0): indexed access value type

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
