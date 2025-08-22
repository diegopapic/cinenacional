# Tipos TypeScript

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