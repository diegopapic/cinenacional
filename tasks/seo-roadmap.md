# Roadmap SEO — cinenacional.com

**Fecha del audit:** 2026-03-23
**Health Score estimado:** 62/100
**GEO (AI Search) Score:** 38/100

---

## Fase 1: Fundamentos críticos (crawlability + indexability)

### 1.1 ~~Crear robots.txt~~ ✅ COMPLETADO
- **Archivo:** `src/app/robots.ts`
- **Qué se hizo:** Creado con `Allow: /`, `Disallow: /admin/` y `/api/`, referencia al sitemap.
- **Commit:** `ceb28b8`

### 1.2 ~~Desbloquear AI crawlers~~ ✅ COMPLETADO
- **Archivo:** `src/proxy.ts`
- **Qué se hizo:** Agregados GPTBot, ClaudeBot, PerplexityBot, AppleBot, AmazonBot, DuckDuckBot, LinkedInBot, Yandex, PinterestBot a la allowlist.
- **Commit:** `ceb28b8`

### 1.3 ~~Fix URLs de sitemap~~ ✅ COMPLETADO
- **Archivo:** `src/app/sitemap/[slug]/route.ts`
- **Bug:** El sitemap estático usaba `/estrenos` y `/estrenos/${year}` pero las rutas reales son `/listados/estrenos` y `/listados/estrenos/${year}`. Google indexaba URLs que redirigían (301) en vez de resolver directo (200).
- **Qué se hizo:** Corregidas las URLs + agregadas páginas estáticas faltantes (`/listados/peliculas`, `/listados/personas`, `/listados/obituarios`).
- **Commit:** `ceb28b8`

### 1.4 ~~Fix inconsistencia www vs no-www~~ ✅ COMPLETADO
- **Archivo:** `src/app/(site)/listados/estrenos/[year]/page.tsx`
- **Bug:** `metadataBase` usa `cinenacional.com` pero los canonicals de estrenos usaban `www.cinenacional.com`. Google ve esto como dos sitios distintos.
- **Qué se hizo:** Unificado a `cinenacional.com` (sin www).
- **Commit:** `ceb28b8`

### 1.5 Evaluar qué filtros de listados merecen rutas propias (como se hizo con estrenos)
- **Contexto:** Los estrenos ya se migraron de `?year=2024` a `/listados/estrenos/2024`, lo que mejoró la indexabilidad. Hay que evaluar si otros filtros merecen el mismo tratamiento.
- **Filtros actuales por página:**
  - **Películas** (`/listados/peliculas`): `search`, `genreId`, `tipoDuracion` (largo/medio/corto), `countryId`, `ratingId`, `soundType`, `colorTypeId`, `releaseDateFrom/To`, `productionYearFrom/To`, `sortBy`, `page`
  - **Personas** (`/listados/personas`): `search`, `gender`, `roleId`, `nationalityId`, `birthLocationId`, `deathLocationId`, `birthYearFrom/To`, `deathYearFrom/To`, `sortBy`, `page`
  - **Obituarios** (`/listados/obituarios`): `year`, `page`
- **Criterio para migrar un filtro a ruta propia:** ¿El filtro produce contenido completamente distinto con entidad propia? (ej: "obituarios de 2024" es una página con sentido propio, igual que "estrenos de 2024").
- **Candidatos probables:**
  - ~~**Obituarios por año** → `/listados/obituarios/2024`~~ ✅ COMPLETADO (`95b6b7a`) — ruta nueva, canonical, sitemap, redirects legacy actualizados
  - ~~**Películas por género** → `/listados/peliculas/genero/drama`~~ ✅ COMPLETADO (`c448f8c`) — ruta SSR nueva, canonical, sitemap genres.xml
  - **Personas por rol** → `/listados/personas/directores`, `/listados/personas/actores` (entidades con sentido propio)
- **Candidatos dudosos (evaluar):**
  - Películas por tipo de duración → `/listados/peliculas/cortometrajes` (¿hay búsqueda suficiente?)
  - Películas por país coproductor → `/listados/peliculas/coproducciones/españa` (¿volumen?)
  - Personas por género/nacionalidad → probablemente no justifica ruta propia
- **Decisión:** Definir cuáles migrar antes de implementar canonicals, porque las rutas nuevas cambian cuál es la URL canónica.

