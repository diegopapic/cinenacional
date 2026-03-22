# Migración a React 19.2 / Next.js 16.2

Estado actual: **Next.js 15.5.12** + **React 18.3.x** + **NextAuth v4** → Objetivo: **Next.js 16.2.x** + **React 19.2.x** + **Auth.js v5**

Fuentes:
- [Guía oficial de upgrade a Next.js 16](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [React 19 Upgrade Guide](https://react.dev/blog/2024/04/25/react-19-upgrade-guide)
- [NextAuth + Next.js 16 issue](https://github.com/nextauthjs/next-auth/issues/13302)
- [Migrating to Auth.js v5](https://authjs.dev/getting-started/migrating-to-v5)

---

## Fase 0: Preparación y auditoría pre-migración ✅

- [x] Ejecutar `npm run build` y `npm run lint` — build OK, lint tenía 558 errores preexistentes.
- [x] Hacer commit de cualquier cambio pendiente en `main` (a29d576).
- [x] Crear backup del `package.json` y `package-lock.json` actuales (`*.bak`).
- [x] Revisar `tasks/lessons.md` para contexto — OK.

---

## Fase 0.5: Limpiar errores de ESLint preexistentes

### 0.5a. Errores auto-fixeables ✅ (commit 50fe685)

Reducidos de 558 → 433 errores.

- [x] **`prefer-const`** (6 → 0): Auto-fix `let` → `const`.
- [x] **`no-unused-vars`** (89 → 0): Eliminados imports/variables sin usar, bare `catch {}`, configurado `argsIgnorePattern: "^_"` en `eslint.config.mjs`.
- [x] **`no-unescaped-entities`** (30 → 0): Reemplazado `"` → `&quot;` en JSX text.

### 0.5b. Imágenes y accesibilidad ✅ (commit 2dbb702)

Reducidos de 433 → 399 errores.

- [x] **`@next/next/no-img-element`** (29 → 0): Regla desactivada globalmente — todas las imágenes son URLs de Cloudinary con transformaciones dinámicas. Migración a `next/image` + loader planificada en Fase 5d.
- [x] **`jsx-a11y/alt-text`** (1 → 0): Renombrado import `Image` → `ImageIcon` (lucide) para evitar falso positivo.
- [x] **`jsx-a11y/role-has-required-aria-props`** (1 → 0): Agregado `aria-controls` al combobox en Header.
- [x] **`react/jsx-no-comment-textnodes`** (1 → 0): Eliminados `// ✅` inline en JSX.
- [x] **`@next/next/no-html-link-for-pages`** (1 → 0): Reemplazado `<a>` por `<Link>` en admin dashboard.
- [x] **`react-hooks/exhaustive-deps`** (1 → 0): `eslint-disable` con justificación en `usePageView`.

### 0.5c. `no-explicit-any` (399) — estrategia incremental

Estos NO se arreglan ahora. Son deuda técnica que se ataca incrementalmente post-migración. Razones:
- La migración puede cambiar tipos (Auth.js v5, React 19 types) → trabajo doble si se tipifican ahora.
- 399 `any` requieren entender el tipo correcto caso por caso.
- Se pueden ir resolviendo archivo por archivo después de la Fase 5.

### 0.5d. Verificación ✅

- [x] `npm run build` pasa.
- [x] `npx eslint src/` muestra solo `no-explicit-any` (399) como errores restantes.

---

## Fase 1: NextAuth v4 → Auth.js v5

**Hacer PRIMERO, todavía en Next.js 15 + React 18.** Así se debuggea contra un stack conocido.

NextAuth v4 (4.24.11) declara peer dependency `next@"^12 || ^13 || ^14 || ^15"` — no incluye Next.js 16. Más allá del peer dep, hay reportes de errores de runtime con React 19 en componentes client-side de next-auth (hooks internos de `SessionProvider`). Aunque este proyecto no usa `SessionProvider`, es preferible no arriesgarse y migrar primero.

Auth.js v5 requiere Next.js ≥14, así que se puede migrar sin problemas en el stack actual.

### 1a. Instalar Auth.js v5

- [ ] `npm install next-auth@5` (reemplaza v4).
- [ ] `npm install @auth/prisma-adapter` (reemplaza `@next-auth/prisma-adapter`).
- [ ] `npm uninstall @next-auth/prisma-adapter`.

### 1b. Reestructurar auth config

- [ ] Crear `src/auth.ts` (o `auth.ts` en raíz) con el nuevo formato:
  ```ts
  import NextAuth from "next-auth"
  import { authConfig } from "./lib/auth-config"
  export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)
  ```
- [ ] Migrar `src/lib/auth.ts` → `src/lib/auth-config.ts`:
  - `authOptions` → exportar como config object para `NextAuth()`.
  - Cambiar `CredentialsProvider` import de `next-auth/providers/credentials` → `@auth/core/providers/credentials` (o el equivalente v5).
  - Adaptar callbacks (jwt, session) al nuevo formato si cambió.
- [ ] Actualizar `src/app/api/auth/[...nextauth]/route.ts`:
  - Reemplazar handler manual por `export const { GET, POST } = handlers` importado de `src/auth.ts`.

### 1c. Actualizar `requireAuth()`

- [ ] En `src/lib/auth.ts` (o donde quede el helper):
  - Reemplazar `getServerSession(authOptions)` → `auth()` de Auth.js v5.
  - `auth()` retorna la sesión directamente, sin necesidad de pasar config.
- [ ] Buscar todos los archivos que importan `requireAuth` o `getServerSession` — verificar que siguen funcionando.

### 1d. Actualizar middleware (todavía `middleware.ts` en esta fase)

- [ ] `getToken()` de `next-auth/jwt` → verificar si el import y la API cambiaron en v5.
- [ ] Auth.js v5 opcionalmente exporta un `auth` middleware wrapper — evaluar si conviene usarlo o mantener el check manual con `getToken`.

### 1e. Actualizar client-side

- [ ] `signIn()` de `next-auth/react` → verificar si cambia el import en v5.
- [ ] `src/app/admin/login/page.tsx` — actualizar llamada a `signIn("credentials", ...)`.

### 1f. Verificación

- [ ] `npm run build` sin errores.
- [ ] Test manual: login con credenciales, acceso a `/admin/*`, logout.
- [ ] Verificar que `requireAuth()` funcione en API routes y server components.
- [ ] Verificar que el middleware siga protegiendo `/admin/*`.

---

## Fase 2: Actualizar React 18 → 19 y tipos

### 2a. Actualizar dependencias core

- [ ] `npm install react@latest react-dom@latest`
- [ ] `npm install -D @types/react@latest @types/react-dom@latest`

### 2b. Verificar breaking changes de React 19

El codebase ya está limpio de APIs deprecated (no usa PropTypes, defaultProps, string refs, forwardRef, legacy context, ReactDOM.render). Los cambios que sí aplican:

- [ ] **TypeScript**: `@types/react@19` elimina tipos implícitos de children en `React.FC`. Buscar todos los `React.FC` y `React.FunctionComponent` — agregar `children` explícitamente donde corresponda al tipo de props.
- [ ] **`ref` como prop**: React 19 pasa `ref` como prop regular. No usamos `forwardRef` así que no hay cambio, pero verificar que ningún componente tenga conflictos con prop `ref`.
- [ ] **`useRef` requiere argumento**: `useRef()` sin argumento ahora es error de tipos. Buscar todos los `useRef()` y agregar `useRef(null)` donde falte.
- [ ] **Cleanup en `ref` callbacks**: React 19 soporta retornar cleanup de ref callbacks. Verificar que ningún ref callback retorne algo accidentalmente.
- [ ] **`useDeferredValue` initialValue**: Si se usa, verificar la nueva firma. (Probablemente no aplica.)
- [ ] Ejecutar `npm run build` — corregir errores de tipos que surjan.

### 2c. Verificar librerías de terceros con React 19

- [ ] **react-hot-toast ^2.5.2**: Verificar compatibilidad con React 19. Si hay problemas, buscar alternativa (sonner, react-toastify) o fijar versión con override.
- [ ] **@radix-ui/react-dialog, react-select, react-tabs**: Verificar que las versiones actuales soporten React 19. Actualizar si es necesario.
- [ ] **@tanstack/react-query ^5.80.6**: Soporta React 19 — solo verificar que no haya warnings.
- [ ] **@hookform/resolvers + react-hook-form ^7.57**: Verificar compatibilidad.
- [ ] **@dnd-kit/core, sortable, utilities**: Verificar compatibilidad.
- [ ] **next-cloudinary ^6.16**: Verificar compatibilidad.
- [ ] **lucide-react ^0.513**: Verificar compatibilidad.
- [ ] **isomorphic-dompurify ^2.28**: Verificar compatibilidad.
- [ ] Ejecutar `npm run build` y `npm run lint` — corregir cualquier issue.

---

## Fase 3: Actualizar Next.js 15 → 16

### 3a. Actualizar dependencia

- [ ] `npm install next@latest`
- [ ] `npm install -D eslint-config-next@latest`

### 3b. Async Request APIs (ya resuelto)

El codebase **ya usa async** para `headers()`, `params`, `searchParams` y `generateMetadata()`. Verificación rápida:

- [ ] Buscar `cookies()` sin `await` — no debería haber ninguno (no se usa).
- [ ] Buscar `headers()` sin `await` — ya es async en `layout.tsx`.
- [ ] Buscar acceso sincrónico a `params` en pages/layouts/routes — ya son `Promise<...>`.
- [ ] Buscar acceso sincrónico a `searchParams` — ya son `Promise<...>`.
- [ ] Opcionalmente ejecutar el codemod como verificación: `npx @next/codemod@canary upgrade latest`.

### 3c. Middleware → Proxy (breaking change)

Next.js 16 depreca `middleware.ts` y la renombra a `proxy.ts`.

- [ ] Renombrar `src/middleware.ts` → `src/proxy.ts`.
- [ ] Renombrar la función exportada `middleware()` → `proxy()`.
- [ ] Renombrar el `export const config` si usa `matcher` — el formato se mantiene igual pero verificar.
- [ ] En `next.config.js`: si usa `skipMiddlewareUrlNormalize`, cambiar a `skipProxyUrlNormalize`. (No lo usamos actualmente.)
- [ ] Verificar que `getToken` de Auth.js v5 sigue funcionando en proxy context.
- [ ] Verificar que el CSRF, rate limiting, CSP y demás lógica funcione igual en `proxy.ts`.

### 3d. Turbopack como default (breaking change)

Next.js 16 usa Turbopack por defecto para `next dev` y `next build`. Nuestro `next.config.js` tiene configuración `webpack` custom.

- [ ] **Evaluar la config webpack actual**:
  - `config.optimization.minimize = true` — Turbopack maneja esto internamente, no hace falta.
  - `config.resolve.fallback = { fs: false, path: false, crypto: false }` — Migrar a `turbopack.resolveAlias` o verificar si realmente algún código client-side importa estos módulos.
- [ ] **Opción A (recomendada)**: Migrar a Turbopack completo.
  - Eliminar la función `webpack()` de `next.config.js`.
  - Si es necesario, agregar `turbopack.resolveAlias` para los fallbacks:
    ```js
    turbopack: {
      resolveAlias: {
        fs: { browser: './empty.ts' },
        path: { browser: './empty.ts' },
        crypto: { browser: './empty.ts' },
      }
    }
    ```
  - Testear con `next dev` y `next build`.
- [ ] **Opción B (fallback)**: Usar `--webpack` flag temporalmente.
  - Actualizar scripts en `package.json`: `"build": "prisma generate && next build --webpack"`.
  - Planificar migración a Turbopack después.
- [ ] Actualizar `package.json` scripts — remover `--turbopack` si existe (ya es default).

### 3e. Cambios en next.config.js

- [ ] **`experimental.serverActions`**: Mover `serverActions.bodySizeLimit` fuera de `experimental` si Next.js 16 lo promueve a estable. Verificar docs.
- [ ] **`experimental.workerThreads` y `cpus`**: Verificar si siguen siendo válidos o fueron removidos.
- [ ] **`turbopack` config**: Si había algo en `experimental.turbopack`, moverlo al nivel superior.
- [ ] **`typescript.ignoreBuildErrors: true`**: Mantener por ahora, pero evaluar si conviene desactivar.
- [ ] **`images` config**: Verificar cambios de defaults:
  - `minimumCacheTTL` ahora es 14400s (4h) por default — OK para nuestro caso.
  - `imageSizes` ya no incluye 16px — OK.
  - `qualities` ahora es `[75]` por default — OK.
- [ ] **`eslint` key removida del config**: Verificar que no la tengamos (no la tenemos).
- [ ] Ejecutar `npm run build` — corregir errores.

### 3f. ESLint: `next lint` removido

Next.js 16 elimina el comando `next lint`. Hay que usar ESLint directamente.

- [ ] Actualizar `package.json`:
  - Cambiar `"lint": "next lint"` → `"lint": "eslint ."` (flat config no necesita `--ext`).
- [ ] Ya tenemos `eslint.config.mjs` con flat config — verificar que funcione con `eslint-config-next@latest`.
- [ ] La config usa `FlatCompat` para extender `next/core-web-vitals` y `next/typescript` — verificar que `@next/eslint-plugin-next` sigue funcionando.
- [ ] Si ESLint 9+ cambia algo, actualizar la config.
- [ ] Ejecutar el nuevo comando lint y corregir errores.

---

## Fase 4: Tailwind CSS 3 → 4 (opcional, recomendado)

Tailwind CSS 4 no es requerido por Next.js 16, pero trae mejoras de build performance (3-10x faster) y es el camino forward.

### 4a. Evaluar viabilidad

- [ ] Verificar que los browsers target (Chrome 111+, Safari 16.4+) son compatibles con Tailwind v4.
- [ ] Revisar plugins: `@tailwindcss/typography` — verificar si hay versión v4.
- [ ] Revisar colores oklch custom — Tailwind v4 soporta oklch nativamente, potencialmente simplifica la config.

### 4b. Ejecutar migración automática

- [ ] `npx @tailwindcss/upgrade` — migra clases y config automáticamente.
- [ ] Revisar cambios manuales necesarios:
  - `tailwind.config.js` → migrar a CSS-first config con `@theme` directive en `globals.css`.
  - `postcss.config.js` → simplificar (Tailwind v4 incluye su propio PostCSS plugin).
  - Colores oklch custom con alpha → migrar a `@theme` en CSS.
  - Fuentes custom → migrar a `@theme`.
  - Animaciones custom (fade-in, shimmer, stats-scroll) → migrar a CSS.
- [ ] Verificar que `tailwind-merge` sigue funcionando con v4 class names.
- [ ] Eliminar `autoprefixer` del `postcss.config.js` (Tailwind v4 lo incluye internamente).
- [ ] Ejecutar `npm run build` y verificar visualmente las páginas.

---

## Fase 5: Limpieza y optimización post-migración

### 5a. Activar React Compiler (opcional)

Next.js 16 tiene soporte estable para React Compiler. Memoización automática.

- [ ] `npm install -D babel-plugin-react-compiler`
- [ ] Agregar `reactCompiler: true` en `next.config.js`.
- [ ] Testear performance — puede aumentar tiempos de build.
- [ ] Si hay problemas, deshabilitar y evaluar caso por caso.

### 5b. Explorar nuevas APIs de React 19.2

- [ ] **`useEffectEvent`**: Evaluar si alguno de nuestros hooks de infraestructura se beneficia (especialmente `useInterval`, `useWindowEvent`).
- [ ] **View Transitions**: Evaluar para transiciones de navegación en el sitio público.
- [ ] **Activity**: Evaluar para el admin (mantener estado de tabs/modals en background).

### 5c. Explorar nuevas APIs de Next.js 16

- [ ] **`updateTag`**: Evaluar para mutaciones del admin (revalidación inmediata post-edit).
- [ ] **`refresh()`**: Evaluar para Server Actions.
- [ ] **`cacheLife` / `cacheTag`**: Evaluar si nuestras páginas con `revalidate` se benefician.
- [ ] **`cacheComponents`**: Evaluar PPR para páginas mixtas (shell estático + datos dinámicos).

### 5d. Migrar `<img>` a `next/image` con Cloudinary loader

Actualmente todas las imágenes usan `<img>` con URLs de Cloudinary que ya incluyen transformaciones (`f_auto`, `q_auto`, `w_XXX`). Migrar a `next/image` aporta lazy loading automático, `srcset` responsivo, preload de LCP images con `priority`, y formato automático (avif/webp).

Hacer post-migración porque: (1) la config de `images` cambia en Next.js 16, mejor configurar una sola vez; (2) si se migra Tailwind v4, los breakpoints pueden cambiar y habría que ajustar `sizes`; (3) son ~30 archivos, no bloquea nada.

**Opciones de implementación** (elegir una):
- **Opción A**: `CldImage` de `next-cloudinary` (ya instalado `^6.16`) — wrapper de `next/image` con soporte nativo de transformaciones Cloudinary.
- **Opción B**: Loader custom (`cloudinaryLoader`) de ~5 líneas, configurado globalmente via `images.loaderFile` en `next.config.js`. Más liviano, sin dependencia extra.

**Pasos:**
- [ ] Elegir opción A o B.
- [ ] Configurar `images.remotePatterns` o `loaderFile` en `next.config.js`.
- [ ] Migrar `<img>` → `<Image>` / `<CldImage>` en componentes del sitio público (priorizar LCP: hero, posters, fotos de personas).
- [ ] Migrar `<img>` en componentes del admin (menor prioridad).
- [ ] Agregar `priority` a imágenes above-the-fold (hero, primer poster).
- [ ] Verificar Lighthouse LCP en páginas clave.
- [ ] Re-habilitar regla `@next/next/no-img-element` en `eslint.config.mjs`.

### 5e. Verificación final

- [ ] `npm run build` sin errores ni warnings nuevos.
- [ ] `npm run lint` limpio.
- [ ] Test manual del sitio público: home, búsqueda, fichas, listados, efemérides.
- [ ] Test manual del admin: login, CRUD películas, personas, festivales, locations.
- [ ] Test manual de proxy: CSRF, rate limiting, CSP, auth guards.
- [ ] Verificar Docker build: `docker compose build app` exitoso.
- [ ] Verificar performance con Lighthouse en páginas clave.

---

## Notas técnicas

### Lo que ya está resuelto (no requiere cambios)

- **Async Request APIs**: Todos los `params`, `searchParams`, `headers()` ya usan `await` + `Promise<...>`.
- **No hay APIs deprecated**: Sin PropTypes, defaultProps, string refs, forwardRef, legacy context, ReactDOM.render/hydrate, next/amp, serverRuntimeConfig, next/legacy/image.
- **useEffect ban**: 0 useEffects directos en componentes — solo en 10 hooks de infraestructura.
- **ESLint flat config**: Ya migrado a `eslint.config.mjs` con `argsIgnorePattern: "^_"`.
- **No hay parallel routes**: No necesitamos agregar `default.js` files.
- **`images.remotePatterns`**: Ya usamos el formato moderno (no `images.domains`).

### Riesgos identificados

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| NextAuth v4 incompatible con Next.js 16 | **Alto** | Migrar a Auth.js v5 PRIMERO (Fase 1) |
| Webpack config custom vs Turbopack | **Medio** | Evaluar si los fallbacks son necesarios; usar `--webpack` como escape |
| react-hot-toast con React 19 | **Bajo** | Versión 2.5.x es reciente, probablemente compatible |
| Tailwind v4 con colores oklch custom | **Bajo** | Tailwind v4 soporta oklch nativamente |
| `typescript.ignoreBuildErrors: true` oculta errores | **Medio** | Ideal: desactivar y corregir errores de tipos |

### Orden de ejecución

```
Fase 0 (preparación) ✅
  ↓
Fase 0.5a (lint: prefer-const, unused-vars, unescaped-entities) ✅
  ↓
Fase 0.5b (lint: img-element, accesibilidad, otros menores) ✅
  ↓
Fase 1 (NextAuth v4 → Auth.js v5) ← PRÓXIMO, contra stack conocido (Next 15 + React 18)
  ↓
Fase 2 (React 18 → 19)
  ↓
Fase 3 (Next.js 15 → 16) ← React 19 + Auth.js v5 ya están listos
  ↓
Fase 4 (Tailwind 3 → 4) ← opcional, independiente
  ↓
Fase 5 (optimización + migrar <img> a next/image) ← post-migración
```

Cada fase es deployable independientemente. La Fase 1 se puede deployar y validar en producción antes de continuar con las demás.
