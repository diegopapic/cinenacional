# Informe de Auditoría de Seguridad — CineNacional

**Fecha:** 2026-03-02
**Alcance:** Análisis estático completo del codebase
**Estado:** Solo diagnóstico, sin implementación de correcciones

---

## Resumen ejecutivo

Se identificaron **21 hallazgos de seguridad** en el proyecto, de los cuales 3 son críticos, 5 de severidad alta, 6 de severidad media, 4 de severidad baja y 3 informativos. Los problemas más urgentes están relacionados con secretos expuestos en el repositorio y falta de autorización en endpoints de lectura.

| Severidad      | Cantidad |
| -------------- | -------- |
| Crítica        | 3        |
| Alta           | 5        |
| Media          | 6        |
| Baja           | 4        |
| Informacional  | 3        |
| **Total**      | **21**   |

---

## 1. Hallazgos críticos

### 1.1 Secretos expuestos en control de versiones

- **Categoría:** Gestión de secretos
- **Severidad:** CRÍTICA
- **Archivos:** `.env`, `.env.local`, `.env.staging`

**Descripción:**
Múltiples archivos de entorno contienen credenciales en texto plano que están o estuvieron commiteadas en git:

- Credenciales de base de datos PostgreSQL (usuario y contraseña)
- Token de API de TMDB
- API key de Anthropic
- Token de bot de Telegram
- Credenciales de Cloudinary (API key y secret)
- Password de admin hardcodeado
- Múltiples valores de `NEXTAUTH_SECRET`
- El historial de git muestra que `.env.production` fue commiteado en al menos 3 commits

**Riesgo:** Compromiso total de base de datos, APIs de terceros, cuentas de administración y tokens de autenticación. Un atacante con acceso al repo puede impersonar la aplicación ante servicios externos.

---

### 1.2 IP de producción expuesta en package.json

- **Categoría:** Exposición de infraestructura
- **Severidad:** CRÍTICA
- **Archivo:** `package.json` (línea 26)

**Descripción:**
El script `perf:test:prod` contiene la IP pública del servidor de producción hardcodeada:

```json
"perf:test:prod": "BASE_URL=https://5.161.58.106:3000 NODE_ENV=production node scripts/measure-performance.js"
```

**Riesgo:** La IP pública del servidor queda expuesta en el repositorio, facilitando reconocimiento y ataques dirigidos (port scanning, DoS, explotación de servicios expuestos).

---

### 1.3 Falta de autorización en endpoints de lectura (CRUD)

- **Categoría:** Autorización
- **Severidad:** CRÍTICA
- **Archivos:** Todas las rutas que usan `createListAndCreateHandlers` — calificaciones, genres, themes, etc.

**Descripción:**
Mientras que los endpoints POST están protegidos con `requireAuth()` (línea 239 de `crud-factory.ts`), los endpoints GET son completamente públicos. No hay chequeo de autenticación en operaciones de lectura/listado.

**Riesgo:** Cualquier usuario no autenticado puede enumerar y ver todas las entradas de la base de datos a través de la API.

---

## 2. Hallazgos de severidad alta

### 2.1 Rate limiting insuficiente en autenticación

- **Categoría:** DoS / Fuerza bruta
- **Severidad:** ALTA
- **Archivo:** `src/middleware.ts` (líneas 10-13)

**Descripción:**
La configuración actual permite 10 intentos de autenticación en 5 minutos:

```javascript
const RATE_LIMITS = {
  api: { requests: 1000, window: 60000 },
  auth: { requests: 10, window: 300000 },
  search: { requests: 500, window: 60000 }
}
```

Problemas adicionales:
- Usa `Map` en memoria, se pierde al reiniciar el servidor
- No funciona en deployments multi-instancia
- El rate limiting solo aplica si el request tiene IP válida (fallback a `'unknown'`)

**Riesgo:** Ataques de fuerza bruta contra login de admin, credential stuffing, ataques DoS.

---

### 2.2 Problemas de seguridad en sesiones

- **Categoría:** Gestión de sesiones
- **Severidad:** ALTA
- **Archivo:** `src/lib/auth.ts` (líneas 99-109)

**Descripción:**
- Cookies sin flag `secure` en entornos no-production (staging, desarrollo)
- `sameSite` configurado como `'lax'` en vez de `'strict'`
- Tokens de sesión vulnerables a XSS en entornos de desarrollo

**Riesgo:** Secuestro de sesión, ataques CSRF en ciertos escenarios, robo de cookies.

---

### 2.3 Riesgo de inyección SQL en parámetro `limit`

- **Categoría:** Inyección SQL
- **Severidad:** ALTA
- **Archivo:** `src/app/api/search/route.ts` (líneas 52-78)