### 1.6 Agregar canonicals en todas las páginas públicas
- **Prerequisito:** Cerrar la decisión del punto 1.5 sobre qué filtros se convierten en rutas.
- **Páginas de detalle (canonical simple, sin dependencia de 1.5):**
  - `src/app/(site)/page.tsx` — home: `alternates: { canonical: 'https://cinenacional.com' }`
  - `src/app/(site)/pelicula/[slug]/page.tsx` — `alternates: { canonical: \`https://cinenacional.com/pelicula/${slug}\` }`
  - `src/app/(site)/persona/[slug]/page.tsx` — `alternates: { canonical: \`https://cinenacional.com/persona/${slug}\` }`
  - `src/app/(site)/efemerides/[[...date]]/page.tsx` — canonical a la URL de la fecha
  - `src/app/(site)/pelicula/[slug]/criticas/[reviewId]/page.tsx` — canonical a la URL de la crítica
- **Páginas de listados (dependen de 1.5):**
  - `src/app/(site)/listados/obituarios/page.tsx` — si se migra a `/obituarios/2024`, el canonical apunta ahí
  - `src/app/(site)/listados/peliculas/page.tsx` — si se crean rutas por género, esas son las canónicas
  - `src/app/(site)/listados/personas/page.tsx` — idem con roles
  - Para filtros que NO se migran a ruta propia: el canonical apunta a la URL base sin query params
- **Búsqueda:** `/buscar` debería tener `noindex` en vez de canonical (no tiene sentido indexar resultados de búsqueda).
- **Por qué:** Sin canonical, Google puede indexar la misma página con distintos query params como contenido duplicado.

### 1.7 Agregar `generateMetadata` a páginas de listados
- **Archivos a modificar:**
  - `src/app/(site)/listados/peliculas/page.tsx` — actualmente hereda metadata genérica del layout. Necesita título y descripción propios ("Películas argentinas — cinenacional.com").
  - `src/app/(site)/listados/personas/page.tsx` — idem ("Personas del cine argentino — cinenacional.com").
  - `src/app/(site)/listados/estrenos/page.tsx` — idem ("Estrenos del cine argentino — cinenacional.com").
  - `src/app/(site)/buscar/page.tsx` — metadata básica ("Buscar — cinenacional.com").
- **Problema:** Estas páginas son `'use client'`, así que `generateMetadata` no se puede usar directamente. Opciones:
  - (A) Extraer un wrapper Server Component que defina metadata y renderice el client component como children.
  - (B) Usar `export const metadata: Metadata = { ... }` estático (funciona en client pages en Next.js 16).
- **Por qué:** Sin metadata propia, heredan el título genérico "cinenacional.com - Base de datos del cine argentino" en los SERPs.

### 1.8 Unificar formato de marca en titles
- **Problema:** Se usan 3 formatos distintos:
  - `"... - cinenacional.com"` (home, película, persona)
  - `"... | CineNacional"` (estrenos)
  - `"... -- CineNacional"` (efemérides, obituarios)
- **Acción:** Elegir uno (recomendación: `"... — cinenacional.com"`) y aplicarlo en todos los `generateMetadata` y `metadata` estáticos.
- **Archivos:** Todos los `page.tsx` del sitio público que definen metadata.

---

## Fase 2: Structured Data (rich results)

### 2.1 ~~WebSite + Organization schema~~ ✅ COMPLETADO
- **Archivo:** `src/app/(site)/layout.tsx`
- **Qué se hizo:** JSON-LD con `@type: WebSite`, `SearchAction` (habilita sitelinks searchbox en Google), y `Organization` como publisher con logo y sameAs (X, Instagram).
- **Commit:** `ceb28b8`

### 2.2 BreadcrumbList schema
- **Archivos a crear/modificar:**
  - Crear `src/components/shared/BreadcrumbSchema.tsx` — componente reutilizable.
  - Usar en `src/app/(site)/pelicula/[slug]/page.tsx`: Home > Películas > {título}
  - Usar en `src/app/(site)/persona/[slug]/page.tsx`: Home > Personas > {nombre}
  - Usar en `src/app/(site)/listados/estrenos/[year]/page.tsx`: Home > Estrenos > {año}
  - Usar en `src/app/(site)/efemerides/[[...date]]/page.tsx`: Home > Efemérides > {fecha}
- **Por qué:** Google muestra breadcrumbs en los SERPs. Mejora CTR y comprensión de estructura del sitio.

