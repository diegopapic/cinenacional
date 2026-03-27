// src/app/admin/books/page.tsx
'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Search,
  Edit,
  Trash2,
  BookOpen,
  X,
  Save,
  Loader2,
  GripVertical
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { getCsrfHeaders } from '@/lib/csrf-client'
import PersonSearchInput from '@/components/admin/shared/PersonSearchInput'

interface BookAuthor {
  id: number
  name: string
  slug: string
  order: number
}

interface Book {
  id: number
  slug: string
  title: string
  publisher: string | null
  publishYear: number | null
  authors: BookAuthor[]
  createdAt: string
}

interface AuthorEntry {
  personId: number
  personName: string
}

export default function AdminBooksPage() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingBook, setEditingBook] = useState<Book | null>(null)
  const [deletingBookId, setDeletingBookId] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    publisher: '',
    publishYear: '',
  })
  const [authors, setAuthors] = useState<AuthorEntry[]>([])
  const [formErrors, setFormErrors] = useState({ title: '', authors: '' })

  const { data: books = [], isLoading: loading } = useQuery<Book[]>({
    queryKey: ['admin-books'],
    queryFn: async () => {
      const response = await fetch('/api/books')
      if (!response.ok) throw new Error('Error al cargar los libros')
      const data = await response.json()
      return Array.isArray(data) ? data : []
    },
  })

  const filteredBooks = books.filter(book =>
    book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    book.authors.some(a => a.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (book.publisher && book.publisher.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const validateForm = () => {
    const errors = { title: '', authors: '' }

    if (!formData.title.trim()) {
      errors.title = 'El título es requerido'
    }
    if (authors.length === 0) {
      errors.authors = 'Se requiere al menos un autor'
    }

    setFormErrors(errors)
    return !errors.title && !errors.authors
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    try {
      setIsSubmitting(true)
      const url = editingBook ? `/api/books/${editingBook.id}` : '/api/books'
      const method = editingBook ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...getCsrfHeaders()
        },
        body: JSON.stringify({
          title: formData.title.trim(),
          publisher: formData.publisher.trim() || undefined,
          publishYear: formData.publishYear ? parseInt(formData.publishYear) : null,
          authorIds: authors.map(a => a.personId),
        })
      })

      if (!response.ok) {
        let errorMessage = 'Error al guardar el libro'
        try {
          const error = await response.json()
          errorMessage = error.error || error.message || errorMessage
        } catch { /* ignore parse error */ }
        throw new Error(errorMessage)
      }

      toast.success(editingBook ? 'Libro actualizado' : 'Libro creado')
      setShowModal(false)
      resetForm()
      queryClient.invalidateQueries({ queryKey: ['admin-books'] })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al guardar')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData({ title: '', publisher: '', publishYear: '' })
    setAuthors([])
    setFormErrors({ title: '', authors: '' })
    setEditingBook(null)
  }

  const handleEdit = (book: Book) => {
    setEditingBook(book)
    setFormData({
      title: book.title,
      publisher: book.publisher || '',
      publishYear: book.publishYear?.toString() || '',
    })
    setAuthors(book.authors.map(a => ({ personId: a.id, personName: a.name })))
    setShowModal(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este libro? Esta acción no se puede deshacer.')) return

    try {
      setDeletingBookId(id)
      const response = await fetch(`/api/books/${id}`, {
        method: 'DELETE',
        headers: getCsrfHeaders()
      })

      if (!response.ok) throw new Error('Error al eliminar')

      toast.success('Libro eliminado')
      queryClient.invalidateQueries({ queryKey: ['admin-books'] })
    } catch {
      toast.error('Error al eliminar el libro')
    } finally {
      setDeletingBookId(null)
    }
  }

  const handleNewBook = () => {
    resetForm()
    setShowModal(true)
  }

  const handleAddAuthor = (personId: number, personName?: string) => {
    if (!personId) return
    if (authors.some(a => a.personId === personId)) {
      toast.error('Este autor ya está agregado')
      return
    }
    setAuthors(prev => [...prev, { personId, personName: personName || '' }])
    if (formErrors.authors) {
      setFormErrors(prev => ({ ...prev, authors: '' }))
    }
  }

  const handleRemoveAuthor = (personId: number) => {
    setAuthors(prev => prev.filter(a => a.personId !== personId))
  }

  const moveAuthor = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= authors.length) return
    const newAuthors = [...authors]
    const temp = newAuthors[index]
    newAuthors[index] = newAuthors[newIndex]
    newAuthors[newIndex] = temp
    setAuthors(newAuthors)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-3xl font-bold text-gray-900">
              Bibliografía
            </h1>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filtros y acciones */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar por título, autor o editorial..."
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <button
              onClick={handleNewBook}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Nuevo Libro
            </button>
          </div>
        </div>

        {/* Lista de libros */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : filteredBooks.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No se encontraron libros</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Título
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Autor/es
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Editorial
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Año
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredBooks.map((book) => (
                    <tr key={book.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {book.title}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-700">
                          {book.authors.map(a => a.name).join(', ') || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500">
                          {book.publisher || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {book.publishYear || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(book)}
                            className="text-blue-600 hover:text-blue-900 transition-colors"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(book.id)}
                            disabled={deletingBookId === book.id}
                            className="text-red-600 hover:text-red-900 transition-colors disabled:opacity-50"
                            title="Eliminar"
                          >
                            {deletingBookId === book.id ? (
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
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingBook ? 'Editar Libro' : 'Nuevo Libro'}
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
                {/* Título */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Título del libro *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => {
                      setFormData({ ...formData, title: e.target.value })
                      if (formErrors.title) setFormErrors({ ...formErrors, title: '' })
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    placeholder="Ej: Historia del cine argentino"
                  />
                  {formErrors.title && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.title}</p>
                  )}
                </div>

                {/* Autores */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Autor/es *
                  </label>

                  {/* Lista de autores agregados */}
                  {authors.length > 0 && (
                    <div className="mb-2 space-y-1">
                      {authors.map((author, index) => (
                        <div
                          key={author.personId}
                          className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-md"
                        >
                          <GripVertical className="w-4 h-4 text-gray-400 shrink-0" />
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => moveAuthor(index, 'up')}
                              disabled={index === 0}
                              className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs"
                              title="Subir"
                            >
                              ▲
                            </button>
                            <button
                              type="button"
                              onClick={() => moveAuthor(index, 'down')}
                              disabled={index === authors.length - 1}
                              className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs"
                              title="Bajar"
                            >
                              ▼
                            </button>
                          </div>
                          <span className="text-sm text-gray-900 flex-1">
                            {author.personName}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveAuthor(author.personId)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Buscador de persona */}
                  <PersonSearchInput
                    onChange={(personId, personName) => handleAddAuthor(personId, personName)}
                    placeholder="Buscar autor..."
                    showAlternativeNames={false}
                  />
                  {formErrors.authors && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.authors}</p>
                  )}
                </div>

                {/* Editorial */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Editorial
                  </label>
                  <input
                    type="text"
                    value={formData.publisher}
                    onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    placeholder="Ej: Ediciones de la Flor"
                  />
                </div>

                {/* Año de publicación */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Año de publicación
                  </label>
                  <input
                    type="number"
                    value={formData.publishYear}
                    onChange={(e) => setFormData({ ...formData, publishYear: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    placeholder="Ej: 2020"
                    min={1800}
                    max={2100}
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
                      {editingBook ? 'Actualizar' : 'Crear'} Libro
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