**Descripción:**
El parámetro `limit` controlado por el usuario se interpola en la query SQL sin validación de rango:

```typescript
movies = await prisma.$queryRaw`
  SELECT ... FROM movies WHERE
    unaccent(LOWER(title)) LIKE unaccent(${searchPattern})
  ...
  LIMIT ${limit}
`
```

No hay validación de que `limit` sea positivo o esté dentro de un rango razonable.

**Riesgo:** Degradación de performance de base de datos, agotamiento de memoria, posible disclosure de datos a través de mensajes de error.

---

### 2.4 Endpoints de salud sin autenticación

- **Categoría:** Autorización
- **Severidad:** ALTA
- **Archivos:** `src/app/api/health/db/route.ts`, `src/app/api/health/route.ts`

**Descripción:**
Los endpoints de health check exponen información sensible sin requerir autenticación:
- Conteos de conexiones a base de datos
- Estadísticas de pool de conexiones
- Tiempos de respuesta
- Conteos de registros en tablas
- Variable `NODE_ENV`

**Riesgo:** Información útil para planificar ataques DoS o para reconocimiento de infraestructura.

---

### 2.5 Credenciales iniciales hardcodeadas

- **Categoría:** Autenticación
- **Severidad:** ALTA
- **Archivo:** `.env.local` (líneas 28-30)

**Descripción:**
Email, contraseña y username de admin en texto plano en el repositorio:

```
ADMIN_EMAIL=diego.papic@gmail.com
ADMIN_PASSWORD=jW4a^hp#W&2d
ADMIN_USERNAME=admin
```

Aunque se roten después, permanecen en el historial de git.

**Riesgo:** Acceso administrativo completo usando credenciales del repositorio.

---

## 3. Hallazgos de severidad media

### 3.1 Dependencias vulnerables conocidas

- **Categoría:** Gestión de dependencias
- **Severidad:** MEDIA

Paquetes con vulnerabilidades conocidas:
- `next` 10.0.0-15.5.9 — DoS vía Image Optimizer y deserialización HTTP
- `ajv` <6.14.0 — Vulnerabilidad ReDoS
- `minimatch` <=3.1.3 — Múltiples vulnerabilidades ReDoS
- `vue-template-compiler` >=2.0.0 — Vulnerabilidad XSS

**Riesgo:** Ataques ReDoS, DoS y XSS a través de dependencias transitivas.

---

### 3.2 Sin validación de token CSRF

- **Categoría:** CSRF
- **Severidad:** MEDIA
- **Archivo:** `src/middleware.ts` (líneas 161-183)

**Descripción:**
La protección CSRF depende solo de headers `Origin`/`Referer`, sin token CSRF dedicado. Las rutas de NextAuth están excluidas del chequeo. El browser no envía header `Origin` en requests same-origin, por lo que la validación es incompleta.

**Riesgo:** Ataques CSRF posibles en ciertos contextos.

---

### 3.3 CSP demasiado permisiva

- **Categoría:** Content Security Policy
- **Severidad:** MEDIA
- **Archivo:** `src/middleware.ts` (líneas 98-114)

**Descripción:**
- Usa `'unsafe-inline'` en `script-src`, anulando la protección contra XSS
- Múltiples redes de ads y scripts de terceros en whitelist
- `connect-src` muy amplio permitiendo conexiones a muchos dominios de terceros
- No usa nonces ni hashes para scripts

**Riesgo:** Reducción significativa de la efectividad de CSP contra ataques XSS.

---

### 3.4 Mensajes de error verbosos

- **Categoría:** Exposición de información
- **Severidad:** MEDIA
- **Archivos:** `src/app/api/health/route.ts` (línea 24), `src/lib/api/api-handler.ts` (línea 17)

**Descripción:**
Se retornan mensajes de error crudos y detalles de validación Zod al cliente:

```typescript
// health/route.ts
error: error instanceof Error ? error.message : 'Unknown error'

// api-handler.ts
{ error: 'Datos inválidos', details: error.errors }
```

**Riesgo:** Revelación de estructura interna de la API, rutas de archivos, configuración del sistema.

---

### 3.5 Logging excesivo de información sensible

- **Categoría:** Exposición de información
- **Severidad:** MEDIA
- **Archivo:** `src/middleware.ts` (línea 139) y múltiples rutas

**Descripción:**
133 llamadas a `console.error` en rutas de API. El middleware loguea IPs y patrones de acceso:

```typescript
console.log(`Rate limit exceeded for IP: ${clientKey} on path: ${path}`)
```

Sin agregación segura ni sistema de logging dedicado.

**Riesgo:** Exposición de información sensible en logs de producción.

---

### 3.6 Salt de hashing de IP débil y hardcodeado

