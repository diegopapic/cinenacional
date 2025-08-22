# MovieModal Component

Context

**Ubicación**: `/src/contexts/MovieModalContext.tsx`

Context centralizado que **elimina completamente el props drilling** en MovieModal.

#### Arquitectura del Context

```typescript
interface MovieModalContextValue {
  // Form methods from React Hook Form
  register: any;
  handleSubmit: any;
  watch: any;
  setValue: any;
  reset: any;
  control: any;
  formState: any;
  getValues: any;
  trigger: any;
  clearErrors: any;
  setError: any;
  setFocus: any;
  getFieldState: any;
  resetField: any;
  unregister: any;
  
  // UI State
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isSubmitting: boolean;
  editingMovie: Movie | null;
  
  // Submit handler
  onSubmit: (data: any) => Promise<void>;
  
  // Fechas parciales (3 sistemas)
  isPartialDate: boolean;
  setIsPartialDate: (value: boolean) => void;
  partialReleaseDate: any;
  setPartialReleaseDate: (value: any) => void;
  isPartialFilmingStartDate: boolean;
  setIsPartialFilmingStartDate: (value: boolean) => void;
  partialFilmingStartDate: any;
  setPartialFilmingStartDate: (value: any) => void;
  isPartialFilmingEndDate: boolean;
  setIsPartialFilmingEndDate: (value: boolean) => void;
  partialFilmingEndDate: any;
  setPartialFilmingEndDate: (value: any) => void;
  
  // Duration
  tipoDuracionDisabled: boolean;
  
  // Metadata
  availableRatings: any[];
  availableColorTypes: any[];
  movieFormInitialData: any;
  
  // Relation handlers (9 handlers)
  handleGenresChange: (genres: number[]) => void;
  handleCastChange: (cast: any[]) => void;
  handleCrewChange: (crew: any[]) => void;
  handleCountriesChange: (countries: number[]) => void;
  handleProductionCompaniesChange: (companies: number[]) => void;
  handleDistributionCompaniesChange: (companies: number[]) => void;
  handleThemesChange: (themes: number[]) => void;
  handleScreeningVenuesChange: (venues: number[]) => void;
  handleLinksChange: (links: any[]) => void;
  
  // Data management
  alternativeTitles: any[];
  setAlternativeTitles: (titles: any[]) => void;
  movieLinks: any[];
  
  // Core functions
  loadMovieData: (movie: Movie) => Promise<void>;
  resetForNewMovie: () => void;
}
```

#### Funcionalidades del Context

**1. Carga Automática de Datos:**
```typescript
useEffect(() => {
  if (editingMovie) {
    console.log('🔄 Loading movie data for editing:', editingMovie.title)
    movieFormData.loadMovieData(editingMovie).catch(error => {
      console.error('❌ Error loading movie data:', error)
      if (onError) {
        onError(error instanceof Error ? error : new Error('Error loading movie data'))
      }
    })
  } else {
    movieFormData.resetForNewMovie()
  }
}, [editingMovie?.id])
```

**2. Provider Simplificado:**
```typescript
<MovieModalProvider 
  editingMovie={editingMovie}
  onSuccess={handleMovieSuccess}
  onError={handleMovieError}
>
  <MovieModal 
    isOpen={showModal}
    onClose={handleCloseModal}
  />
</MovieModalProvider>
```

#### Beneficios Conseguidos

✅ **Eliminación Total del Props Drilling**: De 46 props a 2 props  
✅ **Componentes Desacoplados**: Cada tab accede directamente al Context  
✅ **Mantenibilidad Mejorada**: Cambios centralizados  
✅ **Testing Simplificado**: Cada componente es independiente  
✅ **Performance Optimizada**: No re-renders por props drilling  

### Uso del Context en Componentes

**Antes (Props Drilling):**
```typescript
// ❌ 20+ props por componente
<BasicInfoTab 
  register={register}
  watch={watch}
  setValue={setValue}
  errors={errors}
  isPartialDate={isPartialDate}
  setIsPartialDate={setIsPartialDate}
  partialReleaseDate={partialReleaseDate}
  setPartialReleaseDate={setPartialReleaseDate}
  availableRatings={availableRatings}
  availableColorTypes={availableColorTypes}
  handleGenresChange={handleGenresChange}
  handleCountriesChange={handleCountriesChange}
  handleThemesChange={handleThemesChange}
  // ... 15+ props más
/>
```

**Después (Context API):**
```typescript
// ✅ Sin props, datos del Context
<BasicInfoTab />

// Dentro del componente:
export default function BasicInfoTab() {
  const {
    register,
    watch,
    setValue,
    formState,
    isPartialDate,
    setIsPartialDate,
    partialReleaseDate,
    setPartialReleaseDate,
    availableRatings,
    availableColorTypes,
    handleGenresChange,
    handleCountriesChange,
    handleThemesChange,
    // ... todos los datos necesarios
  } = useMovieModalContext()
  
  const errors = formState?.errors || {}
  // ... resto del componente
}
```

---

## 📌 Capa de Servicios

### API Client

**Ubicación**: `/src/services/api-client.ts`

Cliente HTTP singleton que centraliza todas las comunicaciones con la API.

#### Características Principales

**Patrón Singleton**
```typescript
class ApiClient {
  private baseUrl: string = '/api'
  
  // Instancia única para toda la aplicación
  static instance = new ApiClient()
}
```

**Manejo de Respuestas**
```typescript
private async handleResponse<T>(response: Response): Promise<T> {
  // Manejo de errores HTTP
  if (!response.ok) {
    // Intenta extraer mensaje de error del body
    const errorBody = await response.text()
    let errorMessage = `Error ${response.status}: ${response.statusText}`
    
    try {
      const errorData = JSON.parse(errorBody)
      errorMessage = errorData.error || errorMessage
    } catch {
      // Si no es JSON, usar el texto como está
      if (errorBody) {
        errorMessage = errorBody
      }
    }
    
    throw new Error(errorMessage)
  }
  
  // Manejo especial para 204 No Content
  if (response.status === 204) return null as T
  
  return response.json()
}
```

**Construcción de URLs**
```typescript
private buildUrl(endpoint: string, params?: Record<string, string>): string {
  const url = new URL(`${this.baseUrl}${endpoint}`, window.location.origin)
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.append(key, value)
      }
    })
  }
  
  return url.toString()
}
```

**Métodos HTTP Tipados**
- `get<T>()`: Requests GET con params opcionales
- `post<T>()`: Requests POST con body JSON
- `put<T>()`: Requests PUT para actualizaciones
- `patch<T>()`: Requests PATCH para actualizaciones parciales
- `delete<T>()`: Requests DELETE, retorna void por defecto

#### Uso
```typescript
// Importar instancia singleton
import { apiClient } from '@/services/api-client'

// Usar en servicios
const data = await apiClient.get<Movie[]>('/movies', {
  params: { page: '1', limit: '20' }
})
```

### Movies Service

**Ubicación**: `/src/services/movies.service.ts`

Servicio especializado para operaciones con películas.

#### Funciones Principales