### 2.3 Mejorar MovieSchema — agregar sameAs, trailer, inLanguage
- **Archivo:** `src/components/movies/MovieSchema.tsx`
- **Cambios:**
  - Agregar `sameAs` con IMDB link (`https://www.imdb.com/title/${imdbId}/`) y links externos activos. Los datos ya se cargan de la DB.
  - Agregar `trailer` como `VideoObject` cuando hay `trailerUrl` (especialmente YouTube).
  - Agregar `inLanguage: "es"` (o derivar del campo si existe).
  - Usar fecha completa ISO 8601 en `dateCreated` cuando hay mes/día disponibles (actualmente solo usa el año).
  - Agregar `productionCompany` — los datos ya se cargan en la query pero no se pasan al schema.
- **Archivo page.tsx:** `src/app/(site)/pelicula/[slug]/page.tsx` — pasar `trailerUrl`, `imdbId`, `links`, `productionCompanies` al componente `MovieSchema`.

### 2.4 Mejorar PersonSchema — agregar nationality
- **Archivo:** `src/components/people/PersonSchema.tsx`
- **Cambio:** Agregar `nationality` deducido de `birthLocation` o de la tabla `nationalities`.
- **Archivo page.tsx:** `src/app/(site)/persona/[slug]/page.tsx` — pasar `nationalities` al componente.

### 2.5 ItemList schema en listados de películas y personas
- **Archivos:**
  - `src/app/(site)/listados/peliculas/page.tsx` — agregar `@type: ItemList` con las películas listadas.
  - `src/app/(site)/listados/personas/page.tsx` — agregar `@type: ItemList` con las personas listadas.
- **Nota:** Como son client components, el schema se puede inyectar dinámicamente después del fetch o migrar a server components (ver Fase 5).

---

## Fase 3: Content Quality & E-E-A-T

### 3.1 ~~H1 en homepage~~ ✅ COMPLETADO
- **Archivo:** `src/app/(site)/page.tsx`
- **Qué se hizo:** Agregado `<h1 className="sr-only">cinenacional.com — Base de datos del cine argentino</h1>`.
- **Commit:** `ceb28b8`

### 3.2 Activar footer links
- **Archivo:** `src/components/layout/Footer.tsx`
- **Problema:** Los links de navegación (Explorar, Información, Legal) están todos comentados (líneas 9-101). Esto elimina internal linking sitewide.
- **Acción:** Descomentar las secciones y crear las páginas destino que no existan (ver 3.3).

### 3.3 Crear páginas institucionales
- **Páginas a crear:**
  - `/sobre-nosotros` — Quién está detrás del sitio. Crítico para E-E-A-T (Trustworthiness).
  - `/contacto` — Formulario o info de contacto.
  - ~~`/terminos` — Términos de uso.~~ ✅ COMPLETADO (`53567f3`)
  - ~~`/privacidad` — Política de privacidad.~~ ✅ COMPLETADO (`53567f3`)
- **Por qué:** Sin estas páginas, el puntaje de Trustworthiness cae significativamente según las Quality Rater Guidelines de Google.

### 3.4 Fix alt text vacío en SearchResults
- **Archivo:** `src/components/layout/SearchResults.tsx` (líneas ~117 y ~168)
- **Bug:** Las imágenes de resultados de búsqueda tienen `alt=""`. Deberían tener `alt={movie.title}` o `alt={personName}`.

### 3.5 Mejorar fallback de description para personas
- **Archivo:** `src/app/(site)/persona/[slug]/page.tsx` — en `generateMetadata`
- **Problema:** El fallback es `"{nombre}. Persona del cine argentino."` — muy genérico.
- **Mejora:** Incluir roles: `"{nombre}, actor/director del cine argentino. Filmografía completa y biografía."` (derivar roles de los badges/ocupaciones).

---

## Fase 4: AI Search / GEO (Generative Engine Optimization)

### 4.1 ~~Crear llms.txt~~ ✅ COMPLETADO
- **Archivo:** `public/llms.txt`
- **Qué se hizo:** Descripción del sitio, contenido principal, estructura de URLs, datos estructurados y contacto.
- **Commit:** `ceb28b8`

