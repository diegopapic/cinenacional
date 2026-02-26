// src/services/movies.service.ts
import { apiClient } from './api-client'
import { MovieFilters } from '@/components/admin/movies/MoviesFilters'
import { MovieCompleteData } from '@/lib/movies/movieTypes'
import { processPartialDateForAPI, processPartialDateFromAPI } from '@/lib/shared/dateUtils'

interface MoviesResponse {
  movies: any[]
  pagination: {
    totalPages: number
    currentPage: number
    totalItems: number
  }
}

/**
 * Formatea los datos del formulario de película para enviar a la API
 * Convierte las fechas completas o parciales al formato esperado por el backend
 */
function formatMovieDataForAPI(data: MovieCompleteData): any {
  const apiData: any = {
    title: data.title,
    year: data.year,
    duration: data.duration,
    durationSeconds: data.durationSeconds,
    tipoDuracion: data.tipoDuracion,
    synopsis: data.synopsis,
    synopsisLocked: data.synopsisLocked ?? false,
    notes: data.notes,
    tagline: data.tagline,
    posterUrl: data.posterUrl,
    trailerUrl: data.trailerUrl,
    imdbId: data.imdbId,
    stage: data.stage,
    colorTypeId: data.colorTypeId,
    soundType: data.soundType,
    ratingId: data.ratingId,
    countries: data.countries,
    is_coproduction: data.is_coproduction,
    production_type: data.production_type,
    dataCompleteness: data.dataCompleteness,
    metaDescription: data.metaDescription,
    metaKeywords: data.metaKeywords,
    genres: data.genres,
    cast: data.cast,
    crew: data.crew,
    productionCompanies: data.productionCompanies,
    distributionCompanies: data.distributionCompanies,
    themes: data.themes,
    movieCountries: data.movieCountries,
    links: data.links,
    screeningVenues: data.screeningVenues
  }

  const release = processPartialDateForAPI(data.isPartialReleaseDate, data.partialReleaseDate, data.releaseDate)
  apiData.releaseYear = release.year
  apiData.releaseMonth = release.month
  apiData.releaseDay = release.day

  const filmingStart = processPartialDateForAPI(data.isPartialFilmingStartDate, data.partialFilmingStartDate, data.filmingStartDate)
  apiData.filmingStartYear = filmingStart.year
  apiData.filmingStartMonth = filmingStart.month
  apiData.filmingStartDay = filmingStart.day

  const filmingEnd = processPartialDateForAPI(data.isPartialFilmingEndDate, data.partialFilmingEndDate, data.filmingEndDate)
  apiData.filmingEndYear = filmingEnd.year
  apiData.filmingEndMonth = filmingEnd.month
  apiData.filmingEndDay = filmingEnd.day

  return apiData
}

/**
 * Convierte los datos de la API al formato del formulario
 */
function formatMovieFromAPI(movie: any): MovieCompleteData {
  const formData: MovieCompleteData = {
    title: movie.title || '',
    year: movie.year || null,
    releaseDate: '',
    duration: movie.duration || null,
    durationSeconds: movie.durationSeconds || null,
    tipoDuracion: movie.tipoDuracion || '',
    synopsis: movie.synopsis || '',
    synopsisLocked: movie.synopsisLocked ?? false,
    notes: movie.notes || '',
    tagline: movie.tagline || '',
    posterUrl: movie.posterUrl || '',
    trailerUrl: movie.trailerUrl || '',
    imdbId: movie.imdbId || '',
    stage: movie.stage || 'COMPLETA',
    filmingStartDate: '',
    filmingEndDate: '',
    colorTypeId: movie.colorTypeId || null,
    soundType: movie.soundType || '',
    ratingId: movie.ratingId || null,
    countries: movie.countries || ['Argentina'],
    is_coproduction: movie.is_coproduction || false,
    production_type: movie.production_type || 'national',
    dataCompleteness: movie.dataCompleteness || 'BASIC_PRESS_KIT',
    metaDescription: movie.metaDescription || '',
    metaKeywords: movie.metaKeywords || [],
    genres: movie.genres || [],
    cast: movie.cast || [],
    crew: movie.crew || [],
    productionCompanies: movie.productionCompanies || [],
    distributionCompanies: movie.distributionCompanies || [],
    themes: movie.themes || [],
    movieCountries: movie.movieCountries || [],
    links: movie.links || [],
    screeningVenues: movie.screeningVenues || []
  }

  const release = processPartialDateFromAPI(movie.releaseYear, movie.releaseMonth, movie.releaseDay)
  if (release) {
    formData.releaseDate = release.date
    formData.isPartialReleaseDate = release.isPartial
    if (release.partialDate) formData.partialReleaseDate = release.partialDate
  }

  const filmingStart = processPartialDateFromAPI(movie.filmingStartYear, movie.filmingStartMonth, movie.filmingStartDay)
  if (filmingStart) {
    formData.filmingStartDate = filmingStart.date
    formData.isPartialFilmingStartDate = filmingStart.isPartial
    if (filmingStart.partialDate) formData.partialFilmingStartDate = filmingStart.partialDate
  }

  const filmingEnd = processPartialDateFromAPI(movie.filmingEndYear, movie.filmingEndMonth, movie.filmingEndDay)
  if (filmingEnd) {
    formData.filmingEndDate = filmingEnd.date
    formData.isPartialFilmingEndDate = filmingEnd.isPartial
    if (filmingEnd.partialDate) formData.partialFilmingEndDate = filmingEnd.partialDate
  }

  return formData
}

