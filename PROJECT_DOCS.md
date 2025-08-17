# Documentación del Proyecto CineNacional

## 📋 Índice
1. [Descripción General](#descripción-general)
2. [Stack Tecnológico](#stack-tecnológico)
3. [Arquitectura del Proyecto](#arquitectura-del-proyecto)
4. [Estructura de Carpetas](#estructura-de-carpetas)
5. [Base de Datos](#base-de-datos)
6. [Módulos Principales](#módulos-principales)
7. [Sistema de Fechas Parciales](#sistema-de-fechas-parciales)
8. [Hooks Personalizados](#hooks-personalizados)
9. [Capa de Servicios](#capa-de-servicios)
10. [Tipos TypeScript](#tipos-typescript)
11. [API Routes](#api-routes)
12. [Funciones de Utilidad](#funciones-de-utilidad)
13. [Componentes Complejos](#componentes-complejos)
14. [Flujos de Trabajo](#flujos-de-trabajo)
15. [Scripts y Comandos](#scripts-y-comandos)
16. [Estado de Migración](#estado-de-migración)

---

## 📝 Descripción General

CineNacional es una plataforma web integral para catalogar, gestionar y consultar información sobre cine argentino. El proyecto está en proceso de migración desde WordPress a un stack moderno basado en Next.js con TypeScript.

### URLs del Proyecto
- **Producción**: https://cinenacional.vercel.app/
- **GitHub**: https://github.com/diegopapic/cinenacional
- **Base de datos original (WordPress)**: Google Drive con MySQL dumps

---

## 🛠 Stack Tecnológico

### Dependencias Principales

#### Frontend & Framework
- **Next.js**: 14.2.13 (App Router)
- **React**: 18.3.0
- **TypeScript**: 5.3.0

#### UI & Estilos
- **Tailwind CSS**: 3.4.13
- **Radix UI**: Componentes headless accesibles
  - Dialog, Select, Tabs
- **Lucide React**: 0.513.0 (iconos)
- **clsx** + **tailwind-merge**: Utilidades de clases CSS

#### Formularios y Validación
- **React Hook Form**: 7.57.0
- **Zod**: 3.25.57 (esquemas de validación)
- **@hookform/resolvers**: 5.1.1

#### Base de Datos
- **Prisma**: 6.9.0 (ORM)
- **@prisma/client**: 6.9.0
- **PostgreSQL** via Supabase
- **mysql2**: 3.14.3 (para migración desde WordPress)

#### Servicios y APIs
- **Supabase**: 2.53.0 (backend as a service)
- **Axios**: 1.9.0 (HTTP client)
- **@tanstack/react-query**: 5.80.6 (gestión de estado del servidor)

#### Multimedia
- **next-cloudinary**: 6.16.0 (gestión de imágenes)

#### Utilidades
- **date-fns**: 4.1.0 (manejo de fechas)
- **lodash**: 4.17.21 (utilidades JS)
- **react-hot-toast**: 2.5.2 (notificaciones)
- **php-unserialize**: 0.0.1 (para migración desde WordPress)

### Herramientas de Desarrollo
- **Husky**: 9.1.7 (Git hooks)
- **ESLint**: 8.57.0
- **dotenv-cli**: 8.0.0
- **ts-node**: 10.9.2

---

## 🏗 Arquitectura del Proyecto

### Patrón de Arquitectura
El proyecto sigue una arquitectura de capas con separación clara de responsabilidades:

```
┌───────────────────────────────────────┐
│     Capa de Presentación (UI)       │
│   Components + Pages (App Router)    │
├───────────────────────────────────────┤
│    Capa de Lógica de Negocio        │
│    Services + Hooks + Utilities      │
├───────────────────────────────────────┤
│      Capa de Acceso a Datos         │
│    API Routes + Prisma ORM          │
├───────────────────────────────────────┤
│         Base de Datos               │
│    PostgreSQL (Supabase)            │
└───────────────────────────────────────┘
```

### Flujo de Datos
1. **UI Components** → Capturan input del usuario
2. **Custom Hooks** → Manejan estado y lógica de UI
3. **Services** → Formatean y envían datos a la API
4. **API Routes** → Validan y procesan requests
5. **Prisma ORM** → Ejecuta queries en PostgreSQL
6. **PostgreSQL** → Almacena datos persistentes

---

## 📁 Estructura de Carpetas

```
cinenacional/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── admin/             # Panel de administración (privado)
│   │   │   ├── movies/        # Gestión de películas
│   │   │   ├── people/        # Gestión de personas
│   │   │   ├── genres/        # Gestión de géneros
│   │   │   ├── locations/     # Gestión de ubicaciones
│   │   │   ├── themes/        # Gestión de temas
│   │   │   ├── calificaciones/# Gestión de ratings
│   │   │   ├── countries/     # Gestión de países
│   │   │   └── screening-venues/ # Gestión de salas/plataformas
│   │   ├── api/              # API Routes
│   │   │   ├── movies/[id]/  # CRUD de películas
│   │   │   ├── people/[id]/  # CRUD de personas
│   │   │   ├── genres/[id]/  # CRUD de géneros
│   │   │   ├── locations/    # Endpoints de ubicaciones
│   │   │   │   ├── tree/     # Árbol jerárquico
│   │   │   │   └── search/   # Búsqueda de ubicaciones
│   │   │   └── ...           # Otros endpoints
│   │   ├── listados/         # Listados públicos
│   │   │   ├── peliculas/    # Catálogo de películas
│   │   │   └── personas/     # Directorio de personas
│   │   ├── peliculas/[slug]/ # Página pública de película
│   │   └── personas/[slug]/  # Página pública de persona
│   │
│   ├── components/           
│   │   ├── admin/            # Componentes del admin
│   │   │   ├── movies/       
│   │   │   │   └── MovieModal/  # Modal complejo con tabs
│   │   │   │       ├── tabs/    # BasicInfo, Cast, Crew, Media, Advanced
│   │   │   │       └── ...      # Header, Footer, etc.
│   │   │   ├── people/       
│   │   │   │   └── PersonFormFields/ # Campos del formulario
│   │   │   └── locations/    # Tree view de ubicaciones
│   │   ├── layout/           # Header, Footer globales
│   │   └── movies/           # Componentes públicos
│   │
│   ├── hooks/                # Custom React Hooks
│   │   ├── useMovieForm.ts   # Lógica del form de películas
│   │   ├── usePeople.ts      # Gestión de personas
│   │   ├── usePeopleForm.ts  # Lógica del form de personas
│   │   └── useDebounce.ts    # Utilidad de debounce
│   │
│   ├── lib/                  
│   │   ├── movies/           # Dominio de películas
│   │   │   ├── movieTypes.ts # Tipos TypeScript
│   │   │   ├── movieConstants.ts # Constantes
│   │   │   └── movieUtils.ts # Utilidades
│   │   ├── people/           # Dominio de personas
│   │   │   ├── peopleTypes.ts
│   │   │   ├── peopleConstants.ts
│   │   │   └── peopleUtils.ts
│   │   ├── shared/           # Código compartido
│   │   │   └── dateUtils.ts # Sistema de fechas parciales
│   │   ├── utils/            
│   │   │   └── slugs.ts     # Generación de slugs
│   │   ├── prisma.ts        # Cliente Prisma singleton
│   │   ├── schemas.ts       # Esquemas Zod
│   │   └── utils.ts         # Utilidades generales
│   │
│   └── services/             # Capa de servicios
│       ├── api-client.ts     # Cliente HTTP base
│       ├── movies.service.ts # Servicio de películas
│       ├── people.service.ts # Servicio de personas
│       ├── metadata.service.ts # Servicio de metadata
│       └── index.ts          # Barrel export
│
├── prisma/
│   └── schema.prisma         # Esquema de base de datos
├── scripts/                  # Scripts de utilidad
├── public/                   # Archivos estáticos
└── [archivos de config]      # package.json, tsconfig, etc.
```

---

## 🗄 Base de Datos

### Esquema Principal

#### Entidades Principales (16 tablas)

**Contenido Principal:**
- `movies` - Películas con información completa
- `people` - Personas (actores, directores, etc.)
- `genres` - Géneros cinematográficos
- `themes` - Temas y tags
- `locations` - Ubicaciones jerárquicas
- `countries` - Países
- `languages` - Idiomas

**Entidades de Producción:**
- `production_companies` - Productoras
- `distribution_companies` - Distribuidoras
- `screening_venues` - Salas de cine y plataformas
- `ratings` - Calificaciones por edad
- `color_types` - Tipos de color (B&N, Color, etc.)
- `awards` - Premios

**Usuarios:**
- `users` - Usuarios del sistema
- `user_ratings` - Calificaciones de usuarios
- `user_watchlist` - Lista de películas por ver
- `user_watched` - Películas vistas

#### Tablas de Relación (15 tablas)

**Relaciones de Películas:**
- `movie_cast` - Elenco
- `movie_crew` - Equipo técnico
- `movie_genres` - Géneros por película
- `movie_themes` - Temas por película
- `movie_countries` - Países de producción
- `movie_production_companies` - Productoras
- `movie_distribution_companies` - Distribuidoras
- `movie_screenings` - Proyecciones y estrenos
- `movie_awards` - Premios de películas
- `movie_links` - Enlaces externos
- `movie_alternative_titles` - Títulos alternativos
- `movie_images` - Imágenes y fotos
- `movie_videos` - Videos y trailers

**Relaciones de Personas:**
- `person_nationalities` - Nacionalidades
- `person_links` - Enlaces externos

### Características Especiales del Schema

#### Sistema de Fechas Parciales
Tanto películas como personas usan campos separados para fechas:
```prisma
// Películas
releaseYear      Int?
releaseMonth     Int? @db.SmallInt
releaseDay       Int? @db.SmallInt

// Personas
birthYear        Int?
birthMonth       Int? @db.SmallInt
birthDay         Int? @db.SmallInt
```

#### Enums Importantes
- `MovieStage`: COMPLETA, EN_DESARROLLO, EN_RODAJE, etc.
- `DataCompleteness`: Nivel de información cargada
- `Gender`: MALE, FEMALE, OTHER
- `VenueType`: CINEMA, STREAMING, TV_CHANNEL, OTHER
- `PersonLinkType`: 20+ tipos de enlaces
- `LinkType`: Redes sociales para películas
- `ColorCategory`: COLOR, BLACK_AND_WHITE, MIXED, UNKNOWN

#### Índices Optimizados
- Búsquedas por slug, título, año
- Fechas parciales (año, año-mes)
- Relaciones frecuentes
- Campos de filtrado (isActive, stage, etc.)

---

## 🎬 Módulos Principales

### 1. Módulo de Películas

#### Componentes Principales
- **MovieModal** (`/components/admin/movies/MovieModal/`)
  - Sistema de tabs para organizar información
  - Tabs: BasicInfo, Cast, Crew, Media, Advanced
  - Manejo de fechas parciales para estreno y rodaje
  - Integración con Cloudinary para imágenes

#### Características
- ABM completo con validación
- Sistema de títulos alternativos
- Enlaces a redes sociales
- Gestión de elenco y crew con roles
- Múltiples productoras y distribuidoras
- Salas de proyección
- Calificación por edad
- Tipo de color y sonido
- Estado de producción (stage)
- Nivel de completitud de datos

### 2. Módulo de Personas

#### Componentes Principales
- **PersonForm** (`/components/admin/people/`)
  - PersonFormFields/
    - BasicInfoFields (con fechas parciales)
    - BiographyFields
    - LocationFields
    - LinksSection

#### Características
- Fechas parciales de nacimiento/muerte
- Múltiples nacionalidades
- Enlaces externos verificables
- Ubicaciones jerárquicas
- Opción de ocultar edad
- Gestión de enlaces con tipos específicos

### 3. Módulos Auxiliares

- **Géneros**: CRUD simple con slug único
- **Ubicaciones**: Árbol jerárquico (país > provincia > ciudad)
- **Temas**: Tags con contador de uso
- **Calificaciones**: Sistema de ratings por edad
- **Países**: Gestión con código ISO
- **Salas/Plataformas**: Cines físicos y streaming

---

## 📅 Sistema de Fechas Parciales

### Ubicación Central
`/src/lib/shared/dateUtils.ts`

### Problema que Resuelve
Permite almacenar fechas incompletas cuando no se conoce la información exacta:
- Solo año: "1995"
- Año y mes: "Marzo 1995"
- Fecha completa: "15 de marzo de 1995"

### Implementación Completa

#### Interface Base
```typescript
export interface PartialDate {
  year: number | null;
  month: number | null;
  day: number | null;
}
```

#### Funciones Principales

**Conversión de Fechas**
```typescript
// ISO String → PartialDate
dateToPartialFields(dateString: string): PartialDate
// Extrae año, mes y día de una fecha ISO

// PartialDate → ISO String
partialFieldsToDate(partial: PartialDate): string | null
// Solo retorna si la fecha está completa (año, mes Y día)
```

**Formateo para Display**
```typescript
formatPartialDate(partial: PartialDate, options): string
// Opciones:
// - monthFormat: 'short' | 'long'
// - includeDay: boolean
// - fallback: string

// Ejemplos de salida:
// "1995" (solo año)
// "Marzo de 1995" (año y mes)
// "15 de marzo de 1995" (fecha completa)
```

**Validación**
```typescript
validatePartialDate(partial: PartialDate, options): string | null
// Opciones:
// - minYear: número mínimo de año (default: 1800)
// - maxYear: número máximo de año
// - allowFuture: permitir fechas futuras
// - fieldName: nombre del campo para mensajes

// Validaciones:
// - Año requerido si hay mes o día
// - Mes requerido si hay día
// - Rango de año válido
// - Mes entre 1-12
// - Día válido para el mes
```

**Comparación y Cálculos**
```typescript
// Compara dos fechas parciales
comparePartialDates(date1: PartialDate, date2: PartialDate): number | null
// Retorna: -1 (date1 < date2), 0 (iguales), 1 (date1 > date2)

// Calcula años entre fechas
calculateYearsBetween(startDate: PartialDate, endDate?: PartialDate): number | null
// Si no se proporciona endDate, usa la fecha actual

// Valida un rango de fechas
validateDateRange(startDate: PartialDate, endDate: PartialDate): string | null
```

**Utilidades Helper**
```typescript
// Crea PartialDate desde valores de formulario
createPartialDate(year: any, month: any, day: any): PartialDate

// Verifica si está completa
isCompleteDate(partial: PartialDate): boolean

// Verifica si está vacía
isEmptyDate(partial: PartialDate): boolean
```

### Constantes
```typescript
export const MONTHS = [
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  // ... etc
]
```

### Uso en la UI
- Checkbox "Fecha incompleta" para activar modo parcial
- Campos separados para año, mes (dropdown), día
- Validación en tiempo real
- Formateo automático para mostrar

---

## 🪝 Hooks Personalizados

### useMovieForm

**Ubicación**: `/src/hooks/useMovieForm.ts` (514 líneas)

Hook principal para gestión de formularios de películas. Orquesta toda la lógica del MovieModal.

#### Responsabilidades
- Gestión de estado del formulario con React Hook Form + Zod
- Manejo de 3 sistemas de fechas parciales independientes
- Auto-cálculo de tipo de duración
- Gestión de 9 tipos de relaciones N:M
- Carga de metadata (ratings, color types)
- Conversión de datos entre UI y API

#### Interface Principal
```typescript
interface UseMovieFormReturn {
  // Submit handler
  onSubmit: (data: MovieFormData) => Promise<void>
  
  // Estados principales
  activeTab: string
  isPartialDate: boolean
  partialReleaseDate: PartialReleaseDate
  tipoDuracionDisabled: boolean
  alternativeTitles: any[]
  movieLinks: any[]
  
  // Estados de fechas de rodaje
  isPartialFilmingStartDate: boolean
  partialFilmingStartDate: PartialFilmingDate
  isPartialFilmingEndDate: boolean
  partialFilmingEndDate: PartialFilmingDate
  
  // Metadata
  availableRatings: any[]
  availableColorTypes: any[]
  
  // 9 Callbacks para relaciones
  handleGenresChange: (genres: number[]) => void
  handleCastChange: (cast: any[]) => void
  handleCrewChange: (crew: any[]) => void
  handleCountriesChange: (countries: number[]) => void
  handleProductionCompaniesChange: (companies: number[]) => void
  handleDistributionCompaniesChange: (companies: number[]) => void
  handleThemesChange: (themes: number[]) => void
  handleScreeningVenuesChange: (venues: number[]) => void
  handleLinksChange: (links: any[]) => void
  
  // Funciones principales
  loadMovieData: (movie: Movie) => Promise<void>
  resetForNewMovie: () => void
  
  // 14 métodos de React Hook Form
  register, handleSubmit, watch, setValue, reset,
  control, formState, getValues, trigger, clearErrors,
  setError, setFocus, getFieldState, resetField, unregister
}
```

#### Características Especiales

**Sistema de Fechas Parciales Triple**
- Maneja independientemente: releaseDate, filmingStartDate, filmingEndDate
- Cada fecha puede ser: completa (YYYY-MM-DD), parcial (YYYY o YYYY-MM), o vacía
- Conversión automática entre formato ISO y campos separados (year, month, day)

**Auto-cálculo de Duración**
```typescript
// Watcher que observa cambios en duration/durationSeconds
// Calcula automáticamente: CORTOMETRAJE, MEDIOMETRAJE, LARGOMETRAJE
// Bloquea edición manual cuando hay valores
```

**Estado de Relaciones Centralizado**
```typescript
const [movieRelations, setMovieRelations] = useState({
  genres: number[],
  cast: Array<{personId, characterName, billingOrder, isPrincipal}>,
  crew: Array<{personId, role, department, billingOrder}>,
  countries: number[],
  productionCompanies: number[],
  distributionCompanies: number[],
  themes: number[],
  screeningVenues: number[]
})
```

**Proceso de Submit**
1. `prepareMovieData()` - Formatea datos básicos
2. Procesa 3 fechas según tipo (parcial/completa)
3. Elimina campos de fecha del objeto principal
4. Mapea relaciones con metadata específica
5. Maneja screeningVenues con fechas y flags (isPremiere, isExclusive)
6. Envía a servicio con todos los campos INT de fechas

---

### usePeople

**Ubicación**: `/src/hooks/usePeople.ts`

Hook para gestión de listados de personas con paginación, filtros y búsqueda.

#### Interface Principal
```typescript
interface UsePeopleReturn {
  // Datos
  people: PersonWithRelations[]
  totalCount: number
  totalPages: number
  hasMore: boolean
  currentPage: number
  pageSize: number
  
  // Estado
  loading: boolean
  error: Error | null
  filters: PersonFilters
  
  // Acciones principales
  loadPeople: () => Promise<void>
  deletePerson: (id: number) => Promise<void>
  exportToCSV: () => Promise<void>
  
  // Gestión de filtros
  updateFilter: <K>(key: K, value: PersonFilters[K]) => void
  updateFilters: (filters: Partial<PersonFilters>) => void
  resetFilters: () => void
  
  // Navegación
  goToPage: (page: number) => void
  goToNextPage: () => void
  goToPreviousPage: () => void
  canGoNext: boolean
  canGoPrevious: boolean
}
```

#### Características

**Debounce en Búsqueda**
- Retraso de 300ms antes de ejecutar búsqueda
- Evita requests excesivos mientras el usuario escribe

**Paginación Inteligente**
- Reset automático a página 1 cuando cambian filtros
- Cálculo de navegación habilitada/deshabilitada
- Soporte para límite configurable

**Exportación CSV**
- Genera archivo CSV con filtros actuales aplicados
- Descarga automática con nombre timestampeado

#### Hooks Adicionales

**usePeopleSearch**
- Hook especializado para autocomplete
- Búsqueda con debounce de 300ms
- Retorna solo id, name y slug
- Mínimo 2 caracteres para buscar

**usePerson**
- Carga una persona individual por ID
- Soporte para modo "new" (creación)
- Función reload para refrescar datos

---

### usePeopleForm

**Ubicación**: `/src/hooks/usePeopleForm.ts`

Hook para gestión del formulario de personas (crear/editar).

#### Interface Principal
```typescript
interface UsePeopleFormReturn {
  // Estado
  formData: PersonFormData
  loading: boolean
  saving: boolean
  errors: string[]
  isDirty: boolean
  isEdit: boolean
  
  // Acciones de campos
  updateField: <K>(field: K, value: PersonFormData[K]) => void
  updateFields: (updates: Partial<PersonFormData>) => void
  
  // Gestión de links
  addLink: () => void
  updateLink: (index: number, updates: Partial<PersonLink>) => void
  removeLink: (index: number) => void
  
  // Acciones principales
  save: () => Promise<boolean>
  reset: () => void
  cancel: () => void
  reload: () => Promise<void>
}
```

#### Características

**Gestión de Estado**
- Control de cambios (isDirty) para advertir pérdida de datos
- Limpieza automática de errores al modificar campos
- Diferenciación entre modo creación y edición

**Manejo de Links**
- Array dinámico de enlaces externos
- Funciones helper para agregar, actualizar y eliminar
- Validación de tipos de enlaces

**Validación y Guardado**
- Validación frontend antes de enviar
- Mensajes de error/éxito específicos
- Redirección automática tras guardar (configurable)

---

## 🔌 Capa de Servicios

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
    // Fallback a mensaje genérico si falla
  }
  
  // Manejo especial para 204 No Content
  if (response.status === 204) return null as T
  
  return response.json()
}
```

**Construcción de URLs**
```typescript
private buildUrl(endpoint: string, params?: Record<string, string>): string {
  // Construye URL completa con base URL
  // Agrega query params automáticamente
  // Filtra valores null/undefined/empty
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

---

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
}
```

**formatMovieFromAPI()**
```typescript
function formatMovieFromAPI(movie: any): MovieFormData {
  // Convierte datos de la API al formato del formulario
  // Detecta si las fechas son completas o parciales
  // Configura flags isPartial según corresponda
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
- Log de debugging incluido

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

---

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
}
```

**formatPersonFromAPI()**
```typescript
function formatPersonFromAPI(person: any): PersonFormData {
  // Convierte API a formato formulario
  // Detecta fechas completas vs parciales
  // Configura flags isPartial
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

#### Schema de Validación (Zod)
```typescript
export const movieFormSchema = z.object({
  // Campo requerido
  title: z.string().min(1, 'El título es requerido'),
  
  // Campos opcionales con any para flexibilidad
  originalTitle: z.any().optional(),
  synopsis: z.any().optional(),
  
  // Campos numéricos
  year: z.any().optional(),
  duration: z.any().optional(),
  ratingId: z.union([z.number(), z.null()]).optional(),
  
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
  ]).optional()
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
  duration?: number
  rating?: number
  posterUrl?: string
  status: string
  stage?: string
  filmingStartDate: string
  filmingEndDate: string
  dataCompleteness?: string
  genres: Array<{ id: number; name: string }>
  directors: Array<{ id: number; name: string }>
  mainCast: Array<{
    person: { id: number; name: string }
    character?: string
  }>
  country: string
}
```

**MovieRelations**
```typescript
interface MovieRelations {
  genres: number[]
  cast: any[]
  crew: any[]
  countries: number[]
  productionCompanies: number[]
  distributionCompanies: number[]
  themes: number[]
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

---

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
  deathDate?: string | null
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

#### POST /api/movies

Crea una nueva película.

**Request Body:**
```json
{
  "title": "string (required)",
  "year": 2024,
  "releaseYear": 2024,
  "releaseMonth": 3,
  "releaseDay": 15,
  "duration": 120,
  "synopsis": "string",
  "stage": "COMPLETA",
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
    "department": "Dirección",
    "billingOrder": 1
  }],
  "alternativeTitles": [{
    "title": "string",
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
- Equipo técnico
- Países
- Productoras y distribuidoras
- Imágenes y videos
- Premios
- Temas
- Enlaces
- Proyecciones

#### PUT /api/movies/[id]

Actualiza una película existente.

**Request Body:** Mismo formato que POST

**Características especiales:**
- Usa transacción para actualizar todas las relaciones
- Elimina y recrea relaciones para evitar duplicados
- Maneja campos de rating y colorType con disconnect/connect
- Timeout de transacción: 30 segundos

#### DELETE /api/movies/[id]

Elimina una película y todas sus relaciones (cascada).

---

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

---

## 🧰 Funciones de Utilidad

### Movie Utils

**Ubicación**: `/src/lib/movies/movieUtils.ts`

#### Cálculo de Duración
```typescript
calcularTipoDuracion(minutos: number, segundos?: number): string
// Retorna: 'largometraje' | 'mediometraje' | 'cortometraje'
// Thresholds:
// - largometraje: >= 60 minutos
// - mediometraje: >= 30 minutos
// - cortometraje: < 30 minutos
```

#### Preparación de Datos
```typescript
prepareMovieData(data: MovieFormData): any
// Limpia y prepara datos del formulario
// - Convierte strings vacíos a undefined
// - Parsea campos numéricos
// - Valida URLs
// - Establece valores por defecto
```

#### Utilidades de Display
```typescript
getCompletenessLabel(completeness: string): string
// Retorna label legible para nivel de completitud

getCompletenessColor(completeness: string): string
// Retorna clases CSS para el badge de completitud

getStageColor(stage?: string): string
// Retorna clases CSS para el badge de etapa

getStageName(stage?: string): string
// Retorna nombre legible de la etapa
```

#### Manejo de Fechas
```typescript
buildReleaseDateData(
  isPartialDate: boolean,
  releaseDate?: string,
  partialReleaseDate?: PartialDate
): ReleaseDateData
// Construye objeto con year, month, day según tipo de fecha
```

---

### People Utils

**Ubicación**: `/src/lib/people/peopleUtils.ts`

#### Generación de Slugs
```typescript
generatePersonSlug(firstName?: string, lastName?: string): string
// Genera slug único desde nombre
// - Normaliza caracteres (elimina acentos)
// - Reemplaza espacios con guiones
// - Elimina caracteres especiales
```

#### Formateo
```typescript
formatPersonName(person: Partial<Person>): string
// Combina firstName y lastName

formatGender(gender?: Gender): string
// Convierte enum a texto legible

formatBirthInfo(person: Person): string
// Formatea fecha de nacimiento con edad calculada
// Respeta hideAge flag
```

#### Conversión de Datos
```typescript
formatPersonFormDataForAPI(data: PersonFormData): any
// Prepara datos del formulario para API

formatPersonDataForForm(person?: PersonWithRelations): PersonFormData
// Convierte datos de API a formato de formulario
```

#### Validación
```typescript
validatePersonForm(data: PersonFormData): string[]
// Valida:
// - Presencia de nombre o apellido
// - Fechas lógicas (muerte > nacimiento)
// - URLs válidas en links

isValidUrl(url: string): boolean
// Valida formato de URL
```

#### Manejo de Links
```typescript
addNewPersonLink(currentLinks: PersonLink[]): PersonLink[]
// Agrega nuevo link con valores por defecto

updatePersonLink(links: PersonLink[], index: number, updates: Partial<PersonLink>): PersonLink[]
// Actualiza link específico

removePersonLink(links: PersonLink[], index: number): PersonLink[]
// Elimina link y reordena displayOrder

sortPersonLinks(links: PersonLink[]): PersonLink[]
// Ordena por displayOrder
```

#### Cálculos
```typescript
calculateAge(birthDate: Date, deathDate?: Date): number
// Calcula edad actual o al momento de muerte

getPersonSummary(person: Person): string
// Genera resumen breve (ej: "n. 1980 - f. 2020")
```

---

## 🎯 Componentes Complejos

### MovieModal

**Ubicación**: `/src/components/admin/movies/MovieModal/index.tsx`

El componente más complejo del sistema, maneja la creación y edición completa de películas con 46 props.

#### Estructura del Componente

```
MovieModal/
├── index.tsx                 # Componente principal orquestador
├── MovieModalHeader.tsx      # Header con título y botón cerrar
├── MovieModalTabs.tsx        # Navegación entre tabs
├── MovieModalFooter.tsx      # Botones de acción y errores
└── tabs/
    ├── BasicInfoTab.tsx      # Información principal y fechas
    ├── MediaTab.tsx          # Imágenes y videos
    ├── CastTab.tsx           # Gestión del elenco
    ├── CrewTab.tsx           # Equipo técnico
    └── AdvancedTab.tsx      # Metadata y configuración avanzada
```

#### Props del MovieModal (46 props)

```typescript
interface MovieModalProps {
  // Control del modal
  isOpen: boolean
  onClose: () => void
  editingMovie: Movie | null
  onSubmit: (data: MovieFormData) => Promise<void>
  isSubmitting: boolean

  // React Hook Form (6 métodos)
  register: UseFormRegister<MovieFormData>
  handleSubmit: UseFormHandleSubmit<MovieFormData>
  watch: UseFormWatch<MovieFormData>
  setValue: UseFormSetValue<MovieFormData>
  reset: UseFormReset<MovieFormData>
  errors: FieldErrors<MovieFormData>

  // Estados de UI (2)
  activeTab: string
  setActiveTab: (tab: string) => void
  
  // Fecha de estreno (4)
  isPartialDate: boolean
  setIsPartialDate: (value: boolean) => void
  partialReleaseDate: PartialReleaseDate
  setPartialReleaseDate: (value: PartialReleaseDate) => void
  
  // Fechas de rodaje (6)
  isPartialFilmingStartDate: boolean
  setIsPartialFilmingStartDate: (value: boolean) => void
  partialFilmingStartDate: PartialFilmingDate
  setPartialFilmingStartDate: (value: PartialFilmingDate) => void
  isPartialFilmingEndDate: boolean
  setIsPartialFilmingEndDate: (value: boolean) => void
  partialFilmingEndDate: PartialFilmingDate
  setPartialFilmingEndDate: (value: PartialFilmingDate) => void
  
  // Estados especiales (1)
  tipoDuracionDisabled: boolean
  
  // Metadata (2)
  availableRatings: any[]
  availableColorTypes: any[]
  
  // Datos iniciales (3)
  movieFormInitialData: any
  alternativeTitles: any[]
  setAlternativeTitles: (titles: any[]) => void
  movieLinks: any[]
  
  // Callbacks de relaciones (9)
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
```

#### Arquitectura de Tabs

**1. BasicInfoTab (19 props)**
- Información principal (título, año, sinopsis)
- Sistema de 3 fechas parciales
- Duración con auto-cálculo de tipo
- Géneros, países y temas
- Enlaces oficiales
- Nivel de completitud de datos

**2. MediaTab**
- Integración con Cloudinary
- Upload de poster y backdrop
- URL del trailer
- Galería de imágenes

**3. CastTab**
- Búsqueda y selección de personas
- Nombre del personaje
- Orden de aparición
- Marcador de rol principal

**4. CrewTab**
- Selección de personas
- Rol específico (Director, Productor, etc.)
- Departamento
- Orden en créditos

**5. AdvancedTab**
- Calificación por edad
- Tipo de color y sonido
- Productoras y distribuidoras
- Títulos alternativos
- Metadata SEO

#### Características del BasicInfoTab

```typescript
// Manejo de fecha parcial de estreno
<div>
  <label className="inline-flex items-center">
    <input
      type="checkbox"
      checked={isPartialDate}
      onChange={(e) => setIsPartialDate(e.target.checked)}
    />
    <span className="ml-2">Fecha incompleta</span>
  </label>
</div>

{!isPartialDate ? (
  // Input de fecha completa
  <input type="date" {...register('releaseDate')} />
) : (
  // Inputs separados para fecha parcial
  <div className="flex gap-2">
    <input type="number" placeholder="Año" />
    <select>
      <option value="">Mes</option>
      {MONTHS.map(month => (
        <option key={month.value} value={month.value}>
          {month.label}
        </option>
      ))}
    </select>
  </div>
)}
```

#### Sistema de Duración Auto-calculada

```typescript
// En el BasicInfoTab
<div>
  <label>
    Tipo de duración
    {tipoDuracionDisabled && (
      <span className="ml-2 text-xs text-green-600">
        (Calculado automáticamente)
      </span>
    )}
  </label>
  <select
    {...register('tipoDuracion')}
    disabled={tipoDuracionDisabled}
    className={tipoDuracionDisabled ? 'bg-gray-100' : ''}
  >
    {TIPOS_DURACION.map((tipo) => (
      <option key={tipo.value} value={tipo.value}>
        {tipo.label}
      </option>
    ))}
  </select>
</div>
```

#### Integración con MovieFormEnhanced

El BasicInfoTab utiliza el componente `MovieFormEnhanced` para manejar relaciones complejas:

```typescript
<MovieFormEnhanced
  key={editingMovieId || 'new'}
  onGenresChange={handleGenresChange}
  onCountriesChange={handleCountriesChange}
  onThemesChange={handleThemesChange}
  onScreeningVenuesChange={handleScreeningVenuesChange}
  initialData={movieFormInitialData}
  showOnlyBasicInfo={true}  // Solo muestra campos básicos
/>
```

#### Patrón de Composición

```typescript
// El modal principal orquesta todos los tabs
<Tabs.Root value={activeTab} onValueChange={setActiveTab}>
  <MovieModalTabs activeTab={activeTab} onTabChange={setActiveTab} />
  
  <div className="p-6">
    <Tabs.Content value="basic">
      <BasicInfoTab {...basicInfoProps} />
    </Tabs.Content>
    
    <Tabs.Content value="media">
      <MediaTab {...mediaProps} />
    </Tabs.Content>
    
    <Tabs.Content value="cast">
      <CastTab {...castProps} />
    </Tabs.Content>
    
    <Tabs.Content value="crew">
      <CrewTab {...crewProps} />
    </Tabs.Content>
    
    <Tabs.Content value="advanced">
      <AdvancedTab {...advancedProps} />
    </Tabs.Content>
  </div>
</Tabs.Root>
```

#### Problemas del Diseño Actual

**1. Props Drilling Masivo**
- 46 props pasadas desde el componente padre
- Cada tab recibe entre 10-20 props
- Dificulta el mantenimiento y testing

**2. Acoplamiento Fuerte**
- El modal depende directamente de useMovieForm
- Los tabs no pueden funcionar independientemente
- Difícil de reutilizar en otros contextos

**3. Complejidad de Estado**
- 3 sistemas de fechas parciales independientes
- 9 callbacks para manejar relaciones
- Estados duplicados entre tabs

#### Solución Propuesta: Context Pattern

```typescript
// MovieModalContext.tsx
const MovieModalContext = createContext<MovieModalContextType>()

export function MovieModalProvider({ children, ...props }) {
  const movieForm = useMovieForm(props)
  
  return (
    <MovieModalContext.Provider value={movieForm}>
      {children}
    </MovieModalContext.Provider>
  )
}

// Uso simplificado
<MovieModalProvider editingMovie={movie} onSuccess={handleSuccess}>
  <MovieModal /> {/* Sin props! */}
</MovieModalProvider>

// Dentro de cada tab
function BasicInfoTab() {
  const { register, watch, errors, ... } = useMovieModalContext()
  // Acceso directo al contexto sin props
}
```

#### Optimizaciones Potenciales

**1. Lazy Loading de Tabs**
```typescript
const CastTab = lazy(() => import('./tabs/CastTab'))
const CrewTab = lazy(() => import('./tabs/CrewTab'))

// Cargar solo cuando se necesita
<Suspense fallback={<TabLoader />}>
  <CastTab />
</Suspense>
```

**2. Memoización de Props**
```typescript
const basicInfoProps = useMemo(() => ({
  register,
  watch,
  errors,
  // ... otras props
}), [register, watch, errors])
```

**3. División de Responsabilidades**
```typescript
// Separar lógica de fechas en un hook dedicado
function usePartialDateField(fieldName: string) {
  const [isPartial, setIsPartial] = useState(false)
  const [partialDate, setPartialDate] = useState<PartialDate>({})
  
  // Toda la lógica de fechas parciales
  return { isPartial, setIsPartial, partialDate, setPartialDate }
}

// Usar en el componente
const releaseDate = usePartialDateField('releaseDate')
const filmingStartDate = usePartialDateField('filmingStartDate')
const filmingEndDate = usePartialDateField('filmingEndDate')
```

---

### MovieLinksManager

Componente para gestionar enlaces externos de películas con validación y tipos específicos.

#### Características
- Array dinámico de enlaces
- Validación de URLs en tiempo real
- Tipos predefinidos (IMDB, YouTube, Facebook, etc.)
- Ordenamiento drag & drop (si está implementado)
- Preview de enlaces

---

### MovieFormEnhanced

Componente wrapper que mejora el formulario básico con funcionalidades adicionales.

#### Props Principales
```typescript
interface MovieFormEnhancedProps {
  onGenresChange: (genres: number[]) => void
  onCountriesChange: (countries: number[]) => void
  onThemesChange: (themes: number[]) => void
  onScreeningVenuesChange: (venues: number[]) => void
  initialData?: any
  showOnlyBasicInfo?: boolean
}
```

#### Características
- Selectores múltiples con búsqueda
- Carga async de opciones
- Validación de selecciones
- Modo básico vs completo

---

## 🔄 Flujos de Trabajo y Patrones

### Arquitectura de Comunicación

```
Frontend (React)
    ↔
Services Layer (TypeScript)
    ↔
API Client (Singleton)
    ↔
API Routes (Next.js)
    ↔
Prisma ORM
    ↔
PostgreSQL (Supabase)
```

### Flujo Completo: Crear/Editar Película

```
1. MovieModal Component (46 props)
   ↔
2. useMovieForm Hook maneja:
   - React Hook Form + Zod validation
   - 3 estados de fechas parciales
   - Auto-cálculo tipo duración
   - Carga async de metadata
   - 9 callbacks para relaciones
   ↔
3. Tabs del formulario:
   - BasicInfoTab: Info + fechas parciales
   - MediaTab: Cloudinary integration
   - CastTab: Relaciones N:M con personas
   - CrewTab: Roles técnicos
   - AdvancedTab: Metadata, ratings, etc.
   ↔
4. onSubmit procesa:
   - prepareMovieData() formatea datos
   - Convierte fechas según tipo (parcial/completa)
   - Mapea relaciones (genres, cast, crew, etc.)
   ↔
5. moviesService.create/update():
   - formatMovieDataForAPI() final
   - Envía a API con fechas como INT separados
   ↔
6. API Route (/api/movies):
   - Valida con movieSchema (Zod)
   - Genera slug único
   - Crea con transacción Prisma
   - Incluye todas las relaciones
   ↔
7. Respuesta incluye relaciones pobladas
```

### Flujo: Sistema de Fechas Parciales

```typescript
// 1. UI detecta checkbox "Fecha incompleta"
if (isPartialDate) {
  // Muestra 3 inputs: año | mes | día
  <input value={partialDate.year} />
  <select value={partialDate.month}>MONTHS</select>
  <input value={partialDate.day} /> // opcional
}

// 2. Hook procesa según tipo
if (isPartialDate) {
  data.releaseYear = partialDate.year
  data.releaseMonth = partialDate.month
  data.releaseDay = null // si no hay día
} else if (data.releaseDate) {
  // Convierte fecha ISO a campos
  [year, month, day] = data.releaseDate.split('-')
}

// 3. API guarda en 3 columnas INT
releaseYear: Int?
releaseMonth: Int? @db.SmallInt  
releaseDay: Int? @db.SmallInt

// 4. Al recuperar, detecta tipo
if (movie.releaseDay) {
  // Fecha completa → formato ISO
  setValue('releaseDate', `${year}-${month}-${day}`)
} else if (movie.releaseYear) {
  // Fecha parcial → activa checkbox
  setIsPartialDate(true)
  setPartialReleaseDate({year, month, day: null})
}
```

### Patrón de Validación

```typescript
// Schema Zod flexible
movieSchema = z.object({
  title: z.string().min(1), // Único requerido
  // Resto opcional con transformaciones
  ratingId: z.union([
    z.number().
    positive(),
    z.null(),
    z.literal(0).transform(() => null)
  ]).optional()
})

// Validación en cascada:
1. Cliente: React Hook Form + Zod
2. API: Schema validation
3. DB: Constraints de Prisma
```

### Patrón de Servicios

```typescript
// Cada servicio sigue el mismo patrón
export const entityService = {
  // CRUD básico
  getAll(filters): Promise<PaginatedResponse>
  getById(id): Promise<Entity>
  create(data): Promise<Entity>
  update(id, data): Promise<Entity>
  delete(id): Promise<void>
  
  // Búsqueda y validación
  search(query): Promise<SearchResult[]>
  checkSlugAvailability(slug): Promise<boolean>
  
  // Extras específicos
  getStats(): Promise<Stats>
  exportToCSV(filters): Promise<Blob>
  
  // Formateo interno
  formatDataForAPI(data): any
  formatDataFromAPI(data): FormData
}
```

### Manejo de Relaciones N:M

```typescript
// Patrón para películas-géneros
genres: {
  create: genres.map((id, index) => ({
    genreId: id,
    isPrimary: index === 0 // Primero es principal
  }))
}

// Patrón para cast con metadata
cast: {
  create: cast.map(item => ({
    personId: item.personId,
    characterName: item.characterName,
    billingOrder: item.billingOrder,
    isPrincipal: item.isPrincipal
  }))
}
```

---

## 📜 Scripts y Comandos

### Desarrollo
```bash
npm run dev              # Inicia servidor de desarrollo
npm run build           # Build de producción
npm run start           # Inicia servidor de producción
npm run lint            # Ejecuta ESLint
```

### Base de Datos
```bash
npm run db:push         # Push del schema sin migración
npm run db:migrate      # Crear y ejecutar migraciones
npm run db:seed         # Poblar base de datos
npm run db:studio       # Abrir Prisma Studio (GUI)
npm run db:generate     # Generar cliente Prisma
npm run db:reset        # Reset completo de la DB
npm run db:export       # Exportar estructura de DB
```

### Documentación
```bash
npm run compile         # Compila código en un archivo
npm run structure       # Genera estructura del proyecto
npm run update-docs     # Actualiza toda la documentación
```

### Git Hooks (Husky)
```bash
npm run prepare         # Instala hooks de git
npm run precommit      # Ejecuta antes de cada commit
```

---

## 📊 Estado de Migración

### ✅ Completado
- Estructura base del proyecto Next.js
- Sistema de fechas parciales centralizado y documentado
- Esquema de base de datos completo en Prisma
- ABM de películas con todos los campos
- ABM de personas con fechas parciales
- Módulos auxiliares (géneros, ubicaciones, temas, etc.)
- Integración con Cloudinary para imágenes
- Sistema de enlaces externos
- Validación con Zod
- Hooks personalizados complejos (useMovieForm, usePeople, usePeopleForm)
- Capa de servicios completa con API Client singleton
- Sistema de tipos TypeScript robusto
- API Routes con transacciones y validación
- Funciones de utilidad para movies y people
- Componente MovieModal con sistema de tabs

### 🚧 En Proceso
- Migración de datos desde WordPress (10,589 películas)
- Optimización de queries con React Query
- Sistema de búsqueda avanzada
- Tests unitarios y de integración

### ❌ Pendiente
- Autenticación y autorización de usuarios
- Dashboard de estadísticas
- API pública con rate limiting
- Sistema de caché (Redis)
- Búsqueda con Elasticsearch/Algolia
- Internacionalización (i18n)
- PWA capabilities
- Sistema de recomendaciones

### 🐛 Issues Conocidos
- Performance en listados muy grandes
- Validación de fechas parciales necesita mejoras en UX
- Falta lazy loading en galerías de imágenes
- Caché de imágenes de Cloudinary no optimizado
- Hook useMovieForm muy grande (500+ líneas) - candidato a refactorización
- MovieModal con 46 props - necesita Context API

---

## 💻 Patrones de Código y Arquitectura

### Utilidades Core

#### Class Names (Tailwind + clsx)
```typescript
cn(...inputs: ClassValue[]) // Merge de clases Tailwind
```

#### Generación de Slugs
```typescript
createSlug(text: string): string
// "El Secreto de Sus Ojos" → "el-secreto-de-sus-ojos"
// Maneja acentos, caracteres especiales, múltiples espacios

generatePersonSlug(firstName?: string, lastName?: string): string
// Similar pero para personas
```

#### Formateo
```typescript
formatDate(date): string // Fecha en español AR
formatDuration(minutes): string // "2h 15min"
formatPartialDate(partial, options) // Desde dateUtils
formatPersonName(person): string // Combina nombres
formatBirthInfo(person): string // Fecha con edad
```

### Problemas Detectados y Mejoras Sugeridas

#### 1. Props Drilling Extremo en MovieModal
**Problema**: MovieModal recibe 46 props que debe pasar a sus tabs
**Impacto**: Dificulta mantenimiento, testing y reutilización
**Solución**: Context API o composición

```typescript
// Actual - 46 props
<MovieModal 
  isOpen={isOpen}
  onClose={onClose}
  editingMovie={editingMovie}
  onSubmit={onSubmit}
  isSubmitting={isSubmitting}
  register={register}
  handleSubmit={handleSubmit}
  watch={watch}
  setValue={setValue}
  reset={reset}
  errors={errors}
  activeTab={activeTab}
  setActiveTab={setActiveTab}
  isPartialDate={isPartialDate}
  setIsPartialDate={setIsPartialDate}
  partialReleaseDate={partialReleaseDate}
  setPartialReleaseDate={setPartialReleaseDate}
  // ... 30 props más
/>

// Solución propuesta - Context
<MovieModalProvider editingMovie={movie} onSuccess={handleSuccess}>
  <MovieModal /> {/* Sin props! */}
</MovieModalProvider>
```

#### 2. Hook Gigante
**Problema**: useMovieForm hace demasiado (514 líneas)
**Solución**: Split en hooks especializados

```typescript
// Sugerido
useMovieForm() // Orquestador
├── useMovieMetadata() // Ratings, colors
├── useMovieDates() // Fechas parciales
├── useMovieRelations() // Cast, crew, etc
└── useMovieValidation() // Zod + RHF
```

#### 3. Duplicación de Lógica de Fechas
**Problema**: Mismo código repetido para 3 fechas en BasicInfoTab
**Solución**: Componente o hook genérico

```typescript
// Componente reutilizable
function PartialDateField({ 
  label, 
  fieldName, 
  register, 
  isPartial, 
  onPartialChange,
  partialDate,
  onPartialDateChange 
}) {
  return (
    <div>
      <label>{label}</label>
      <Checkbox 
        checked={isPartial} 
        onChange={onPartialChange}
        label="Fecha incompleta"
      />
      {!isPartial ? (
        <input type="date" {...register(fieldName)} />
      ) : (
        <PartialDateInputs 
          value={partialDate}
          onChange={onPartialDateChange}
        />
      )}
    </div>
  )
}

// Uso simplificado
<PartialDateField
  label="Fecha de Estreno"
  fieldName="releaseDate"
  {...releaseDateProps}
/>
```

#### 4. Validación Inconsistente
**Problema**: Validación mínima en Zod
**Solución**: Schemas más estrictos

```typescript
// Actual
title: z.string().min(1)
year: z.number().optional() // Sin límites

// Sugerido  
title: z.string().min(1).max(255)
year: z.number().min(1895).max(currentYear + 5)
```

#### 5. Transacciones Largas
**Problema**: Timeout en actualizaciones complejas
**Solución**: Optimizar queries o dividir transacciones

```typescript
// Actual: Una transacción gigante
await prisma.$transaction(async (tx) => {
  // 12+ operaciones
}, { timeout: 30000 })

// Sugerido: Transacciones más pequeñas o bulk operations
await prisma.movieGenre.deleteMany({ where: { movieId } })
await prisma.movieGenre.createMany({ data: genres })
```

#### 6. Tabs No Optimizados
**Problema**: Todos los tabs se renderizan aunque no estén visibles
**Solución**: Lazy loading y memoización

```typescript
// Actual
<Tabs.Content value="cast">
  <CastTab {...props} />
</Tabs.Content>

// Optimizado
const CastTab = lazy(() => import('./tabs/CastTab'))

<Tabs.Content value="cast">
  {activeTab === 'cast' && (
    <Suspense fallback={<TabSkeleton />}>
      <CastTab {...props} />
    </Suspense>
  )}
</Tabs.Content>
```

---

## 📚 Referencias y Recursos

- [Next.js 14 Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [React Hook Form](https://react-hook-form.com/)
- [Radix UI](https://www.radix-ui.com/)
- [Supabase](https://supabase.com/docs)
- [Cloudinary](https://cloudinary.com/documentation)

---

*Última actualización: Enero 2025*
*Versión: 0.1.0*