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

### 1.6 Agregar canonicals en todas las páginas públicas (parcialmente completado)
- **Páginas de detalle — ✅ COMPLETADO (`2796199`):**
  - ~~`src/app/(site)/layout.tsx` — home: `alternates: { canonical: '/' }`~~
  - ~~`src/app/(site)/pelicula/[slug]/page.tsx` — canonical a `/pelicula/${slug}`~~
  - ~~`src/app/(site)/persona/[slug]/page.tsx` — canonical a `/persona/${slug}`~~
  - ~~`src/app/(site)/efemerides/[[...date]]/page.tsx` — canonical a `/efemerides/${MM-DD}`~~
  - `src/app/(site)/pelicula/[slug]/criticas/[reviewId]/page.tsx` — página no existe aún
- **Páginas de listados (dependen de 1.5):**
  - ~~`src/app/(site)/listados/obituarios/[year]/page.tsx`~~ — ya tiene canonical
  - ~~`src/app/(site)/listados/peliculas/genero/[genreSlug]/page.tsx`~~ — ya tiene canonical
  - ~~`src/app/(site)/listados/estrenos/[year]/page.tsx`~~ — ya tiene canonical
  - ~~`src/app/(site)/listados/peliculas/page.tsx`~~ — ✅ COMPLETADO (`585d46e`) canonical a `/listados/peliculas`
  - ~~`src/app/(site)/listados/personas/page.tsx`~~ — ✅ COMPLETADO (`a8a312f`) canonical a `/listados/personas`
- **Búsqueda:** `/buscar` debería tener `noindex` en vez de canonical (no tiene sentido indexar resultados de búsqueda).
- **Páginas institucionales** — ya tienen canonical: `/contacto`, `/terminos`, `/privacidad`, `/sobre-nosotros`.

### 1.7 Agregar `generateMetadata` a páginas de listados (parcialmente completado)
- **Archivos completados:**
  - ~~`src/app/(site)/listados/peliculas/page.tsx`~~ — ✅ COMPLETADO (`585d46e`) título dinámico según filtros + descripción
  - ~~`src/app/(site)/listados/personas/page.tsx`~~ — ✅ COMPLETADO (`a8a312f`) título dinámico según filtros + descripción
- **Archivos pendientes:**
  - `src/app/(site)/listados/estrenos/page.tsx` — pendiente ("Estrenos del cine argentino — cinenacional.com").
  - `src/app/(site)/buscar/page.tsx` — metadata básica ("Buscar — cinenacional.com").

### 1.8 ~~Unificar formato de marca en titles~~ ✅ COMPLETADO (`f33977b`)
- **Qué se hizo:** Unificado el separador de marca a `" — cinenacional.com"` (em-dash) en todos los títulos: layout, película, persona, efemérides, estrenos (año/década/próximos) y críticas.
- **Archivos:** `layout.tsx`, `pelicula/[slug]/page.tsx`, `persona/[slug]/page.tsx`, `efemerides/[[...date]]/page.tsx`, `listados/estrenos/[year]/page.tsx`, `pelicula/[slug]/criticas/[reviewId]/page.tsx`.

---

## Fase 2: Structured Data (rich results)

### 2.1 ~~WebSite + Organization schema~~ ✅ COMPLETADO
- **Archivo:** `src/app/(site)/layout.tsx`
- **Qué se hizo:** JSON-LD con `@type: WebSite`, `SearchAction` (habilita sitelinks searchbox en Google), y `Organization` como publisher con logo y sameAs (X, Instagram).
- **Commit:** `ceb28b8`

### 2.2 ~~BreadcrumbList schema~~ ✅ COMPLETADO (`483e488`)
- **Qué se hizo:** Creado componente reutilizable `src/components/shared/BreadcrumbSchema.tsx` con JSON-LD `BreadcrumbList`. Usado en 4 páginas:
  - `pelicula/[slug]`: Inicio > Películas > {título}
  - `persona/[slug]`: Inicio > Personas > {nombre}
  - `listados/estrenos/[year]`: Inicio > Estrenos > {año/década/próximos}
  - `efemerides/[[...date]]`: Inicio > Efemérides > {día de mes}

### 2.3 ~~Mejorar MovieSchema — agregar sameAs, trailer, inLanguage~~ ✅ COMPLETADO (`209f328`)
- **Qué se hizo:** Agregados al schema JSON-LD de películas:
  - `sameAs`: IMDB link + links externos activos
  - `trailer`: `VideoObject` con embedUrl y thumbnailUrl para YouTube
  - `inLanguage: "es"`
  - `dateCreated`: fecha completa ISO 8601 cuando hay mes/día disponibles
  - `productionCompany`: productoras como `Organization`