**formatMovieDataForAPI()**
```typescript
function formatMovieDataForAPI(data: MovieFormData): any {
  // Convierte datos del formulario al formato de la API
  // Procesa 3 fechas parciales independientes:
  //   - releaseDate (estreno)
  //   - filmingStartDate (inicio rodaje)
  //   - filmingEndDate (fin rodaje)
  // Cada fecha se convierte a 3 campos INT: year, month, day
  
  const formattedData: any = { ...data }
  
  // Procesar fecha de estreno
  if (data.isPartialDate && data.partialReleaseDate) {
    formattedData.releaseYear = data.partialReleaseDate.year
    formattedData.releaseMonth = data.partialReleaseDate.month
    formattedData.releaseDay = data.partialReleaseDate.day
    delete formattedData.releaseDate
  } else if (data.releaseDate) {
    const [year, month, day] = data.releaseDate.split('-').map(Number)
    formattedData.releaseYear = year
    formattedData.releaseMonth = month
    formattedData.releaseDay = day
  }
  
  // Similar para filmingStartDate y filmingEndDate
  // ...
  
  return formattedData
}
```

**formatMovieFromAPI()**
```typescript
function formatMovieFromAPI(movie: any): MovieFormData {
  // Convierte datos de la API al formato del formulario
  // Detecta si las fechas son completas o parciales
  // Configura flags isPartial según corresponda
  
  const formattedMovie: MovieFormData = { ...movie }
  
  // Detectar si la fecha de estreno es parcial o completa
  if (movie.releaseDay) {
    // Fecha completa
    formattedMovie.releaseDate = `${movie.releaseYear}-${String(movie.releaseMonth).padStart(2, '0')}-${String(movie.releaseDay).padStart(2, '0')}`
    formattedMovie.isPartialDate = false
  } else if (movie.releaseYear) {
    // Fecha parcial
    formattedMovie.isPartialDate = true
    formattedMovie.partialReleaseDate = {
      year: movie.releaseYear,
      month: movie.releaseMonth,
      day: null
    }
  }
  
  return formattedMovie
}
```

#### Métodos del Servicio

**getAll(filters: MovieFilters)**
- Obtiene lista paginada con filtros
- Soporta búsqueda, año, ordenamiento
- Retorna movies + información de paginación

**getById(id: number)**
- Obtiene película con todas sus relaciones
- Retorna datos crudos de la API

**getByIdForEdit(id: number)**
- Obtiene película formateada para edición
- Usa `formatMovieFromAPI()` internamente

**create(data: MovieFormData)**
- Crea nueva película
- Formatea fechas parciales antes de enviar
- Manejo de errores con mensajes específicos

**update(id: number, data: MovieFormData)**
- Actualiza película existente
- Mismo formateo que create

**delete(id: number)**
- Elimina película por ID

**search(term: string, limit?: number)**
- Búsqueda para autocomplete
- Límite configurable (default: 10)

**checkSlugAvailability(slug: string, excludeId?: number)**
- Verifica disponibilidad de slug
- Excluye ID actual en modo edición

**getStats()**
- Retorna estadísticas agregadas
- Total, por año, por stage, por completitud

**exportToCSV(filters: MovieFilters)**
- Exporta películas filtradas a CSV
- Retorna Blob para descarga

### People Service

**Ubicación**: `/src/services/people.service.ts`

Servicio especializado para operaciones con personas.

#### Funciones de Formateo

**formatPersonDataForAPI()**
```typescript
function formatPersonDataForAPI(data: PersonFormData): any {
  // Convierte formulario a formato API
  // Procesa 2 fechas parciales:
  //   - birthDate (nacimiento)
  //   - deathDate (fallecimiento)
  // Maneja campos opcionales de ubicación
  
  const formattedData: any = { ...data }
  
  // Procesar fecha de nacimiento
  if (data.isPartialBirthDate && data.partialBirthDate) {
    formattedData.birthYear = data.partialBirthDate.year
    formattedData.birthMonth = data.partialBirthDate.month
    formattedData.birthDay = data.partialBirthDate.day
    delete formattedData.birthDate
  } else if (data.birthDate) {
    const [year, month, day] = data.birthDate.split('-').map(Number)
    formattedData.birthYear = year
    formattedData.birthMonth = month
    formattedData.birthDay = day
  }
  
  // Similar para deathDate
  // ...
  
  return formattedData
}
```

**formatPersonFromAPI()**
```typescript
function formatPersonFromAPI(person: any): PersonFormData {
  // Convierte API a formato formulario
  // Detecta fechas completas vs parciales
  // Configura flags isPartial
  
  const formattedPerson: PersonFormData = { ...person }
  
  // Detectar si la fecha de nacimiento es parcial o completa
  if (person.birthDay) {
    // Fecha completa
    formattedPerson.birthDate = `${person.birthYear}-${String(person.birthMonth).padStart(2, '0')}-${String(person.birthDay).padStart(2, '0')}`
    formattedPerson.isPartialBirthDate = false
  } else if (person.birthYear) {
    // Fecha parcial
    formattedPerson.isPartialBirthDate = true
    formattedPerson.partialBirthDate = {
      year: person.birthYear,
      month: person.birthMonth,
      day: null
    }
  }
  
  return formattedPerson
}
```

#### Métodos del Servicio

**getAll(filters: PersonFilters)**
- Lista paginada con múltiples filtros
- Filtros: search, gender, hasLinks, isActive
- Usa apiClient internamente

**search(query: string, limit?: number)**
- Búsqueda rápida para autocomplete
- Mínimo 2 caracteres requeridos
- Retorna: id, name, slug

**getById(id: number)**
- Obtiene persona con relaciones
- Incluye links, ubicaciones, contadores

**getByIdForEdit(id: number)**
- Versión formateada para edición
- Usa `formatPersonFromAPI()`

**create(data: PersonFormData)**
- Crea nueva persona
- Formatea fechas parciales
- Log de debugging incluido

**createQuick(name: string)**
- Creación rápida solo con nombre
- Separa automáticamente firstName/lastName
- Útil para agregar personas on-the-fly

**update(id: number, data: PersonFormData)**
- Actualiza persona existente
- Mismo formateo que create

**delete(id: number)**
- Elimina persona por ID

**checkSlugAvailability(slug: string, excludeId?: number)**
- Verifica disponibilidad de slug

**getStats()**
- Estadísticas agregadas
- Total, activos, con links, por género

**exportToCSV(filters: PersonFilters)**
- Exporta personas filtradas
- Usa fetch directamente para manejar Blob

### Roles Service - **NUEVO** 🆕

**Ubicación**: `/src/services/roles.service.ts`

Servicio especializado para operaciones con roles cinematográficos.

#### Métodos del Servicio

```typescript
export const rolesService = {
  // CRUD básico
  getAll(filters?: RoleFilters): Promise<PaginatedRolesResponse>
  getById(id: number): Promise<Role>
  create(data: RoleFormData): Promise<Role>
  update(id: number, data: RoleFormData): Promise<Role>
  delete(id: number): Promise<void>
  
  // Búsqueda y validación
  search(query: string, limit?: number): Promise<Role[]>
  checkSlugAvailability(slug: string, excludeId?: number): Promise<boolean>
  
  // Utilidades
  getDepartments(): Promise<string[]>
  getByDepartment(department: string): Promise<Role[]>
}
```

#### Características
- **Generación automática de slug**: Basado en el nombre del rol
- **Validación de unicidad**: Verifica nombre y slug únicos
- **Filtros avanzados**: Por departamento, estado activo, búsqueda
- **Ordenamiento**: Por nombre, departamento, orden de display
- **Paginación**: Soporte completo con información de páginas

---

## 📝 Tipos TypeScript

### Movie Types

**Ubicación**: `/src/lib/movies/movieTypes.ts`

#### Tipos de Fechas Parciales
```typescript
// Tipo base reutilizable
export type PartialDate = {
  year: number | null
  month: number | null
  day?: number | null
}

// Alias para compatibilidad
export type PartialReleaseDate = PartialDate
export type PartialFilmingDate = PartialDate
```

