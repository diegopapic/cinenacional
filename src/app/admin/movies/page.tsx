// src/app/admin/movies/page.tsx - Versión actualizada con pestañas
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CloudinaryUploadWidget } from '@/components/admin/CloudinaryUploadWidget'
import { z } from 'zod'
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Film,
  Calendar,
  Clock,
  Star,
  X,
  Save,
  Loader2,
  Info,
  Users,
  Briefcase,
  Settings,
  Image
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { formatDate, formatDuration } from '@/lib/utils'
import MovieFormEnhanced from '@/components/admin/MovieFormEnhanced'
import AlternativeTitlesManager from '@/components/admin/AlternativeTitlesManager'

// Importar Tabs de Radix UI
import * as Tabs from '@radix-ui/react-tabs'

// Schema de validación
const movieFormSchema = z.object({
  title: z.string().min(1, 'El título es requerido'),
  originalTitle: z.string().optional(),
  year: z.number().min(1895).max(new Date().getFullYear() + 5),
  releaseDate: z.string().optional(),
  duration: z.number().optional(),
  durationSeconds: z.number().min(0).max(59).optional(),
  tipoDuracion: z.string().optional(),
  synopsis: z.string().optional(),
  tagline: z.string().optional(),
  rating: z.number().min(0).max(10).optional(),
  posterUrl: z.string().url().optional().or(z.literal('')),
  posterPublicId: z.string().optional(),
  backdropUrl: z.string().url().optional().or(z.literal('')),
  backdropPublicId: z.string().optional(),
  trailerUrl: z.string().url().optional().or(z.literal('')),
  imdbId: z.string().optional(),
  aspectRatio: z.string().optional(),
  colorType: z.string().optional(),
  soundType: z.string().optional(),
  filmFormat: z.string().optional(),
  certificateNumber: z.string().optional(),
  ratingId: z.number().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  dataCompleteness: z.enum([
    'BASIC_PRESS_KIT',
    'FULL_PRESS_KIT',
    'MAIN_CAST',
    'MAIN_CREW',
    'FULL_CAST',
    'FULL_CREW'
  ]).optional(),
  metaDescription: z.string().optional(),
  metaKeywords: z.string().optional()
})

type MovieFormData = z.infer<typeof movieFormSchema>

const getCompletenessLabel = (completeness: string) => {
  const labels: Record<string, string> = {
    BASIC_PRESS_KIT: 'Gacetilla básica',
    FULL_PRESS_KIT: 'Gacetilla completa',
    MAIN_CAST: 'Intérpretes principales',
    MAIN_CREW: 'Técnicos principales',
    FULL_CAST: 'Todos los intérpretes',
    FULL_CREW: 'Todos los técnicos'
  }
  return labels[completeness] || completeness
}

const getCompletenessColor = (completeness: string) => {
  const colors: Record<string, string> = {
    BASIC_PRESS_KIT: 'bg-red-100 text-red-800',
    FULL_PRESS_KIT: 'bg-orange-100 text-orange-800',
    MAIN_CAST: 'bg-yellow-100 text-yellow-800',
    MAIN_CREW: 'bg-green-100 text-green-800',
    FULL_CAST: 'bg-green-100 text-green-800',
    FULL_CREW: 'bg-blue-100 text-blue-800'
  }
  return colors[completeness] || 'bg-gray-100 text-gray-800'
}

interface Movie {
  id: number
  slug: string
  title: string
  originalTitle?: string
  year: number
  releaseDate?: string
  duration?: number
  rating?: number
  posterUrl?: string
  status: string
  dataCompleteness?: string
  genres: Array<{ id: number; name: string }>
  directors: Array<{ id: number; name: string }>
  mainCast: Array<{
    person: { id: number; name: string }
    character?: string
  }>
  country: string
}

