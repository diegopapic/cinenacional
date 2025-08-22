# Flujos de Trabajo y Patrones

y Patrones

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

### Flujo Completo: Crear/Editar Película - **REFACTORIZADO**

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
   - CrewTab: roles técnicos con roleId 🆕
   - AdvancedTab: metadata, ratings, etc.
   ↕
6. onSubmit procesa (desde useMovieForm):
   - prepareMovieData() formatea datos
   - Convierte fechas según tipo (parcial/completa)
   - Mapea relaciones (genres, cast, crew con roleId, etc.)
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

### Flujo CRUD de Roles - **NUEVO** 🆕

```
1. Componente RolesList
   ↕
2. Hook useRoles gestiona estado
   - Filtros, paginación, búsqueda
   - Llama a rolesService
   ↕
3. rolesService formatea request
   - Genera slug automático
   - Valida datos con Zod
   ↕
4. API Client envía request
   ↕
5. API Route /api/roles
   - Valida con roleSchema
   - Verifica unicidad
   - CRUD con Prisma
   ↕
6. Base de datos PostgreSQL
   - Constraints de unicidad
   - Índices optimizados
   ↕
7. Respuesta formateada
   - Incluye contadores
   - Datos relacionados
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

### Patrón de Validación en Capas

```typescript
// 1. Cliente: React Hook Form + Zod
const form = useForm({
  resolver: zodResolver(roleFormSchema)
})

// 2. Servicio: Validación adicional
if (!isValidSlug(slug)) {
  throw new Error('Slug inválido')
}

// 3. API: Schema validation
const validatedData = roleSchema.parse(body)

// 4. DB: Constraints de Prisma
@@unique([name])
@@unique([slug])
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

// Patrón para crew con roles 🆕
crew: {
  create: crew.map(item => ({
    personId: item.personId,
    roleId: item.roleId,  // 🆕 Referencia a tabla roles
    role: item.role,       // Mantiene compatibilidad
    department: item.department,
    billingOrder: item.billingOrder
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