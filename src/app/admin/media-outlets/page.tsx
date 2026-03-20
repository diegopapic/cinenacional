// src/app/admin/media-outlets/page.tsx
'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Newspaper,
  X,
  Save,
  Loader2,
  Hash,
  ExternalLink
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { getCsrfHeaders } from '@/lib/csrf-client'

const LANGUAGES = [
  { value: 'es', label: 'Castellano' },
  { value: 'en', label: 'Inglés' },
  { value: 'pt', label: 'Portugués' },
  { value: 'fr', label: 'Francés' },
  { value: 'it', label: 'Italiano' },
  { value: 'de', label: 'Alemán' }
]

const COUNTRIES = [
  'Argentina',
  'España',
  'México',
  'Estados Unidos',
  'Chile',
  'Uruguay',
  'Colombia',
  'Brasil',
  'Perú',
  'Francia',
  'Italia',
  'Alemania',
  'Reino Unido'
]

const mediaOutletFormSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(255),
  url: z.string().url('URL inválida').optional().or(z.literal('')),
  country: z.string().max(100).optional().or(z.literal('')),
  language: z.string().max(10).optional().or(z.literal(''))
})

type MediaOutletFormData = z.infer<typeof mediaOutletFormSchema>

interface MediaOutlet {
  id: number
  slug: string
  name: string
  url?: string | null
  country?: string | null
  language?: string | null
  reviewCount?: number
  createdAt: string
}

export default function AdminMediaOutletsPage() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingOutlet, setEditingOutlet] = useState<MediaOutlet | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<MediaOutletFormData>({
    resolver: zodResolver(mediaOutletFormSchema)
  })

  const { data: outlets = [], isLoading: loading } = useQuery<MediaOutlet[]>({
    queryKey: ['admin-media-outlets', searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams({
        search: searchTerm,
        sortBy: 'name',
        sortOrder: 'asc'
      })

      const response = await fetch(`/api/media-outlets?${params}`)
      if (!response.ok) throw new Error('Error al cargar los medios')

      return response.json()
    },
  })

  const onSubmit = async (data: MediaOutletFormData) => {
    try {
      const url = editingOutlet
        ? `/api/media-outlets/${editingOutlet.id}`
        : '/api/media-outlets'

      const method = editingOutlet ? 'PUT' : 'POST'
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...getCsrfHeaders() },
        body: JSON.stringify({
          name: data.name,
          url: data.url || null,
          country: data.country || null,
          language: data.language || null
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al guardar')
      }

      toast.success(editingOutlet ? 'Medio actualizado' : 'Medio creado')
      setShowModal(false)
      reset()
      setEditingOutlet(null)
      queryClient.invalidateQueries({ queryKey: ['admin-media-outlets'] })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al guardar')
    }
  }

  const handleEdit = (outlet: MediaOutlet) => {
    setEditingOutlet(outlet)
    setValue('name', outlet.name)
    setValue('url', outlet.url || '')
    setValue('country', outlet.country || '')
    setValue('language', outlet.language || '')
    setShowModal(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este medio?')) return

    try {
      setDeletingId(id)
      const response = await fetch(`/api/media-outlets/${id}`, {
        method: 'DELETE',
        headers: getCsrfHeaders()
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al eliminar')
      }

      toast.success('Medio eliminado')
      queryClient.invalidateQueries({ queryKey: ['admin-media-outlets'] })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al eliminar')
    } finally {
      setDeletingId(null)
    }
  }

  const handleNew = () => {
    setEditingOutlet(null)
    reset()
    setShowModal(true)
  }

  const getLanguageLabel = (code: string) =>
    LANGUAGES.find((l) => l.value === code)?.label || code

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-3xl font-bold text-gray-900">
              Administración de Medios
            </h1>
            <p className="mt-2 text-gray-600">
              Gestiona los medios de comunicación asociados a las críticas
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar medios..."
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div />

            <button
              onClick={handleNew}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Nuevo Medio
            </button>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Medios</p>
                  <p className="text-2xl font-bold text-gray-900">{outlets.length}</p>
                </div>
                <Newspaper className="w-8 h-8 text-gray-400" />
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Críticas</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {outlets.reduce((sum, o) => sum + (o.reviewCount || 0), 0)}
                  </p>
                </div>
                <Hash className="w-8 h-8 text-gray-400" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : outlets.length === 0 ? (
            <div className="text-center py-12">
              <Newspaper className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No se encontraron medios</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Medio
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      URL
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      País
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Idioma
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Críticas
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {outlets.map((outlet) => (
                    <tr key={outlet.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-500">{outlet.id}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Newspaper className="w-5 h-5 text-gray-400 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {outlet.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              /{outlet.slug}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {outlet.url ? (
                          <a
                            href={outlet.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                          >
                            {outlet.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">
                          {outlet.country || <span className="text-gray-400">-</span>}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">
                          {outlet.language ? (
                            getLanguageLabel(outlet.language)
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-sm font-medium text-gray-900">
                          {outlet.reviewCount || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(outlet)}
                            className="text-blue-600 hover:text-blue-900 transition-colors"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(outlet.id)}
                            disabled={deletingId === outlet.id || (outlet.reviewCount || 0) > 0}
                            className="text-red-600 hover:text-red-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title={outlet.reviewCount ? `En uso en ${outlet.reviewCount} críticas` : 'Eliminar'}
                          >
                            {deletingId === outlet.id ? (
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
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingOutlet ? 'Editar Medio' : 'Nuevo Medio'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false)
                  reset()
                  setEditingOutlet(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  {...register('name')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  placeholder="Ej: Página/12, La Nación, Escribiendo Cine"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL del sitio web
                </label>
                <input
                  type="url"
                  {...register('url')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  placeholder="https://www.ejemplo.com"
                />
                {errors.url && (
                  <p className="mt-1 text-sm text-red-600">{errors.url.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    País
                  </label>
                  <input
                    type="text"
                    {...register('country')}
                    list="country-options"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    placeholder="Ej: Argentina"
                  />
                  <datalist id="country-options">
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Idioma
                  </label>
                  <select
                    {...register('language')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  >
                    <option value="">Sin especificar</option>
                    {LANGUAGES.map((lang) => (
                      <option key={lang.value} value={lang.value}>
                        {lang.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    reset()
                    setEditingOutlet(null)
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
                      {editingOutlet ? 'Actualizar' : 'Crear'} Medio
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