#### Schema de Validación (Zod) - **MEJORADO**
```typescript
// Schema principal para formularios SIN transform (evita problemas de compilación)
export const movieFormFieldsSchema = z.object({
  // Campo requerido
  title: z.string().min(1, 'El título es requerido'),
  
  // Campos opcionales SIN transform
  originalTitle: z.string().optional(),
  synopsis: z.string().optional(),
  tagline: z.string().optional(),
  imdbId: z.string().optional(),
  posterUrl: z.string().optional(),
  trailerUrl: z.string().optional(),
  
  // Campos numéricos con validación estricta - **CORREGIDO**
  year: z.number().nullable().optional(),
  duration: z.preprocess(
    (val) => {
      if (val === '' || val === null || val === undefined || isNaN(Number(val))) {
        return null;
      }
      return Number(val);
    },
    z.number().positive().nullable().optional()
  ),
  
  durationSeconds: z.preprocess(
    (val) => {
      if (val === '' || val === null || val === undefined || isNaN(Number(val))) {
        return null;
      }
      const num = Number(val);
      return num >= 0 && num <= 59 ? num : null;
    },
    z.number().min(0).max(59).nullable().optional()
  ),
  
  ratingId: z.union([z.number(), z.null()]).optional(),
  colorTypeId: z.union([z.number(), z.null()]).optional(),
  
  // Metadata con transform (solo estos campos lo necesitan)
  metaDescription: z.union([
    z.string(),
    z.null(),
    z.undefined()
  ]).transform(val => val ?? '').optional(),
  
  metaKeywords: z.union([
    z.string(),
    z.array(z.string()),
    z.null(),
    z.undefined()
  ]).transform(val => val ?? []).optional(),
  
  // Enums con valores específicos
  dataCompleteness: z.enum([
    'BASIC_PRESS_KIT',
    'FULL_PRESS_KIT',
    'MAIN_CAST',
    'MAIN_CREW',
    'FULL_CAST',
    'FULL_CREW'
  ]).optional(),
  
  stage: z.enum([
    'COMPLETA',
    'EN_DESARROLLO',
    'EN_POSTPRODUCCION',
    'EN_PREPRODUCCION',
    'EN_RODAJE',
    'INCONCLUSA',
    'INEDITA'
  ]).optional(),
  
  tipoDuracion: z.enum([
    'largometraje',
    'mediometraje',
    'cortometraje'
  ]).optional()
})

// Uso en React Hook Form
const form = useForm<MovieFormData>({
  resolver: zodResolver(movieFormSchema),
  defaultValues: movieFormInitialData
})
```

#### Interfaces Principales

**Movie**
```typescript
interface Movie {
  id: number
  slug: string
  title: string
  originalTitle?: string
  year: number
  releaseDate?: string
  releaseYear?: number
  releaseMonth?: number
  releaseDay?: number
  duration?: number
  durationSeconds?: number
  rating?: number
  posterUrl?: string
  trailerUrl?: string
  synopsis?: string
  tagline?: string
  imdbId?: string
  status: string
  stage?: string
  dataCompleteness?: string
  filmingStartDate?: string
  filmingStartYear?: number
  filmingStartMonth?: number
  filmingStartDay?: number
  filmingEndDate?: string
  filmingEndYear?: number
  filmingEndMonth?: number
  filmingEndDay?: number
  genres: Array<{ id: number; name: string }>
  directors: Array<{ id: number; name: string }>
  mainCast: Array<{
    person: { id: number; name: string }
    character?: string
  }>
  country: string
  productionCompanies?: Array<{ id: number; name: string }>
  distributionCompanies?: Array<{ id: number; name: string }>
  themes?: Array<{ id: number; name: string }>
  alternativeTitles?: AlternativeTitle[]
  links?: MovieLink[]
}
```

**MovieFormData**
```typescript
interface MovieFormData {
  // Campos básicos
  title: string
  originalTitle?: string
  year?: number
  synopsis?: string
  tagline?: string
  imdbId?: string
  posterUrl?: string
  trailerUrl?: string
  
  // Duración
  duration?: number
  durationSeconds?: number
  tipoDuracion?: string
  
  // Fechas
  releaseDate?: string
  isPartialDate?: boolean
  partialReleaseDate?: PartialReleaseDate
  
  filmingStartDate?: string
  isPartialFilmingStartDate?: boolean
  partialFilmingStartDate?: PartialFilmingDate
  
  filmingEndDate?: string
  isPartialFilmingEndDate?: boolean
  partialFilmingEndDate?: PartialFilmingDate
  
  // Metadata
  stage?: string
  dataCompleteness?: string
  ratingId?: number | null
  colorTypeId?: number | null
  metaDescription?: string
  metaKeywords?: string | string[]
  
  // Relaciones (no incluidas en el form, manejadas por callbacks)
  genres?: number[]
  cast?: any[]
  crew?: any[]
  countries?: number[]
  productionCompanies?: number[]
  distributionCompanies?: number[]
  themes?: number[]
  screeningVenues?: any[]
  alternativeTitles?: AlternativeTitle[]
  links?: MovieLink[]
}
```

**MovieRelations**
```typescript
interface MovieRelations {
  genres: number[]
  cast: Array<{
    personId: number
    characterName?: string
    billingOrder?: number
    isPrincipal?: boolean
  }>
  crew: Array<{
    personId: number
    role: string
    department?: string
    billingOrder?: number
  }>
  countries: number[]
  productionCompanies: number[]
  distributionCompanies: number[]
  themes: number[]
  screeningVenues: Array<{
    venueId: number
    screeningDate?: string
    isPremiere?: boolean
    isExclusive?: boolean
  }>
}
```

**MovieLink**
```typescript
interface MovieLink {
  id?: number
  type: string
  url: string
  description?: string
}
```

**AlternativeTitle**
```typescript
interface AlternativeTitle {
  id?: number
  title: string
  type?: string
  language?: string
}
```

#### Tipos de Constantes
```typescript
export type MovieStage = 
  | 'COMPLETA' 
  | 'EN_DESARROLLO' 
  | 'EN_POSTPRODUCCION' 
  | 'EN_PREPRODUCCION' 
  | 'EN_RODAJE' 
  | 'INCONCLUSA' 
  | 'INEDITA'

export type DataCompleteness = 
  | 'BASIC_PRESS_KIT'
  | 'FULL_PRESS_KIT'
  | 'MAIN_CAST'
  | 'MAIN_CREW'
  | 'FULL_CAST'
  | 'FULL_CREW'

export type DurationType = 
  | 'largometraje' 
  | 'mediometraje' 
  | 'cortometraje'
```

### People Types

**Ubicación**: `/src/lib/people/peopleTypes.ts`

#### Interfaces Base

**Person**
```typescript
interface Person {
  id: number
  slug: string
  firstName?: string | null
  lastName?: string | null
  realName?: string | null
  birthDate?: string | null
  birthYear?: number | null
  birthMonth?: number | null
  birthDay?: number | null
  deathDate?: string | null
  deathYear?: number | null
  deathMonth?: number | null
  deathDay?: number | null
  birthLocationId?: number | null
  deathLocationId?: number | null
  biography?: string | null
  photoUrl?: string | null
  gender?: Gender | null
  hideAge: boolean
  hasLinks: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
}
```

