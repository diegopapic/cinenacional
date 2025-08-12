// src/lib/movies/movieConstants.ts

export const MOVIE_STAGES = [
  { value: 'COMPLETA', label: 'Completa', description: 'Película terminada y estrenada' },
  { value: 'EN_DESARROLLO', label: 'En desarrollo', description: 'En etapa de desarrollo del proyecto' },
  { value: 'EN_POSTPRODUCCION', label: 'En postproducción', description: 'En proceso de edición y postproducción' },
  { value: 'EN_PREPRODUCCION', label: 'En preproducción', description: 'En preparación para el rodaje' },
  { value: 'EN_RODAJE', label: 'En rodaje', description: 'Actualmente filmando' },
  { value: 'INCONCLUSA', label: 'Inconclusa', description: 'Proyecto abandonado o sin terminar' },
  { value: 'INEDITA', label: 'Inédita', description: 'Completa pero sin estrenar' }
] as const

export const TIPOS_DURACION = [
  { value: 'largometraje', label: 'Largometraje' },
  { value: 'mediometraje', label: 'Mediometraje' },
  { value: 'cortometraje', label: 'Cortometraje' }
] as const

export const DATA_COMPLETENESS_LEVELS = [
  { value: 'BASIC_PRESS_KIT', label: 'Gacetilla básica', icon: '📄' },
  { value: 'FULL_PRESS_KIT', label: 'Gacetilla completa', icon: '📋' },
  { value: 'MAIN_CAST', label: 'Intérpretes principales', icon: '👥' },
  { value: 'MAIN_CREW', label: 'Técnicos principales', icon: '🔧' },
  { value: 'FULL_CAST', label: 'Todos los intérpretes', icon: '🎭' },
  { value: 'FULL_CREW', label: 'Todos los técnicos', icon: '🎬' }
] as const

export const SOUND_TYPES = [
  { value: 'Sonora', label: 'Sonora' },
  { value: 'Muda', label: 'Muda' },
  { value: 'n/d', label: 'No disponible' }
] as const

export const MONTHS = [
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' }
] as const

// Duraciones en minutos
export const DURATION_THRESHOLDS = {
  LARGOMETRAJE: 60,
  MEDIOMETRAJE: 30
} as const

// Colores para los badges
export const STAGE_COLORS = {
  COMPLETA: 'bg-green-100 text-green-800',
  EN_DESARROLLO: 'bg-blue-100 text-blue-800',
  EN_POSTPRODUCCION: 'bg-purple-100 text-purple-800',
  EN_PREPRODUCCION: 'bg-yellow-100 text-yellow-800',
  EN_RODAJE: 'bg-orange-100 text-orange-800',
  INCONCLUSA: 'bg-red-100 text-red-800',
  INEDITA: 'bg-gray-100 text-gray-800'
} as const

export const COMPLETENESS_COLORS = {
  BASIC_PRESS_KIT: 'bg-red-100 text-red-800',
  FULL_PRESS_KIT: 'bg-orange-100 text-orange-800',
  MAIN_CAST: 'bg-yellow-100 text-yellow-800',
  MAIN_CREW: 'bg-green-100 text-green-800',
  FULL_CAST: 'bg-green-100 text-green-800',
  FULL_CREW: 'bg-blue-100 text-blue-800'
} as const