- **Categoría:** Privacidad
- **Severidad:** MEDIA
- **Archivo:** `src/app/api/analytics/pageview/route.ts` (líneas 29-33)

**Descripción:**

```typescript
const salt = process.env.IP_HASH_SALT || 'cinenacional-analytics-2024'
```

El salt por defecto es débil, predecible y hardcodeado.

**Riesgo:** Reversión del hash para identificar IPs de usuarios si el salt por defecto está en uso.

---

## 4. Hallazgos de severidad baja

### 4.1 Parámetros numéricos sin validación de rango

- **Categoría:** Validación de entrada
- **Severidad:** BAJA
- **Archivos:** `src/app/api/search/route.ts`, `src/app/api/analytics/pageview/route.ts`, `src/app/api/efemerides/route.ts`

**Descripción:**
Parámetros como `limit` y `days` se parsean con `parseInt()` sin verificar rangos máximos/mínimos.

**Riesgo:** Valores extremos pueden causar problemas de performance o agotamiento de memoria.

---

### 4.2 Sanitización XSS solo del lado del cliente

- **Categoría:** XSS
- **Severidad:** BAJA
- **Archivos:** Componentes de búsqueda, `MovieHero.tsx`

**Descripción:**
DOMPurify se usa para sanitización, pero solo del lado del cliente. Si contenido malicioso llega a sinopsis o biografías, la sanitización depende de la correcta configuración de DOMPurify en el browser.

**Riesgo:** XSS basado en DOM si la configuración de DOMPurify es incorrecta o se bypasea.

---

### 4.3 Generación de slugs con hash no criptográfico

- **Categoría:** Colisiones
- **Severidad:** BAJA
- **Archivo:** `src/lib/utils.ts` (líneas 31-37)

**Descripción:**
Se usa un hash simple (shift + multiplicación) para generar slugs de títulos sin caracteres alfanuméricos. Las colisiones son posibles.

**Riesgo:** Colisiones de slugs que lleven a confusión de contenido.

---

### 4.4 Detalles de validación Zod expuestos

- **Categoría:** Exposición de información
- **Severidad:** BAJA
- **Archivo:** `src/lib/api/api-handler.ts`

**Descripción:**
Los errores de validación de Zod se retornan completos al cliente, revelando la estructura esperada de los datos.

**Riesgo:** Facilita ingeniería inversa de la API.

---

## 5. Hallazgos informativos

### 5.1 TypeScript ignorando errores en build

- **Archivo:** `next.config.js` (líneas 31-33)

```javascript
typescript: { ignoreBuildErrors: true }
```

Errores de tipos silenciados en build. Podría ocultar problemas de seguridad relacionados con tipos.

---

### 5.2 Source maps en producción deshabilitados (positivo)

- **Archivo:** `next.config.js` (línea 85)

`productionBrowserSourceMaps: false` — correctamente configurado.

---

### 5.3 Audit logging de intentos de login presente (positivo)

- **Archivo:** `src/lib/auth.ts` (líneas 58-67)

Los intentos de login se registran en tabla `auditLog`. Esto es una buena práctica.

---

## Plan de remediación recomendado

### Inmediato (esta semana)

1. ~~**Rotar todos los secretos** — contraseñas de BD, API keys, tokens, NEXTAUTH_SECRET~~ ✅ Completado 2026-03-02
   - DB password, TMDB token, Anthropic API key, Telegram bot token, Cloudinary key+secret, NEXTAUTH_SECRET rotados
   - IP_HASH_SALT generado y configurado como variable de entorno requerida
   - Salt fallback hardcodeado eliminado de `analytics/pageview/route.ts`
2. ~~**Limpiar historial de git** con `git filter-repo` para eliminar secretos de commits anteriores~~ ✅ Completado 2026-03-02
   - `.env.production` eliminado de los 742 commits del historial
   - Force push realizado a GitHub
3. ~~**Mover la IP de producción** fuera de `package.json` a una variable de entorno~~ ✅ Completado 2026-03-02
   - IP eliminada del script `perf:test:prod`, ahora requiere `BASE_URL` como env var
4. ~~**Agregar `.env*` a `.gitignore`** (excepto `.env.example` sin valores reales)~~ ✅ Ya estaba configurado + `.env.example` creado 2026-03-02

### Corto plazo (1-2 semanas)

5. ~~**Proteger endpoints de lectura** con autorización donde corresponda~~ ✅ Completado 2026-03-02
   - `requireAuth()` agregado a GET en `createListAndCreateHandlers` y `createItemHandlers` (crud-factory.ts)
   - `requireAuth()` agregado a GET custom en `/api/roles/route.ts`
   - Endpoints protegidos: calificaciones, genres, themes, screening-venues, roles (list + detail)
