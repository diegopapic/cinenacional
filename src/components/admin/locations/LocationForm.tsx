// src/components/admin/locations/LocationForm.tsx

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { X } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'

interface Location {
  id: number
  name: string
  slug: string
  parentId: number | null
  parent?: {
    id: number
    name: string
  }
  latitude?: string | null
  longitude?: string | null
  path?: string
}

interface LocationFormProps {
  location?: Location
}

export default function LocationForm({ location }: LocationFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [slug, setSlug] = useState(location?.slug || '')
  const [isCheckingSlug, setIsCheckingSlug] = useState(false)
  
  // Estados para el autocomplete
  const [parentSearch, setParentSearch] = useState('')
  const [selectedParent, setSelectedParent] = useState<Location | null>(null)
  const [suggestions, setSuggestions] = useState<Location[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const autocompleteRef = useRef<HTMLDivElement>(null)
  
  // Usar el hook useDebounce para el término de búsqueda
  const debouncedSearchTerm = useDebounce(parentSearch, 300)
  
  // Obtener parentId de la URL si existe
  const urlParentId = searchParams.get('parentId')
  
  const [formData, setFormData] = useState({
    name: location?.name || '',
    parentId: location?.parentId || urlParentId || '',
    latitude: location?.latitude || '',
    longitude: location?.longitude || ''
  })

  // Cargar el lugar padre si existe
  useEffect(() => {
    if (location?.parent || urlParentId) {
      loadInitialParent()
    }
  }, [])

  // Efecto para buscar cuando cambia el término debounced
  useEffect(() => {
    if (debouncedSearchTerm.length >= 2) {
      searchLocations(debouncedSearchTerm)
    } else if (debouncedSearchTerm.length === 0) {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }, [debouncedSearchTerm])

  // Manejar clics fuera del autocomplete
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Verificar slug cuando cambia el nombre
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (formData.name && formData.name !== location?.name) {
        checkSlugAvailability()
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [formData.name])

  const loadInitialParent = async () => {
    try {
      let parentId = location?.parentId || urlParentId
      if (!parentId) return

      const response = await fetch(`/api/locations/${parentId}`)
      if (response.ok) {
        const parentData = await response.json()
        setSelectedParent(parentData)
        setParentSearch(parentData.name)
      }
    } catch (error) {
      console.error('Error loading parent location:', error)
    }
  }

  const checkSlugAvailability = async () => {
    setIsCheckingSlug(true)
    try {
      const response = await fetch('/api/locations/check-slug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          excludeId: location?.id
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setSlug(data.slug)
      }
    } catch (error) {
      console.error('Error checking slug:', error)
    } finally {
      setIsCheckingSlug(false)
    }
  }

  // Función de búsqueda
  const searchLocations = async (searchTerm: string) => {
    setIsSearching(true)
    try {
      const params = new URLSearchParams({
        q: searchTerm,
        limit: '10'
      })
      
      if (location?.id) {
        params.append('excludeId', location.id.toString())
      }

      const response = await fetch(`/api/locations/search?${params}`)
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

  const handleParentSearchChange = (value: string) => {
    setParentSearch(value)
    setSelectedParent(null)
    setFormData(prev => ({ ...prev, parentId: '' }))
    
    if (!value.trim()) {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }

  const handleSelectParent = (parent: Location) => {
    setSelectedParent(parent)
    setParentSearch(parent.name)
    setFormData(prev => ({ ...prev, parentId: parent.id.toString() }))
    setShowSuggestions(false)
    setSuggestions([])
  }

  const handleClearParent = () => {
    setSelectedParent(null)
    setParentSearch('')
    setFormData(prev => ({ ...prev, parentId: '' }))
    setSuggestions([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const url = location 
        ? `/api/locations/${location.id}`
        : '/api/locations'
      
      const method = location ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          parentId: formData.parentId || null
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al guardar el lugar')
      }

      router.push(`/admin/locations?refresh=${Date.now()}`)
      router.refresh()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al guardar el lugar')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Nombre *
        </label>
        <input
          type="text"
          id="name"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        />
        {slug && (
          <p className="mt-1 text-sm text-gray-500">
            Slug: {slug} {isCheckingSlug && '(verificando...)'}
          </p>
        )}
      </div>

      <div ref={autocompleteRef}>
        <label htmlFor="parentSearch" className="block text-sm font-medium text-gray-700">
          Lugar padre (opcional)
        </label>
        <div className="relative mt-1">
          <div className="relative">
            <input
              type="text"
              id="parentSearch"
              value={parentSearch}
              onChange={(e) => handleParentSearchChange(e.target.value)}
              placeholder="Buscar lugar padre..."
              className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
            {(parentSearch || selectedParent) && (
              <button
                type="button"
                onClick={handleClearParent}
                className="absolute inset-y-0 right-0 flex items-center pr-3"
              >
                <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>
          
          {selectedParent && selectedParent.path && (
            <p className="mt-1 text-sm text-gray-500">
              Ubicación: {selectedParent.path}
            </p>
          )}

          {/* Dropdown de sugerencias */}
          {showSuggestions && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
              {isSearching ? (
                <div className="px-3 py-2 text-sm text-gray-500">Buscando...</div>
              ) : suggestions.length > 0 ? (
                <ul className="py-1">
                  {suggestions.map((suggestion) => (
                    <li
                      key={suggestion.id}
                      onClick={() => handleSelectParent(suggestion)}
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
                  No se encontraron lugares
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="latitude" className="block text-sm font-medium text-gray-700">
            Latitud (opcional)
          </label>
          <input
            type="number"
            id="latitude"
            value={formData.latitude}
            onChange={(e) => handleChange('latitude', e.target.value)}
            step="0.00000001"
            min="-90"
            max="90"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="longitude" className="block text-sm font-medium text-gray-700">
            Longitud (opcional)
          </label>
          <input
            type="number"
            id="longitude"
            value={formData.longitude}
            onChange={(e) => handleChange('longitude', e.target.value)}
            step="0.00000001"
            min="-180"
            max="180"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>

      <div className="flex justify-end gap-4">
        <Link
          href="/admin/locations"
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={isLoading || !formData.name}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Guardando...' : (location ? 'Actualizar' : 'Crear')}
        </button>
      </div>
    </form>
  )
}