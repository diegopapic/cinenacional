# Hooks Personalizados

### useMovieForm - **REFACTORIZADO**

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

### useRoles - **NUEVO** 🆕

**Ubicación**: `/src/hooks/useRoles.ts`

Hook para gestión de roles cinematográficos.

#### Interface Principal
```typescript
interface UseRolesReturn {
  // Datos
  roles: Role[]
  totalCount: number
  totalPages: number
  hasMore: boolean
  currentPage: number
  pageSize: number
  
  // Estado
  loading: boolean
  error: Error | null
  filters: RoleFilters
  
  // Acciones principales
  loadRoles: () => Promise<void>
  createRole: (data: RoleFormData) => Promise<Role>
  updateRole: (id: number, data: RoleFormData) => Promise<Role>
  deleteRole: (id: number) => Promise<void>
  
  // Gestión de filtros
  updateFilter: <K>(key: K, value: RoleFilters[K]) => void
  updateFilters: (filters: Partial<RoleFilters>) => void
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
- **Búsqueda con debounce**: 300ms de retraso
- **Filtros**: Por departamento y estado activo
- **Ordenamiento**: Por nombre, departamento o fecha
- **Paginación**: Configurable con límite variable
- **CRUD completo**: Todas las operaciones disponibles

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