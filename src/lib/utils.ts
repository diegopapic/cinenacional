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
 * createSlug
 * @TODO Add documentation
 */
export function createSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
    .replace(/[^a-z0-9]+/g, '-') // Reemplazar caracteres especiales con guiones
    .replace(/^-+|-+$/g, '') // Eliminar guiones al inicio y final
    .replace(/-+/g, '-') // Reemplazar múltiples guiones con uno solo
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