### 4.2 Contenido narrativo auto-contenido en películas
- **Archivo:** `src/app/(site)/pelicula/[slug]/page.tsx` o componente MovieHero/MoviePageClient
- **Problema:** Las fichas son datos atómicos. Los LLMs necesitan párrafos de ~150 palabras para citar una fuente.
- **Acción:** Generar automáticamente un párrafo introductorio con los datos de la DB:
  > "{título} es una película argentina de {género} estrenada en {año}, dirigida por {director} y protagonizada por {actores principales}. {sinopsis breve}"
- **Implementación:** Función server-side que construya el texto a partir de los datos ya cargados. Renderizar como `<p>` visible antes de la sinopsis, o como contenido `sr-only` si no se quiere mostrar visualmente.

### 4.3 Contenido narrativo en personas
- **Archivo:** `src/app/(site)/persona/[slug]/page.tsx`
- **Similar al 4.2:** Generar un párrafo tipo:
  > "{nombre} es un/a {roles} del cine argentino, nacido/a en {lugar} en {año}. Ha participado en {N} películas, entre ellas {top 3 películas}."

### 4.4 FAQ schema en páginas clave
- **Crear:** `src/components/shared/FAQSchema.tsx`
- **Usar en películas:** "¿Quién dirige {título}?", "¿De qué trata {título}?", "¿Cuándo se estrenó {título}?"
- **Usar en personas:** "¿Cuántas películas hizo {nombre}?", "¿Dónde nació {nombre}?"
- **Datos:** Ya disponibles en la query de Prisma.

### 4.5 Estadísticas citables en listados
- **Archivos:** Páginas de listados de estrenos, películas
- **Acción:** Agregar un párrafo con datos duros: "En {año} se estrenaron {N} películas argentinas" o "Hay {N} películas argentinas registradas en cinenacional.com".
- **Por qué:** Los LLMs priorizan datos cuantitativos citables.

---

## Fase 5: Performance & Core Web Vitals

### 5.1 ~~Quitar priority de imágenes below-the-fold~~ ✅ COMPLETADO
- **Archivos:** `src/app/(site)/page.tsx` (banner UCINE), `src/components/layout/Footer.tsx` (logo)
- **Qué se hizo:** Removido `priority` de ambas imágenes. Estaban compitiendo por bandwidth con la LCP image.
- **Commit:** `ceb28b8`

### 5.2 Fix hero preload URL mismatch
- **Archivos:**
  - `src/app/(site)/page.tsx` línea ~15: `getHeroPreloadUrl` genera `w_1920,c_limit,q_auto,f_auto`
  - `src/components/home/HeroSection.tsx` línea ~38: `getHeroImageUrl` genera `w_1920,q_auto,f_auto` (sin `c_limit`)
- **Bug:** Las URLs no coinciden → el browser descarga la imagen **dos veces** (preload inútil + carga real).
- **Fix:** Unificar los parámetros de Cloudinary en ambas funciones.

### 5.3 Lazy load hero carousel images
- **Archivo:** `src/components/home/HeroSection.tsx` (líneas ~250-282)
- **Bug:** Las 5 imágenes del hero carousel se cargan simultáneamente. Solo la primera es visible.
- **Fix:** Agregar `loading="lazy"` a las imágenes con `idx > 0`. Solo `idx === 0` debe tener `priority`.

### 5.4 Resolver `force-dynamic` vs `revalidate`
- **Archivos:**
  - `src/app/(site)/pelicula/[slug]/page.tsx` línea 18-19
  - `src/app/(site)/persona/[slug]/page.tsx`
- **Bug:** `export const dynamic = 'force-dynamic'` + `export const revalidate = 3600` es contradictorio. `force-dynamic` gana → siempre SSR, el `revalidate` no aplica. Cada visita genera una query a la DB.
- **Opciones:**
  - (A) Quitar `force-dynamic` y usar solo `revalidate = 3600` → ISR, mucho más performante.
  - (B) Quitar `revalidate` y dejar `force-dynamic` → siempre fresco pero más lento.
- **Recomendación:** Opción A. Los datos de películas/personas cambian raramente.

### 5.5 Mover sanitización de HTML al server
- **Archivo:** `src/components/movies/MovieHero.tsx` (línea ~11)
- **Problema:** `isomorphic-dompurify` (~60KB) se importa en un client component. Se ejecuta en cada render.
- **Fix:** Sanitizar la sinopsis/biografía en el server component (`page.tsx`) y pasar el HTML ya sanitizado como prop.

