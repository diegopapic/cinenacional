// src/app/admin/countries/page.tsx
'use client'

import { useState, useEffect } from 'react'
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Globe,
  X,
  Save,
  Loader2
} from 'lucide-react'
import { toast } from 'react-hot-toast'

interface Country {
  id: number
  code: string
  name: string
  createdAt: string
  _count?: {
    movies: number
  }
}

export default function AdminCountriesPage() {
  const [countries, setCountries] = useState<Country[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingCountry, setEditingCountry] = useState<Country | null>(null)
  const [deletingCountryId, setDeletingCountryId] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Estado del formulario
  const [formData, setFormData] = useState({
    code: '',
    name: ''
  })
  const [formErrors, setFormErrors] = useState({
    code: '',
    name: ''
  })

  // Cargar países
  const fetchCountries = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/countries')
      
      if (!response.ok) {
        throw new Error('Error al cargar los países')
      }
      
      const data = await response.json()
      setCountries(Array.isArray(data) ? data : [])
    } catch (error) {
      toast.error('Error al cargar los países')
      setCountries([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCountries()
  }, [])

  // Filtrar países
  const filteredCountries = countries.filter(country =>
    country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    country.code.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Validar formulario
  const validateForm = () => {
    const errors = { code: '', name: '' }
    let isValid = true
    
    if (!formData.code.trim()) {
      errors.code = 'El código es requerido'
      isValid = false
    } else if (formData.code.length !== 2) {
      errors.code = 'El código debe tener exactamente 2 caracteres'
      isValid = false
    } else if (!/^[A-Z]{2}$/.test(formData.code)) {
      errors.code = 'El código debe contener solo letras mayúsculas'
      isValid = false
    }
    
    if (!formData.name.trim()) {
      errors.name = 'El nombre es requerido'
      isValid = false
    } else if (formData.name.length > 100) {
      errors.name = 'El nombre no puede exceder 100 caracteres'
      isValid = false
    }
    
    setFormErrors(errors)
    return isValid
  }

  // Crear o actualizar país
  const handleSubmit = async () => {
    if (!validateForm()) return

    try {
      setIsSubmitting(true)
      const url = editingCountry
        ? `/api/countries/${editingCountry.id}`
        : '/api/countries'
      
      const method = editingCountry ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code: formData.code.trim().toUpperCase(),
          name: formData.name.trim()
        })
      })

      if (!response.ok) {
        let errorMessage = 'Error al guardar el país'
        try {
          const error = await response.json()
          errorMessage = error.error || error.message || errorMessage
        } catch (e) {}
        throw new Error(errorMessage)
      }

      toast.success(editingCountry ? 'País actualizado' : 'País creado')
      setShowModal(false)
      resetForm()
      fetchCountries()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al guardar')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Resetear formulario
  const resetForm = () => {
    setFormData({ code: '', name: '' })
    setFormErrors({ code: '', name: '' })
    setEditingCountry(null)
  }

  // Editar país
  const handleEdit = (country: Country) => {
    setEditingCountry(country)
    setFormData({
      code: country.code,
      name: country.name
    })
    setShowModal(true)
  }

  // Eliminar país
  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este país? Esta acción no se puede deshacer.')) return

    try {
      setDeletingCountryId(id)
      const response = await fetch(`/api/countries/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        let errorMessage = 'Error al eliminar el país'
        try {
          const error = await response.json()
          errorMessage = error.error || error.message || errorMessage
        } catch (e) {}
        throw new Error(errorMessage)
      }

      toast.success('País eliminado')
      fetchCountries()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al eliminar el país')
    } finally {
      setDeletingCountryId(null)
    }
  }

  // Abrir modal para nuevo país
  const handleNewCountry = () => {
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
              Administración de Países
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
                placeholder="Buscar países..."
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Botón nuevo país */}
            <button
              onClick={handleNewCountry}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Nuevo País
            </button>
          </div>
        </div>

        {/* Lista de países */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : filteredCountries.length === 0 ? (
            <div className="text-center py-12">
              <Globe className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No se encontraron países</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Código
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      País
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
                  {filteredCountries.map((country) => (
                    <tr key={country.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {country.code}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {country.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {country._count?.movies || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(country)}
                            className="text-blue-600 hover:text-blue-900 transition-colors"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(country.id)}
                            disabled={deletingCountryId === country.id}
                            className="text-red-600 hover:text-red-900 transition-colors disabled:opacity-50"
                            title="Eliminar"
                          >
                            {deletingCountryId === country.id ? (
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
                  {editingCountry ? 'Editar País' : 'Nuevo País'}
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
                    Código ISO *
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => {
                      const value = e.target.value.toUpperCase().slice(0, 2)
                      setFormData({ ...formData, code: value })
                      if (formErrors.code) {
                        setFormErrors({ ...formErrors, code: '' })
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    placeholder="Ej: AR, BR, US"
                    maxLength={2}
                  />
                  {formErrors.code && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.code}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Código ISO 3166-1 alpha-2 (2 letras mayúsculas)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del País *
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
                    placeholder="Ej: Argentina, Brasil, Estados Unidos"
                  />
                  {formErrors.name && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
                  )}
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
                      {editingCountry ? 'Actualizar' : 'Crear'} País
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