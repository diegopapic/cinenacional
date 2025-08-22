# Movies API

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