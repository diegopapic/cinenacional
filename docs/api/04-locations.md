# Locations API

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