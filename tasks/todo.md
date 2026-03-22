# Migración a React 19.2 / Next.js 16.2

Estado: **✅ MIGRACIÓN CORE COMPLETA** — Next.js 16.2.1 + React 19.2.4 + Auth.js v5 (next-auth@5.0.0-beta.30)

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

- [x] **`@next/next/no-img-element`** (29 → 0): Regla desactivada globalmente — todas las imágenes son URLs de Cloudinary con transformaciones dinámicas. Migración a `next/image` + loader planificada en Fase 6d.
- [x] **`jsx-a11y/alt-text`** (1 → 0): Renombrado import `Image` → `ImageIcon` (lucide) para evitar falso positivo.
- [x] **`jsx-a11y/role-has-required-aria-props`** (1 → 0): Agregado `aria-controls` al combobox en Header.
- [x] **`react/jsx-no-comment-textnodes`** (1 → 0): Eliminados `// ✅` inline en JSX.
- [x] **`@next/next/no-html-link-for-pages`** (1 → 0): Reemplazado `<a>` por `<Link>` en admin dashboard.
- [x] **`react-hooks/exhaustive-deps`** (1 → 0): `eslint-disable` con justificación en `usePageView`.

### 0.5c. `no-explicit-any` (399) — estrategia incremental

Estos NO se arreglan ahora. Son deuda técnica que se ataca incrementalmente post-migración. Razones:
- La migración puede cambiar tipos (Auth.js v5, React 19 types) → trabajo doble si se tipifican ahora.
- 399 `any` requieren entender el tipo correcto caso por caso.
- Se pueden ir resolviendo archivo por archivo después de la migración.

### 0.5d. Verificación ✅

- [x] `npm run build` pasa.
- [x] `npx eslint src/` muestra solo `no-explicit-any` (399) como errores restantes.

---

## Fase 1: NextAuth v4 → Auth.js v5 ✅ (commit c2402f4)

Migrado a `next-auth@5.0.0-beta.30` + `@auth/prisma-adapter@2.11.1`, todavía sobre Next.js 15 + React 18.

- [x] **1a**: Instalado `next-auth@5`, `@auth/prisma-adapter`, removido `@next-auth/prisma-adapter`.
- [x] **1b**: Creado `src/auth.ts` como punto central (`{ auth, handlers, signIn, signOut }`). `src/lib/auth.ts` solo exporta `requireAuth()` que usa `auth()`.
- [x] **1c**: `requireAuth()` usa `auth()` en vez de `getServerSession(authOptions)`.
- [x] **1d**: Middleware actualizado: `getToken` con `cookieName: 'authjs.session-token'`, secret con fallback `AUTH_SECRET ?? NEXTAUTH_SECRET`.
- [x] **1e**: Client-side (`signIn` de `next-auth/react`) no requirió cambios — API igual en v5.
- [x] **1f**: Build OK, lint OK (400 errores, solo `no-explicit-any`). Middleware bajó de 57.6kB a 48.1kB.

**Nota de deploy**: Las sesiones existentes se invalidan por cambio de cookie name. Los usuarios deben re-loguearse. Agregar `AUTH_SECRET` como env var (puede ser el mismo valor que `NEXTAUTH_SECRET`).

---

## Fase 2: Actualizar React 18 → 19 ✅ (commit 29f2b91)

- [x] **2a**: react@19.2.4, react-dom@19.2.4, @types/react@19.2.14, @types/react-dom@19.2.3
- [x] **2b**: No se necesitaron cambios de código — el codebase no tenía React.FC, useRef() sin args, forwardRef, ni APIs deprecadas.
- [x] **2c**: Todas las librerías de terceros compatibles sin cambios (radix-ui, tanstack, hook-form, dnd-kit, lucide, etc.)
- Build y lint OK (400 errores, solo no-explicit-any).

---

## Fase 3: Actualizar Next.js 15 → 16 ✅ (commit 397b761)

- [x] **3a**: next@16.2.1, eslint@9.39.4, eslint-config-next@16.2.1
- [x] **3b**: Async request APIs ya estaban OK — no se necesitaron cambios.
- [x] **3c**: `middleware.ts` → `proxy.ts`, función `middleware()` → `proxy()`.
- [x] **3d**: Turbopack default. Eliminada config webpack, agregado `turbopack: {}`.
- [x] **3e**: `next.config.js` simplificado. `tsconfig.json` auto-updated (jsx: react-jsx).
- [x] **3f**: `"lint": "next lint"` → `"lint": "eslint src/"`. ESLint config reescrita con imports nativos de `eslint-config-next` (sin FlatCompat). Removido `@eslint/eslintrc`.

Nuevos warnings del React compiler lint (25): `react-hooks/refs`, `static-components`, etc. — legítimos pero no bloquean.

---

## Fase 4: Tailwind CSS 3 → 4 ✅ (commit d17a588)

Migrado de Tailwind CSS 3.4.13 → 4.2.2 via `npx @tailwindcss/upgrade`.

