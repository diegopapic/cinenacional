// src/services/movies.service.ts
import { MovieFilters } from '@/components/admin/movies/MoviesFilters'
import { MovieFormData } from '@/lib/movies/movieTypes'
import { dateToPartialFields, partialFieldsToDate, PartialDate } from '@/lib/shared/dateUtils'

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
function formatMovieDataForAPI(data: MovieFormData): any {
  const apiData: any = {
    title: data.title,
    year: data.year,
    duration: data.duration,
    durationSeconds: data.durationSeconds,
    tipoDuracion: data.tipoDuracion,
    synopsis: data.synopsis,
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

  // Procesar fecha de estreno
  if (data.isPartialReleaseDate && data.partialReleaseDate) {
    // Fecha parcial de estreno
    apiData.releaseYear = data.partialReleaseDate.year
    apiData.releaseMonth = data.partialReleaseDate.month
    apiData.releaseDay = data.partialReleaseDate.day
  } else if (data.releaseDate) {
    // Fecha completa de estreno - convertir a campos parciales
    const partial = dateToPartialFields(data.releaseDate)
    apiData.releaseYear = partial.year
    apiData.releaseMonth = partial.month
    apiData.releaseDay = partial.day
  } else {
    // Sin fecha de estreno
    apiData.releaseYear = null
    apiData.releaseMonth = null
    apiData.releaseDay = null
  }

  // Procesar fecha de inicio de rodaje
  if (data.isPartialFilmingStartDate && data.partialFilmingStartDate) {
    // Fecha parcial de inicio de rodaje
    apiData.filmingStartYear = data.partialFilmingStartDate.year
    apiData.filmingStartMonth = data.partialFilmingStartDate.month
    apiData.filmingStartDay = data.partialFilmingStartDate.day
  } else if (data.filmingStartDate) {
    // Fecha completa de inicio de rodaje - convertir a campos parciales
    const partial = dateToPartialFields(data.filmingStartDate)
    apiData.filmingStartYear = partial.year
    apiData.filmingStartMonth = partial.month
    apiData.filmingStartDay = partial.day
  } else {
    // Sin fecha de inicio de rodaje
    apiData.filmingStartYear = null
    apiData.filmingStartMonth = null
    apiData.filmingStartDay = null
  }

  // Procesar fecha de fin de rodaje
  if (data.isPartialFilmingEndDate && data.partialFilmingEndDate) {
    // Fecha parcial de fin de rodaje
    apiData.filmingEndYear = data.partialFilmingEndDate.year
    apiData.filmingEndMonth = data.partialFilmingEndDate.month
    apiData.filmingEndDay = data.partialFilmingEndDate.day
  } else if (data.filmingEndDate) {
    // Fecha completa de fin de rodaje - convertir a campos parciales
    const partial = dateToPartialFields(data.filmingEndDate)
    apiData.filmingEndYear = partial.year
    apiData.filmingEndMonth = partial.month
    apiData.filmingEndDay = partial.day
  } else {
    // Sin fecha de fin de rodaje
    apiData.filmingEndYear = null
    apiData.filmingEndMonth = null
    apiData.filmingEndDay = null
  }

  return apiData
}

/**
 * Convierte los datos de la API al formato del formulario
 */
function formatMovieFromAPI(movie: any): MovieFormData {
  const formData: MovieFormData = {
    title: movie.title || '',
    year: movie.year || null,
    releaseDate: '',
    duration: movie.duration || null,
    durationSeconds: movie.durationSeconds || null,
    tipoDuracion: movie.tipoDuracion || '',
    synopsis: movie.synopsis || '',
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

  // Procesar fecha de estreno
  if (movie.releaseYear) {
    const releasePartial: PartialDate = {
      year: movie.releaseYear,
      month: movie.releaseMonth,
      day: movie.releaseDay
    }

    // Si la fecha está completa, convertirla a formato ISO
    if (movie.releaseYear && movie.releaseMonth && movie.releaseDay) {
      formData.releaseDate = partialFieldsToDate(releasePartial) || ''
      formData.isPartialReleaseDate = false
    } else {
      // Fecha parcial
      formData.partialReleaseDate = releasePartial
      formData.isPartialReleaseDate = true
      formData.releaseDate = ''
    }
  }

  // Procesar fecha de inicio de rodaje
  if (movie.filmingStartYear) {
    const filmingStartPartial: PartialDate = {
      year: movie.filmingStartYear,
      month: movie.filmingStartMonth,
      day: movie.filmingStartDay
    }

    // Si la fecha está completa, convertirla a formato ISO
    if (movie.filmingStartYear && movie.filmingStartMonth && movie.filmingStartDay) {
      formData.filmingStartDate = partialFieldsToDate(filmingStartPartial) || ''
      formData.isPartialFilmingStartDate = false
    } else {
      // Fecha parcial
      formData.partialFilmingStartDate = filmingStartPartial
      formData.isPartialFilmingStartDate = true
      formData.filmingStartDate = ''
    }
  }

  // Procesar fecha de fin de rodaje
  if (movie.filmingEndYear) {
    const filmingEndPartial: PartialDate = {
      year: movie.filmingEndYear,
      month: movie.filmingEndMonth,
      day: movie.filmingEndDay
    }

    // Si la fecha está completa, convertirla a formato ISO
    if (movie.filmingEndYear && movie.filmingEndMonth && movie.filmingEndDay) {
      formData.filmingEndDate = partialFieldsToDate(filmingEndPartial) || ''
      formData.isPartialFilmingEndDate = false
    } else {
      // Fecha parcial
      formData.partialFilmingEndDate = filmingEndPartial
      formData.isPartialFilmingEndDate = true
      formData.filmingEndDate = ''
    }
  }

  return formData
}

export const moviesService = {
  /**
   * Obtiene la lista de películas con filtros y paginación
   */
  async getAll(filters: MovieFilters): Promise<MoviesResponse> {
    const params = new URLSearchParams({
      page: filters.currentPage.toString(),
      limit: '20',
      search: filters.searchTerm,
      year: filters.selectedYear,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    })

    const response = await fetch(`/api/movies?${params}`)

    if (!response.ok) {
      throw new Error('Error al cargar las películas')
    }

    const data = await response.json()

    // Las películas ya vienen con los campos de fecha parcial desde la API
    return {
      movies: data.movies || [],
      pagination: data.pagination || { totalPages: 1, currentPage: 1, totalItems: 0 }
    }
  },

  /**
   * Obtiene una película por ID con todas sus relaciones
   */
  async getById(id: number): Promise<any> {
    const response = await fetch(`/api/movies/${id}`)

    if (!response.ok) {
      throw new Error('Error al cargar los datos de la película')
    }

    const movie = await response.json()

    // Devolver la película tal cual, con los campos de fecha parcial
    return movie
  },

  /**
   * Obtiene una película por ID en formato de formulario para edición
   */
  async getByIdForEdit(id: number): Promise<MovieFormData> {
    const response = await fetch(`/api/movies/${id}`)

    if (!response.ok) {
      throw new Error('Error al cargar los datos de la película')
    }

    const movie = await response.json()
    return formatMovieFromAPI(movie)
  },

  /**
   * Crea una nueva película
   */
  async create(data: MovieFormData): Promise<any> {
    // Mismo tratamiento que update
    let formattedData = data;

    if (!('releaseYear' in data) && !('filmingStartYear' in data)) {
      formattedData = formatMovieDataForAPI(data);
    }

    const response = await fetch('/api/movies', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formattedData)
    })

    if (!response.ok) {
      let errorMessage = 'Error al crear la película'
      try {
        const error = await response.json()
        errorMessage = error.error || error.message || errorMessage
      } catch (e) {
        console.error('Error parsing response:', e)
      }
      throw new Error(errorMessage)
    }

    return response.json()
  },

  /**
   * Actualiza una película existente
   */
  async update(id: number, data: MovieFormData): Promise<any> {
    // NO volver a formatear si los datos ya vienen con campos de fecha separados
    let formattedData = data;

    // Solo formatear si vienen campos de fecha completos (releaseDate, etc.)
    // Si ya vienen releaseYear, releaseMonth, etc., no hacer nada
    if (!('releaseYear' in data) && !('filmingStartYear' in data)) {
      // Solo formatear si es necesario
      formattedData = formatMovieDataForAPI(data);
    }

    const response = await fetch(`/api/movies/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formattedData)
    })

    if (!response.ok) {
      let errorMessage = 'Error al actualizar la película'
      try {
        const error = await response.json()
        errorMessage = error.error || error.message || errorMessage
      } catch (e) {
        console.error('Error completo:', e)
        console.error('Error parsing response:', e)
      }
      throw new Error(errorMessage)
    }

    return response.json()
  },

  /**
   * Elimina una película
   */
  async delete(id: number): Promise<void> {
    const response = await fetch(`/api/movies/${id}`, {
      method: 'DELETE'
    })

    if (!response.ok) {
      throw new Error('Error al eliminar la película')
    }
  },

  /**
   * Busca películas por término de búsqueda (autocomplete)
   */
  async search(term: string, limit: number = 10): Promise<any[]> {
    const params = new URLSearchParams({
      search: term,
      limit: limit.toString()
    })

    const response = await fetch(`/api/movies/search?${params}`)

    if (!response.ok) {
      throw new Error('Error al buscar películas')
    }

    return response.json()
  },

  /**
   * Verifica si un slug está disponible
   */
  async checkSlugAvailability(slug: string, excludeId?: number): Promise<boolean> {
    const params = new URLSearchParams({ slug })
    if (excludeId) params.append('excludeId', String(excludeId))

    const response = await fetch(`/api/movies/check-slug?${params}`)

    if (!response.ok) {
      throw new Error('Error al verificar disponibilidad del slug')
    }

    const { available } = await response.json()
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
    const response = await fetch('/api/movies/stats')

    if (!response.ok) {
      throw new Error('Error al obtener estadísticas')
    }

    return response.json()
  },

  /**
   * Exporta películas a CSV
   */
  async exportToCSV(filters: MovieFilters): Promise<Blob> {
    const params = new URLSearchParams({
      search: filters.searchTerm,
      year: filters.selectedYear
    })

    const response = await fetch(`/api/movies/export?${params}`)

    if (!response.ok) {
      throw new Error('Error al exportar películas')
    }

    return response.blob()
  }
}