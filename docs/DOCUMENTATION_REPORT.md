# 📊 Reporte de Documentación - CineNacional

Generado: 21/8/2025, 10:58:42

## 📈 Estadísticas Generales

| Métrica | Valor |
|---------|-------|
| Archivos analizados | 92 |
| Funciones totales | 131 |
| Funciones documentadas | 68 |
| Funciones sin documentar | 63 |
| **Cobertura de documentación** | **52%** |

## 📁 Archivos Analizados

- `src/app/admin/layout.tsx`
- `src/app/admin/locations/[id]/edit/page.tsx`
- `src/app/admin/locations/new/page.tsx`
- `src/app/admin/locations/page.tsx`
- `src/app/admin/movies/page.tsx`
- `src/app/admin/roles/page.tsx`
- `src/app/api/countries/route.ts`
- `src/app/api/efemerides/route.ts`
- `src/app/api/locations/[id]/route.ts`
- `src/app/api/locations/check-slug/route.ts`
- `src/app/api/locations/countries/route.ts`
- `src/app/api/locations/route.ts`
- `src/app/api/locations/search/route.ts`
- `src/app/api/locations/tree/route.ts`
- `src/app/api/movies/[id]/route.ts`
- `src/app/api/movies/home-feed/route.ts`
- `src/app/api/movies/route.ts`
- `src/app/api/people/[id]/filmography/route.ts`
- `src/app/api/people/[id]/route.ts`
- `src/app/api/people/route.ts`

... y 72 archivos más

## ⚠️ Funciones sin Documentación

- `metadata()` en [src/app/admin/locations/[id]/edit/page.tsx:9](../src/app/admin/locations/[id]/edit/page.tsx#L9)
- `metadata()` en [src/app/admin/locations/new/page.tsx:8](../src/app/admin/locations/new/page.tsx#L8)
- `metadata()` en [src/app/admin/locations/page.tsx:7](../src/app/admin/locations/page.tsx#L7)
- `revalidate()` en [src/app/admin/locations/page.tsx:13](../src/app/admin/locations/page.tsx#L13)
- `GET()` en [src/app/api/countries/route.ts:6](../src/app/api/countries/route.ts#L6)
- `GET()` en [src/app/api/efemerides/route.ts:6](../src/app/api/efemerides/route.ts#L6)
- `GET()` en [src/app/api/locations/[id]/route.ts:8](../src/app/api/locations/[id]/route.ts#L8)
- `PUT()` en [src/app/api/locations/[id]/route.ts:85](../src/app/api/locations/[id]/route.ts#L85)
- `DELETE()` en [src/app/api/locations/[id]/route.ts:163](../src/app/api/locations/[id]/route.ts#L163)
- `POST()` en [src/app/api/locations/check-slug/route.ts:8](../src/app/api/locations/check-slug/route.ts#L8)
- `GET()` en [src/app/api/locations/countries/route.ts:6](../src/app/api/locations/countries/route.ts#L6)
- `dynamic()` en [src/app/api/locations/route.ts:8](../src/app/api/locations/route.ts#L8)
- `revalidate()` en [src/app/api/locations/route.ts:9](../src/app/api/locations/route.ts#L9)
- `GET()` en [src/app/api/locations/route.ts:12](../src/app/api/locations/route.ts#L12)
- `POST()` en [src/app/api/locations/route.ts:74](../src/app/api/locations/route.ts#L74)
- `GET()` en [src/app/api/locations/search/route.ts:6](../src/app/api/locations/search/route.ts#L6)
- `dynamic()` en [src/app/api/locations/tree/route.ts:7](../src/app/api/locations/tree/route.ts#L7)
- `revalidate()` en [src/app/api/locations/tree/route.ts:8](../src/app/api/locations/tree/route.ts#L8)
- `GET()` en [src/app/api/locations/tree/route.ts:24](../src/app/api/locations/tree/route.ts#L24)
- `GET()` en [src/app/api/movies/[id]/route.ts:10](../src/app/api/movies/[id]/route.ts#L10)

... y 84 funciones más sin documentar

## 💡 Cómo Agregar Documentación JSDoc

```typescript
/**
 * Descripción breve de lo que hace la función
 * 
 * @param {string} paramName - Descripción del parámetro
 * @param {number} [optionalParam] - Parámetro opcional
 * @returns {Promise<ResultType>} Descripción del retorno
 * @throws {Error} Cuándo puede lanzar error
 * @example
 * const result = await myFunction('value', 123);
 */
export async function myFunction(paramName: string, optionalParam?: number): Promise<ResultType> {
  // ...
}
```

## 🚀 Próximos Pasos

1. Agregar JSDoc a las funciones sin documentar
2. Ejecutar `npm run docs:api` para generar documentación automática
3. Revisar y actualizar la documentación manual si es necesario

## 📝 Scripts Disponibles

```bash
# Detectar cambios y generar este reporte
npm run docs:detect

# Generar documentación desde JSDoc
npm run docs:api

# Actualizar toda la documentación
npm run docs:update
```
