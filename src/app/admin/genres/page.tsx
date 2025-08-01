// src/app/admin/genres/page.tsx
'use client'

import { useState, useEffect } from 'react'
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Hash,
  X,
  Save,
  Loader2
} from 'lucide-react'
import { toast } from 'react-hot-toast'

interface Genre {
  id: number
  slug: string
  name: string
  description?: string | null
  createdAt: string
  _count?: {
    movies: number
  }
}

export default function AdminGenresPage() {
  const [genres, setGenres] = useState<Genre[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingGenre, setEditingGenre] = useState<Genre | null>(null)
  const [deletingGenreId, setDeletingGenreId] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Estado del formulario
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  })
  const [formErrors, setFormErrors] = useState({
    name: ''
  })

  // Cargar géneros
  const fetchGenres = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/genres')
      
      if (!response.ok) {
        throw new Error('Error al cargar los géneros')
      }
      
      const data = await response.json()
      setGenres(Array.isArray(data) ? data : [])
    } catch (error) {
      toast.error('Error al cargar los géneros')
      setGenres([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGenres()
  }, [])

  // Filtrar géneros
  const filteredGenres = genres.filter(genre =>
    genre.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (genre.description && genre.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  // Validar formulario
  const validateForm = () => {
    const errors = { name: '' }
    
    if (!formData.name.trim()) {
      errors.name = 'El nombre es requerido'
    } else if (formData.name.length > 100) {
      errors.name = 'El nombre no puede exceder 100 caracteres'
    }
    
    setFormErrors(errors)
    return !errors.name
  }

  // Crear o actualizar género
  const handleSubmit = async () => {
    if (!validateForm()) return

    try {
      setIsSubmitting(true)
      const url = editingGenre
        ? `/api/genres/${editingGenre.id}`
        : '/api/genres'
      
      const method = editingGenre ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || undefined
        })
      })

      if (!response.ok) {
        let errorMessage = 'Error al guardar el género'
        try {
          const error = await response.json()
          errorMessage = error.error || error.message || errorMessage
        } catch (e) {}
        throw new Error(errorMessage)
      }

      toast.success(editingGenre ? 'Género actualizado' : 'Género creado')
      setShowModal(false)
      resetForm()
      fetchGenres()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al guardar')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Resetear formulario
  const resetForm = () => {
    setFormData({ name: '', description: '' })
    setFormErrors({ name: '' })
    setEditingGenre(null)
  }

  // Editar género
  const handleEdit = (genre: Genre) => {
    setEditingGenre(genre)
    setFormData({
      name: genre.name,
      description: genre.description || ''
    })
    setShowModal(true)
  }

  // Eliminar género
  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este género? Esta acción no se puede deshacer.')) return

    try {
      setDeletingGenreId(id)
      const response = await fetch(`/api/genres/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Error al eliminar')
      }

      toast.success('Género eliminado')
      fetchGenres()
    } catch (error) {
      toast.error('Error al eliminar el género')
    } finally {
      setDeletingGenreId(null)
    }
  }

  // Abrir modal para nuevo género
  const handleNewGenre = () => {
    resetForm()
    setShowModal(true)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-3xl font-bold text-gray-900">
              Administración de Géneros
            </h1>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filtros y acciones */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            {/* Búsqueda */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar géneros..."
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Botón nuevo género */}
            <button
              onClick={handleNewGenre}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Nuevo Género
            </button>
          </div>
        </div>

        {/* Lista de géneros */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : filteredGenres.length === 0 ? (
            <div className="text-center py-12">
              <Hash className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No se encontraron géneros</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Género
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Descripción
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Slug
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Películas
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredGenres.map((genre) => (
                    <tr key={genre.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {genre.name}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500 max-w-xs truncate">
                          {genre.description || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-400">
                          {genre.slug}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {genre._count?.movies || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(genre)}
                            className="text-blue-600 hover:text-blue-900 transition-colors"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(genre.id)}
                            disabled={deletingGenreId === genre.id}
                            className="text-red-600 hover:text-red-900 transition-colors disabled:opacity-50"
                            title="Eliminar"
                          >
                            {deletingGenreId === genre.id ? (
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

      {/* Modal de creación/edición */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingGenre ? 'Editar Género' : 'Nuevo Género'}
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false)
                    resetForm()
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del Género *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value })
                      if (formErrors.name) {
                        setFormErrors({ ...formErrors, name: '' })
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    placeholder="Ej: Drama, Comedia, Thriller"
                  />
                  {formErrors.name && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    placeholder="Breve descripción del género (opcional)"
                  />
                </div>
              </div>

              {/* Botones de acción */}
              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    resetForm()
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
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
                      {editingGenre ? 'Actualizar' : 'Crear'} Género
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}