- [x] **4a**: Viabilidad OK — browsers compatibles, `@tailwindcss/typography` soporta v4 via `@plugin`.
- [x] **4b**: Migración automática ejecutada (112 archivos):
  - `tailwind.config.js` eliminado → colores/fonts/animaciones migrados a `@theme` en `globals.css`.
  - `@tailwind base/components/utilities` → `@import 'tailwindcss'`.
  - Plugin: `require("@tailwindcss/typography")` → `@plugin '@tailwindcss/typography'`.
  - `postcss.config.mjs` eliminado → `postcss.config.js` con `@tailwindcss/postcss`.
  - `autoprefixer` eliminado (built-in en v4).
  - ~100 templates: class renames automáticos (`shadow-sm`→`shadow-xs`, `outline-none`→`outline-hidden`, `ring-offset`→`ring-offset-*`).
  - Build OK, lint sin errores nuevos.

---

## Fase 5: Corregir warnings del React compiler lint

25 warnings nuevos de las reglas `react-hooks/refs`, `react-hooks/static-components`, `react-hooks/immutability` y `react-hooks/incompatible-library` introducidas por `eslint-config-next@16`. Son patterns que el React compiler no puede optimizar correctamente y que pueden causar bugs si se activa `reactCompiler: true`.

### 5a. `react-hooks/refs` (18 warnings) ✅ (commit 9e9602a)

- [x] Creados hooks `usePrevious` y `useValueChange` en `src/hooks/` — reemplazan el pattern de leer `ref.current` durante render.
- [x] `RoleSelector.tsx` (2): sync loadedRole via `useValueChange`.
- [x] `PersonForm.tsx` (4): init via `useMountEffect`, sync nationalities via `useValueChange`.
- [x] `BasicInfoFields.tsx` (4): sync partial dates via `useValueChange`.
- [x] `MovieModalContext.tsx` (8): detect editingMovie changes via `useValueChange`.

### 5b. `react-hooks/static-components` (5 warnings) ✅ (commit de97496)

- [x] `src/app/admin/stats/page.tsx` (5): `SortHeader` extraído de inline a componente module-level con props `sortField` y `onSort`.

### 5c. `react-hooks/immutability` (1 warning) ✅ (commit 0cd73c1)

- [x] `ImageGallery.tsx`: Creado hook `useBodyOverflow` — sincroniza `document.body.style.overflow` con estado del lightbox via effect en vez de mutación directa.

### 5d. `react-hooks/incompatible-library` (1 warning) ✅ (commit 6ab098f)

- [x] `RoleModal.tsx`: Reemplazado `watch()` por `useWatch()` de react-hook-form (compatible con memoización). También migrado ref-during-render a `useValueChange`.

**Fase 5 completada.** 25/25 warnings resueltos. Errores restantes: 400 `no-explicit-any` + 8 internos = 408 total. Build OK.

---

## Fase 6: Limpieza y optimización post-migración

### 6a. Activar React Compiler ✅ (commit 87a4215)

- [x] Instalado `babel-plugin-react-compiler`.
- [x] `reactCompiler: true` en `next.config.js`.
- [x] Build pasa sin errores. Memoización automática activa para todos los componentes.

### 6b. Explorar nuevas APIs de React 19.2

- [x] **`useEffectEvent`**: Adoptado en 6 hooks de infraestructura (`useInterval`, `useWindowEvent`, `useKeydown`, `useEscapeKey`, `useClickOutside`, `usePageView`). Eliminó refs manuales y todos los `eslint-disable-next-line` de `exhaustive-deps`. (commit 69e08b5)
- [x] **View Transitions**: No disponible en React 19.2 stable (`unstable_ViewTransition` no exportado). Pendiente para cuando se estabilice.
- [x] **Activity**: No disponible en React 19.2 stable (`unstable_Activity` no exportado). Pendiente para cuando se estabilice.

### 6c. Explorar nuevas APIs de Next.js 16

- [ ] **`updateTag`**: Evaluar para mutaciones del admin (revalidación inmediata post-edit).
- [ ] **`refresh()`**: Evaluar para Server Actions.
- [ ] **`cacheLife` / `cacheTag`**: Evaluar si nuestras páginas con `revalidate` se benefician.
- [ ] **`cacheComponents`**: Evaluar PPR para páginas mixtas (shell estático + datos dinámicos).

### 6d. Migrar `<img>` a `next/image` con Cloudinary loader

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

### 6e. Verificación final

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
Fase 1 (NextAuth v4 → Auth.js v5) ✅
  ↓
Fase 2 (React 18 → 19) ✅
  ↓
Fase 3 (Next.js 15 → 16) ✅ ← React 19 + Auth.js v5 ya están listos
  ↓
Fase 4 (Tailwind 3 → 4) ✅
  ↓
Fase 5 (React compiler lint warnings) ✅
  ↓
Fase 6 (React Compiler + optimización + migrar <img> a next/image) ← post-migración
```

Cada fase es deployable independientemente. La Fase 1 se puede deployar y validar en producción antes de continuar con las demás.
