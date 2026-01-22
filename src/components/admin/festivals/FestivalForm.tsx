// src/components/admin/festivals/FestivalForm.tsx

'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { X, Loader2 } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'
import { Festival, FestivalFormData, festivalFormSchema } from '@/lib/festivals/festivalTypes'
import toast from 'react-hot-toast'

interface Location {
  id: number
  name: string
  path?: string
}

interface FestivalFormProps {
  festival?: Festival & { location?: Location }
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export default function FestivalForm({ festival }: FestivalFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Form data
  const [formData, setFormData] = useState<Partial<FestivalFormData>>({
    name: festival?.name || '',
    shortName: festival?.shortName || '',
    slug: festival?.slug || '',
    description: festival?.description || '',
    logoUrl: festival?.logoUrl || '',
    website: festival?.website || '',
    locationId: festival?.locationId || undefined,
    foundedYear: festival?.foundedYear || undefined,
    isActive: festival?.isActive ?? true,
  })

  // Location autocomplete
  const [locationSearch, setLocationSearch] = useState('')
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(
    festival?.location || null
  )
  const [suggestions, setSuggestions] = useState<Location[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const autocompleteRef = useRef<HTMLDivElement>(null)

  const debouncedSearchTerm = useDebounce(locationSearch, 300)

  // Auto-generate slug when name changes
  useEffect(() => {
    if (formData.name && !festival) {
      setFormData(prev => ({
        ...prev,
        slug: generateSlug(formData.name || '')
      }))
    }
  }, [formData.name, festival])

  // Search locations
  useEffect(() => {
    if (debouncedSearchTerm.length >= 2) {
      searchLocations(debouncedSearchTerm)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }, [debouncedSearchTerm])

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Load initial location
  useEffect(() => {
    if (festival?.location) {
      setSelectedLocation(festival.location)
      setLocationSearch(festival.location.name)
    }
  }, [festival])

  const searchLocations = async (searchTerm: string) => {
    setIsSearching(true)
    try {
      const response = await fetch(`/api/locations/search?q=${encodeURIComponent(searchTerm)}&limit=10`)
      if (response.ok) {
        const data = await response.json()
        setSuggestions(data)
        setShowSuggestions(true)
      }
    } catch (error) {
      console.error('Error searching locations:', error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleLocationSearchChange = (value: string) => {
    setLocationSearch(value)
    setSelectedLocation(null)
    setFormData(prev => ({ ...prev, locationId: undefined }))

    if (!value.trim()) {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }

  const handleSelectLocation = (location: Location) => {
    setSelectedLocation(location)
    setLocationSearch(location.name)
    setFormData(prev => ({ ...prev, locationId: location.id }))
    setShowSuggestions(false)
    setSuggestions([])
  }

  const handleClearLocation = () => {
    setSelectedLocation(null)
    setLocationSearch('')
    setFormData(prev => ({ ...prev, locationId: undefined }))
    setSuggestions([])
  }

  const handleChange = (field: keyof FestivalFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validate
    const validation = festivalFormSchema.safeParse(formData)
    if (!validation.success) {
      const firstError = validation.error.errors[0]
      setError(firstError.message)
      return
    }

    setIsLoading(true)

    try {
      const url = festival
        ? `/api/festivals/${festival.id}`
        : '/api/festivals'

      const method = festival ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al guardar el festival')
      }

      toast.success(festival ? 'Festival actualizado' : 'Festival creado')
      router.push('/admin/festivals')
      router.refresh()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al guardar el festival')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Nombre */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Nombre *
          </label>
          <input
            type="text"
            id="name"
            value={formData.name || ''}
            onChange={(e) => handleChange('name', e.target.value)}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Festival Internacional de Cine de Mar del Plata"
          />
        </div>

        {/* Nombre corto */}
        <div>
          <label htmlFor="shortName" className="block text-sm font-medium text-gray-700">
            Nombre corto
          </label>
          <input
            type="text"
            id="shortName"
            value={formData.shortName || ''}
            onChange={(e) => handleChange('shortName', e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="BAFICI"
          />
        </div>
      </div>

      {/* Slug */}
      <div>
        <label htmlFor="slug" className="block text-sm font-medium text-gray-700">
          Slug *
        </label>
        <input
          type="text"
          id="slug"
          value={formData.slug || ''}
          onChange={(e) => handleChange('slug', e.target.value)}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="festival-mar-del-plata"
        />
        <p className="mt-1 text-sm text-gray-500">
          Se usa en la URL: /festivales/{formData.slug || 'slug'}
        </p>
      </div>

      {/* Ciudad (autocomplete) */}
      <div ref={autocompleteRef}>
        <label htmlFor="locationSearch" className="block text-sm font-medium text-gray-700">
          Ciudad *
        </label>
        <div className="relative mt-1">
          <div className="relative">
            <input
              type="text"
              id="locationSearch"
              value={locationSearch}
              onChange={(e) => handleLocationSearchChange(e.target.value)}
              placeholder="Buscar ciudad..."
              required={!selectedLocation}
              className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
            {(locationSearch || selectedLocation) && (
              <button
                type="button"
                onClick={handleClearLocation}
                className="absolute inset-y-0 right-0 flex items-center pr-3"
              >
                <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>

          {selectedLocation && selectedLocation.path && (
            <p className="mt-1 text-sm text-gray-500">
              {selectedLocation.path}
            </p>
          )}

          {showSuggestions && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
              {isSearching ? (
                <div className="px-3 py-2 text-sm text-gray-500 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Buscando...
                </div>
              ) : suggestions.length > 0 ? (
                <ul className="py-1">
                  {suggestions.map((suggestion) => (
                    <li
                      key={suggestion.id}
                      onClick={() => handleSelectLocation(suggestion)}
                      className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                    >
                      <div className="text-sm font-medium text-gray-900">
                        {suggestion.name}
                      </div>
                      {suggestion.path && suggestion.path !== suggestion.name && (
                        <div className="text-xs text-gray-500">
                          {suggestion.path}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-3 py-2 text-sm text-gray-500">
                  No se encontraron ciudades
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Año de fundación */}
        <div>
          <label htmlFor="foundedYear" className="block text-sm font-medium text-gray-700">
            Año de fundación
          </label>
          <input
            type="number"
            id="foundedYear"
            value={formData.foundedYear || ''}
            onChange={(e) => handleChange('foundedYear', e.target.value ? parseInt(e.target.value) : null)}
            min="1800"
            max={new Date().getFullYear()}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="1985"
          />
        </div>

        {/* Website */}
        <div>
          <label htmlFor="website" className="block text-sm font-medium text-gray-700">
            Sitio web
          </label>
          <input
            type="url"
            id="website"
            value={formData.website || ''}
            onChange={(e) => handleChange('website', e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="https://www.bafici.gob.ar"
          />
        </div>
      </div>

      {/* Descripción */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Descripción
        </label>
        <textarea
          id="description"
          value={formData.description || ''}
          onChange={(e) => handleChange('description', e.target.value)}
          rows={4}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Breve descripción del festival..."
        />
      </div>

      {/* Logo URL */}
      <div>
        <label htmlFor="logoUrl" className="block text-sm font-medium text-gray-700">
          URL del logo
        </label>
        <input
          type="url"
          id="logoUrl"
          value={formData.logoUrl || ''}
          onChange={(e) => handleChange('logoUrl', e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="https://..."
        />
      </div>

      {/* Activo */}
      <div className="flex items-center">
        <input
          type="checkbox"
          id="isActive"
          checked={formData.isActive}
          onChange={(e) => handleChange('isActive', e.target.checked)}
          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
        />
        <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
          Festival activo
        </label>
      </div>

      {/* Botones */}
      <div className="flex justify-end gap-4">
        <Link
          href="/admin/festivals"
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={isLoading || !formData.name || !formData.locationId}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          {isLoading ? 'Guardando...' : (festival ? 'Actualizar' : 'Crear')}
        </button>
      </div>
    </form>
  )
}
