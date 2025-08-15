// src/components/admin/locations/LocationForm.tsx

'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

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
}

interface LocationFormProps {
  location?: Location
}

export default function LocationForm({ location }: LocationFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [availableLocations, setAvailableLocations] = useState<Location[]>([])
  const [slug, setSlug] = useState(location?.slug || '')
  const [isCheckingSlug, setIsCheckingSlug] = useState(false)
  
  // Obtener parentId de la URL si existe
  const urlParentId = searchParams.get('parentId')
  
  const [formData, setFormData] = useState({
    name: location?.name || '',
    parentId: location?.parentId || urlParentId || '',
    latitude: location?.latitude || '',
    longitude: location?.longitude || ''
  })

  // Cargar lugares disponibles como padres
  useEffect(() => {
    loadAvailableLocations()
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

  const loadAvailableLocations = async () => {
    try {
      const response = await fetch('/api/locations')
      if (response.ok) {
        const data = await response.json()
        // Filtrar el lugar actual si estamos editando
        const filtered = location 
          ? data.filter((loc: Location) => loc.id !== location.id && !isDescendantOf(loc, location.id, data))
          : data
        setAvailableLocations(filtered)
      }
    } catch (error) {
      console.error('Error loading locations:', error)
    }
  }

  // Verificar si un lugar es descendiente de otro
  const isDescendantOf = (location: Location, ancestorId: number, allLocations: Location[]): boolean => {
    if (location.parentId === ancestorId) return true
    if (!location.parentId) return false
    
    const parent = allLocations.find(loc => loc.id === location.parentId)
    if (!parent) return false
    
    return isDescendantOf(parent, ancestorId, allLocations)
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

      router.push('/admin/locations')
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

  // Construir el path completo del lugar
  const buildLocationPath = (locationId: number): string => {
    const location = availableLocations.find(loc => loc.id === locationId)
    if (!location) return ''
    
    const path = [location.name]
    let current = location
    
    while (current.parentId) {
      const parent = availableLocations.find(loc => loc.id === current.parentId)
      if (!parent) break
      path.unshift(parent.name)
      current = parent
    }
    
    return path.join(' > ')
  }

  // Organizar lugares en estructura jerárquica para el select
  const organizeLocationsHierarchically = () => {
    const organized: { location: Location; level: number; path: string }[] = []
    
    const addLocationAndChildren = (locations: Location[], parentId: number | null, level: number) => {
      const children = locations.filter(loc => loc.parentId === parentId)
      children.forEach(child => {
        organized.push({
          location: child,
          level,
          path: buildLocationPath(child.id)
        })
        addLocationAndChildren(locations, child.id, level + 1)
      })
    }
    
    addLocationAndChildren(availableLocations, null, 0)
    return organized
  }

  const organizedLocations = organizeLocationsHierarchically()

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

      <div>
        <label htmlFor="parentId" className="block text-sm font-medium text-gray-700">
          Lugar padre (opcional)
        </label>
        <select
          id="parentId"
          value={formData.parentId}
          onChange={(e) => handleChange('parentId', e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="">Sin padre (es un país)</option>
          {organizedLocations.map(({ location, level, path }) => (
            <option key={location.id} value={location.id}>
              {'  '.repeat(level)}{location.name}
              {path !== location.name && ` (${path})`}
            </option>
          ))}
        </select>
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