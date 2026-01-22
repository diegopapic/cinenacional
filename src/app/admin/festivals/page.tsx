// src/app/admin/festivals/page.tsx

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Edit, Trash2, Calendar, ChevronRight, Search, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface FestivalListItem {
  id: number
  slug: string
  name: string
  shortName?: string | null
  locationName: string
  foundedYear?: number | null
  isActive: boolean
  editionsCount: number
}

export default function FestivalsPage() {
  const [festivals, setFestivals] = useState<FestivalListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [total, setTotal] = useState(0)

  useEffect(() => {
    loadFestivals()
  }, [search])

  const loadFestivals = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      params.set('limit', '50')

      const response = await fetch(`/api/festivals?${params}`)
      if (response.ok) {
        const data = await response.json()
        setFestivals(data.data)
        setTotal(data.total)
      }
    } catch (error) {
      console.error('Error loading festivals:', error)
      toast.error('Error al cargar festivales')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`¿Eliminar el festival "${name}"?`)) return

    try {
      const response = await fetch(`/api/festivals/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al eliminar')
      }

      toast.success('Festival eliminado')
      loadFestivals()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al eliminar')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Festivales</h1>
          <p className="text-sm text-gray-500 mt-1">
            {total} {total === 1 ? 'festival' : 'festivales'}
          </p>
        </div>
        <Link
          href="/admin/festivals/new"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Festival
        </Link>
      </div>

      {/* Búsqueda */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar festivales..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : festivals.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Calendar className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay festivales</h3>
          <p className="mt-1 text-sm text-gray-500">
            {search ? 'No se encontraron festivales con ese criterio.' : 'Comienza creando un nuevo festival.'}
          </p>
          {!search && (
            <div className="mt-6">
              <Link
                href="/admin/festivals/new"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Festival
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden rounded-md">
          <ul className="divide-y divide-gray-200">
            {festivals.map((festival) => (
              <li key={festival.id}>
                <div className="px-4 py-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/admin/festivals/${festival.id}`}
                      className="flex items-center gap-2 group"
                    >
                      <h3 className="text-sm font-medium text-indigo-600 truncate group-hover:text-indigo-800">
                        {festival.name}
                      </h3>
                      {festival.shortName && (
                        <span className="text-xs text-gray-500">
                          ({festival.shortName})
                        </span>
                      )}
                      {!festival.isActive && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          Inactivo
                        </span>
                      )}
                    </Link>
                    <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
                      <span>{festival.locationName}</span>
                      {festival.foundedYear && (
                        <span>Desde {festival.foundedYear}</span>
                      )}
                      <span>
                        {festival.editionsCount} {festival.editionsCount === 1 ? 'edición' : 'ediciones'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/festivals/${festival.id}`}
                      className="p-2 text-gray-400 hover:text-indigo-600"
                      title="Ver ediciones"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Link>
                    <Link
                      href={`/admin/festivals/${festival.id}/edit`}
                      className="p-2 text-gray-400 hover:text-indigo-600"
                      title="Editar"
                    >
                      <Edit className="h-5 w-5" />
                    </Link>
                    <button
                      onClick={() => handleDelete(festival.id, festival.name)}
                      className="p-2 text-gray-400 hover:text-red-600"
                      title="Eliminar"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
