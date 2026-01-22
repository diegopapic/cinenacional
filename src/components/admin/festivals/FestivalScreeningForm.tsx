// src/components/admin/festivals/FestivalScreeningForm.tsx

'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { X, Loader2, Search } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'
import {
  FestivalScreening,
  FestivalScreeningFormData,
  PremiereType,
  PremiereTypeLabels,
  festivalScreeningFormSchema
} from '@/lib/festivals/festivalTypes'

// Simple section type for the form - only needs id, name, isCompetitive
interface SimpleFestivalSection {
  id: number
  name: string
  isCompetitive: boolean
}
import { DateInput } from '@/components/admin/ui/DateInput'
import toast from 'react-hot-toast'

interface Movie {
  id: number
  title: string
  slug: string
  year?: number | null
  posterUrl?: string | null
}

interface Venue {
  id: number
  name: string
}

interface FestivalScreeningFormProps {
  editionId: number
  sections: SimpleFestivalSection[]
  screening?: FestivalScreening
  onSuccess?: () => void
  onCancel?: () => void
  compact?: boolean
}

export default function FestivalScreeningForm({
  editionId,
  sections,
  screening,
  onSuccess,
  onCancel,
  compact = false
}: FestivalScreeningFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState<Partial<FestivalScreeningFormData>>(() => {
    // Parse date without timezone conversion
    let dateStr = ''
    if (screening?.screeningDate) {
      const d = String(screening.screeningDate)
      dateStr = d.split('T')[0]
    }

    // Parse time without timezone conversion
    let timeStr = ''
    if (screening?.screeningTime) {
      const t = String(screening.screeningTime)
      const match = t.match(/(\d{2}):(\d{2})/)
      if (match) {
        timeStr = `${match[1]}:${match[2]}`
      }
    }

    return {
      editionId,
      sectionId: screening?.sectionId || undefined,
      movieId: screening?.movieId || undefined,
      screeningDate: dateStr,
      screeningTime: timeStr,
      venueId: screening?.venueId || undefined,
      premiereType: screening?.premiereType || 'REGULAR',
      isOfficial: screening?.isOfficial ?? true,
      notes: screening?.notes || '',
    }
  })

  // Movie search
  const [movieSearch, setMovieSearch] = useState(screening?.movie?.title || '')
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(screening?.movie || null)
  const [movieSuggestions, setMovieSuggestions] = useState<Movie[]>([])
  const [showMovieSuggestions, setShowMovieSuggestions] = useState(false)
  const [isSearchingMovies, setIsSearchingMovies] = useState(false)
  const movieAutocompleteRef = useRef<HTMLDivElement>(null)

  // Venues
  const [venues, setVenues] = useState<Venue[]>([])

  const debouncedMovieSearch = useDebounce(movieSearch, 300)

  // Load venues
  useEffect(() => {
    loadVenues()
  }, [])

  // Search movies - only if no movie is already selected
  useEffect(() => {
    if (debouncedMovieSearch.length >= 2 && !selectedMovie) {
      searchMovies(debouncedMovieSearch)
    } else {
      setMovieSuggestions([])
      setShowMovieSuggestions(false)
    }
  }, [debouncedMovieSearch, selectedMovie])

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (movieAutocompleteRef.current && !movieAutocompleteRef.current.contains(event.target as Node)) {
        setShowMovieSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])


  const loadVenues = async () => {
    try {
      const response = await fetch('/api/screening-venues?limit=100')
      if (response.ok) {
        const data = await response.json()
        // API returns { venues, pagination }
        setVenues(data.venues || data.data || [])
      }
    } catch (error) {
      console.error('Error loading venues:', error)
    }
  }

  const searchMovies = async (searchTerm: string) => {
    setIsSearchingMovies(true)
    try {
      const response = await fetch(`/api/movies?search=${encodeURIComponent(searchTerm)}&limit=10`)
      if (response.ok) {
        const data = await response.json()
        // API returns { movies, pagination }
        setMovieSuggestions(data.movies || data.data || [])
        setShowMovieSuggestions(true)
      }
    } catch (error) {
      console.error('Error searching movies:', error)
    } finally {
      setIsSearchingMovies(false)
    }
  }

  const handleMovieSearchChange = (value: string) => {
    setMovieSearch(value)
    setSelectedMovie(null)
    setFormData(prev => ({ ...prev, movieId: undefined }))

    if (!value.trim()) {
      setMovieSuggestions([])
      setShowMovieSuggestions(false)
    }
  }

  const handleSelectMovie = (movie: Movie) => {
    setSelectedMovie(movie)
    setMovieSearch(movie.title)
    setFormData(prev => ({ ...prev, movieId: movie.id }))
    setShowMovieSuggestions(false)
    setMovieSuggestions([])
  }

  const handleClearMovie = () => {
    setSelectedMovie(null)
    setMovieSearch('')
    setFormData(prev => ({ ...prev, movieId: undefined }))
    setMovieSuggestions([])
  }

  const handleChange = (field: keyof FestivalScreeningFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validate
    const validation = festivalScreeningFormSchema.safeParse(formData)
    if (!validation.success) {
      const firstError = validation.error.errors[0]
      setError(firstError.message)
      return
    }

    setIsLoading(true)

    try {
      const url = screening
        ? `/api/festival-screenings/${screening.id}`
        : `/api/festival-editions/${editionId}/screenings`

      const method = screening ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al guardar la proyección')
      }

      toast.success(screening ? 'Proyección actualizada' : 'Proyección creada')

      if (onSuccess) {
        onSuccess()
      } else {
        router.refresh()
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al guardar la proyección')
    } finally {
      setIsLoading(false)
    }
  }

  const formContent = (
    <>
      {error && (
        <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}

      {/* Película (autocomplete) */}
      <div ref={movieAutocompleteRef}>
        <label htmlFor="movieSearch" className="block text-sm font-medium text-gray-700">
          Película *
        </label>
        <div className="relative mt-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              id="movieSearch"
              value={movieSearch}
              onChange={(e) => handleMovieSearchChange(e.target.value)}
              placeholder="Buscar película..."
              required={!selectedMovie}
              className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
            {(movieSearch || selectedMovie) && (
              <button
                type="button"
                onClick={handleClearMovie}
                className="absolute inset-y-0 right-0 flex items-center pr-3"
              >
                <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>

          {selectedMovie && (
            <p className="mt-1 text-sm text-gray-500">
              {selectedMovie.title} {selectedMovie.year && `(${selectedMovie.year})`}
            </p>
          )}

          {showMovieSuggestions && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
              {isSearchingMovies ? (
                <div className="px-3 py-2 text-sm text-gray-500 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Buscando...
                </div>
              ) : movieSuggestions.length > 0 ? (
                <ul className="py-1">
                  {movieSuggestions.map((movie) => (
                    <li
                      key={movie.id}
                      onClick={() => handleSelectMovie(movie)}
                      className="px-3 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-3"
                    >
                      {movie.posterUrl && (
                        <img
                          src={movie.posterUrl}
                          alt=""
                          className="w-8 h-12 object-cover rounded"
                        />
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {movie.title}
                        </div>
                        {movie.year && (
                          <div className="text-xs text-gray-500">
                            {movie.year}
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-3 py-2 text-sm text-gray-500">
                  No se encontraron películas
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sección */}
      <div>
        <label htmlFor="sectionId" className="block text-sm font-medium text-gray-700">
          Sección *
        </label>
        <select
          id="sectionId"
          value={formData.sectionId || ''}
          onChange={(e) => handleChange('sectionId', e.target.value ? parseInt(e.target.value) : undefined)}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="">Seleccionar sección</option>
          {sections.map((section) => (
            <option key={section.id} value={section.id}>
              {section.name} {section.isCompetitive && '(Competencia)'}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Fecha de proyección */}
        <div>
          <label htmlFor="screeningDate" className="block text-sm font-medium text-gray-700">
            Fecha *
          </label>
          <DateInput
            value={formData.screeningDate || ''}
            onChange={(value: string) => handleChange('screeningDate', value)}
          />
        </div>

        {/* Horario */}
        <div>
          <label htmlFor="screeningTime" className="block text-sm font-medium text-gray-700">
            Horario
          </label>
          <input
            type="time"
            id="screeningTime"
            value={formData.screeningTime || ''}
            onChange={(e) => handleChange('screeningTime', e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Tipo de premiere */}
        <div>
          <label htmlFor="premiereType" className="block text-sm font-medium text-gray-700">
            Tipo de proyección
          </label>
          <select
            id="premiereType"
            value={formData.premiereType || 'REGULAR'}
            onChange={(e) => handleChange('premiereType', e.target.value as PremiereType)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          >
            {Object.entries(PremiereTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Venue */}
        <div>
          <label htmlFor="venueId" className="block text-sm font-medium text-gray-700">
            Sala / Lugar
          </label>
          <select
            id="venueId"
            value={formData.venueId || ''}
            onChange={(e) => handleChange('venueId', e.target.value ? parseInt(e.target.value) : null)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">Sin especificar</option>
            {venues.map((venue) => (
              <option key={venue.id} value={venue.id}>
                {venue.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Notas */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
          Notas
        </label>
        <textarea
          id="notes"
          value={formData.notes || ''}
          onChange={(e) => handleChange('notes', e.target.value)}
          rows={2}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Presentación del director, subtitulada, etc."
        />
      </div>

      {/* Oficial */}
      <div className="flex items-center">
        <input
          type="checkbox"
          id="isOfficial"
          checked={formData.isOfficial}
          onChange={(e) => handleChange('isOfficial', e.target.checked)}
          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
        />
        <label htmlFor="isOfficial" className="ml-2 block text-sm text-gray-900">
          Proyección oficial
        </label>
      </div>

      {/* Botones */}
      <div className="flex justify-end gap-4">
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancelar
          </button>
        ) : (
          <Link
            href={`/admin/festival-editions/${editionId}`}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancelar
          </Link>
        )}
        <button
          type="submit"
          disabled={isLoading || !formData.movieId || !formData.sectionId || !formData.screeningDate}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          {isLoading ? 'Guardando...' : (screening ? 'Actualizar' : 'Agregar')}
        </button>
      </div>
    </>
  )

  if (compact) {
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        {formContent}
      </form>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {formContent}
    </form>
  )
}