**PersonLink**
```typescript
interface PersonLink {
  id?: number
  personId?: number
  type: PersonLinkType
  url: string
  title?: string | null
  displayOrder: number
  isVerified: boolean
  isActive: boolean
  lastChecked?: string | null
  createdAt?: string
  updatedAt?: string
}
```

#### Tipos de Enlaces
```typescript
export type PersonLinkType = 
  | 'IMDB'
  | 'TMDB'
  | 'CINENACIONAL'
  | 'WIKIPEDIA'
  | 'OFFICIAL_WEBSITE'
  | 'PORTFOLIO'
  | 'BLOG'
  | 'INSTAGRAM'
  | 'TWITTER'
  | 'FACEBOOK'
  | 'YOUTUBE'
  | 'TIKTOK'
  | 'LINKEDIN'
  | 'VIMEO'
  | 'LETTERBOXD'
  | 'SPOTIFY'
  | 'PODCAST'
  | 'INTERVIEW'
  | 'ARTICLE'
  | 'OTHER'
```

#### PersonFormData
```typescript
interface PersonFormData {
  firstName: string
  lastName: string
  realName?: string
  
  // Fechas completas para inputs
  birthDate: string
  deathDate: string
  
  // Fechas parciales
  partialBirthDate?: PartialDate
  partialDeathDate?: PartialDate
  
  // Flags de fecha parcial
  isPartialBirthDate?: boolean
  isPartialDeathDate?: boolean
  
  // Ubicaciones
  birthLocationId?: number | null
  deathLocationId?: number | null
  birthLocation?: string  // Texto del autocompletar
  deathLocation?: string  // Texto del autocompletar
  
  // Otros campos
  biography?: string
  photoUrl?: string
  gender?: string
  hideAge?: boolean
  isActive?: boolean
  links: PersonLink[]
  nationalities?: number[]
}
```

#### Tipos de Filtros y Respuestas
```typescript
interface PersonFilters {
  search?: string
  gender?: Gender | ''
  hasLinks?: boolean | ''
  isActive?: boolean | ''
  page?: number
  limit?: number
}

interface PaginatedPeopleResponse {
  data: PersonWithRelations[]
  totalCount: number
  page: number
  totalPages: number
  hasMore: boolean
}

interface PersonWithRelations extends Person {
  birthLocation?: Location | null
  deathLocation?: Location | null
  links?: PersonLink[]
  nationalities?: Country[]
  _count?: {
    links: number
    castRoles: number
    crewRoles: number
  }
}
```

### Role Types - **NUEVO** 🆕

**Ubicación**: `/src/lib/roles/roleTypes.ts`

#### Interfaces Base

```typescript
interface Role {
  id: number
  name: string
  slug: string
  description?: string | null
  department?: string | null
  isActive: boolean
  displayOrder: number
  createdAt: string
  updatedAt: string
  _count?: {
    crewRoles: number
  }
}

interface RoleFormData {
  name: string
  description?: string
  department?: string
  isActive?: boolean
  displayOrder?: number
}

interface RoleFilters {
  search?: string
  department?: string
  isActive?: boolean | ''
  page?: number
  limit?: number
  sortBy?: 'name' | 'department' | 'createdAt' | 'displayOrder'
  sortOrder?: 'asc' | 'desc'
}

interface PaginatedRolesResponse {
  data: Role[]
  totalCount: number
  page: number
  totalPages: number
  hasMore: boolean
}
```

#### Schema de Validación (Zod)

```typescript
export const roleFormSchema = z.object({
  name: z.string()
    .min(1, 'El nombre es requerido')
    .max(100, 'El nombre no puede superar los 100 caracteres'),
  description: z.string().optional(),
  department: z.string().optional(),
  isActive: z.boolean().optional().default(true),
  displayOrder: z.number().optional().default(0)
})
```

#### Constantes

```typescript
export const ROLE_DEPARTMENTS = [
  'Dirección',
  'Producción',
  'Fotografía',
  'Edición',
  'Sonido',
  'Música',
  'Arte',
  'Vestuario',
  'Maquillaje',
  'Efectos Especiales',
  'Animación',
  'Postproducción',
  'Distribución',
  'Marketing',
  'Otros'
] as const

export type RoleDepartment = typeof ROLE_DEPARTMENTS[number]
```

---

## 🌐 API Routes

### Movies API

#### GET /api/movies

Lista películas con filtros y paginación.

**Query Parameters:**
- `page` (number): Página actual (default: 1)
- `limit` (number): Películas por página (default: 20)
- `search` (string): Búsqueda en título y sinopsis
- `genre` (string): Filtrar por slug de género
- `year` (string): Filtrar por año
- `stage` (string): Filtrar por etapa de producción
- `sortBy` (string): Campo de ordenamiento (default: 'createdAt')
- `sortOrder` (string): Dirección ('asc' | 'desc', default: 'desc')

