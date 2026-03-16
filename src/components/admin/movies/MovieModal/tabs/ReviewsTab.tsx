// src/components/admin/movies/MovieModal/tabs/ReviewsTab.tsx
import { useState, useEffect, useCallback } from 'react'
import {
  Plus,
  Trash2,
  Edit,
  Loader2,
  ExternalLink,
  Lock,
  Star,
  Save,
  X
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { getCsrfHeaders } from '@/lib/csrf-client'
import { useMovieModalContext } from '@/contexts/MovieModalContext'
import PersonSearchInput from '@/components/admin/shared/PersonSearchInput'
import { createLogger } from '@/lib/logger'

const log = createLogger('ReviewsTab')

interface ReviewAuthor {
  id: number
  firstName?: string | null
  lastName?: string | null
  slug: string
}

interface ReviewMediaOutlet {
  id: number
  name: string
  url?: string | null
  language?: string | null
}

interface Review {
  id: number
  title?: string | null
  summary?: string | null
  url?: string | null
  content?: string | null
  hasPaywall: boolean
  score?: number | null
  authorId?: number | null
  mediaOutletId?: number | null
  publishYear?: number | null
  publishMonth?: number | null
  publishDay?: number | null
  sortOrder: number
  author?: ReviewAuthor | null
  mediaOutlet?: ReviewMediaOutlet | null
}

interface MediaOutletOption {
  id: number
  name: string
  url?: string | null
  language?: string | null
}

const EMPTY_REVIEW: Omit<Review, 'id'> = {
  title: '',
  summary: '',
  url: '',
  content: '',
  hasPaywall: false,
  score: null,
  authorId: null,
  mediaOutletId: null,
  publishYear: null,
  publishMonth: null,
  publishDay: null,
  sortOrder: 0
}

export default function ReviewsTab() {
  const { editingMovie } = useMovieModalContext()
  const movieId = editingMovie?.id

  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(false)
  const [mediaOutlets, setMediaOutlets] = useState<MediaOutletOption[]>([])

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [editingReview, setEditingReview] = useState<Review | null>(null)
  const [formData, setFormData] = useState<Omit<Review, 'id'>>(EMPTY_REVIEW)
  const [submitting, setSubmitting] = useState(false)
  const [authorName, setAuthorName] = useState('')

  const fetchReviews = useCallback(async () => {
    if (!movieId) return
    try {
      setLoading(true)
      const response = await fetch(`/api/movies/${movieId}/reviews`)
      if (!response.ok) throw new Error('Error al cargar críticas')
      const data = await response.json()
      setReviews(data)
    } catch (error) {
      log.error('Error fetching reviews', error)
      toast.error('Error al cargar las críticas')
    } finally {
      setLoading(false)
    }
  }, [movieId])

  const fetchMediaOutlets = useCallback(async () => {
    try {
      const response = await fetch('/api/media-outlets?sortBy=name&sortOrder=asc')
      if (!response.ok) return
      const data = await response.json()
      setMediaOutlets(data)
    } catch (error) {
      log.error('Error fetching media outlets', error)
    }
  }, [])

  useEffect(() => {
    if (movieId) {
      fetchReviews()
      fetchMediaOutlets()
    }
  }, [movieId, fetchReviews, fetchMediaOutlets])

  const handleNew = () => {
    setEditingReview(null)
    setFormData({ ...EMPTY_REVIEW, sortOrder: reviews.length })
    setAuthorName('')
    setShowForm(true)
  }

  const handleEdit = (review: Review) => {
    setEditingReview(review)
    setFormData({
      title: review.title || '',
      summary: review.summary || '',
      url: review.url || '',
      content: review.content || '',
      hasPaywall: review.hasPaywall,
      score: review.score,
      authorId: review.authorId,
      mediaOutletId: review.mediaOutletId,
      publishYear: review.publishYear,
      publishMonth: review.publishMonth,
      publishDay: review.publishDay,
      sortOrder: review.sortOrder
    })
    if (review.author) {
      const name = `${review.author.firstName || ''} ${review.author.lastName || ''}`.trim()
      setAuthorName(name)
    } else {
      setAuthorName('')
    }
    setShowForm(true)
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingReview(null)
    setFormData(EMPTY_REVIEW)
    setAuthorName('')
  }

  const handleSubmit = async () => {
    if (!movieId) return

    try {
      setSubmitting(true)

      const payload = {
        ...formData,
        score: formData.score || null,
        authorId: formData.authorId || null,
        mediaOutletId: formData.mediaOutletId || null,
        publishYear: formData.publishYear || null,
        publishMonth: formData.publishMonth || null,
        publishDay: formData.publishDay || null
      }

      let response: Response
      if (editingReview) {
        response = await fetch(`/api/movies/${movieId}/reviews/${editingReview.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...getCsrfHeaders() },
          body: JSON.stringify(payload)
        })
      } else {
        response = await fetch(`/api/movies/${movieId}/reviews`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getCsrfHeaders() },
          body: JSON.stringify(payload)
        })
      }

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Error al guardar')
      }

      toast.success(editingReview ? 'Crítica actualizada' : 'Crítica agregada')
      handleCancel()
      fetchReviews()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al guardar la crítica')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (reviewId: number) => {
    if (!movieId) return
    if (!confirm('¿Eliminar esta crítica?')) return

    try {
      const response = await fetch(`/api/movies/${movieId}/reviews/${reviewId}`, {
        method: 'DELETE',
        headers: getCsrfHeaders()
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Error al eliminar')
      }

      toast.success('Crítica eliminada')
      fetchReviews()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al eliminar')
    }
  }

  const formatAuthorName = (author: ReviewAuthor) => {
    return `${author.firstName || ''} ${author.lastName || ''}`.trim() || 'Sin nombre'
  }

  const formatDate = (year?: number | null, month?: number | null, day?: number | null) => {
    if (!year) return ''
    let str = String(year)
    if (month) {
      str = `${String(month).padStart(2, '0')}/${str}`
      if (day) {
        str = `${String(day).padStart(2, '0')}/${str}`
      }
    }
    return str
  }

  if (!movieId) {
    return (
      <div className="text-center py-8 text-gray-500">
        Guardá la película primero para poder agregar críticas.
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">
          Críticas ({reviews.length})
        </h3>
        {!showForm && (
          <button
            type="button"
            onClick={handleNew}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
          >
            <Plus className="w-4 h-4" />
            Agregar crítica
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="border border-blue-200 rounded-lg p-4 bg-blue-50/30 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">
              {editingReview ? 'Editar crítica' : 'Nueva crítica'}
            </h4>
            <button type="button" onClick={handleCancel} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Título */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
              <input
                type="text"
                value={formData.title || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Título de la crítica (opcional)"
              />
            </div>

            {/* Autor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Autor</label>
              <PersonSearchInput
                value={formData.authorId || undefined}
                initialPersonName={authorName}
                onChange={(personId, personName) => {
                  setFormData(prev => ({ ...prev, authorId: personId || null }))
                  setAuthorName(personName || '')
                }}
                placeholder="Buscar autor..."
                showAlternativeNames={false}
              />
            </div>

            {/* Medio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Medio</label>
              <select
                value={formData.mediaOutletId || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  mediaOutletId: e.target.value ? Number(e.target.value) : null
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Sin medio</option>
                {mediaOutlets.map(outlet => (
                  <option key={outlet.id} value={outlet.id}>{outlet.name}</option>
                ))}
              </select>
            </div>

            {/* URL */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">URL de la crítica</label>
              <input
                type="url"
                value={formData.url || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://..."
              />
            </div>

            {/* Resumen */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Resumen</label>
              <textarea
                value={formData.summary || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, summary: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Resumen breve de la crítica"
              />
            </div>

            {/* Contenido */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Texto de la crítica</label>
              <textarea
                value={formData.content || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Texto completo de la crítica (opcional si hay URL)"
              />
            </div>

            {/* Puntaje */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Puntaje (1-10)</label>
              <input
                type="number"
                min="1"
                max="10"
                value={formData.score ?? ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  score: e.target.value ? Number(e.target.value) : null
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Sin puntaje"
              />
            </div>

            {/* Fecha de publicación */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de publicación</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Día"
                  min="1"
                  max="31"
                  value={formData.publishDay ?? ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    publishDay: e.target.value ? Number(e.target.value) : null
                  }))}
                  className="w-20 px-2 py-2 border border-gray-300 rounded-md text-gray-900 text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="number"
                  placeholder="Mes"
                  min="1"
                  max="12"
                  value={formData.publishMonth ?? ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    publishMonth: e.target.value ? Number(e.target.value) : null
                  }))}
                  className="w-20 px-2 py-2 border border-gray-300 rounded-md text-gray-900 text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="number"
                  placeholder="Año"
                  min="1900"
                  max="2100"
                  value={formData.publishYear ?? ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    publishYear: e.target.value ? Number(e.target.value) : null
                  }))}
                  className="w-24 px-2 py-2 border border-gray-300 rounded-md text-gray-900 text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Paywall */}
            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="hasPaywall"
                checked={formData.hasPaywall}
                onChange={(e) => setFormData(prev => ({ ...prev, hasPaywall: e.target.checked }))}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="hasPaywall" className="text-sm text-gray-700">
                Detrás de paywall
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm flex items-center gap-2"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {editingReview ? 'Actualizar' : 'Agregar'}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {reviews.length === 0 && !showForm ? (
        <div className="text-center py-8 text-gray-500 border border-dashed border-gray-300 rounded-lg">
          <p>No hay críticas cargadas para esta película.</p>
          <button
            type="button"
            onClick={handleNew}
            className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Agregar la primera crítica
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {review.title && (
                      <span className="font-medium text-gray-900 text-sm">
                        {review.title}
                      </span>
                    )}
                    {review.score && (
                      <span className="inline-flex items-center gap-0.5 text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded-full font-medium">
                        <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                        {review.score}/10
                      </span>
                    )}
                    {review.hasPaywall && (
                      <span className="inline-flex items-center gap-0.5 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">
                        <Lock className="w-3 h-3" />
                        Paywall
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 flex-wrap">
                    {review.author && (
                      <span className="font-medium text-gray-700">
                        {formatAuthorName(review.author)}
                      </span>
                    )}
                    {review.author && review.mediaOutlet && (
                      <span className="text-gray-300">|</span>
                    )}
                    {review.mediaOutlet && (
                      <span className="text-gray-600">{review.mediaOutlet.name}</span>
                    )}
                    {(review.author || review.mediaOutlet) && review.publishYear && (
                      <span className="text-gray-300">|</span>
                    )}
                    {review.publishYear && (
                      <span>{formatDate(review.publishYear, review.publishMonth, review.publishDay)}</span>
                    )}
                    {review.mediaOutlet?.language && review.mediaOutlet.language !== 'es' && (
                      <>
                        <span className="text-gray-300">|</span>
                        <span className="uppercase">{review.mediaOutlet.language}</span>
                      </>
                    )}
                  </div>

                  {review.summary && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{review.summary}</p>
                  )}

                  {review.url && (
                    <a
                      href={review.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mt-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Ver crítica
                    </a>
                  )}
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleEdit(review)}
                    className="p-1 text-blue-600 hover:text-blue-800 rounded"
                    title="Editar"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(review.id)}
                    className="p-1 text-red-600 hover:text-red-800 rounded"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
