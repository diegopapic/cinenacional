// src/app/admin/movies/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import MoviesFilters, { type MovieFilters } from '@/components/admin/movies/MoviesFilters'
import MoviesPagination from '@/components/admin/movies/MoviesPagination'
import MoviesTable from '@/components/admin/movies/MoviesTable'
import MovieModal from '@/components/admin/movies/MovieModal'
import { moviesService } from '@/services'
import { type Movie } from '@/lib/movies/movieTypes'
import { useMovieForm } from '@/hooks/useMovieForm'

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

  // Usar el custom hook
  const movieForm = useMovieForm({
    editingMovie,
    onSuccess: () => {
      setShowModal(false)
      setEditingMovie(null)
      fetchMovies()
    }
  })

  console.log('movieForm keys:', Object.keys(movieForm))

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
    try {
      setEditingMovie(movie)
      await movieForm.loadMovieData(movie)
      setShowModal(true)
    } catch (error) {
      console.error('Error in handleEdit:', error)
      toast.error('Error al cargar los datos de la película')
    }
  }

  // Eliminar película
  const handleDelete = async (id: number) => {
    await moviesService.delete(id)
    fetchMovies()
  }

  // Abrir modal para nueva película
  const handleNewMovie = () => {
    setEditingMovie(null)
    movieForm.resetForNewMovie()
    setShowModal(true)
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

        {/* Modal con todas las props del hook */}
        <MovieModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false)
            setEditingMovie(null)
          }}
          editingMovie={editingMovie}
          onSubmit={movieForm.onSubmit}
          isSubmitting={movieForm.formState.isSubmitting}

          // Props del formulario
          register={movieForm.register}
          handleSubmit={movieForm.handleSubmit}
          watch={movieForm.watch}
          setValue={movieForm.setValue}
          reset={movieForm.reset}
          errors={movieForm.formState.errors}

          // Estados
          activeTab={movieForm.activeTab}
          setActiveTab={movieForm.setActiveTab}
          isPartialDate={movieForm.isPartialDate}
          setIsPartialDate={movieForm.setIsPartialDate}
          partialReleaseDate={movieForm.partialReleaseDate}
          setPartialReleaseDate={movieForm.setPartialReleaseDate}
          tipoDuracionDisabled={movieForm.tipoDuracionDisabled}

          // Estados para fechas de rodaje
          isPartialFilmingStartDate={movieForm.isPartialFilmingStartDate}
          setIsPartialFilmingStartDate={movieForm.setIsPartialFilmingStartDate}
          partialFilmingStartDate={movieForm.partialFilmingStartDate}
          setPartialFilmingStartDate={movieForm.setPartialFilmingStartDate}
          isPartialFilmingEndDate={movieForm.isPartialFilmingEndDate}
          setIsPartialFilmingEndDate={movieForm.setIsPartialFilmingEndDate}
          partialFilmingEndDate={movieForm.partialFilmingEndDate}
          setPartialFilmingEndDate={movieForm.setPartialFilmingEndDate}

          // Metadata - ahora viene del hook
          availableRatings={movieForm.availableRatings}
          availableColorTypes={movieForm.availableColorTypes}

          // Relaciones
          movieFormInitialData={movieForm.movieFormInitialData}
          alternativeTitles={movieForm.alternativeTitles}
          setAlternativeTitles={movieForm.setAlternativeTitles}
          movieLinks={movieForm.movieLinks}

          // Callbacks
          handleGenresChange={movieForm.handleGenresChange}
          handleCastChange={movieForm.handleCastChange}
          handleCrewChange={movieForm.handleCrewChange}
          handleCountriesChange={movieForm.handleCountriesChange}
          handleLanguagesChange={movieForm.handleLanguagesChange}
          handleProductionCompaniesChange={movieForm.handleProductionCompaniesChange}
          handleDistributionCompaniesChange={movieForm.handleDistributionCompaniesChange}
          handleThemesChange={movieForm.handleThemesChange}
          handleLinksChange={movieForm.handleLinksChange}
        />
      </div>
    </div>
  )
}