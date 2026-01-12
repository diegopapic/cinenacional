# TMDB Enrichment Scripts

Scripts para enriquecer la base de datos de CineNacional con IMDB IDs desde la API de TMDB.

## Estructura

```
tmdb-enrichment/
├── config.ts           # Configuración y API keys
├── tmdb-client.ts      # Cliente API de TMDB
├── utils.ts            # Utilidades comunes
├── enrich-movies.ts    # Script para películas
├── enrich-people.ts    # Script para personas
├── test-connection.ts  # Test de conexiones
├── package.json        # Dependencias
└── reports/            # CSVs generados
```

## Instalación

```bash
cd scripts/tmdb-enrichment
npm install
```

## Configuración

Las credenciales están en `config.ts`. Para producción, usar variables de entorno:

```bash
export DATABASE_URL="postgresql://cinenacional:Paganitzu@localhost:5433/cinenacional"
export TMDB_ACCESS_TOKEN="eyJhbGciOiJIUzI1NiJ9..."
```

## Uso

### Test de conexión

```bash
npm run test-connection
```

### Películas

```bash
# Test con 10 películas (dry-run)
npm run movies:test

# Procesar todas (solo genera CSV)
npm run movies:dry-run

# Procesar y aplicar auto-aceptados
npm run movies:apply

# Aplicar desde CSV revisado
npm run movies:apply-csv
```

**Opciones avanzadas:**
```bash
npx ts-node enrich-movies.ts --dry-run --limit 100       # Solo 100 películas
npx ts-node enrich-movies.ts --dry-run --offset 500      # Empezar desde la 501
npx ts-node enrich-movies.ts --apply --limit 1000        # Procesar 1000 y aplicar
```

### Personas

```bash
# Test con 10 personas (dry-run)
npm run people:test

# Procesar todas (solo genera CSV)
npm run people:dry-run

# Procesar y aplicar auto-aceptados
npm run people:apply

# Aplicar desde CSV revisado
npm run people:apply-csv
```

**Opciones avanzadas:**
```bash
npx ts-node enrich-people.ts --dry-run --limit 100           # Solo 100 personas
npx ts-node enrich-people.ts --dry-run --min-movies 5        # Solo con 5+ películas
npx ts-node enrich-people.ts --dry-run --offset 1000         # Empezar desde la 1001
```

## Sistema de Matching

### Películas

| Criterio | Puntos |
|----------|--------|
| Título exacto (≥95% similitud) | +40 |
| Título similar (80-94%) | +30 |
| Título parcial (60-79%) | +15 |
| Año exacto | +25 |
| Año ±1 | +15 |
| Director coincide | +30 |
| País Argentina | +20 |
| Duración similar (±5 min) | +10 |

### Personas

| Criterio | Puntos |
|----------|--------|
| Nombre exacto (≥95% similitud) | +30 |
| Nombre similar (80-94%) | +20 |
| Nombre alternativo match | +10 |
| Fecha nacimiento coincide | hasta +50 |
| Fecha muerte coincide | hasta +50 |
| Origen argentino | +15 |
| Películas en común | +10 por película (max 30) |

### Estados de Match

| Estado | Score | Acción |
|--------|-------|--------|
| `auto_accept` | ≥80 | Se aplica automáticamente |
| `review` | 50-79 | Requiere revisión manual |
| `multiple` | 50-79 + alternativas | Múltiples candidatos similares |
| `no_match` | <50 | Sin match válido |

## Flujo de Trabajo Recomendado

### 1. Test inicial
```bash
npm run movies:test
npm run people:test
```

### 2. Procesar por lotes (dry-run)
```bash
# Películas en lotes de 1000
npx ts-node enrich-movies.ts --dry-run --limit 1000
npx ts-node enrich-movies.ts --dry-run --limit 1000 --offset 1000
# etc...

# Personas prioritarias (más películas primero)
npx ts-node enrich-people.ts --dry-run --min-movies 10
```

### 3. Revisar CSVs
Abrir `reports/movies-matches.csv` y `reports/people-matches.csv` en Excel/Sheets.

- Revisar items con `match_status = review` o `multiple`
- Cambiar status a `auto_accept` si el match es correcto
- Cambiar status a `no_match` si es incorrecto

### 4. Aplicar cambios
```bash
npm run movies:apply-csv
npm run people:apply-csv
```

## Estimaciones de Tiempo

Con rate limit de ~35 req/seg:

| Dataset | Cantidad | Requests/item | Tiempo estimado |
|---------|----------|---------------|-----------------|
| Películas | 11,846 | ~3-6 | 17-34 min |
| Personas | 63,950 | ~3-6 | 1.5-3 horas |

## Reportes Generados

Cada ejecución genera:
- `{entity}-matches-{timestamp}.csv` - Archivo con timestamp
- `{entity}-matches.csv` - Última versión (para --apply-csv)

### Columnas del CSV

**Películas:**
- `local_id`, `local_title`, `local_year`, `local_director`
- `tmdb_id`, `tmdb_title`, `tmdb_year`, `tmdb_director`
- `imdb_id`, `match_score`, `match_status`, `match_reason`

**Personas:**
- `local_id`, `local_name`, `local_birth`, `local_death`, `local_movies`
- `tmdb_id`, `tmdb_name`, `tmdb_birth`, `tmdb_death`, `tmdb_place`
- `imdb_id`, `match_score`, `match_status`, `match_reason`

## Troubleshooting

### Error de conexión a TMDB
- Verificar API key en `config.ts`
- Verificar conexión a internet

### Error de conexión a PostgreSQL
- Verificar que el container de Docker esté corriendo
- Verificar `DATABASE_URL` en `config.ts`

### Rate limit de TMDB
- El script ya incluye rate limiting (35 req/seg)
- Si hay errores 429, aumentar `delayBetweenRequests` en `config.ts`

### Muchos "no_match"
- Verificar que los títulos estén correctos en la BD
- Películas muy antiguas o locales pueden no estar en TMDB
