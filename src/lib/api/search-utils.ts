// src/lib/api/search-utils.ts

import { Prisma } from '@prisma/client'

/** Accent characters to strip via PostgreSQL translate() */
export const ACCENT_FROM = 'áàâãäéèêëíìîïóòôõöúùûüñç'
export const ACCENT_TO = 'aaaaaeeeeiiiioooooouuuunc'

/**
 * Strip diacritics + lowercase for search normalization (JS side).
 * The DB side uses translate() with ACCENT_FROM/ACCENT_TO.
 */
export function normalizeSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

/**
 * Wrap a SQL column expression in translate(LOWER(...)) for accent-insensitive comparison.
 * Uses Prisma.raw() so ACCENT_FROM/ACCENT_TO are SQL literals (not parameters).
 * Safe because both constants are hardcoded, not user input.
 */
export function norm(column: string): ReturnType<typeof Prisma.raw> {
  return Prisma.raw(`translate(LOWER(${column}), '${ACCENT_FROM}', '${ACCENT_TO}')`)
}
