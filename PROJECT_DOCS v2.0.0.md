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
9. [Context API y State Management](#context-api-y-state-management)
10. [Capa de Servicios](#capa-de-servicios)
11. [Tipos TypeScript](#tipos-typescript)
12. [API Routes](#api-routes)
13. [Funciones de Utilidad](#funciones-de-utilidad)
14. [Componentes Complejos](#componentes-complejos)
15. [Flujos de Trabajo](#flujos-de-trabajo)
16. [Scripts y Comandos](#scripts-y-comandos)
17. [Problemas Resueltos](#problemas-resueltos)
18. [Estado de Migración](#estado-de-migración)
19. [Mejoras Implementadas](#mejoras-implementadas)
20. [Próximas Mejoras](#próximas-mejoras)

---

## 📄 Descripción General

CineNacional es una plataforma web integral para catalogar, gestionar y consultar información sobre cine argentino. El proyecto está en proceso de migración desde WordPress a un stack moderno basado en Next.js con TypeScript.

### URLs del Proyecto
- **Producción**: https://cinenacional.vercel.app/
- **GitHub**: https://github.com/diegopapic/cinenacional
- **Base de datos original (WordPress)**: Google Drive con MySQL dumps

### Estado del Proyecto
- **Versión actual**: 2.0.0
- **Última actualización mayor**: Refactorización completa con Context API
- **Películas migradas**: 10,589 desde WordPress
- **Estado**: Funcional con admin panel completo

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
El proyecto sigue una arquitectura de capas con separación clara de responsabilidades y Context API para gestión de estado:

```
┌─────────────────────────────────────────────┐
│     Capa de Presentación (UI)              │
│   Components + Pages (App Router)          │
│   + Context API para State Management      │
├─────────────────────────────────────────────┤
│    Capa de Lógica de Negocio               │
│    Services + Hooks + Utilities            │
├─────────────────────────────────────────────┤
│      Capa de Acceso a Datos                │
│    API Routes + Prisma ORM                 │
├─────────────────────────────────────────────┤
│         Base de Datos                      │
│    PostgreSQL (Supabase)                   │
└─────────────────────────────────────────────┘
```

### Flujo de Datos Modernizado
1. **UI Components** → Usan Context API para acceder al estado
2. **Context Providers** → Centralizan estado y lógica
3. **Custom Hooks** → Manejan lógica de negocio específica
4. **Services** → Formatean y envían datos a la API
5. **API Routes** → Validan y procesan requests
6. **Prisma ORM** → Ejecuta queries en PostgreSQL
7. **PostgreSQL** → Almacena datos persistentes

### Principios de Diseño
- **Separation of Concerns**: Cada capa tiene responsabilidades claras
- **DRY (Don't Repeat Yourself)**: Código reutilizable en hooks y utils
- **Type Safety**: TypeScript en todo el proyecto
- **State Management**: Context API para eliminar props drilling
- **Error Handling**: Manejo consistente de errores en todas las capas

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
│   │   │   │   └── MovieModal/  # Modal refactorizado con Context
│   │   │   │       ├── tabs/    # BasicInfo, Cast, Crew, Media, Advanced
│   │   │   │       └── ...      # Header, Footer, etc.
│   │   │   ├── people/       
│   │   │   │   └── PersonFormFields/ # Campos del formulario
│   │   │   └── locations/    # Tree view de ubicaciones
│   │   ├── layout/           # Header, Footer globales
│   │   └── movies/           # Componentes públicos
│   │
│   ├── contexts/             # Context API providers 🆕
│   │   ├── MovieModalContext.tsx # Context para MovieModal
│   │   └── index.ts          # Barrel exports
│   │
│   ├── hooks/                # Custom React Hooks
│   │   ├── useMovieForm.ts   # Lógica del form de películas (refactorizado)
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
filmingStartYear  Int?
filmingStartMonth Int? @db.SmallInt
filmingStartDay   Int? @db.SmallInt
filmingEndYear    Int?
filmingEndMonth   Int? @db.SmallInt
filmingEndDay     Int? @db.SmallInt

// Personas
birthYear        Int?
birthMonth       Int? @db.SmallInt
birthDay         Int? @db.SmallInt
deathYear        Int?
deathMonth       Int? @db.SmallInt
deathDay         Int? @db.SmallInt
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
- **MovieModal** (`/components/admin/movies/MovieModal/`) - **REFACTORIZADO** 🆕
  - ✅ **De 46 props a 2 props** (`isOpen`, `onClose`)
  - ✅ **Context API**: `MovieModalContext` centraliza todo el estado
  - ✅ **Tabs sin props**: Todos los tabs (BasicInfo, Cast, Crew, Media, Advanced) ahora tienen 0 props
  - ✅ **Carga automática**: useEffect en Context carga datos automáticamente al editar
  - ✅ **Manejo centralizado**: Todas las fechas parciales, relaciones y metadata gestionados por el Context

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
    - LocationFields (con autocompletar)
    - LinksSection

#### Características
- Fechas parciales de nacimiento/muerte
- Múltiples nacionalidades
- Enlaces externos verificables
- Ubicaciones jerárquicas con autocompletar
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
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' }
]
```

### Uso en la UI
- Checkbox "Fecha incompleta" para activar modo parcial
- Campos separados para año, mes (dropdown), día
- Validación en tiempo real
- Formateo automático para mostrar

---

## 🪝 Hooks Personalizados

### useMovieForm - **REFACTORIZADO** 🆕

**Ubicación**: `/src/hooks/useMovieForm.ts` (514 líneas → **Optimizado para Context API**)

Hook principal para gestión de formularios de películas. **Completamente refactorizado** para trabajar con Context API.

#### Cambios Principales en la Refactorización:
- ✅ **Interface simplificada**: Recibe `editingMovie`, `onSuccess`, `onError` como parámetros opcionales
- ✅ **Callbacks personalizables**: `onSuccess(movie)` y `onError(error)` permiten manejo flexible
- ✅ **Estado de submission**: `isSubmitting` para prevenir double-submit
- ✅ **Manejo de errores mejorado**: Ejecuta callbacks en lugar de solo mostrar toasts
- ✅ **Compatibilidad total**: Mantiene toda la funcionalidad anterior

#### Interface Actualizada
```typescript
interface UseMovieFormProps {
  editingMovie?: Movie | null;
  onSuccess?: (movie: Movie) => void;
  onError?: (error: Error) => void;
}

interface UseMovieFormReturn {
  // Submit handler
  onSubmit: (data: MovieFormData) => Promise<void>
  
  // Estados principales
  activeTab: string
  setActiveTab: (tab: string) => void
  isSubmitting: boolean  // 🆕 Agregado
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
  
  // Métodos de React Hook Form tipados como any
  register: any
  handleSubmit: any
  watch: any
  setValue: any
  reset: any
  control: any
  formState: any
  getValues: any
  trigger: any
  clearErrors: any
  setError: any
  setFocus: any
  getFieldState: any
  resetField: any
  unregister: any
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
useEffect(() => {
  const duration = watch('duration')
  const durationSeconds = watch('durationSeconds')
  
  if (duration || durationSeconds) {
    const totalMinutes = (duration || 0) + (durationSeconds || 0) / 60
    const calculatedType = calcularTipoDuracion(totalMinutes)
    setValue('tipoDuracion', calculatedType)
    setTipoDuracionDisabled(true)
  } else {
    setTipoDuracionDisabled(false)
  }
}, [watch('duration'), watch('durationSeconds')])
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

**Manejo de Campos Null en Edición**
```typescript
// En loadMovieData, limpia valores null antes de setear
const cleanedMovie = {
  ...fullMovie,
  tagline: fullMovie.tagline || '',
  imdbId: fullMovie.imdbId || '',
  posterUrl: fullMovie.posterUrl || '',
  trailerUrl: fullMovie.trailerUrl || '',
  originalTitle: fullMovie.originalTitle || '',
  synopsis: fullMovie.synopsis || '',
  // ... otros campos
}
// Luego usar cleanedMovie para llenar el formulario
reset(cleanedMovie)
```

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

## 🎯 Context API y State Management 🆕

### MovieModalContext

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

#### Schema de Validación (Zod) - **MEJORADO** 🆕
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
  
  // Campos numéricos con validación estricta - **CORREGIDO** 🆕
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

#### POST /api/movies - **CORREGIDO** 🆕

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
- Equipo técnico
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

---

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

---

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

## 🎯 Componentes Complejos

### MovieModal - **COMPLETAMENTE REFACTORIZADO** 🆕

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

## 📄 Flujos de Trabajo y Patrones

### Arquitectura de Comunicación Modernizada

```
Frontend (React + Context API)
    ↕
Context Providers (State Management)
    ↕
Custom Hooks (Business Logic)
    ↕
Services Layer (TypeScript)
    ↕
API Client (Singleton)
    ↕
API Routes (Next.js)
    ↕
Prisma ORM
    ↕
PostgreSQL (Supabase)
```

### Flujo Completo: Crear/Editar Película - **REFACTORIZADO** 🆕

```
1. Componente Padre (page.tsx)
   ↕
2. MovieModalProvider envuelve MovieModal
   - Recibe: editingMovie, onSuccess, onError
   - Ejecuta: useMovieForm() internamente
   ↕
3. Context detecta cambio en editingMovie (useEffect)
   - Si editingMovie: loadMovieData() automáticamente
   - Si null: resetForNewMovie() automáticamente
   ↕
4. MovieModal (2 props solamente)
   - isOpen, onClose
   - Datos del Context via useMovieModalContext()
   ↕
5. Tabs sin props acceden al Context:
   - BasicInfoTab: fechas parciales + formulario
   - MediaTab: Cloudinary integration
   - CastTab: relaciones N:M con personas
   - CrewTab: roles técnicos
   - AdvancedTab: metadata, ratings, etc.
   ↕
6. onSubmit procesa (desde useMovieForm):
   - prepareMovieData() formatea datos
   - Convierte fechas según tipo (parcial/completa)
   - Mapea relaciones (genres, cast, crew, etc.)
   ↕
7. moviesService.create/update():
   - formatMovieDataForAPI() final
   - Envía a API con fechas como INT separados
   ↕
8. API Route (/api/movies):
   - Valida con movieSchema (Zod)
   - Genera slug único
   - Auto-increment corregido ✅
   - Crea con transacción Prisma
   ↕
9. Context ejecuta callback onSuccess/onError
   - page.tsx maneja respuesta
   - Toast específico con nombre de película
   - Refresh de datos
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

### Patrón de Context API

```typescript
// 1. Crear Context Provider
<MovieModalProvider 
  editingMovie={movie}
  onSuccess={handleSuccess}
  onError={handleError}
>
  <MovieModal isOpen={showModal} onClose={handleClose} />
</MovieModalProvider>

// 2. Hook del Context centraliza todo
const movieFormData = useMovieForm({ editingMovie, onSuccess, onError })

// 3. Componentes acceden sin props
const { register, watch, setValue } = useMovieModalContext()

// 4. Carga automática con useEffect
useEffect(() => {
  if (editingMovie) {
    movieFormData.loadMovieData(editingMovie)
  } else {
    movieFormData.resetForNewMovie()
  }
}, [editingMovie?.id])
```

### Patrón de Validación

```typescript
// Schema Zod sin transform (evita problemas)
movieSchema = z.object({
  title: z.string().min(1), // Único requerido
  tagline: z.string().optional(), // Sin transform
  ratingId: z.union([
    z.number().positive(),
    z.null(),
    z.literal(0).transform(() => null)
  ]).optional()
})

// Limpieza de nulls en el hook
const cleanedMovie = {
  ...fullMovie,
  tagline: fullMovie.tagline || '',
  // ... limpiar todos los campos
}

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

// Patrón para screening venues con metadata especial
screeningVenues: {
  create: venues.map((venue, index) => ({
    venueId: venue.venueId,
    screeningDate: venue.screeningDate,
    isPremiere: index === 0,
    isExclusive: venues.length === 1
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

# Comando para corregir auto-increment después de migración ✅
# Ejecutar en consola SQL de Supabase:
SELECT setval('movies_id_seq', (SELECT MAX(id) + 1 FROM movies));
SELECT setval('people_id_seq', (SELECT MAX(id) + 1 FROM people));
SELECT setval('genres_id_seq', (SELECT MAX(id) + 1 FROM genres));
SELECT setval('locations_id_seq', (SELECT MAX(id) + 1 FROM locations));
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

### Scripts de Migración
```bash
# Análisis de datos WordPress
node scripts/analyze-wp-completeness.js
node scripts/analyze-wp-structure.js

# Migración a Supabase
node scripts/migrate-wp-titles-supabase.js
node scripts/migrate-wp-people-supabase.js
node scripts/migrate-wp-relations-supabase.js
```

---

## 🔧 Problemas Resueltos

### 1. ✅ **Props Drilling Extremo en MovieModal - SOLUCIONADO**

**Problema**: MovieModal recibía 46+ props que se pasaban a 5 tabs
**Impacto**: Mantenimiento imposible, testing complejo, performance degradada

**Solución Implementada**: Context API Completo
```typescript
// ANTES - Props Drilling
<MovieModal 
  isOpen={isOpen}
  onClose={onClose}
  editingMovie={editingMovie}
  // ... 43 props más
/>

// DESPUÉS - Context API
<MovieModalProvider editingMovie={movie} onSuccess={handleSuccess}>
  <MovieModal isOpen={isOpen} onClose={onClose} />
</MovieModalProvider>
```

**Resultados**:
- ✅ **Props reducidas**: 46+ → 2 props (96% reducción)
- ✅ **Componentes desacoplados**: Cada tab accede directamente al Context
- ✅ **Mantenibilidad**: Cambios centralizados en una ubicación
- ✅ **Performance**: Eliminado re-renders por props drilling

### 2. ✅ **Auto-increment de Base de Datos - SOLUCIONADO**

**Problema**: Error "Unique constraint failed on the fields: (id)" al crear películas
**Causa**: Migración de WordPress mantuvo IDs originales pero no actualizó secuencia

**Solución Implementada**:
```sql
-- Aplicado en Supabase
SELECT setval('movies_id_seq', (SELECT MAX(id) + 1 FROM movies));
SELECT setval('people_id_seq', (SELECT MAX(id) + 1 FROM people));
SELECT setval('genres_id_seq', (SELECT MAX(id) + 1 FROM genres));
SELECT setval('locations_id_seq', (SELECT MAX(id) + 1 FROM locations));
```

**Resultado**: ✅ Creación de películas y personas funciona perfectamente

### 3. ✅ **Toasts Duplicados - SOLUCIONADO**

**Problema**: Aparecían 2 toasts al crear/actualizar películas
**Causa**: useMovieForm y page.tsx ambos mostraban toasts

**Solución Implementada**: Eliminar toasts del hook, mantener solo en callbacks
```typescript
// ELIMINADO de useMovieForm:
// toast.success('Película actualizada exitosamente')

// MANTENIDO en page.tsx:
toast.success(`Película "${movie.title}" actualizada exitosamente`)
```

**Resultado**: ✅ Solo aparece un toast descriptivo con el nombre de la película

### 4. ✅ **Validación de Campos Numéricos - SOLUCIONADO**

**Problema**: Error "Expected number, received nan" en duration y durationSeconds
**Causa**: Zod no manejaba campos vacíos correctamente

**Solución Implementada**: z.preprocess para campos numéricos
```typescript
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
)
```

**Resultado**: ✅ Campos numéricos manejan valores vacíos, null y 0 correctamente

### 5. ✅ **Tipos de React Hook Form Simplificados**

**Problema**: Incompatibilidad de tipos entre React Hook Form y Zod
**Solución Implementada**: Tipos pragmáticos como `any` para métodos del form
```typescript
// Solución temporal mientras se resuelven incompatibilidades de versiones
register: any
handleSubmit: any
watch: any
// ... otros métodos
```

**Resultado**: ✅ Compilación exitosa en desarrollo y Vercel

### 6. ✅ **Carga Automática de Datos en Edición**

**Problema**: Al refactorizar se perdió la carga automática de datos al editar
**Solución Implementada**: useEffect en Context detecta cambios en editingMovie
```typescript
useEffect(() => {
  if (editingMovie) {
    movieFormData.loadMovieData(editingMovie)
  } else {
    movieFormData.resetForNewMovie()
  }
}, [editingMovie?.id])
```

**Resultado**: ✅ Datos se cargan automáticamente al hacer clic en "Editar"

### 7. ✅ **Error de validación "Expected string, received null"**

**Problema**: Campos de películas llegaban como null pero Zod esperaba strings

**Solución Implementada**: 
```typescript
// En movieTypes.ts - SIN transform en campos problemáticos
tagline: z.string().optional(),
imdbId: z.string().optional(),
posterUrl: z.string().optional(),
trailerUrl: z.string().optional(),

// Solo usar transform en metadata que lo necesita
metaDescription: z.union([
  z.string(),
  z.null(),
  z.undefined()
]).transform(val => val ?? '').optional()

// En useMovieForm.ts - Limpieza antes de setear en formulario
const cleanedMovie = {
  ...fullMovie,
  tagline: fullMovie.tagline || '',
  imdbId: fullMovie.imdbId || '',
  posterUrl: fullMovie.posterUrl || '',
  trailerUrl: fullMovie.trailerUrl || '',
  // ... limpiar todos los campos string
}
```

**Resultado**: ✅ Formularios manejan correctamente valores null

### 8. ✅ **Fechas parciales con undefined vs null**

**Problema**: TypeScript esperaba `null` pero llegaba `undefined` en PartialDate

**Solución Implementada**:
```typescript
// Uso de nullish coalescing en peopleUtils.ts
const birthPartial: PartialDate = {
  year: person.birthYear ?? null,    // Convierte undefined a null
  month: person.birthMonth ?? null,
  day: person.birthDay ?? null
}
```

**Resultado**: ✅ Fechas parciales funcionan correctamente

### 9. ✅ **Ubicaciones en personas no se cargaban al editar**

**Problema**: Los campos birthLocation/deathLocation no se recuperaban

**Solución Implementada**:
```typescript
// En API /api/people/[id]/route.ts
const person = await prisma.person.update({
  where: { id },
  data: {
    ...updateData,
    birthLocationId: data.birthLocationId || null,
    deathLocationId: data.deathLocationId || null
  },
  include: {
    birthLocation: true,  // Incluir relación
    deathLocation: true,  // Incluir relación
    // ... otras relaciones
  }
})
```

**Resultado**: ✅ Ubicaciones se cargan y guardan correctamente

---

## 🚀 Estado de Migración

### ✅ **Completado - REFACTORIZACIÓN CONTEXT API** 🆕
- ✅ Arquitectura Context API implementada completamente
- ✅ Props drilling eliminado (46+ props → 2 props)
- ✅ MovieModal y todos sus tabs refactorizados
- ✅ Carga automática de datos en Context
- ✅ Manejo centralizado de estado y callbacks
- ✅ Errores de auto-increment y validación corregidos
- ✅ Compilación exitosa en Vercel
- ✅ Funcionalidad 100% preservada con arquitectura moderna

### ✅ Completado Previamente
- Estructura base del proyecto Next.js
- Sistema de fechas parciales centralizado y documentado
- Esquema de base de datos completo en Prisma (31 tablas)
- ABM de películas con todos los campos
- ABM de personas con fechas parciales
- Módulos auxiliares (géneros, ubicaciones, temas, etc.)
- Integración con Cloudinary para imágenes
- Sistema de enlaces externos
- Validación con Zod (con soluciones para null handling)
- Hooks personalizados complejos
- Capa de servicios completa con API Client singleton
- Sistema de tipos TypeScript robusto
- API Routes con transacciones y validación
- Funciones de utilidad para movies y people
- Campos de autocompletar para ubicaciones en personas
- Migración de 10,589 películas desde WordPress

### 🚧 En Proceso
- Optimización de queries con React Query
- Sistema de búsqueda avanzada
- Tests unitarios y de integración

### ⏱ Pendiente
- Autenticación y autorización de usuarios
- Dashboard de estadísticas
- API pública con rate limiting
- Sistema de caché (Redis)
- Búsqueda con Elasticsearch/Algolia
- Internacionalización (i18n)
- PWA capabilities
- Sistema de recomendaciones

### 🛠 Issues Conocidos - **ACTUALIZADOS**
- ✅ ~~Props drilling extremo~~ → **RESUELTO con Context API**
- ✅ ~~Auto-increment de base de datos~~ → **RESUELTO**
- ✅ ~~Toasts duplicados~~ → **RESUELTO**
- ✅ ~~Validación de campos numéricos~~ → **RESUELTO**
- Performance en listados muy grandes (pendiente)
- Falta lazy loading en galerías de imágenes
- Caché de imágenes de Cloudinary no optimizado
- ~~useMovieForm muy grande~~ → **SIGNIFICATIVAMENTE MEJORADO con Context**
- ~~MovieModal con 46 props~~ → **COMPLETAMENTE RESUELTO**

---

## 💻 Mejoras Implementadas

### 1. ✅ **Context API para MovieModal - IMPLEMENTADO**
**Problema Resuelto**: Props drilling extremo con 46+ props
**Solución**: MovieModalContext centraliza todo el estado

**Implementación**:
```typescript
// Context Provider
<MovieModalProvider editingMovie={movie} onSuccess={handleSuccess}>
  <MovieModal isOpen={showModal} onClose={onClose} />
</MovieModalProvider>

// Hook del Context
const { register, watch, setValue, handleSubmit } = useMovieModalContext()
```

**Beneficios Conseguidos**:
- ✅ **96% reducción de props** (46 → 2)
- ✅ **Componentes desacoplados** y reutilizables
- ✅ **Mantenibilidad exponencial**
- ✅ **Testing simplificado**
- ✅ **Performance optimizada**

### 2. ✅ **Validación Estricta de Campos - IMPLEMENTADO**
**Problema Resuelto**: Validación mínima causaba errores NaN
**Solución**: z.preprocess para campos numéricos con manejo de valores vacíos

### 3. ✅ **Auto-increment Corregido - IMPLEMENTADO**
**Problema Resuelto**: Constraint violations en creación
**Solución**: Secuencias de PostgreSQL sincronizadas después de migración

### 4. ✅ **Gestión de Errores Mejorada - IMPLEMENTADO**
**Problema Resuelto**: Toasts duplicados y manejo básico de errores
**Solución**: Callbacks centralizados con onSuccess/onError

---

## 🔮 Próximas Mejoras

### 1. **Lazy Loading para Tabs** 
**Impacto**: Mejorar performance inicial
```typescript
const BasicInfoTab = lazy(() => import('./tabs/BasicInfoTab'))

// En el render
<Suspense fallback={<TabSkeleton />}>
  {activeTab === 'basic' && <BasicInfoTab />}
</Suspense>
```

### 2. **Componente Reutilizable para Fechas Parciales**
**Impacto**: Eliminar duplicación en formularios
```typescript
<PartialDateField
  label="Fecha de estreno"
  isPartial={isPartialDate}
  onPartialChange={setIsPartialDate}
  partialDate={partialReleaseDate}
  onPartialDateChange={setPartialReleaseDate}
  register={register}
  fieldName="releaseDate"
  errors={errors}
/>
```

### 3. **React Query Integration**
**Impacto**: Mejor caché y sincronización de datos
```typescript
const { data: movies, isLoading } = useMovies(filters)
const createMovie = useCreateMovie()
```

### 4. **División de useMovieForm**
**Impacto**: Hooks más específicos y mantenibles
```typescript
useMovieForm()          // Orquestador
├── useMovieMetadata() // Ratings, colors
├── useMovieDates()    // Fechas parciales
├── useMovieRelations() // Cast, crew, etc
└── useMovieValidation() // Zod + RHF
```

### 5. **Optimización de Transacciones**
**Impacto**: Reducir timeouts en updates complejos
```typescript
// En lugar de una transacción gigante
await prisma.$transaction([
  prisma.movieGenre.deleteMany({ where: { movieId } }),
  prisma.movieGenre.createMany({ data: genres }),
  // ... otras operaciones
])
```

### 6. **Sistema de Búsqueda Avanzada**
**Impacto**: Mejor UX en listados
- Filtros múltiples combinables
- Búsqueda full-text
- Ordenamiento por múltiples campos
- Guardado de filtros favoritos

---

## 🏆 Logros de la Refactorización

### Estadísticas Finales
- **Archivos modificados**: 11 archivos
- **Props eliminadas**: ~100+ props → 4 props finales
- **Interfaces eliminadas**: 9 interfaces completas
- **Líneas de código reducidas**: ~300+ líneas
- **Context API implementado**: 1 context centralizado
- **Hooks refactorizados**: useMovieForm optimizado para Context
- **Películas migradas**: 10,589 desde WordPress
- **Tablas de base de datos**: 31 (16 entidades + 15 relaciones)

### Impacto en Desarrollo
- **Velocidad de desarrollo**: Significativamente acelerada
- **Debugging**: Mucho más simple con estado centralizado
- **Testing**: Componentes independientes y testeables
- **Onboarding**: Nuevos desarrolladores pueden entender la arquitectura más fácilmente
- **Escalabilidad**: Arquitectura preparada para crecimiento

### Arquitectura Moderna Conseguida
```
ANTES (Props Drilling):
Page → MovieModal (46 props) → Tabs (20+ props cada uno)

DESPUÉS (Context API):
Page → MovieModalProvider → MovieModal (2 props) → Tabs (0 props)
                ↕
        useMovieModalContext()
```

---

## 📚 Referencias y Recursos

- [Next.js 14 Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [React Hook Form](https://react-hook-form.com/)
- [React Context API](https://react.dev/reference/react/useContext)
- [Radix UI](https://www.radix-ui.com/)
- [Supabase](https://supabase.com/docs)
- [Cloudinary](https://cloudinary.com/documentation)
- [Zod](https://zod.dev/)
- [TypeScript](https://www.typescriptlang.org/docs/)

---

## 🗂 Apéndices

### A. Comandos Git para Refactorización

```bash
# Refactorización Context API
git add .
git commit -m "refactor: implementar Context API para MovieModal - eliminar props drilling

- Crear MovieModalContext para centralizar estado del formulario
- Reducir MovieModal de 46 props a solo 2 props (isOpen, onClose)
- Eliminar props de todos los tabs (BasicInfo, Media, Cast, Crew, Advanced)
- Agregar carga automática de datos en el Context con useEffect
- Simplificar componente padre (page.tsx) eliminando useMovieForm
- Corregir auto-increment de movies_id_seq en base de datos
- Resolver duplicación de toasts de éxito
- Mantener 100% de funcionalidad con arquitectura más limpia"

git push origin main
```

### B. Estructura de Commits

Seguir convención [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` Nueva funcionalidad
- `fix:` Corrección de bug
- `refactor:` Refactorización de código ✅
- `docs:` Cambios en documentación
- `style:` Cambios de formato
- `test:` Añadir tests
- `chore:` Tareas de mantenimiento
- `perf:` Mejoras de performance
- `ci:` Cambios en CI/CD

### C. Variables de Entorno

```env
# .env.local
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
NEXT_PUBLIC_SUPABASE_URL="https://....supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
CLOUDINARY_CLOUD_NAME="..."
CLOUDINARY_API_KEY="..."
CLOUDINARY_API_SECRET="..."
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="..."
```

### D. Debugging Tips para Context API

```typescript
// Para debugging del Context
const context = useMovieModalContext()
console.log('🔍 Context state:', {
  activeTab: context.activeTab,
  isSubmitting: context.isSubmitting,
  editingMovie: context.editingMovie?.title
})

// Para debugging de React Hook Form desde Context
const { watch, formState } = useMovieModalContext()
const watchedValues = watch()
console.log('📋 Form values:', watchedValues)
console.log('❌ Form errors:', formState.errors)

// Para debugging de fechas parciales
console.log('📅 Fechas parciales:', {
  release: {
    isPartial: context.isPartialDate,
    data: context.partialReleaseDate
  },
  filmingStart: {
    isPartial: context.isPartialFilmingStartDate,
    data: context.partialFilmingStartDate
  },
  filmingEnd: {
    isPartial: context.isPartialFilmingEndDate,
    data: context.partialFilmingEndDate
  }
})
```

### E. Scripts de Migración WordPress

Los scripts de migración se encuentran en `/scripts`:

```bash
# Análisis de datos WordPress
node scripts/analyze-wp-completeness.js
node scripts/analyze-wp-structure.js

# Migración a Supabase
node scripts/migrate-wp-titles-supabase.js
node scripts/migrate-wp-people-supabase.js
node scripts/migrate-wp-relations-supabase.js

# Corrección post-migración ✅
# Ejecutar en Supabase SQL Editor:
SELECT setval('movies_id_seq', (SELECT MAX(id) + 1 FROM movies));
SELECT setval('people_id_seq', (SELECT MAX(id) + 1 FROM people));
SELECT setval('genres_id_seq', (SELECT MAX(id) + 1 FROM genres));
SELECT setval('locations_id_seq', (SELECT MAX(id) + 1 FROM locations));
SELECT setval('themes_id_seq', (SELECT MAX(id) + 1 FROM themes));
SELECT setval('countries_id_seq', (SELECT MAX(id) + 1 FROM countries));
```

### F. Troubleshooting Común

**Error: "Property does not exist on type MovieModalContextValue"**
- Verificar que la propiedad esté declarada en la interface
- Revisar que el Context incluya todas las propiedades de useMovieForm

**Error: "Expected string, received null"**
- Verificar que los campos en `loadMovieData` estén siendo limpiados
- Revisar que el schema no tenga transform en campos problemáticos

**Error: Compilación en Vercel falla**
- Revisar tipos de parámetros en funciones (ej: `setValueAs: (v: any) =>`)
- Verificar que no haya imports circulares
- Chequear versiones de dependencias

**Error: "Unique constraint failed on fields: (id)"**
- Ejecutar corrección de auto-increment en Supabase
- Verificar que no se esté enviando ID en creación

**Error: Context undefined**
- Verificar que el componente esté dentro del Provider
- Revisar que el import del hook sea correcto

**Error: Fechas parciales no se guardan**
- Verificar que se estén enviando como campos INT separados
- Revisar que la API esté procesando year/month/day

**Error: Ubicaciones no se cargan**
- Verificar includes en la API
- Revisar que formatLocationPath esté funcionando

---

*Última actualización: Agosto 2025*  
*Versión: 2.0.0 - REFACTORIZACIÓN CONTEXT API COMPLETA*  
*Mantenedor: Diego Papic*  
*Líneas de documentación: 2,700+*  
*Estado: Documentación completa con todos los cambios y refactorizaciones*