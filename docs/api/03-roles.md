# Roles API

- **NUEVO** 🆕

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