**Response:**
```json
{
  "movies": [{
    "id": 1,
    "slug": "string",
    "title": "string",
    "year": 2024,
    "releaseYear": 2024,
    "releaseMonth": 3,
    "releaseDay": 15,
    "releaseDateFormatted": "2024-03-15",
    "duration": 120,
    "posterUrl": "string",
    "stage": "COMPLETA",
    "genres": [{ "id": 1, "name": "Drama" }],
    "directors": [{ "id": 1, "name": "Director Name" }],
    "mainCast": [{
      "person": { "id": 1, "name": "Actor Name" },
      "character": "Character Name"
    }],
    "country": "Argentina"
  }],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

#### POST /api/movies - **CORREGIDO**

Crea una nueva película. **Problema de auto-increment resuelto**.

**Solución Implementada:**
```sql
-- Corregir secuencia de auto-increment después de migración
SELECT setval('movies_id_seq', (SELECT MAX(id) + 1 FROM movies));
```

**Request Body:**
```json
{
  "title": "string (required)",
  "year": 2024,
  "releaseYear": 2024,
  "releaseMonth": 3,
  "releaseDay": 15,
  "duration": 120,
  "durationSeconds": 30,
  "synopsis": "string",
  "tagline": "string",
  "imdbId": "string",
  "posterUrl": "string",
  "trailerUrl": "string",
  "stage": "COMPLETA",
  "dataCompleteness": "BASIC_PRESS_KIT",
  "ratingId": 1,
  "colorTypeId": 1,
  "genres": [1, 2, 3],
  "cast": [{
    "personId": 1,
    "characterName": "string",
    "billingOrder": 1,
    "isPrincipal": true
  }],
  "crew": [{
    "personId": 1,
    "role": "Director",
    "roleId": 1,
    "department": "Dirección",
    "billingOrder": 1
  }],
  "countries": [1, 2],
  "productionCompanies": [1, 2],
  "distributionCompanies": [1],
  "themes": [1, 2, 3],
  "screeningVenues": [{
    "venueId": 1,
    "screeningDate": "2024-03-15",
    "isPremiere": true,
    "isExclusive": false
  }],
  "alternativeTitles": [{
    "title": "string",
    "description": "string"
  }],
  "links": [{
    "type": "OFFICIAL_WEBSITE",
    "url": "https://example.com",
    "description": "string"
  }]
}
```

**Response:** 201 Created con la película creada incluyendo todas las relaciones.

#### GET /api/movies/[id]

Obtiene una película por ID o slug con todas sus relaciones.

**Response:** Película completa con:
- Información básica
- Géneros
- Elenco completo
- Equipo técnico con roles
- Países
- Productoras y distribuidoras
- Imágenes y videos
- Premios
- Temas
- Enlaces
- Proyecciones
- Títulos alternativos

#### PUT /api/movies/[id]

Actualiza una película existente.

**Request Body:** Mismo formato que POST

**Características especiales:**
- Usa transacción para actualizar todas las relaciones
- Elimina y recrea relaciones para evitar duplicados
- Maneja campos de rating y colorType con disconnect/connect
- Timeout de transacción: 30 segundos

**Implementación de transacción:**
```typescript
await prisma.$transaction(async (tx) => {
  // 1. Actualizar datos básicos
  const updatedMovie = await tx.movie.update({
    where: { id },
    data: basicData
  })
  
  // 2. Actualizar relaciones (eliminar y recrear)
  await tx.movieGenre.deleteMany({ where: { movieId: id } })
  if (genres?.length) {
    await tx.movieGenre.createMany({
      data: genres.map((genreId, index) => ({
        movieId: id,
        genreId,
        isPrimary: index === 0
      }))
    })
  }
  
  // 3. Similar para cast, crew, countries, etc...
  
  return updatedMovie
}, {
  timeout: 30000 // 30 segundos
})
```

#### DELETE /api/movies/[id]

Elimina una película y todas sus relaciones (cascada).

### People API

#### GET /api/people

Lista personas con filtros y paginación.

**Query Parameters:**
- `search` (string): Búsqueda en nombre, apellido y nombre real
- `gender` (string): Filtrar por género (MALE | FEMALE | OTHER)
- `isActive` (string): Filtrar por estado activo ('true' | 'false')
- `hasLinks` (string): Filtrar por personas con enlaces ('true' | 'false')
- `page` (number): Página actual (default: 1)
- `limit` (number): Personas por página (default: 20)

**Response:**
```json
{
  "data": [{
    "id": 1,
    "slug": "string",
    "firstName": "string",
    "lastName": "string",
    "birthYear": 1980,
    "birthMonth": 6,
    "birthDay": 15,
    "birthLocationId": 1,
    "deathLocationId": null,
    "birthLocation": {
      "id": 1,
      "name": "Buenos Aires",
      "parent": {
        "id": 2,
        "name": "Argentina"
      }
    },
    "_count": {
      "links": 5,
      "castRoles": 10,
      "crewRoles": 3
    }
  }],
  "totalCount": 100,
  "page": 1,
  "totalPages": 5,
  "hasMore": true
}
```

#### POST /api/people

Crea una nueva persona.

**Request Body:**
```json
{
  "firstName": "string",
  "lastName": "string",
  "realName": "string",
  "birthYear": 1980,
  "birthMonth": 6,
  "birthDay": 15,
  "deathYear": null,
  "deathMonth": null,
  "deathDay": null,
  "birthLocationId": 1,
  "deathLocationId": null,
  "gender": "MALE",
  "biography": "string",
  "photoUrl": "string",
  "hideAge": false,
  "isActive": true,
  "links": [{
    "type": "IMDB",
    "url": "https://imdb.com/...",
    "title": "string",
    "isVerified": false,
    "isActive": true
  }]
}
```

**Características especiales:**
- Generación automática de slug único
- Soporte para creación rápida con solo `name`
- Transacción para crear persona y links simultáneamente
- Incluye birthLocation y deathLocation en la respuesta

#### PUT /api/people/[id]

Actualiza una persona existente.

**Request Body:** Mismo formato que POST

**Características especiales:**
- Actualiza campos de ubicación (birthLocationId, deathLocationId)
- Maneja fechas parciales correctamente
- Incluye relaciones de ubicación en el return

#### DELETE /api/people/[id]

Elimina una persona y sus relaciones.

### Roles API - **NUEVO** 🆕

#### GET /api/roles

Lista roles con filtros y paginación.

**Query Parameters:**
- `page` (number): Página actual (default: 1)
- `limit` (number): Roles por página (default: 20)
- `search` (string): Búsqueda en nombre y descripción
- `department` (string): Filtrar por departamento
- `isActive` (string): Filtrar por estado activo ('true' | 'false')
- `sortBy` (string): Campo de ordenamiento (default: 'name')
- `sortOrder` (string): Dirección ('asc' | 'desc', default: 'asc')

**Response:**
```json
{
  "data": [{
    "id": 1,
    "name": "Director",
    "slug": "director",
    "description": "Responsable de la dirección general de la película",
    "department": "Dirección",
    "isActive": true,
    "displayOrder": 1,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z",
    "_count": {
      "crewRoles": 150
    }
  }],
  "totalCount": 50,
  "page": 1,
  "totalPages": 3,
  "hasMore": true
}
```

#### POST /api/roles

Crea un nuevo rol.

**Request Body:**
```json
{
  "name": "Director de Fotografía",
  "description": "Responsable de la cinematografía",
  "department": "Fotografía",
  "isActive": true,
  "displayOrder": 2
}
```

**Response:** 201 Created con el rol creado.

#### GET /api/roles/[id]

Obtiene un rol por ID.

**Response:** Rol completo con contador de uso.

#### PUT /api/roles/[id]

Actualiza un rol existente.

**Request Body:** Mismo formato que POST

**Características especiales:**
- Regenera slug si cambia el nombre
- Valida unicidad de nombre y slug
- Actualiza solo campos enviados

#### DELETE /api/roles/[id]

Elimina un rol.

**Características:**
- Verifica que no esté en uso antes de eliminar
- Retorna error 409 si hay relaciones activas

### Locations API

#### GET /api/locations/search

Busca ubicaciones para autocompletar.

**Query Parameters:**
- `query` (string): Término de búsqueda
- `limit` (number): Límite de resultados (default: 10)

**Response:**
```json
[
  {
    "id": 1,
    "name": "Buenos Aires",
    "path": "Buenos Aires, Argentina",
    "parent": {
      "id": 2,
      "name": "Argentina"
    }
  }
]
```

#### GET /api/locations/tree

Obtiene el árbol jerárquico de ubicaciones.

**Response:**
```json
[
  {
    "id": 1,
    "name": "Argentina",
    "type": "COUNTRY",
    "children": [
      {
        "id": 2,
        "name": "Buenos Aires",
        "type": "PROVINCE",
        "children": [
          {
            "id": 3,
            "name": "CABA",
            "type": "CITY",
            "children": []
          }
        ]
      }
    ]
  }
]
```

---

## 🧰 Funciones de Utilidad

### Movie Utils

**Ubicación**: `/src/lib/movies/movieUtils.ts`

#### Cálculo de Duración
```typescript
export function calcularTipoDuracion(minutos: number, segundos?: number): string {
  const totalMinutos = minutos + (segundos || 0) / 60
  
  if (totalMinutos >= 60) return 'largometraje'
  if (totalMinutos >= 30) return 'mediometraje'
  return 'cortometraje'
}
```

#### Preparación de Datos
```typescript
export function prepareMovieData(data: MovieFormData): any {
  const prepared: any = {}
  
  // Limpiar strings vacíos
  Object.keys(data).forEach(key => {
    const value = data[key as keyof MovieFormData]
    if (typeof value === 'string') {
      prepared[key] = value.trim() || undefined
    } else {
      prepared[key] = value
    }
  })
  
  // Parsear campos numéricos
  if (prepared.year) {
    prepared.year = parseInt(prepared.year)
  }
  if (prepared.duration) {
    prepared.duration = parseInt(prepared.duration)
  }
  
  // Validar URLs
  if (prepared.posterUrl && !isValidUrl(prepared.posterUrl)) {
    delete prepared.posterUrl
  }
  if (prepared.trailerUrl && !isValidUrl(prepared.trailerUrl)) {
    delete prepared.trailerUrl
  }
  
  return prepared
}
```

#### Utilidades de Display
```typescript
export function getCompletenessLabel(completeness: string): string {
  const labels: Record<string, string> = {
    'BASIC_PRESS_KIT': 'Kit de prensa básico',
    'FULL_PRESS_KIT': 'Kit de prensa completo',
    'MAIN_CAST': 'Elenco principal',
    'MAIN_CREW': 'Equipo principal',
    'FULL_CAST': 'Elenco completo',
    'FULL_CREW': 'Equipo completo'
  }
  return labels[completeness] || completeness
}