### 5.6 Migrar listados a Server Components (o SSR parcial)
- **Archivos:**
  - `src/app/(site)/listados/peliculas/page.tsx`
  - `src/app/(site)/listados/personas/page.tsx`
- **Problema:** Son 100% `'use client'`. El HTML inicial es solo un spinner. Google puede ejecutar JS pero el LCP se degrada y la indexabilidad es menos confiable.
- **Acción:** Migrar a Server Components con data fetching via Prisma directo (como las páginas de película/persona). Los filtros interactivos pueden quedar como client components hijos.
- **Impacto:** Alto en SEO (contenido indexable sin JS) y en LCP.

---

## Fase 6: Sitemap avanzado

### 6.1 Agregar sitemap de efemérides
- **Archivo:** `src/app/sitemap/[slug]/route.ts`
- **Acción:** Agregar handler para `efemerides.xml` con 366 URLs (01-01 a 12-31).
- **Agregar al index:** `src/app/sitemap.xml/route.ts`

### 6.2 Agregar sitemap de críticas
- **Archivo:** `src/app/sitemap/[slug]/route.ts`
- **Acción:** Agregar handler para `criticas.xml` con URLs tipo `/pelicula/{slug}/criticas/{reviewId}`.
- **Query:** Join reviews con movies para construir las URLs.

### 6.3 Eliminar changefreq y priority del sitemap
- **Archivo:** `src/lib/sitemap.ts`
- **Por qué:** Google los ignora desde hace años. Solo agregan bytes innecesarios al XML.
- **Acción:** Simplificar `SitemapEntry` a solo `url` y `lastModified`. Actualizar `buildSitemapXml`.

### 6.4 Agregar lastmod al sitemap index
- **Archivo:** `src/app/sitemap.xml/route.ts`
- **Acción:** Consultar la fecha más reciente de cada sub-sitemap y pasarla como `lastModified`.

---

## Fase 7: Nice to have

### 7.1 Activar componente SimilarMovies
- **Archivo:** `src/components/movies/SimilarMovies.tsx` (ya existe pero no se usa)
- **Usar en:** `src/app/(site)/pelicula/[slug]/page.tsx`
- **Por qué:** Mejora internal linking y tiempo en sitio.

### 7.2 Agregar `theme-color` meta tag
- **Archivo:** `src/app/(site)/layout.tsx` — en `metadata`
- **Valor:** `#0f1419` (cine-dark)

### 7.3 Agregar Twitter Card al layout
- **Archivo:** `src/app/(site)/layout.tsx` — en `metadata`
- **Actualmente:** Solo las páginas de películas tienen `twitter` metadata.
- **Acción:** Agregar `twitter: { card: 'summary_large_image', site: '@cinenacional' }` al layout.

### 7.4 Agregar `datePublished`/`dateModified` a schemas
- **Archivos:** `MovieSchema.tsx`, `PersonSchema.tsx`
- **Acción:** Usar `createdAt`/`updatedAt` de Prisma. Los LLMs priorizan contenido con fechas.

### 7.5 Considerar IndexNow
- **Qué es:** Protocolo para notificar a Bing/Yandex inmediatamente cuando se publica contenido nuevo.
- **Cuándo:** Cuando se crea/actualiza una película o persona desde el admin.
- **Implementación:** POST a `https://api.indexnow.org/IndexNow` con la URL modificada.

### 7.6 GA con `lazyOnload`
- **Archivo:** `src/app/(site)/layout.tsx`
- **Cambio:** Cambiar `strategy="afterInteractive"` a `strategy="lazyOnload"` en los scripts de GA.
- **Por qué:** Reduce competencia por main thread post-hydration. Mínimo impacto en tracking.

---

## Resumen de impacto estimado

| Fase | Items | Impacto SEO | Esfuerzo |
|------|-------|-------------|----------|
| 1 — Fundamentos | 8 (4 completados) | Crítico | Bajo-Alto |
| 2 — Structured Data | 5 (1 completado) | Alto | Medio |
| 3 — Content/E-E-A-T | 5 (1 completado) | Alto | Medio-Alto |
| 4 — AI/GEO | 5 (1 completado) | Alto | Alto |
| 5 — Performance | 6 (1 completado) | Medio-Alto | Medio |
| 6 — Sitemap avanzado | 4 | Bajo-Medio | Bajo |
| 7 — Nice to have | 6 | Bajo | Bajo |

**Total:** 39 items, 8 completados, 31 pendientes.
