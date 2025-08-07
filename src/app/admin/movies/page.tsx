// src/app/admin/movies/page.tsx - Versión actualizada con pestañas
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'react-hot-toast'
import MoviesFilters, { type MovieFilters } from '@/components/admin/movies/MoviesFilters'
import MoviesPagination from '@/components/admin/movies/MoviesPagination'
import MoviesTable from '@/components/admin/movies/MoviesTable'
import MovieModal from '@/components/admin/movies/MovieModal'
import { moviesService } from '@/services'

import {
  calcularTipoDuracion,
  prepareMovieData
} from '@/lib/movies/movieUtils'

import {
  movieFormSchema,
  type MovieFormData,
  type Movie,
  type PartialReleaseDate
} from '@/lib/movies/movieTypes'

export default function AdminMoviesPage() {
  const [movies, setMovies] = useState<Movie[]>([])
  const [loading, setLoading] = useState(true)
  const [totalPages, setTotalPages] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [editingMovie, setEditingMovie] = useState<Movie | null>(null)
  const [activeTab, setActiveTab] = useState('basic') // Estado para la pestaña activa
  const [availableRatings, setAvailableRatings] = useState<any[]>([])
  const [alternativeTitles, setAlternativeTitles] = useState<any[]>([])
  const [movieLinks, setMovieLinks] = useState<any[]>([])
  const [availableColorTypes, setAvailableColorTypes] = useState<any[]>([])
  const [isPartialDate, setIsPartialDate] = useState(false)
  const [partialReleaseDate, setPartialReleaseDate] = useState<PartialReleaseDate>({
    year: null,
    month: null
  })

  // Consolidar los estados de filtros en un solo objeto
  const [filters, setFilters] = useState<MovieFilters>({
    searchTerm: '',
    selectedStatus: '',
    selectedStage: '',
    selectedYear: '',
    currentPage: 1
  })

  const handleFiltersChange = (newFilters: Partial<MovieFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }

  // Estado para los datos iniciales del formulario
  const [movieFormInitialData, setMovieFormInitialData] = useState<any>(null)

  const [tipoDuracionDisabled, setTipoDuracionDisabled] = useState(false)

  const [movieRelations, setMovieRelations] = useState<{
    genres: number[];
    cast: any[];
    crew: any[];
    countries: number[];
    languages: number[];
    productionCompanies: number[];
    distributionCompanies: number[];
    themes: number[];
  }>({
    genres: [],
    cast: [],
    crew: [],
    countries: [],
    languages: [],
    productionCompanies: [],
    distributionCompanies: [],
    themes: []
  })

  // Form
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<MovieFormData>({
    resolver: zodResolver(movieFormSchema),
    defaultValues: {
      stage: 'COMPLETA' // Valor por defecto
    }
  })

  // EFECTO PARA OBSERVAR CAMBIOS EN DURACIÓN
  useEffect(() => {
    const subscription = watch((value, { name, type }) => {
      // Ejecutar cuando cambien los campos 'duration' O 'durationSeconds'
      if ((name === 'duration' || name === 'durationSeconds') && type === 'change') {
        const minutos = value.duration
        const segundos = value.durationSeconds

        // Verificar si hay alguna duración (minutos o segundos)
        const hayDuracion = (minutos && minutos > 0) || (segundos && segundos > 0)

        if (hayDuracion) {
          // Calcular automáticamente el tipo considerando ambos campos
          const tipoCalculado = calcularTipoDuracion(minutos, segundos)
          const tipoActual = value.tipoDuracion

          // Solo actualizar si el tipo calculado es diferente al actual
          if (tipoCalculado !== tipoActual) {
            setValue('tipoDuracion', tipoCalculado, { shouldValidate: false })
          }
          setTipoDuracionDisabled(true)
        } else {
          // Si no hay duración en ningún campo, habilitar el campo manual
          setTipoDuracionDisabled(false)
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [watch, setValue])

  useEffect(() => {
    const loadRatings = async () => {
      try {
        const response = await fetch('/api/calificaciones')
        if (response.ok) {
          const ratings = await response.json()
          setAvailableRatings(ratings)
        }
      } catch (error) {
        console.error('Error loading ratings:', error)
      }
    }

    loadRatings()
  }, [])

  // Callbacks para MovieFormEnhanced
  const handleGenresChange = useCallback((genres: number[]) => {
    setMovieRelations(prev => ({ ...prev, genres }))
  }, [])

  const handleLinksChange = useCallback((links: any[]) => {
    setMovieLinks(links)
  }, [])

  const handleCastChange = useCallback((cast: any[]) => {
    setMovieRelations(prev => ({ ...prev, cast }))
  }, [])

  const handleCrewChange = useCallback((crew: any[]) => {
    setMovieRelations(prev => ({ ...prev, crew }))
  }, [])

  const handleCountriesChange = useCallback((countries: number[]) => {
    setMovieRelations(prev => ({ ...prev, countries }))
  }, [])

  const handleLanguagesChange = useCallback((languages: number[]) => {
    setMovieRelations(prev => ({ ...prev, languages }))
  }, [])

  const handleProductionCompaniesChange = useCallback((companies: number[]) => {
    setMovieRelations(prev => ({ ...prev, productionCompanies: companies }))
  }, [])

  const handleThemesChange = useCallback((themes: number[]) => {
    setMovieRelations(prev => ({ ...prev, themes }))
  }, [])

  const handleDistributionCompaniesChange = useCallback((companies: number[]) => {
    setMovieRelations(prev => ({ ...prev, distributionCompanies: companies }))
  }, [])

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

  const fetchColorTypes = async () => {
    try {
      const response = await fetch('/api/color-types')
      if (response.ok) {
        const data = await response.json()
        setAvailableColorTypes(data)
      }
    } catch (error) {
      console.error('Error loading color types:', error)
    }
  }

  useEffect(() => {
    fetchMovies()
  }, [filters])

  useEffect(() => {
    fetchColorTypes()
  }, [])

  // Crear o actualizar película
  const onSubmit = async (data: MovieFormData) => {
    try {
      // Preparar los datos correctamente
      const preparedData = prepareMovieData(data)

      // Procesar fecha de estreno según el tipo
      let releaseDateData = {}
      if (isPartialDate) {
        // Fecha parcial - enviar campos separados
        releaseDateData = {
          releaseYear: partialReleaseDate.year,
          releaseMonth: partialReleaseDate.month,
          releaseDay: null
        }
      } else if (data.releaseDate) {
        // Fecha completa - convertir a campos separados
        const [year, month, day] = data.releaseDate.split('-').map(Number)
        releaseDateData = {
          releaseYear: year,
          releaseMonth: month,
          releaseDay: day
        }
      } else {
        // Sin fecha
        releaseDateData = {
          releaseYear: null,
          releaseMonth: null,
          releaseDay: null
        }
      }

      // IMPORTANTE: Eliminar releaseDate del objeto preparado
      delete preparedData.releaseDate;

      const movieData = {
        ...preparedData,
        ...releaseDateData,
        stage: data.stage || 'COMPLETA',
        metaKeywords: preparedData.metaKeywords ? preparedData.metaKeywords.split(',').map((k: string) => k.trim()) : [],
        ...movieRelations,
        alternativeTitles,
        links: movieLinks
      }

      // Asegurarse de nuevo de que no se envíe releaseDate
      delete movieData.releaseDate;

      // MOVER LOS CONSOLE.LOG AQUÍ, ANTES del servicio
      console.log('=== DATOS ENVIADOS AL BACKEND ===');
      console.log('movieData completo:', JSON.stringify(movieData, null, 2));
      console.log('=== DATOS DE FECHA ENVIADOS ===');
      console.log('releaseYear:', movieData.releaseYear);
      console.log('releaseMonth:', movieData.releaseMonth);
      console.log('releaseDay:', movieData.releaseDay);
      console.log('================================');

      // CAMBIO PRINCIPAL: Usar el servicio en lugar de fetch directo
      if (editingMovie) {
        await moviesService.update(editingMovie.id, movieData)
        toast.success('Película actualizada')
      } else {
        await moviesService.create(movieData)
        toast.success('Película creada')
      }

      // Limpiar y actualizar
      setShowModal(false)
      reset()
      setEditingMovie(null)
      setMovieFormInitialData(null)
      fetchMovies()
    } catch (error) {
      console.error('❌ Error in onSubmit:', error)
      toast.error(error instanceof Error ? error.message : 'Error al guardar')
    }
  }

  // Editar película
  const handleEdit = async (movie: Movie) => {

    try {
      console.log('Intentando cargar película con ID:', movie.id)
      const fullMovie = await moviesService.getById(movie.id)
      console.log('Película cargada:', fullMovie)
      const minutos = fullMovie.duration
      const segundos = fullMovie.durationSeconds
      const hayDuracion = (minutos && minutos > 0) || (segundos && segundos > 0)

      if (hayDuracion) {
        const tipoCalculado = calcularTipoDuracion(minutos, segundos)
        setValue('tipoDuracion', tipoCalculado)
        setTipoDuracionDisabled(true)
      } else {
        setValue('tipoDuracion', fullMovie.tipoDuracion || '')
        setTipoDuracionDisabled(false)
      }
      if (fullMovie.alternativeTitles) {
        setAlternativeTitles(fullMovie.alternativeTitles)
      }
      setEditingMovie(movie)

      // Llenar el formulario
      Object.keys(fullMovie).forEach((key) => {
        if (key === 'metaKeywords' && Array.isArray(fullMovie[key])) {
          setValue(key as any, fullMovie[key].join(', '))
        } else if (key === 'releaseDate' && fullMovie[key]) {
          setValue(key as any, new Date(fullMovie[key]).toISOString().split('T')[0])
          setIsPartialDate(false)
        } else if (key === 'filmingStartDate' && fullMovie[key]) {
          setValue(key as any, new Date(fullMovie[key]).toISOString().split('T')[0])
        } else if (key === 'filmingEndDate' && fullMovie[key]) {
          setValue(key as any, new Date(fullMovie[key]).toISOString().split('T')[0])
        } else if (key === 'durationSeconds') {
          setValue(key as any, fullMovie[key] || 0) // Asegurar que tenga un valor por defecto
        } else if (key === 'colorType' && fullMovie[key]) {
          // Si existe colorType, usar su ID
          setValue('colorTypeId' as any, fullMovie[key].id)
        } else {
          setValue(key as any, fullMovie[key])
        }
      })
      // Manejar campos de fecha parcial si existen
      if (fullMovie.releaseYear && !fullMovie.releaseDate) {
        setIsPartialDate(true)
        setPartialReleaseDate({
          year: fullMovie.releaseYear,
          month: fullMovie.releaseMonth || null
        })
        // Si hay fecha completa (día incluido), usar el date picker normal
        if (fullMovie.releaseDay) {
          setIsPartialDate(false)
          const dateStr = `${fullMovie.releaseYear}-${String(fullMovie.releaseMonth || 1).padStart(2, '0')}-${String(fullMovie.releaseDay || 1).padStart(2, '0')}`
          setValue('releaseDate', dateStr)
        }
      } else if (!fullMovie.releaseYear && !fullMovie.releaseDate) {
        // No hay fecha
        setIsPartialDate(false)
        setPartialReleaseDate({ year: null, month: null })
      }
      if (!fullMovie.stage) {
        setValue('stage', 'COMPLETA')
      }
      setValue('dataCompleteness', fullMovie.dataCompleteness || 'BASIC_PRESS_KIT')
      // INICIALIZAR TIPO DE DURACIÓN AL EDITAR
      if (fullMovie.duration && fullMovie.duration > 0) {
        const tipoCalculado = calcularTipoDuracion(fullMovie.duration)
        setValue('tipoDuracion', tipoCalculado)
        setTipoDuracionDisabled(true)
      } else {
        setValue('tipoDuracion', fullMovie.tipoDuracion || '')
        setTipoDuracionDisabled(false)
      }

      if (fullMovie.ratingId) {
        setValue('ratingId', fullMovie.ratingId)
      }

      // Datos para MovieFormEnhanced (mantiene el formato completo para mostrar)
      setMovieFormInitialData({
        genres: fullMovie.genres || [],
        cast: fullMovie.cast || [],
        crew: fullMovie.crew || [],
        countries: fullMovie.movieCountries || [],
        languages: fullMovie.languages || [],
        productionCompanies: fullMovie.productionCompanies || [],
        distributionCompanies: fullMovie.distributionCompanies || [],
        themes: fullMovie.themes || []
      })

      if (fullMovie.links) {
        setMovieLinks(fullMovie.links)
      }


      // IMPORTANTE: Limpiar los datos para movieRelations
      setMovieRelations({
        genres: fullMovie.genres?.map((g: any) => g.genreId) || [],
        cast: fullMovie.cast?.map((c: any) => ({
          personId: c.personId,
          characterName: c.characterName,
          billingOrder: c.billingOrder,
          isPrincipal: c.isPrincipal
        })) || [],
        crew: fullMovie.crew?.map((c: any) => ({
          personId: c.personId,
          role: c.role,
          department: c.department,
          billingOrder: c.billingOrder
        })) || [],
        countries: fullMovie.movieCountries?.map((c: any) => c.countryId) || [],
        languages: fullMovie.languages?.map((l: any) => l.languageId) || [],
        productionCompanies: fullMovie.productionCompanies?.map((c: any) => c.companyId) || [],
        distributionCompanies: fullMovie.distributionCompanies?.map((c: any) => c.companyId) || [],
        themes: fullMovie.themes?.map((t: any) => t.themeId) || []
      })

      setValue('dataCompleteness', fullMovie.dataCompleteness || 'BASIC_PRESS_KIT')

      setShowModal(true)

    } catch (error) {
      console.error('Error completo en handleEdit:', error)
      console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack')
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
    reset({ stage: 'COMPLETA' })
    reset()
    // Limpiar los datos iniciales del formulario
    setMovieFormInitialData(null)
    reset({
      dataCompleteness: 'BASIC_PRESS_KIT', // Valor por defecto
      status: 'PUBLISHED' // y otros valores por defecto si quieres
    })
    // Resetear estados de fecha
    setIsPartialDate(false)
    setPartialReleaseDate({ year: null, month: null })
    // Limpiar las relaciones para nueva película
    setMovieRelations({
      genres: [],
      cast: [],
      crew: [],
      countries: [],
      languages: [],
      productionCompanies: [],
      distributionCompanies: [],
      themes: []
    })
    setMovieLinks([])
    // RESETEAR ESTADO DEL TIPO DE DURACIÓN
    setTipoDuracionDisabled(false)
    setActiveTab('basic') // Resetear a la primera pestaña
    // Agregar al final:
    setAlternativeTitles([])
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

        {/* Modal de creación/edición con pestañas */}
        <MovieModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false)
            reset()
            setEditingMovie(null)
            setMovieFormInitialData(null)
          }}
          editingMovie={editingMovie}
          onSubmit={onSubmit}
          isSubmitting={isSubmitting}

          // Props del formulario
          register={register}
          handleSubmit={handleSubmit}
          watch={watch}
          setValue={setValue}
          reset={reset}
          errors={errors}

          // Estados
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isPartialDate={isPartialDate}
          setIsPartialDate={setIsPartialDate}
          partialReleaseDate={partialReleaseDate}
          setPartialReleaseDate={setPartialReleaseDate}
          tipoDuracionDisabled={tipoDuracionDisabled}

          // Metadata
          availableRatings={availableRatings}
          availableColorTypes={availableColorTypes}

          // Relaciones
          movieFormInitialData={movieFormInitialData}
          alternativeTitles={alternativeTitles}
          setAlternativeTitles={setAlternativeTitles}
          movieLinks={movieLinks}

          // Callbacks
          handleGenresChange={handleGenresChange}
          handleCastChange={handleCastChange}
          handleCrewChange={handleCrewChange}
          handleCountriesChange={handleCountriesChange}
          handleLanguagesChange={handleLanguagesChange}
          handleProductionCompaniesChange={handleProductionCompaniesChange}
          handleDistributionCompaniesChange={handleDistributionCompaniesChange}
          handleThemesChange={handleThemesChange}
          handleLinksChange={handleLinksChange}
        />
      </div>
    </div>
  )
}