- **Archivos:** `MovieSchema.tsx`, `pelicula/[slug]/page.tsx`

### 2.4 ~~Mejorar PersonSchema — agregar nationality~~ ✅ COMPLETADO (`9859e46`)
- **Qué se hizo:** Agregado `nationality` como array de `Country` al schema JSON-LD de personas, usando los datos de la tabla `nationalities` (ya cargados en la query).
- **Archivos:** `PersonSchema.tsx`, `persona/[slug]/page.tsx`

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

### 3.2 ~~Activar footer links~~ ✅ COMPLETADO
- **Archivo:** `src/components/layout/Footer.tsx`
- **Qué se hizo:** Activados links del footer para contacto, términos y privacidad.
- **Commit:** `18589bf`

### 3.3 ~~Crear páginas institucionales~~ ✅ COMPLETADO
- **Páginas creadas:**
  - ~~`/sobre-nosotros`~~ ✅ COMPLETADO (`488f4d2`) — página about con stats dinámicos
  - ~~`/contacto`~~ ✅ COMPLETADO (`e13cb00`) — página de contacto con email y redes sociales
  - ~~`/terminos`~~ ✅ COMPLETADO (`53567f3`) — términos de uso
  - ~~`/privacidad`~~ ✅ COMPLETADO (`53567f3`) — política de privacidad

### 3.4 ~~Fix alt text vacío en SearchResults~~ ✅ COMPLETADO (`31565c3`)
- **Archivo:** `src/components/layout/SearchResults.tsx`
- **Qué se hizo:** Cambiado `alt=""` a `alt={movie.title}` para películas y `alt={person.name}` para personas en los thumbnails de resultados de búsqueda.

### 3.5 ~~Mejorar fallback de description para personas~~ ✅ COMPLETADO (`d572887`)
- **Archivo:** `src/app/(site)/persona/[slug]/page.tsx` — en `generateMetadata`
- **Qué se hizo:** Cuando la persona no tiene biografía, se hace una query ligera para obtener sus roles (actor, director, etc.) y se genera una description como `"Ricardo Darín, actor, productor del cine argentino. Filmografía completa y biografía."` en vez del genérico anterior.

---

## Fase 4: AI Search / GEO (Generative Engine Optimization)

### 4.1 ~~Crear llms.txt~~ ✅ COMPLETADO
- **Archivo:** `public/llms.txt`
- **Qué se hizo:** Descripción del sitio, contenido principal, estructura de URLs, datos estructurados y contacto.
- **Commit:** `ceb28b8`

### 4.2 ~~Contenido narrativo auto-contenido en películas~~ ✅ COMPLETADO (`938fcab`)
- **Archivo:** `src/app/(site)/pelicula/[slug]/page.tsx`
- **Qué se hizo:** Se genera un párrafo introductorio server-side con título, género, año, directores, actores principales y primera oración de la sinopsis. Se renderiza como `<p className="sr-only">` para que los crawlers y LLMs lo puedan citar sin alterar el diseño visual.

### 4.3 ~~Contenido narrativo en personas~~ ✅ COMPLETADO (`691a816`)
- **Archivo:** `src/app/(site)/persona/[slug]/page.tsx`
- **Qué se hizo:** Se genera un párrafo introductorio server-side con nombre, roles, lugar/año de nacimiento, fallecimiento, cantidad total de películas y top 3 películas más recientes. Se renderiza como `<p className="sr-only">` para crawlers y LLMs.

### 4.4 ~~FAQ schema en páginas clave~~ ✅ COMPLETADO (`b520360`)
- **Archivos:** `src/components/shared/FAQSchema.tsx`, `pelicula/[slug]/page.tsx`, `persona/[slug]/page.tsx`
- **Qué se hizo:** Creado componente `FAQSchema` reutilizable con JSON-LD `FAQPage`. En películas: quién dirige, de qué trata, cuándo se estrenó, cuánto dura. En personas: cuántas películas hizo, dónde nació, en qué películas participó, cuándo murió (si aplica).

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

### 5.2 ~~Fix hero preload URL mismatch~~ ✅ COMPLETADO (`78a5879`)
- **Archivo:** `src/components/home/HeroSection.tsx`
- **Qué se hizo:** Agregado `c_limit` a `getHeroImageUrl` para que coincida con `getHeroPreloadUrl`. Ahora el preload es efectivo y el browser descarga la imagen una sola vez.

