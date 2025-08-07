// src/services/movies.service.ts
import { MovieFilters } from '@/components/admin/movies/MoviesFilters'
import { MovieFormData } from '@/lib/movies/movieTypes'

interface MoviesResponse {
  movies: any[]
  pagination: {
    totalPages: number
    currentPage: number
    totalItems: number
  }
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
      status: filters.selectedStatus,
      year: filters.selectedYear,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    })

    const response = await fetch(`/api/movies?${params}`)

    if (!response.ok) {
      throw new Error('Error al cargar las películas')
    }

    const data = await response.json()
    
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

    return response.json()
  },

  /**
   * Crea una nueva película
   */
  async create(data: any): Promise<any> {
    const response = await fetch('/api/movies', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
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
  async update(id: number, data: any): Promise<any> {
    const response = await fetch(`/api/movies/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      let errorMessage = 'Error al actualizar la película'
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
  }
}