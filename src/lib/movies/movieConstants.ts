// src/lib/movies/movieConstants.ts

export { MONTHS } from '@/lib/shared/dateUtils';

/**
 * Estados posibles de producción de una película
 * @constant
 * @type {Array<{value: string, label: string}>}
 */
export const MOVIE_STAGES = [
  { value: 'COMPLETA', label: 'Completa', description: 'Película terminada y estrenada' },
  { value: 'EN_DESARROLLO', label: 'En desarrollo', description: 'En etapa de desarrollo del proyecto' },
  { value: 'EN_POSTPRODUCCION', label: 'En postproducción', description: 'En proceso de edición y postproducción' },
  { value: 'EN_PREPRODUCCION', label: 'En preproducción', description: 'En preparación para el rodaje' },
  { value: 'EN_PRODUCCION', label: 'En producción', description: 'En proceso de producción general' },
  { value: 'EN_RODAJE', label: 'En rodaje', description: 'Actualmente filmando' },
  { value: 'INCONCLUSA', label: 'Inconclusa', description: 'Proyecto abandonado o sin terminar' }
] as const

export const BACKGROUND_PLACEHOLDER = {
  url: '/images/background-placeholder.webp'
} as const;

export const POSTER_ASPECT_RATIO = 2/3;
export const POSTER_SIZES = {
  thumbnail: { width: 200, height: 300 },
  card: { width: 342, height: 513 },
  full: { width: 500, height: 750 }
} as const;

/**
 * TIPOS_DURACION
 * @TODO Add documentation
 */
export const TIPOS_DURACION = [
  { value: 'largometraje', label: 'Largometraje' },
  { value: 'mediometraje', label: 'Mediometraje' },
  { value: 'cortometraje', label: 'Cortometraje' }
] as const

/**
 * DATA_COMPLETENESS_LEVELS
 * @TODO Add documentation
 */
export const DATA_COMPLETENESS_LEVELS = [
  { value: 'BASIC_PRESS_KIT', label: 'Gacetilla básica', icon: '📄' },
  { value: 'FULL_PRESS_KIT', label: 'Gacetilla completa', icon: '📋' },
  { value: 'MAIN_CAST', label: 'Intérpretes principales', icon: '👥' },
  { value: 'MAIN_CREW', label: 'Técnicos principales', icon: '🔧' },
  { value: 'FULL_CAST', label: 'Todos los intérpretes', icon: '🎭' },
  { value: 'FULL_CREW', label: 'Todos los técnicos', icon: '🎬' }
] as const

/**
 * SOUND_TYPES
 * @TODO Add documentation
 */
export const SOUND_TYPES = [
  { value: 'Sonora', label: 'Sonora' },
  { value: 'Muda', label: 'Muda' }
] as const

// Duraciones en minutos
/**
 * DURATION_THRESHOLDS
 * @TODO Add documentation
 */
export const DURATION_THRESHOLDS = {
  LARGOMETRAJE: 60,
  MEDIOMETRAJE: 30
} as const

// Colores para los badges
/**
 * STAGE_COLORS
 * @TODO Add documentation
 */
export const STAGE_COLORS = {
  COMPLETA: 'bg-green-100 text-green-800',
  EN_DESARROLLO: 'bg-blue-100 text-blue-800',
  EN_POSTPRODUCCION: 'bg-purple-100 text-purple-800',
  EN_PREPRODUCCION: 'bg-yellow-100 text-yellow-800',
  EN_PRODUCCION: 'bg-cyan-100 text-cyan-800',
  EN_RODAJE: 'bg-orange-100 text-orange-800',
  INCONCLUSA: 'bg-red-100 text-red-800'
} as const

/**
 * COMPLETENESS_COLORS
 * @TODO Add documentation
 */
export const COMPLETENESS_COLORS = {
  BASIC_PRESS_KIT: 'bg-red-100 text-red-800',
  FULL_PRESS_KIT: 'bg-orange-100 text-orange-800',
  MAIN_CAST: 'bg-yellow-100 text-yellow-800',
  MAIN_CREW: 'bg-green-100 text-green-800',
  FULL_CAST: 'bg-green-100 text-green-800',
  FULL_CREW: 'bg-blue-100 text-blue-800'
} as const