export function getCompletenessColor(completeness: string): string {
  const colors: Record<string, string> = {
    'BASIC_PRESS_KIT': 'bg-yellow-100 text-yellow-800',
    'FULL_PRESS_KIT': 'bg-green-100 text-green-800',
    'MAIN_CAST': 'bg-blue-100 text-blue-800',
    'MAIN_CREW': 'bg-purple-100 text-purple-800',
    'FULL_CAST': 'bg-indigo-100 text-indigo-800',
    'FULL_CREW': 'bg-pink-100 text-pink-800'
  }
  return colors[completeness] || 'bg-gray-100 text-gray-800'
}

export function getStageColor(stage?: string): string {
  const colors: Record<string, string> = {
    'COMPLETA': 'bg-green-100 text-green-800',
    'EN_DESARROLLO': 'bg-yellow-100 text-yellow-800',
    'EN_POSTPRODUCCION': 'bg-orange-100 text-orange-800',
    'EN_PREPRODUCCION': 'bg-blue-100 text-blue-800',
    'EN_RODAJE': 'bg-purple-100 text-purple-800',
    'INCONCLUSA': 'bg-red-100 text-red-800',
    'INEDITA': 'bg-gray-100 text-gray-800'
  }
  return colors[stage || ''] || 'bg-gray-100 text-gray-800'
}

export function getStageName(stage?: string): string {
  const names: Record<string, string> = {
    'COMPLETA': 'Completa',
    'EN_DESARROLLO': 'En desarrollo',
    'EN_POSTPRODUCCION': 'En postproducción',
    'EN_PREPRODUCCION': 'En preproducción',
    'EN_RODAJE': 'En rodaje',
    'INCONCLUSA': 'Inconclusa',
    'INEDITA': 'Inédita'
  }
  return names[stage || ''] || stage || 'Desconocido'
}
```

#### Manejo de Fechas
```typescript
export function buildReleaseDateData(
  isPartialDate: boolean,
  releaseDate?: string,
  partialReleaseDate?: PartialDate
): ReleaseDateData {
  if (isPartialDate && partialReleaseDate) {
    return {
      releaseYear: partialReleaseDate.year,
      releaseMonth: partialReleaseDate.month,
      releaseDay: partialReleaseDate.day
    }
  } else if (releaseDate) {
    const [year, month, day] = releaseDate.split('-').map(Number)
    return {
      releaseYear: year,
      releaseMonth: month,
      releaseDay: day
    }
  }
  
  return {
    releaseYear: null,
    releaseMonth: null,
    releaseDay: null
  }
}
```

### People Utils

**Ubicación**: `/src/lib/people/peopleUtils.ts`

#### Generación de Slugs
```typescript
export function generatePersonSlug(firstName?: string, lastName?: string): string {
  const parts = []
  if (firstName) parts.push(firstName)
  if (lastName) parts.push(lastName)
  
  return parts
    .join('-')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
    .replace(/[^a-z0-9-]/g, '-') // Reemplazar caracteres especiales
    .replace(/-+/g, '-') // Eliminar guiones múltiples
    .replace(/^-|-$/g, '') // Eliminar guiones al inicio/final
}
```

#### Formateo
```typescript
export function formatPersonName(person: Partial<Person>): string {
  const parts = []
  if (person.firstName) parts.push(person.firstName)
  if (person.lastName) parts.push(person.lastName)
  return parts.join(' ') || 'Sin nombre'
}

export function formatGender(gender?: Gender): string {
  const genders: Record<Gender, string> = {
    'MALE': 'Masculino',
    'FEMALE': 'Femenino',
    'OTHER': 'Otro'
  }
  return gender ? genders[gender] : 'No especificado'
}

export function formatBirthInfo(person: Person): string {
  if (!person.birthYear) return 'Fecha de nacimiento desconocida'
  
  let info = `n. ${person.birthYear}`
  
  if (person.birthMonth) {
    info = `n. ${MONTHS[person.birthMonth - 1].label} ${person.birthYear}`
  }
  
  if (person.birthDay && person.birthMonth) {
    info = `n. ${person.birthDay} de ${MONTHS[person.birthMonth - 1].label.toLowerCase()} de ${person.birthYear}`
  }
  
  // Calcular edad si no está oculta
  if (!person.hideAge && !person.deathYear) {
    const age = calculateAge(
      { year: person.birthYear, month: person.birthMonth, day: person.birthDay },
      person.deathYear ? { year: person.deathYear, month: person.deathMonth, day: person.deathDay } : undefined
    )
    if (age !== null) {
      info += ` (${age} años)`
    }
  }
  
  return info
}
```

#### Conversión de Datos - Actualizada
```typescript
export function formatPersonFormDataForAPI(data: PersonFormData): any {
  const formattedData: any = { ...data }
  
  // Procesar fecha de nacimiento
  if (data.isPartialBirthDate && data.partialBirthDate) {
    formattedData.birthYear = data.partialBirthDate.year
    formattedData.birthMonth = data.partialBirthDate.month
    formattedData.birthDay = data.partialBirthDate.day
    delete formattedData.birthDate
    delete formattedData.isPartialBirthDate
    delete formattedData.partialBirthDate
  } else if (data.birthDate) {
    const [year, month, day] = data.birthDate.split('-').map(Number)
    formattedData.birthYear = year
    formattedData.birthMonth = month
    formattedData.birthDay = day
    delete formattedData.birthDate
  }
  
  // Similar para deathDate
  if (data.isPartialDeathDate && data.partialDeathDate) {
    formattedData.deathYear = data.partialDeathDate.year
    formattedData.deathMonth = data.partialDeathDate.month
    formattedData.deathDay = data.partialDeathDate.day
    delete formattedData.deathDate
    delete formattedData.isPartialDeathDate
    delete formattedData.partialDeathDate
  } else if (data.deathDate) {
    const [year, month, day] = data.deathDate.split('-').map(Number)
    formattedData.deathYear = year
    formattedData.deathMonth = month
    formattedData.deathDay = day
    delete formattedData.deathDate
  }
  
  // Limpiar campos de ubicación de texto
  delete formattedData.birthLocation
  delete formattedData.deathLocation
  
  return formattedData
}

