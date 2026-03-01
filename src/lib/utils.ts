import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatDuration } from '@/lib/shared/listUtils'

// Re-export para mantener compatibilidad con importaciones existentes
export { formatDuration }

/**
 * Combina clases de Tailwind CSS de forma segura
 * @param {...ClassValue} inputs - Clases CSS a combinar
 * @returns {string} Clases combinadas y optimizadas
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Genera un slug URL-friendly a partir de un texto.
 * Si el resultado queda vacío o muy corto (< 2 chars), genera un fallback basado en hash.
 */
export function createSlug(text: string): string {
  const slug = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
    .replace(/[^a-z0-9]+/g, '-') // Reemplazar caracteres especiales con guiones
    .replace(/^-+|-+$/g, '') // Eliminar guiones al inicio y final
    .replace(/-+/g, '-') // Reemplazar múltiples guiones con uno solo

  if (!slug || slug.length < 2) {
    // Fallback: hash para títulos sin caracteres alfanuméricos (ej: ")(", "!!")
    let hash = 0
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i)
      hash = hash & hash
    }
    return `title-${Math.abs(hash).toString(36)}`
  }

  return slug
}

/**
 * formatDate
 * @TODO Add documentation
 */
export function formatDate(date: Date | string | null): string {
  if (!date) return ''
  const d = new Date(date)
  return d.toLocaleDateString('es-AR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

