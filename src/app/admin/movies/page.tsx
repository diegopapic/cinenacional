// src/app/admin/movies/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import MoviesFilters, { type MovieFilters } from '@/components/admin/movies/MoviesFilters'
import MoviesPagination from '@/components/admin/movies/MoviesPagination'
import MoviesTable from '@/components/admin/movies/MoviesTable'
import MovieModal from '@/components/admin/movies/MovieModal'
import { MovieModalProvider } from '@/contexts/MovieModalContext'
import { moviesService } from '@/services'
import { type Movie } from '@/lib/movies/movieTypes'

export default function AdminMoviesPage() {
  const [movies, setMovies] = useState<Movie[]>([])
  const [loading, setLoading] = useState(true)
  const [totalPages, setTotalPages] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [editingMovie, setEditingMovie] = useState<Movie | null>(null)

  // Estados de filtros
  const [filters, setFilters] = useState<MovieFilters>({
    searchTerm: '',
    selectedStage: '',
    selectedYear: '',
    currentPage: 1
  })

  const handleFiltersChange = (newFilters: Partial<MovieFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }

  // Cargar películas
  const fetchMovies = async () => {
    try {
      setLoading(true)
      const { movies, pagination } = await moviesService.getAll(filters)
      setMovies(movies)
      setTotalPages(pagination.totalPages)
    } catch (error) {
      toast.error('Error al cargar las películas')
      setMovies([])
      setTotalPages(1)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMovies()
  }, [filters])

  // Editar película
  const handleEdit = async (movie: Movie) => {
    setEditingMovie(movie)
    setShowModal(true)
  }

  // Eliminar película
  const handleDelete = async (id: number) => {
    await moviesService.delete(id)
    fetchMovies()
  }

  // Abrir modal para nueva película
  const handleNewMovie = () => {
    setEditingMovie(null)
    setShowModal(true)
  }

  // Callbacks para el context
  const handleMovieSuccess = (movie: Movie) => {
    setShowModal(false)
    setEditingMovie(null)
    fetchMovies()
    
    // Toast específico según la acción
    if (editingMovie) {
      toast.success(`Película "${movie.title}" actualizada exitosamente`)
    } else {
      toast.success(`Película "${movie.title}" creada exitosamente`)
    }
  }

  const handleMovieError = (error: Error) => {
    console.error('Error en operación de película:', error)
    toast.error(error.message || 'Error al procesar la película')
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingMovie(null)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-3xl font-bold text-gray-900">
              Administración de Películas
            </h1>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filtros y acciones */}
        <MoviesFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onNewMovie={handleNewMovie}
        />

        {/* Lista de películas */}
        <MoviesTable
          movies={movies}
          loading={loading}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        {/* Paginación */}
        {totalPages > 1 && (
          <MoviesPagination
            currentPage={filters.currentPage}
            totalPages={totalPages}
            onPageChange={(page) => handleFiltersChange({ currentPage: page })}
          />
        )}

        {/* Modal envuelto en el Provider */}
        <MovieModalProvider
          editingMovie={editingMovie}
          onSuccess={handleMovieSuccess}
          onError={handleMovieError}
        >
          <MovieModal
            isOpen={showModal}
            onClose={handleCloseModal}
          />
        </MovieModalProvider>
      </div>
    </div>
  )
}