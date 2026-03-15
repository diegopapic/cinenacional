# Lessons Learned

## Review Search Feature

### Extracción de autor: prioridad de fuentes
- JSON-LD > `meta name="author"` > `article:author` > `DC.creator` > byline HTML
- `DC.creator` a veces tiene el webmaster, no el periodista. Siempre priorizar `name="author"`.
- Validar que el nombre extraído parezca un nombre de persona (`isValidAuthorName`): rechazar URLs, emails, prefijos de crédito fotográfico ("Photo:", "Courtesy", etc.), strings genéricos.

### Deduplicación de reviews (3 pasadas)
- Mismo dominio + mismo autor NO es suficiente: puede haber críticas distintas del mismo autor en festivales vs estreno comercial.
- **Pasada 1**: Mismo dominio + mismo autor + mismo título normalizado → duplicada.
- **Pasada 2**: Mismo dominio + mismo autor + un URL slug contiene al otro (ej: `/nuestra-tierra/` vs `/73ssiff-nuestra-tierra/`) → duplicada.
- **Pasada 3**: Mismo dominio + mismo autor + "esencia" del slug es subconjunto de la otra → duplicada. Se extraen palabras significativas del slug removiendo stop words (de/el/la/the/of/and), fechas, y términos de review/festival (critica/review/estrenos/festival/venecia/entrevista). Ejemplo: `venecia-2025-critica-de-nuestra-tierra-de-lucrecia-martel-fuera-de-competicion` → esencia: [nuestra, tierra, lucrecia, martel]. Si la esencia del más corto está completamente contenida en la del más largo, son duplicadas.

### Detección de no-críticas (post-procesamiento)
- El prompt de Claude no es suficiente para filtrar entrevistas/features que mencionan la película evaluativamente pero NO son reseñas.
- Solución: durante enrichment, analizar el HTML buscando señales de entrevista:
  - 4+ citas directas con verbos de atribución ("dice", "explica", "señala", etc.)
  - Formato Q&A
  - Marcadores explícitos ("en entrevista con", "en diálogo con")
  - Metadatos de sección (article:section, articleSection JSON-LD) que indiquen suplemento cultural, no sección de críticas.

### Título de la review vs nombre de la película
- Muchos sitios ponen solo el nombre de la película como título de la página.
- `isTitleJustMovieName()` detecta esto y busca el headline creativo dentro del artículo (subtitle classes, styled `<strong>`, og:description).
- Patrones de WordPress: tanto `style="text-align: center"` (inline) como `class="has-text-align-right"` (class-based).

### Byline extraction: sitios sin metadata estándar
- Algunos sitios (ej: reverseshot.org) no tienen meta tags, JSON-LD, ni clases CSS con "author"/"byline".
- El autor puede estar en un `<div>` genérico (sin clase) dentro de `.article-header`, envuelto en `<a>` sin rel="author".
- Pattern necesario: `By <a>Name</a>` cerca de `.article-header` o similar.
- Importante: soportar iniciales en nombres (ej: "A.G. Sims"), no solo `[A-Z][a-z]+`.

### API de movies: response parsing
- La API de `/api/movies` devuelve `{ movies: [...] }`, no `data.items` ni un array directo.
- El parsing robusto: `data.movies || data.items || (Array.isArray(data) ? data : [])`.
- El campo `role` en crew puede ser string (del search SQL) u objeto `{ name: string }` (de Prisma). Manejar ambos.
