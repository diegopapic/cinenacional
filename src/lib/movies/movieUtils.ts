// src/lib/movies/movieUtils.ts

import { DURATION_THRESHOLDS, MOVIE_STAGES, COMPLETENESS_COLORS, STAGE_COLORS, DATA_COMPLETENESS_LEVELS } from './movieConstants'
import type { MovieFormData } from './movieTypes'

/**
 * Calcula el tipo de duración basado en minutos y segundos
 */
export const calcularTipoDuracion = (
  minutos: number | null | undefined, 
  segundos: number | null | undefined = 0
): string => {
  // Convertir todo a minutos totales
  const minutosReales = minutos || 0
  const segundosReales = segundos || 0
  const duracionTotalMinutos = minutosReales + (segundosReales / 60)

  // Si no hay duración total, retornar vacío
  if (duracionTotalMinutos === 0) return ''

  if (duracionTotalMinutos >= DURATION_THRESHOLDS.LARGOMETRAJE) return 'largometraje'
  if (duracionTotalMinutos >= DURATION_THRESHOLDS.MEDIOMETRAJE) return 'mediometraje'
  return 'cortometraje'
}

/**
 * Limpia y prepara los datos del formulario para enviar al backend
 */
export const prepareMovieData = (data: MovieFormData) => {
  const prepared: any = {}

  // Campos de media que deben enviarse como null (no undefined) cuando están vacíos,
  // para que la API efectivamente borre el valor en la base de datos
  const mediaFields = ['posterUrl', 'posterPublicId', 'backdropUrl', 'backdropPublicId']

  Object.entries(data).forEach(([key, value]) => {
    // Campos de media vacíos → null (para que se envíen en el JSON y se borren en la BD)
    if (mediaFields.includes(key) && (value === '' || value === null || value === undefined)) {
      prepared[key] = null
      return
    }
    // Si es string vacío, null o undefined, lo dejamos como undefined
    if (value === '' || value === null || value === undefined) {
      prepared[key] = undefined
    }
    // Si es un campo numérico y tiene valor
    else if (['year', 'duration', 'durationSeconds', 'rating', 'colorTypeId', 'ratingId', 'tmdbId'].includes(key) && value !== '') {
      const num = Number(value)
      prepared[key] = isNaN(num) ? undefined : num
    }
    // Si es URL y tiene valor, validamos que sea URL válida
    else if (['posterUrl', 'backdropUrl', 'trailerUrl'].includes(key) && value !== '') {
      try {
        new URL(value as string)
        prepared[key] = value
      } catch {
        prepared[key] = undefined
      }
    }
    // Para el resto de campos
    else {
      prepared[key] = value
    }
  })

  // Valores por defecto
  prepared.dataCompleteness = prepared.dataCompleteness || 'BASIC_PRESS_KIT'

  return prepared
}

/**
 * Obtiene el label de completitud de datos
 */
export const getCompletenessLabel = (completeness: string): string => {
  const level = DATA_COMPLETENESS_LEVELS.find(l => l.value === completeness)
  return level ? level.label : completeness
}

/**
 * Obtiene el color CSS para el nivel de completitud
 */
export const getCompletenessColor = (completeness: string): string => {
  return COMPLETENESS_COLORS[completeness as keyof typeof COMPLETENESS_COLORS] || 'bg-gray-100 text-gray-800'
}

/**
 * Obtiene el color CSS para la etapa de la película
 */
export const getStageColor = (stage?: string): string => {
  if (!stage) return 'bg-gray-100 text-gray-800'
  return STAGE_COLORS[stage as keyof typeof STAGE_COLORS] || 'bg-gray-100 text-gray-800'
}

/**
 * Obtiene el nombre de la etapa
 */
export const getStageName = (stage?: string): string => {
  if (!stage) return '-'
  const stageInfo = MOVIE_STAGES.find(s => s.value === stage)
  return stageInfo ? stageInfo.label : stage
}

/**
 * Obtiene un mensaje de error legible
 */
export const getErrorMessage = (error: any): string => {
  if (!error) return ''
  if (typeof error === 'string') return error
  if (error?.message) return error.message
  return 'Este campo tiene un error'
}

/**
 * Formatea keywords para enviar al backend
 */
export const formatKeywords = (keywords: string): string[] => {
  if (!keywords) return []
  return keywords.split(',').map(k => k.trim()).filter(Boolean)
}

/**
 * Construye los datos de fecha de estreno según el tipo (parcial o completa)
 */
export const buildReleaseDateData = (
  isPartialDate: boolean,
  releaseDate?: string,
  partialReleaseDate?: { year: number | null; month: number | null }
) => {
  if (isPartialDate && partialReleaseDate) {
    // Fecha parcial - enviar campos separados
    return {
      releaseYear: partialReleaseDate.year,
      releaseMonth: partialReleaseDate.month,
      releaseDay: null
    }
  } else if (releaseDate) {
    // Fecha completa - convertir a campos separados
    const [year, month, day] = releaseDate.split('-').map(Number)
    return {
      releaseYear: year,
      releaseMonth: month,
      releaseDay: day
    }
  } else {
    // Sin fecha
    return {
      releaseYear: null,
      releaseMonth: null,
      releaseDay: null
    }
  }
}

/**
 * Determina si el campo de tipo de duración debe estar deshabilitado
 */
export const shouldDisableDurationType = (
  minutos: number | undefined | null,
  segundos: number | undefined | null
): boolean => {
  return (minutos && minutos > 0) || (segundos && segundos > 0) ? true : false
}