export function formatPersonDataForForm(person?: PersonWithRelations): PersonFormData {
  if (!person) {
    return {
      firstName: '',
      lastName: '',
      birthDate: '',
      deathDate: '',
      links: []
    }
  }
  
  const formData: PersonFormData = {
    firstName: person.firstName || '',
    lastName: person.lastName || '',
    realName: person.realName || '',
    birthDate: '',
    deathDate: '',
    birthLocationId: person.birthLocationId,
    deathLocationId: person.deathLocationId,
    biography: person.biography || '',
    photoUrl: person.photoUrl || '',
    gender: person.gender || '',
    hideAge: person.hideAge,
    isActive: person.isActive,
    links: person.links || []
  }
  
  // Manejar fechas parciales
  if (person.birthDay) {
    // Fecha completa
    formData.birthDate = `${person.birthYear}-${String(person.birthMonth).padStart(2, '0')}-${String(person.birthDay).padStart(2, '0')}`
    formData.isPartialBirthDate = false
  } else if (person.birthYear) {
    // Fecha parcial
    formData.isPartialBirthDate = true
    formData.partialBirthDate = {
      year: person.birthYear ?? null,
      month: person.birthMonth ?? null,
      day: null
    }
  }
  
  // Similar para muerte
  if (person.deathDay) {
    formData.deathDate = `${person.deathYear}-${String(person.deathMonth).padStart(2, '0')}-${String(person.deathDay).padStart(2, '0')}`
    formData.isPartialDeathDate = false
  } else if (person.deathYear) {
    formData.isPartialDeathDate = true
    formData.partialDeathDate = {
      year: person.deathYear ?? null,
      month: person.deathMonth ?? null,
      day: null
    }
  }
  
  // Formatear paths de ubicaciones
  if (person.birthLocation) {
    formData.birthLocation = formatLocationPath(person.birthLocation)
  }
  if (person.deathLocation) {
    formData.deathLocation = formatLocationPath(person.deathLocation)
  }
  
  return formData
}

// Función auxiliar para formatear paths
function formatLocationPath(location: any): string {
  if (location.path) return location.path
  
  const parts = [location.name]
  if (location.parent) {
    parts.push(location.parent.name)
    if (location.parent.parent) {
      parts.push(location.parent.parent.name)
    }
  }
  return parts.join(', ')
}
```

#### Validación
```typescript
export function validatePersonForm(data: PersonFormData): string[] {
  const errors: string[] = []
  
  // Validar nombre
  if (!data.firstName && !data.lastName) {
    errors.push('Debe ingresar al menos el nombre o apellido')
  }
  
  // Validar fechas lógicas
  if (data.birthDate && data.deathDate) {
    const birthDate = new Date(data.birthDate)
    const deathDate = new Date(data.deathDate)
    if (deathDate < birthDate) {
      errors.push('La fecha de muerte no puede ser anterior a la fecha de nacimiento')
    }
  }
  
  // Validar URLs en links
  data.links.forEach((link, index) => {
    if (!isValidUrl(link.url)) {
      errors.push(`El enlace #${index + 1} tiene una URL inválida`)
    }
  })
  
  return errors
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}
```

#### Manejo de Links
```typescript
export function addNewPersonLink(currentLinks: PersonLink[]): PersonLink[] {
  const newLink: PersonLink = {
    type: 'OFFICIAL_WEBSITE',
    url: '',
    title: '',
    displayOrder: currentLinks.length,
    isVerified: false,
    isActive: true
  }
  return [...currentLinks, newLink]
}

export function updatePersonLink(
  links: PersonLink[], 
  index: number, 
  updates: Partial<PersonLink>
): PersonLink[] {
  return links.map((link, i) => 
    i === index ? { ...link, ...updates } : link
  )
}

export function removePersonLink(links: PersonLink[], index: number): PersonLink[] {
  return links
    .filter((_, i) => i !== index)
    .map((link, i) => ({ ...link, displayOrder: i }))
}

export function sortPersonLinks(links: PersonLink[]): PersonLink[] {
  return [...links].sort((a, b) => a.displayOrder - b.displayOrder)
}
```

#### Cálculos
```typescript
export function calculateAge(
  birthDate: PartialDate, 
  deathDate?: PartialDate
): number | null {
  if (!birthDate.year) return null
  
  const endDate = deathDate || {
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    day: new Date().getDate()
  }
  
  if (!endDate.year) return null
  
  let age = endDate.year - birthDate.year
  
  // Ajustar si no ha llegado el cumpleaños
  if (birthDate.month && endDate.month) {
    if (endDate.month < birthDate.month) {
      age--
    } else if (endDate.month === birthDate.month && birthDate.day && endDate.day) {
      if (endDate.day < birthDate.day) {
        age--
      }
    }
  }
  
  return age
}

export function getPersonSummary(person: Person): string {
  const parts: string[] = []
  
  if (person.birthYear) {
    parts.push(`n. ${person.birthYear}`)
  }
  
  if (person.deathYear) {
    parts.push(`f. ${person.deathYear}`)
  }
  
  return parts.join(' - ') || 'Fechas desconocidas'
}
```

---

🎯 Componentes Complejos
HomePage - ACTUALIZADO CON SECCIONES DINÁMICAS 🆕
Ubicación: /src/app/page.tsx
El componente de la página principal ahora incluye secciones dinámicas que leen de la base de datos.
Características Nuevas
1. Sección "Últimos Estrenos":

Obtiene películas con fechas de estreno completas (año, mes y día)
Filtra solo películas con fechas pasadas o actuales
Ordena por fecha de estreno descendente (más recientes primero)
Muestra hasta 6 películas
Incluye director (obtenido desde movie_crew con roleId=2)
Muestra géneros de cada película
Formatea fechas usando el sistema de fechas parciales

2. Sección "Próximos Estrenos":

Obtiene películas con fechas futuras
Maneja fechas parciales inteligentemente:

Solo año: considera como 31 de diciembre
Año y mes: considera como último día del mes
Fecha completa: usa la fecha exacta


Ordena por fecha de estreno ascendente (próximas primero)
Muestra hasta 6 películas
Incluye la misma información que últimos estrenos

Implementación
typescript// Función para obtener últimos estrenos
const fetchUltimosEstrenos = async () => {
  const params = {
    limit: '50',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  }
  const response = await fetch(`/api/movies?${new URLSearchParams(params)}`)
  const data = await response.json()
  
  // Filtrar películas con fecha completa y no futura
  const today = new Date()
  const peliculasConFecha = data.movies.filter(movie => 
    movie.releaseYear && movie.releaseMonth && movie.releaseDay &&
    new Date(movie.releaseYear, movie.releaseMonth - 1, movie.releaseDay) <= today
  )
  
  // Ordenar por fecha de estreno
  return peliculasConFecha.sort((a, b) => {
    const dateA = new Date(a.releaseYear, a.releaseMonth - 1, a.releaseDay)
    const dateB = new Date(b.releaseYear, b.releaseMonth - 1, b.releaseDay)
    return dateB - dateA // Descendente
  }).slice(0, 6)
}

// Función para obtener próximos estrenos
const fetchProximosEstrenos = async () => {
  const params = {
    limit: '50',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  }
  const response = await fetch(`/api/movies?${new URLSearchParams(params)}`)
  const data = await response.json()
  
  // Filtrar películas con fechas futuras
  const today = new Date()
  const peliculasFuturas = data.movies.filter(movie => {
    if (!movie.releaseYear) return false
    
    // Calcular fecha efectiva considerando fechas parciales
    const efectiveDate = calcularFechaEfectiva(movie)
    return efectiveDate > today
  })
  
  // Ordenar por fecha efectiva
  return peliculasFuturas.sort((a, b) => {
    const dateA = calcularFechaEfectiva(a)
    const dateB = calcularFechaEfectiva(b)
    return dateA - dateB // Ascendente
  }).slice(0, 6)
}
Utilidades para Fechas Parciales
typescript// Calcular fecha efectiva para ordenamiento
const calcularFechaEfectiva = (movie) => {
  const year = movie.releaseYear
  const month = movie.releaseMonth || 12
  const day = movie.releaseDay || obtenerUltimoDiaDelMes(year, month)
  
  return new Date(year, month - 1, day)
}

// Obtener último día del mes
const obtenerUltimoDiaDelMes = (year: number, month: number): number => {
  return new Date(year, month, 0).getDate()
}

// Obtener director desde crew
const obtenerDirector = (movie) => {
  const director = movie.crew?.find(member => 
    member.roleId === 2 || 
    member.role?.toLowerCase() === 'director' ||
    member.role?.toLowerCase() === 'dirección'
  )
  
  if (director?.person) {
    const { firstName, lastName } = director.person
    return [firstName, lastName].filter(Boolean).join(' ')
  }
  return null
}

### MovieModal - **COMPLETAMENTE REFACTORIZADO**

**Ubicación**: `/src/components/admin/movies/MovieModal/index.tsx`

El componente que experimentó la **refactorización más grande del proyecto**.

#### Transformación Épica

**ANTES (Props Drilling Extremo):**
```typescript
interface MovieModalProps {
  isOpen: boolean
  onClose: () => void
  editingMovie: Movie | null
  onSubmit: (data: MovieFormData) => Promise<void>
  isSubmitting: boolean
  
