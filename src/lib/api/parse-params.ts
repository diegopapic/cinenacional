// src/lib/api/parse-params.ts
// Utilidades para parsear y validar parámetros numéricos de la API.

/**
 * Parsea un string a entero y lo clampea dentro de un rango.
 * Retorna `defaultVal` si el valor es null, undefined, vacío o NaN.
 */
export function parseIntClamped(
  value: string | null | undefined,
  defaultVal: number,
  min: number,
  max: number
): number {
  if (!value) return defaultVal
  const parsed = parseInt(value, 10)
  if (isNaN(parsed)) return defaultVal
  return Math.max(min, Math.min(max, parsed))
}

/**
 * Parsea un string a float y lo clampea dentro de un rango.
 * Retorna `defaultVal` si el valor es null, undefined, vacío o NaN.
 */
export function parseFloatClamped(
  value: string | null | undefined,
  defaultVal: number,
  min: number,
  max: number
): number {
  if (!value) return defaultVal
  const parsed = parseFloat(value)
  if (isNaN(parsed)) return defaultVal
  return Math.max(min, Math.min(max, parsed))
}

/**
 * Parsea un ID numérico positivo. Retorna null si inválido o <= 0.
 */
export function parsePositiveInt(value: string | null | undefined): number | null {
  if (!value) return null
  const parsed = parseInt(value, 10)
  return isNaN(parsed) || parsed <= 0 ? null : parsed
}

// Rangos comunes reutilizables
export const LIMITS = { MIN: 1, MAX: 100, DEFAULT: 20 } as const
export const PAGES = { MIN: 1, MAX: 10000, DEFAULT: 1 } as const
export const DAYS = { MIN: 1, MAX: 365, DEFAULT: 30 } as const
export const YEARS = { MIN: 1890, MAX: 2100 } as const