6. ~~**Implementar rate limiting persistente** con Redis o similar~~ ✅ Completado 2026-03-02
   - Creado `src/lib/rate-limit.ts` con Redis (ioredis) + fallback in-memory
   - Rate limiting Redis aplicado en POST `/api/auth/[...nextauth]` (10 req/5min)
   - Rate limiting Redis aplicado en GET `/api/search` (60 req/min)
   - Middleware conservado como primera línea de defensa (in-memory, Edge Runtime)
7. ~~**Fortalecer CSP** — reemplazar `unsafe-inline` con nonces~~ ✅ Completado 2026-03-02
   - Nonce per-request generado en middleware con `crypto.randomUUID()`
   - `script-src` usa `'nonce-xxx' 'strict-dynamic'` en vez de `'unsafe-inline'`
   - `'strict-dynamic'` propaga confianza a scripts cargados dinámicamente (GTM, GA, AdSense)
   - `'unsafe-inline'` y `https:` mantenidos como fallback para browsers sin soporte de nonces
   - Nonce pasado a layout via header `x-nonce` y aplicado a todos los `<Script>` components
   - `style-src` mantiene `'unsafe-inline'` (requerido por Next.js para estilos inline)
8. ~~**Actualizar dependencias vulnerables** (`next`, `ajv`, `minimatch`)~~ ✅ Completado 2026-03-02
   - `next` actualizado de 14.2.35 a 15.5.12 (corrige GHSA-9g9p-9gw9-jx7f y GHSA-h25m-26qc-wcjf)
   - `ajv` actualizado a 6.14.0+ via npm audit fix (corrige ReDoS GHSA-2g4f-4pwh-qvx6)
   - `minimatch` actualizado en todas las instancias transitivas via npm audit fix
   - `documentation` devDependency eliminada (traía `vue-template-compiler` vulnerable sin parche disponible, reemplazada por `typedoc`/`jsdoc`)
   - Código migrado a Next.js 15: `headers()` async, `params` como Promise en 10 archivos, `swcMinify` eliminado
   - `npm audit`: 0 vulnerabilidades
9. ~~**Proteger endpoints de health** con autenticación o limitar información expuesta~~ ✅ Completado 2026-03-02
   - `/api/health` simplificado: solo retorna `status` y `timestamp` (sin uptime, environment ni errores detallados)
   - `/api/health/db` protegido con `requireAuth()`: requiere sesión ADMIN/EDITOR para acceder a estadísticas de BD
   - Mensajes de error en ambos endpoints sanitizados (no exponen detalles internos)

### Mediano plazo (1 mes)

10. ~~**Implementar tokens CSRF** para formularios~~ ✅ Completado 2026-03-03
   - Patrón signed double-submit cookie: middleware genera token HMAC-SHA256, setea cookie non-httpOnly
   - Cliente lee cookie y envía como header `X-CSRF-Token` en cada mutación
   - Middleware valida header === cookie Y firma válida (previene cookie injection)
   - Exclusiones: `/api/auth/` (NextAuth maneja CSRF propio), `/api/analytics/` (usa sendBeacon)
   - 21 archivos actualizados: middleware, api-client, 18 formularios/páginas admin
11. ~~**Validar rangos** en todos los parámetros numéricos de la API~~ ✅ Completado 2026-03-03
   - Creado `src/lib/api/parse-params.ts` con utilidades `parseIntClamped`, `parseFloatClamped`, `parsePositiveInt` y constantes de rango
   - `limit` clampeado a 1-100 en todas las rutas (search, movies, people, festivals, images, roles, crud-factory)
   - `page` clampeado a 1-10000 en todas las rutas
   - `days` clampeado a 1-365 en analytics/pageview
   - Años (`year`, `yearFrom`, `yearTo`, `birthYear`, `deathYear`, etc.) clampeados a 1890-2100
   - IDs de filtros (`locationId`, `genreId`, `roleId`, etc.) validados como enteros positivos con `parsePositiveInt`
   - Coordenadas (`latitude`, `longitude`) validadas con `parseFloatClamped` (-90/90, -180/180)
   - `dia`/`mes` en efemerides clampeados a 1-31 y 1-12 respectivamente
   - `parseId` en crud-factory actualizado para rechazar IDs <= 0
   - 15 archivos de API actualizados
12. **Sanitizar mensajes de error** en producción (no exponer detalles internos)
13. **Implementar sistema de logging** centralizado y seguro
14. **Fortalecer cookies de sesión** — `sameSite: 'strict'`, revisar flags
15. ~~**Generar salt de IP dinámicamente** y almacenarlo de forma segura~~ ✅ Completado 2026-03-02 (resuelto en punto 1)
