# People API

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