  // Props del formulario (6 métodos)
  register: UseFormRegister<MovieFormData>
  handleSubmit: UseFormHandleSubmit<MovieFormData>
  watch: UseFormWatch<MovieFormData>
  setValue: UseFormSetValue<MovieFormData>
  reset: UseFormReset<MovieFormData>
  errors: FieldErrors<MovieFormData>
  
  // Estados de UI (4)
  activeTab: string
  setActiveTab: (tab: string) => void
  isPartialDate: boolean
  setIsPartialDate: (value: boolean) => void
  partialReleaseDate: PartialReleaseDate
  setPartialReleaseDate: (value: PartialReleaseDate) => void
  tipoDuracionDisabled: boolean
  
  // Estados de fechas de rodaje (6)
  isPartialFilmingStartDate: boolean
  setIsPartialFilmingStartDate: (value: boolean) => void
  partialFilmingStartDate: PartialFilmingDate
  setPartialFilmingStartDate: (value: PartialFilmingDate) => void
  isPartialFilmingEndDate: boolean
  setIsPartialFilmingEndDate: (value: boolean) => void
  partialFilmingEndDate: PartialFilmingDate
  setPartialFilmingEndDate: (value: PartialFilmingDate) => void
  
  // Metadata (2)
  availableRatings: any[]
  availableColorTypes: any[]
  
  // Datos iniciales (3)
  movieFormInitialData: any
  alternativeTitles: any[]
  setAlternativeTitles: (titles: any[]) => void
  movieLinks: any[]
  
  // Callbacks para relaciones (9)
  handleGenresChange: (genres: number[]) => void
  handleCastChange: (cast: any[]) => void
  handleCrewChange: (crew: any[]) => void
  handleCountriesChange: (countries: number[]) => void
  handleProductionCompaniesChange: (companies: number[]) => void
  handleDistributionCompaniesChange: (companies: number[]) => void
  handleThemesChange: (themes: number[]) => void
  handleScreeningVenuesChange: (venues: number[]) => void
  handleLinksChange: (links: any[]) => void
}

// Total: 46+ props pasándose manualmente a cada tab
```

**DESPUÉS (Context API):**
```typescript
interface MovieModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function MovieModal({ isOpen, onClose }: MovieModalProps) {
  // ✅ Solo obtener lo necesario del Context
  const {
    handleSubmit,
    activeTab,
    setActiveTab,
    isSubmitting,
    onSubmit
  } = useMovieModalContext()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <MovieModalHeader onClose={onClose} />

        <form onSubmit={handleSubmit(onSubmit)} className="overflow-y-auto max-h-[calc(90vh-8rem)]">
          <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="w-full">
            <MovieModalTabs activeTab={activeTab} onTabChange={setActiveTab} />

            <div className="p-6">
              <Tabs.Content value="basic">
                <BasicInfoTab />  {/* ✅ SIN PROPS */}
              </Tabs.Content>
              <Tabs.Content value="media">
                <MediaTab />      {/* ✅ SIN PROPS */}
              </Tabs.Content>
              <Tabs.Content value="cast">
                <CastTab />       {/* ✅ SIN PROPS */}
              </Tabs.Content>
              <Tabs.Content value="crew">
                <CrewTab />       {/* ✅ SIN PROPS */}
              </Tabs.Content>
              <Tabs.Content value="advanced">
                <AdvancedTab />   {/* ✅ SIN PROPS */}
              </Tabs.Content>
            </div>
          </Tabs.Root>

          <MovieModalFooter onCancel={onClose} />
        </form>
      </div>
    </div>
  )
}
```

#### Estadísticas de la Refactorización

- **Props eliminadas**: 46+ props → 2 props (96% reducción)
- **Archivos modificados**: 11 archivos
- **Líneas de código reducidas**: ~300+ líneas
- **Interfaces eliminadas**: 9 interfaces completas
- **Complejidad**: Drásticamente simplificada
- **Mantenibilidad**: Exponencialmente mejorada

#### Arquitectura de Tabs Refactorizada

**Todos los tabs ahora siguen este patrón:**

```typescript
// ✅ DESPUÉS: Patrón unificado para todos los tabs
export default function BasicInfoTab() {
  const {
    register,
    watch,
    setValue,
    formState,
    isPartialDate,
    setIsPartialDate,
    partialReleaseDate,
    setPartialReleaseDate,
    isPartialFilmingStartDate,
    setIsPartialFilmingStartDate,
    partialFilmingStartDate,
    setPartialFilmingStartDate,
    isPartialFilmingEndDate,
    setIsPartialFilmingEndDate,
    partialFilmingEndDate,
    setPartialFilmingEndDate,
    availableRatings,
    availableColorTypes,
    handleGenresChange,
    handleCountriesChange,
    handleThemesChange,
    movieFormInitialData,
    editingMovie,
    // ... todos los datos necesarios sin props
  } = useMovieModalContext()

  const errors = formState?.errors || {}
  const editingMovieId = editingMovie?.id

  return (
    <div className="space-y-6">
      {/* Información básica */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Título *
          </label>
          <input
            type="text"
            {...register('title')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          />
          {errors.title && (
            <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
          )}
        </div>
        
        {/* ... resto de campos */}
      </div>
      
      {/* Sistema de fechas parciales */}
      <PartialDateSection
        label="Fecha de estreno"
        isPartial={isPartialDate}
        onPartialChange={setIsPartialDate}
        partialDate={partialReleaseDate}
        onPartialDateChange={setPartialReleaseDate}
        register={register}
        fieldName="releaseDate"
        errors={errors}
      />
      
      {/* ... resto del componente */}
    </div>
  )
}
```

#### Estructura del Componente

```
MovieModal/
├── index.tsx                 # Componente principal (2 props)
├── MovieModalHeader.tsx      # Header con título y botón cerrar
├── MovieModalTabs.tsx        # Navegación entre tabs
├── MovieModalFooter.tsx      # Botones de acción y errores
└── tabs/
    ├── BasicInfoTab.tsx      # Información principal y fechas (0 props)
    ├── MediaTab.tsx          # Imágenes y videos (0 props)
    ├── CastTab.tsx           # Gestión del elenco (0 props)
    ├── CrewTab.tsx           # Equipo técnico (0 props)
    └── AdvancedTab.tsx      # Metadata y configuración avanzada (0 props)
```

---