### 5.3 ~~Lazy load hero carousel images~~ ✅ YA RESUELTO
- **Archivo:** `src/components/home/HeroSection.tsx`
- **Estado:** El código existente ya aplica `priority` solo a `idx === 0`. `next/image` usa `loading="lazy"` por defecto en las demás, así que las imágenes con `idx > 0` ya son lazy. Verificado en browser.

### 5.4 ~~Resolver `force-dynamic` vs `revalidate`~~ ✅ COMPLETADO (`3ddda5c`)
- **Archivos:** 6 páginas: película, persona, críticas, sobre-nosotros, género, obituarios por año.
- **Qué se hizo:** Opción B — eliminado `revalidate = 3600` (que era inútil con `force-dynamic`). Se mantiene `force-dynamic` porque las páginas usan APIs dinámicas (cookies/headers vía middleware). ISR requeriría refactorizar el middleware para no usar dynamic APIs en estas rutas.

### 5.5 ~~Mover sanitización de HTML al server~~ ✅ COMPLETADO (`1183d9c`)
- **Archivos:** `pelicula/[slug]/page.tsx`, `MoviePageClient.tsx`, `MovieHero.tsx`
- **Qué se hizo:** Sanitización de sinopsis movida al server component. `MovieHero` ya no importa `isomorphic-dompurify` (~60KB menos en el client bundle). Persona ya lo hacía en el server. `MovieInfo.tsx` es código muerto (no se usa en ningún lado).

### ~~5.6 Migrar listados a Server Components~~ ✅ COMPLETADO (`585d46e`, `a8a312f`)
- **Qué se hizo:** Migrados `/listados/peliculas` y `/listados/personas` de 100% client-side (spinner + React Query) a Server Components con data fetching directo via Prisma. HTML indexable sin JS, con generateMetadata, canonicals y ServerPagination. Filtros como client components hijos con useTransition.
- **Archivos creados:** `src/lib/queries/peliculas.ts`, `src/lib/queries/personas.ts`, `PeliculasFilterBar.tsx`, `PersonasFilterBar.tsx`
- **Archivos eliminados:** `PeliculasContent.tsx`, `PeliculasFilters.tsx`, `PersonasContent.tsx`, `PersonasFilters.tsx`, `useListPage.ts`

---

## Fase 6: Sitemap avanzado

### 6.1 ~~Agregar sitemap de efemérides~~ ✅ COMPLETADO (`36deac9`)
- **Archivos:** `src/app/sitemap/[slug]/route.ts`, `src/app/sitemap.xml/route.ts`
- **Qué se hizo:** Agregado handler `efemerides` que genera 366 URLs (`/efemerides/01-01` a `/efemerides/12-31`) y registrado `efemerides.xml` en el sitemap index.

### 6.2 Agregar sitemap de críticas
- **Archivo:** `src/app/sitemap/[slug]/route.ts`
- **Acción:** Agregar handler para `criticas.xml` con URLs tipo `/pelicula/{slug}/criticas/{reviewId}`.
- **Query:** Join reviews con movies para construir las URLs.

### 6.3 ~~Eliminar changefreq y priority del sitemap~~ ✅ COMPLETADO (`6f29670`)
- **Archivos:** `src/lib/sitemap.ts`, `src/app/sitemap/[slug]/route.ts`
- **Qué se hizo:** Eliminados `changeFrequency` y `priority` de `SitemapEntry` y de todo el XML generado. Las entradas ahora solo tienen `url` y opcionalmente `lastModified`. ~45 líneas menos.

### 6.4 ~~Agregar lastmod al sitemap index~~ ✅ COMPLETADO (`f106046`)
- **Archivo:** `src/app/sitemap.xml/route.ts`
- **Qué se hizo:** Se consulta el `updatedAt` más reciente de movies y people y se pasa como `lastModified` a los sub-sitemaps del index (movies, people, estrenos, obituarios, static).

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
| 1 — Fundamentos | 8 (6 completados) | Crítico | Bajo-Alto |
| 2 — Structured Data | 5 (1 completado) | Alto | Medio |
| 3 — Content/E-E-A-T | 5 (3 completados) | Alto | Medio-Alto |
| 4 — AI/GEO | 5 (1 completado) | Alto | Alto |
| 5 — Performance | 6 (1 completado) | Medio-Alto | Medio |
| 6 — Sitemap avanzado | 4 | Bajo-Medio | Bajo |
| 7 — Nice to have | 6 | Bajo | Bajo |

**Total:** 39 items, 12 completados, 27 pendientes.