export const moviesService = {
  /**
   * Obtiene la lista de películas con filtros y paginación
   */
  async getAll(filters: MovieFilters): Promise<MoviesResponse> {
    const params: Record<string, string> = {
      page: filters.currentPage.toString(),
      limit: '20',
      search: filters.searchTerm,
      year: filters.selectedYear,
      sortBy: 'updatedAt',
      sortOrder: 'desc'
    }

    const data = await apiClient.get<any>('/movies', { params })

    return {
      movies: data.movies || [],
      pagination: data.pagination || { totalPages: 1, currentPage: 1, totalItems: 0 }
    }
  },

  /**
   * Obtiene una película por ID con todas sus relaciones
   */
  async getById(id: number, fresh = false): Promise<any> {
    const options: { params?: Record<string, string>; cache?: RequestCache } = {}
    if (fresh) {
      options.params = { fresh: 'true' }
      options.cache = 'no-store'
    }
    return apiClient.get<any>(`/movies/${id}`, options)
  },

  /**
   * Obtiene una película por ID en formato de formulario para edición
   */
  async getByIdForEdit(id: number): Promise<MovieCompleteData> {
    const movie = await apiClient.get<any>(`/movies/${id}`)
    return formatMovieFromAPI(movie)
  },

  /**
   * Crea una nueva película
   */
  async create(data: MovieCompleteData): Promise<any> {
    let formattedData = data;

    if (!('releaseYear' in data) && !('filmingStartYear' in data)) {
      formattedData = formatMovieDataForAPI(data);
    }

    return apiClient.post<any>('/movies', formattedData)
  },

  /**
   * Actualiza una película existente
   */
  async update(id: number, data: MovieCompleteData): Promise<any> {
    let formattedData = data;

    if (!('releaseYear' in data) && !('filmingStartYear' in data)) {
      formattedData = formatMovieDataForAPI(data);
    }

    return apiClient.put<any>(`/movies/${id}`, formattedData)
  },

  /**
   * Elimina una película
   */
  async delete(id: number): Promise<void> {
    await apiClient.delete(`/movies/${id}`)
  },

  /**
   * Busca películas por término de búsqueda (autocomplete)
   */
  async search(term: string, limit: number = 10): Promise<any[]> {
    return apiClient.get<any[]>('/movies/search', {
      params: { search: term, limit: limit.toString() }
    })
  },

  /**
   * Verifica si un slug está disponible
   */
  async checkSlugAvailability(slug: string, excludeId?: number): Promise<boolean> {
    const params: Record<string, string> = { slug }
    if (excludeId) params.excludeId = String(excludeId)

    const { available } = await apiClient.get<{ available: boolean }>('/movies/check-slug', { params })
    return available
  },

  /**
   * Obtiene estadísticas de películas
   */
  async getStats(): Promise<{
    total: number
    byYear: Record<string, number>
    byStage: Record<string, number>
    byDataCompleteness: Record<string, number>
  }> {
    return apiClient.get('/movies/stats')
  },

  /**
   * Exporta películas a CSV
   */
  async exportToCSV(filters: MovieFilters): Promise<Blob> {
    return apiClient.getBlob('/movies/export', {
      params: {
        search: filters.searchTerm,
        year: filters.selectedYear
      }
    })
  }
}