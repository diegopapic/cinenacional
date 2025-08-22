# Capa de Servicios

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