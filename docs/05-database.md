# Base de Datos

### Esquema Principal

#### Entidades Principales (17 tablas) - **ACTUALIZADO** 🆕

**Contenido Principal:**
- `movies` - Películas con información completa
- `people` - Personas (actores, directores, etc.)
- `roles` - Roles cinematográficos 🆕
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

#### Tabla de Roles - **NUEVA** 🆕

```prisma
model Role {
  id          Int      @id @default(autoincrement())
  name        String   @unique
  slug        String   @unique
  description String?
  department  String?
  isActive    Boolean  @default(true)
  displayOrder Int     @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relaciones
  crewRoles   MovieCrew[]
  
  @@index([slug])
  @@index([department])
  @@index([isActive])
  @@map("roles")
}
```

#### Tablas de Relación (15 tablas)

**Relaciones de Películas:**
- `movie_cast` - Elenco
- `movie_crew` - Equipo técnico (actualizado con roleId) 🆕
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

#### MovieCrew con Roles - **ACTUALIZADO** 🆕

```prisma
model MovieCrew {
  id           Int      @id @default(autoincrement())
  movieId      Int
  personId     Int
  roleId       Int?     // 🆕 Referencia a la tabla roles
  role         String   // Mantiene compatibilidad
  department   String?
  billingOrder Int?
  note         String?
  isConfirmed  Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  movie        Movie    @relation(fields: [movieId], references: [id], onDelete: Cascade)
  person       Person   @relation(fields: [personId], references: [id], onDelete: Cascade)
  roleRef      Role?    @relation(fields: [roleId], references: [id]) // 🆕
  
  @@unique([movieId, personId, role])
  @@index([movieId])
  @@index([personId])
  @@index([roleId]) // 🆕
  @@map("movie_crew")
}
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
- Departamentos de roles 🆕

---