export default function AdminMoviesPage() {
  const [movies, setMovies] = useState<Movie[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [selectedYear, setSelectedYear] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [editingMovie, setEditingMovie] = useState<Movie | null>(null)
  const [deletingMovieId, setDeletingMovieId] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState('basic') // Estado para la pestaña activa
  const [availableRatings, setAvailableRatings] = useState<any[]>([])
  const [alternativeTitles, setAlternativeTitles] = useState<any[]>([])
  // Estado para los datos iniciales del formulario
  const [movieFormInitialData, setMovieFormInitialData] = useState<any>(null)

  // NUEVOS ESTADOS PARA TIPO DE DURACIÓN
  const [tiposDuracion] = useState([
    { value: 'largometraje', label: 'Largometraje' },
    { value: 'mediometraje', label: 'Mediometraje' },
    { value: 'cortometraje', label: 'Cortometraje' }
  ])
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
    resolver: zodResolver(movieFormSchema)
  })

  // FUNCIONES PARA TIPO DE DURACIÓN
  const calcularTipoDuracion = (minutos: number | null | undefined, segundos: number | null | undefined = 0): string => {
    // Convertir todo a minutos totales
    const minutosReales = (minutos || 0)
    const segundosReales = (segundos || 0)
    const duracionTotalMinutos = minutosReales + (segundosReales / 60)

    // Si no hay duración total, retornar vacío
    if (duracionTotalMinutos === 0) return ''

    if (duracionTotalMinutos >= 60) return 'largometraje'
    if (duracionTotalMinutos >= 30) return 'mediometraje'
    return 'cortometraje'
  }

  const obtenerEtiquetaTipoDuracion = (tipo: string): string => {
    const tipoObj = tiposDuracion.find(t => t.value === tipo)
    return tipoObj ? tipoObj.label : ''
  }

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
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        search: searchTerm,
        status: selectedStatus,
        year: selectedYear,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      })

      const response = await fetch(`/api/movies?${params}`)

      if (!response.ok) {
        throw new Error('Error al cargar las películas')
      }

      const data = await response.json()

      // Asegurar que siempre tengamos un array
      setMovies(data.movies || [])
      setTotalPages(data.pagination?.totalPages || 1)
    } catch (error) {
      toast.error('Error al cargar las películas')
      // Asegurar que movies sea un array vacío en caso de error
      setMovies([])
      setTotalPages(1)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMovies()
  }, [currentPage, searchTerm, selectedStatus, selectedYear])

  // Crear o actualizar película
  const onSubmit = async (data: MovieFormData) => {
    try {

      const movieData = {
        ...data,
        dataCompleteness: data.dataCompleteness || 'BASIC_PRESS_KIT',
        metaKeywords: data.metaKeywords ? data.metaKeywords.split(',').map(k => k.trim()) : [],
        ...movieRelations,
        alternativeTitles
      }

      const url = editingMovie
        ? `/api/movies/${editingMovie.id}`
        : '/api/movies'

      const method = editingMovie ? 'PUT' : 'POST'
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(movieData)
      })

      if (!response.ok) {
        let errorMessage = 'Error al guardar la película'
        try {
          const error = await response.json()
          errorMessage = error.error || error.message || errorMessage
        } catch (e) {
        }
        throw new Error(errorMessage)
      }

      toast.success(editingMovie ? 'Película actualizada' : 'Película creada')
      setShowModal(false)
      reset()
      setEditingMovie(null)
      setMovieFormInitialData(null)
      fetchMovies()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al guardar')
    }
  }

  // Editar película
  const handleEdit = async (movie: Movie) => {

    try {
      const response = await fetch(`/api/movies/${movie.id}`)
      const fullMovie = await response.json()
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
        } else if (key === 'durationSeconds') {
          setValue(key as any, fullMovie[key] || 0) // Asegurar que tenga un valor por defecto
        } else {
          setValue(key as any, fullMovie[key])
        }
      })
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
        countries: fullMovie.countries || [],
        languages: fullMovie.languages || [],
        productionCompanies: fullMovie.productionCompanies || [],
        distributionCompanies: fullMovie.distributionCompanies || [],
        themes: fullMovie.themes || []
      })

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
        countries: fullMovie.countries?.map((c: any) => c.countryId) || [],
        languages: fullMovie.languages?.map((l: any) => l.languageId) || [],
        productionCompanies: fullMovie.productionCompanies?.map((c: any) => c.companyId) || [],
        distributionCompanies: fullMovie.distributionCompanies?.map((c: any) => c.companyId) || [],
        themes: fullMovie.themes?.map((t: any) => t.themeId) || []
      })

      setValue('dataCompleteness', fullMovie.dataCompleteness || 'BASIC_PRESS_KIT')

      setShowModal(true)

    } catch (error) {
      toast.error('Error al cargar los datos de la película')
    }
  }

  // Eliminar película
  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar esta película?')) return

    try {
      setDeletingMovieId(id)
      const response = await fetch(`/api/movies/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Error al eliminar')
      }

      toast.success('Película eliminada')
      fetchMovies()
    } catch (error) {
      toast.error('Error al eliminar la película')
    } finally {
      setDeletingMovieId(null)
    }
  }

  // Abrir modal para nueva película
  const handleNewMovie = () => {
    setEditingMovie(null)
    reset()
    // Limpiar los datos iniciales del formulario
    setMovieFormInitialData(null)
    reset({
      dataCompleteness: 'BASIC_PRESS_KIT', // Valor por defecto
      status: 'PUBLISHED' // y otros valores por defecto si quieres
    })
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
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Búsqueda */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar películas..."
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Filtro por estado */}
            <select
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="">Todos los estados</option>
              <option value="DRAFT">Borrador</option>
              <option value="PUBLISHED">Publicado</option>
              <option value="ARCHIVED">Archivado</option>
            </select>

            {/* Filtro por año */}
            <select
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              <option value="">Todos los años</option>
              {Array.from({ length: 50 }, (_, i) => new Date().getFullYear() - i).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>

            {/* Botón nueva película */}
            <button
              onClick={handleNewMovie}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Nueva Película
            </button>
          </div>
        </div>

        {/* Lista de películas */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : movies && movies.length === 0 ? (
            <div className="text-center py-12">
              <Film className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No se encontraron películas</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Película
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Año
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Director
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Completitud
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rating
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {movies && movies.map((movie) => (
                    <tr key={movie.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            {movie.posterUrl ? (
                              <img
                                className="h-10 w-10 rounded-lg object-cover"
                                src={movie.posterUrl}
                                alt={movie.title}
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-lg bg-gray-200 flex items-center justify-center">
                                <Film className="w-5 h-5 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {movie.title}
                            </div>
                            {movie.originalTitle && (
                              <div className="text-sm text-gray-500">
                                {movie.originalTitle}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {movie.year}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {movie.directors?.map(d => d.name).join(', ') || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${movie.status === 'PUBLISHED'
                          ? 'bg-green-100 text-green-800'
                          : movie.status === 'DRAFT'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                          }`}>
                          {movie.status === 'PUBLISHED' ? 'Publicado' :
                            movie.status === 'DRAFT' ? 'Borrador' : 'Archivado'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {movie.rating ? (
                          <div className="flex items-center">
                            <Star className="w-4 h-4 text-yellow-400 fill-current" />
                            <span className="ml-1 text-sm text-gray-900">
                              {movie.rating}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <a
                            href={`/peliculas/${movie.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-600 hover:text-gray-900 transition-colors"
                            title="Ver película"
                          >
                            <Eye className="w-4 h-4" />
                          </a>
                          <button
                            onClick={() => handleEdit(movie)}
                            className="text-blue-600 hover:text-blue-900 transition-colors"
                            title="Editar"
                          >

                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(movie.id)}
                            disabled={deletingMovieId === movie.id}
                            className="text-red-600 hover:text-red-900 transition-colors disabled:opacity-50"
                            title="Eliminar"
                          >
                            {deletingMovieId === movie.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-4 rounded-lg shadow">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Página <span className="font-medium">{currentPage}</span> de{' '}
                  <span className="font-medium">{totalPages}</span>
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Siguiente
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de creación/edición con pestañas */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingMovie ? 'Editar Película' : 'Nueva Película'}
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false)
                    reset()
                    setEditingMovie(null)
                    setMovieFormInitialData(null)
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="overflow-y-auto max-h-[calc(90vh-8rem)]">
              <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="w-full">
                {/* Lista de pestañas */}
                <Tabs.List className="flex border-b border-gray-200 px-6 pt-4">
                  <Tabs.Trigger
                    value="basic"
                    className={`px-4 py-2 -mb-px text-sm font-medium transition-colors ${activeTab === 'basic'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      <Info className="w-4 h-4" />
                      Información Básica
                    </div>
                  </Tabs.Trigger>
                  <Tabs.Trigger
                    value="media"
                    className={`px-4 py-2 -mb-px text-sm font-medium transition-colors ${activeTab === 'media'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      <Image className="w-4 h-4" />
                      Multimedia
                    </div>
                  </Tabs.Trigger>
                  <Tabs.Trigger
                    value="cast"
                    className={`px-4 py-2 -mb-px text-sm font-medium transition-colors ${activeTab === 'cast'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Reparto
                    </div>
                  </Tabs.Trigger>
                  <Tabs.Trigger
                    value="crew"
                    className={`px-4 py-2 -mb-px text-sm font-medium transition-colors ${activeTab === 'crew'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4" />
                      Equipo Técnico
                    </div>
                  </Tabs.Trigger>
                  <Tabs.Trigger
                    value="advanced"
                    className={`px-4 py-2 -mb-px text-sm font-medium transition-colors ${activeTab === 'advanced'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      Avanzado
                    </div>
                  </Tabs.Trigger>
                </Tabs.List>

                {/* Contenido de las pestañas */}
                <div className="p-6">
                  {/* Pestaña de Información Básica */}
                  <Tabs.Content value="basic" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">
                          Información Principal
                        </h3>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Título *
                          </label>
                          <input
                            type="text"
                            {...register('title')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                          />
                          {errors.title && (
                            <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Año *
                            </label>
                            <input
                              type="number"
                              {...register('year', { valueAsNumber: true })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                            />
                            {errors.year && (
                              <p className="mt-1 text-sm text-red-600">{errors.year.message}</p>
                            )}
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Fecha de Estreno
                            </label>
                            <input
                              type="date"
                              {...register('releaseDate')}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Duración (minutos)
                          </label>
                          <input
                            type="number"
                            {...register('duration', { valueAsNumber: true })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Duración (segundos)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="59"
                            {...register('durationSeconds', { valueAsNumber: true })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                            placeholder="0-59"
                          />
                          {errors.durationSeconds && (
                            <p className="mt-1 text-sm text-red-600">{errors.durationSeconds.message}</p>
                          )}
                        </div>

                        {/* NUEVO CAMPO TIPO DE DURACIÓN */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tipo de duración
                            {tipoDuracionDisabled && (
                              <span className="ml-2 text-xs text-green-600 font-normal">
                                (Calculado automáticamente)
                              </span>
                            )}
                          </label>
                          <select
                            {...register('tipoDuracion')}
                            disabled={tipoDuracionDisabled}
                            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 transition-colors ${tipoDuracionDisabled
                              ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                              : 'hover:border-gray-400'
                              }`}
                          >
                            <option value="">Seleccionar tipo de duración...</option>
                            {tiposDuracion.map((tipo) => (
                              <option key={tipo.value} value={tipo.value}>
                                {tipo.label}
                              </option>
                            ))}
                          </select>
                          <div className="mt-1 text-xs text-gray-500">
                            {tipoDuracionDisabled ? (
                              <div className="flex items-center space-x-1">
                                <svg className="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                                <span>
                                  <strong>{obtenerEtiquetaTipoDuracion(watch('tipoDuracion') || '')}</strong>
                                  {(() => {
                                    const minutos = watch('duration') || 0
                                    const segundos = watch('durationSeconds') || 0
                                    if (minutos > 0 || segundos > 0) {
                                      if (minutos > 0 && segundos > 0) {
                                        return ` (${minutos}min ${segundos}s)`
                                      } else if (minutos > 0) {
                                        return ` (${minutos}min)`
                                      } else {
                                        return ` (${segundos}s)`
                                      }
                                    }
                                    return ''
                                  })()}
                                </span>
                              </div>
                            ) : (
                              <div>
                                <p>Ingrese la duración para calcular automáticamente, o seleccione manualmente.</p>
                                <div className="mt-1 space-y-1">
                                  <div className="flex justify-between">
                                    <span>Largometraje:</span>
                                    <span className="font-mono text-gray-400">60+ min</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Mediometraje:</span>
                                    <span className="font-mono text-gray-400">30-59 min</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Cortometraje:</span>
                                    <span className="font-mono text-gray-400">&lt; 30 min</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Estado
                          </label>
                          <select
                            {...register('status')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                          >
                            <option value="DRAFT">Borrador</option>
                            <option value="PUBLISHED">Publicado</option>
                            <option value="ARCHIVED">Archivado</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nivel de información cargada *
                        </label>
                        <select
                          {...register('dataCompleteness')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                        >
                          <option value="BASIC_PRESS_KIT">📄 Gacetilla básica</option>
                          <option value="FULL_PRESS_KIT">📋 Gacetilla completa</option>
                          <option value="MAIN_CAST">👥 Intérpretes principales</option>
                          <option value="MAIN_CREW">🔧 Técnicos principales</option>
                          <option value="FULL_CAST">🎭 Todos los intérpretes</option>
                          <option value="FULL_CREW">🎬 Todos los técnicos</option>
                        </select>
                        <p className="mt-1 text-xs text-gray-500">
                          Indica hasta qué nivel de detalle has cargado la información de esta película
                        </p>
                      </div>
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">
                          Información Adicional
                        </h3>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Sinopsis
                          </label>
                          <textarea
                            {...register('synopsis')}
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tagline
                          </label>
                          <input
                            type="text"
                            {...register('tagline')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            IMDb ID
                          </label>
                          <input
                            type="text"
                            {...register('imdbId')}
                            placeholder="tt0123456"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Géneros, Países e Idiomas */}
                    <MovieFormEnhanced
                      key={editingMovie?.id || 'new'}
                      onGenresChange={handleGenresChange}
                      onCastChange={handleCastChange}
                      onCrewChange={handleCrewChange}
                      onCountriesChange={handleCountriesChange}
                      onLanguagesChange={handleLanguagesChange}
                      onProductionCompaniesChange={handleProductionCompaniesChange}
                      onDistributionCompaniesChange={handleDistributionCompaniesChange}
                      onThemesChange={handleThemesChange}
                      initialData={movieFormInitialData}
                      showOnlyBasicInfo={true}
                    />
                  </Tabs.Content>


                  {/* Pestaña de Multimedia */}
                  <Tabs.Content value="media" className="space-y-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      Imágenes y Videos
                    </h3>

                    <CloudinaryUploadWidget
                      value={watch('posterUrl')}
                      onChange={(url, publicId) => {
                        setValue('posterUrl', url)
                        setValue('posterPublicId', publicId)
                      }}
                      label="Afiche de la Película"
                      type="poster"
                      movieId={editingMovie?.id}
                    />

                    <CloudinaryUploadWidget
                      value={watch('backdropUrl')}
                      onChange={(url, publicId) => {
                        setValue('backdropUrl', url)
                        setValue('backdropPublicId', publicId)
                      }}
                      label="Imagen de Fondo"
                      type="backdrop"
                      movieId={editingMovie?.id}
                    />

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        URL del Trailer
                      </label>
                      <input
                        type="url"
                        {...register('trailerUrl')}
                        placeholder="https://youtube.com/watch?v=..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      />
                    </div>
                  </Tabs.Content>

                  {/* Pestaña de Reparto */}
                  <Tabs.Content value="cast">
                    <MovieFormEnhanced
                      key={editingMovie?.id || 'new'}
                      onGenresChange={handleGenresChange}
                      onCastChange={handleCastChange}
                      onCrewChange={handleCrewChange}
                      onCountriesChange={handleCountriesChange}
                      onLanguagesChange={handleLanguagesChange}
                      onProductionCompaniesChange={handleProductionCompaniesChange}
                      onDistributionCompaniesChange={handleDistributionCompaniesChange}
                      onThemesChange={handleThemesChange}
                      initialData={movieFormInitialData}
                      showOnlyCast={true}
                    />
                  </Tabs.Content>

                  {/* Pestaña de Equipo Técnico */}
                  <Tabs.Content value="crew">
                    <MovieFormEnhanced
                      key={editingMovie?.id || 'new'}
                      onGenresChange={handleGenresChange}
                      onCastChange={handleCastChange}
                      onCrewChange={handleCrewChange}
                      onCountriesChange={handleCountriesChange}
                      onLanguagesChange={handleLanguagesChange}
                      onProductionCompaniesChange={handleProductionCompaniesChange}
                      onDistributionCompaniesChange={handleDistributionCompaniesChange}
                      onThemesChange={handleThemesChange}
                      initialData={movieFormInitialData}
                      showOnlyCrew={true}
                    />
                  </Tabs.Content>

                  {/* Pestaña de Configuración Avanzada */}
                  <Tabs.Content value="advanced" className="space-y-6">
                    {/* Información técnica */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">
                        Información Técnica
                      </h3>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Color
                          </label>
                          <select
                            {...register('colorType')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                          >
                            <option value="">Seleccionar...</option>
                            <option value="Color">Color</option>
                            <option value="Blanco y Negro">Blanco y Negro</option>
                            <option value="Color y B&N">Color y B&N</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Sonido
                          </label>
                          <select
                            {...register('soundType')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                          >
                            <option value="">Seleccionar...</option>
                            <option value="Sonora">Sonora</option>
                            <option value="Muda">Muda</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Clasificación */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Calificación
                      </label>
                      <select
                        {...register('ratingId', { valueAsNumber: true })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      >
                        <option value="">Sin calificación</option>
                        {availableRatings.map((rating) => (
                          <option key={rating.id} value={rating.id}>
                            {rating.name} {rating.abbreviation && `(${rating.abbreviation})`}
                          </option>
                        ))}
                      </select>
                      {(() => {
                        const selectedRating = availableRatings.find(r => r.id === watch('ratingId'))
                        return selectedRating?.description && (
                          <p className="mt-1 text-sm text-gray-500">
                            {selectedRating.description}
                          </p>
                        )
                      })()}
                    </div>

                    {/* SEO */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">
                        SEO y Palabras Clave
                      </h3>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Palabras Clave (separadas por comas)
                        </label>
                        <input
                          type="text"
                          {...register('metaKeywords')}
                          placeholder="drama, argentina, buenos aires"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                        />
                      </div>
                    </div>
                    {/* Títulos Alternativos - AGREGAR AQUÍ */}
                    <div className="mt-6">
                      <AlternativeTitlesManager
                        onChange={setAlternativeTitles}
                        initialTitles={editingMovie ? alternativeTitles : []}
                      />
                    </div>
                    {/* Productoras y Distribuidoras */}
                    <MovieFormEnhanced
                      key={editingMovie?.id || 'new'}
                      onGenresChange={handleGenresChange}
                      onCastChange={handleCastChange}
                      onCrewChange={handleCrewChange}
                      onCountriesChange={handleCountriesChange}
                      onLanguagesChange={handleLanguagesChange}
                      onProductionCompaniesChange={handleProductionCompaniesChange}
                      onDistributionCompaniesChange={handleDistributionCompaniesChange}
                      onThemesChange={handleThemesChange}
                      initialData={movieFormInitialData}
                      showOnlyCompanies={true}
                    />
                  </Tabs.Content>
                </div>
              </Tabs.Root>

              {/* Botones */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    reset()
                    setEditingMovie(null)
                    setMovieFormInitialData(null)
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {editingMovie ? 'Actualizar' : 'Crear'} Película
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}