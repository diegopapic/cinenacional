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
 * Build a Prisma SQL fragment that normalizes a column for accent-insensitive comparison.
 * Uses translate(LOWER(col), from, to) — built-in, no extension needed.
 */
export function norm(column: string): Prisma.Sql {
  return Prisma.sql`translate(LOWER(${Prisma.raw(column)}), ${ACCENT_FROM}, ${ACCENT_TO})`
}
