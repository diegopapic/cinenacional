// src/app/admin/festival-editions/[id]/sections/new/FestivalSectionForm.tsx

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Copy } from 'lucide-react'
import toast from 'react-hot-toast'

interface SectionTemplate {
  id: number
  slug: string
  name: string
  description: string | null
  isCompetitive: boolean
  displayOrder: number
}

interface FestivalSectionFormProps {
  editionId: number
  templates: SectionTemplate[]
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export default function FestivalSectionForm({ editionId, templates }: FestivalSectionFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'template' | 'custom'>(templates.length > 0 ? 'template' : 'custom')
  const [selectedTemplates, setSelectedTemplates] = useState<number[]>([])

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    isCompetitive: false,
    displayOrder: 0,
  })

  const handleChange = (field: string, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value }
      // Auto-generate slug when name changes
      if (field === 'name') {
        updated.slug = generateSlug(value)
      }
      return updated
    })
  }

  const toggleTemplate = (templateId: number) => {
    setSelectedTemplates(prev =>
      prev.includes(templateId)
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId]
    )
  }

  const handleSubmitTemplates = async () => {
    if (selectedTemplates.length === 0) {
      setError('Selecciona al menos una plantilla')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/festival-editions/${editionId}/sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateIds: selectedTemplates })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear secciones')
      }

      toast.success(`${data.length} sección(es) creada(s)`)
      router.push(`/admin/festival-editions/${editionId}`)
      router.refresh()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al crear secciones')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmitCustom = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.slug) {
      setError('El nombre y slug son requeridos')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/festival-editions/${editionId}/sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear sección')
      }

      toast.success('Sección creada')
      router.push(`/admin/festival-editions/${editionId}`)
      router.refresh()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al crear sección')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Mode selector */}
      {templates.length > 0 && (
        <div className="flex gap-4 border-b border-gray-200 pb-4">
          <button
            type="button"
            onClick={() => setMode('template')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              mode === 'template'
                ? 'bg-indigo-100 text-indigo-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Copy className="h-4 w-4 inline mr-2" />
            Desde plantillas
          </button>
          <button
            type="button"
            onClick={() => setMode('custom')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              mode === 'custom'
                ? 'bg-indigo-100 text-indigo-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Sección personalizada
          </button>
        </div>
      )}

      {mode === 'template' && templates.length > 0 ? (
        /* Template selection mode */
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Selecciona las plantillas para crear secciones en esta edición:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {templates.map((template) => (
              <label
                key={template.id}
                className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedTemplates.includes(template.id)
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedTemplates.includes(template.id)}
                  onChange={() => toggleTemplate(template.id)}
                  className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{template.name}</span>
                    {template.isCompetitive && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                        Competencia
                      </span>
                    )}
                  </div>
                  {template.description && (
                    <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                  )}
                </div>
              </label>
            ))}
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <Link
              href={`/admin/festival-editions/${editionId}`}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancelar
            </Link>
            <button
              type="button"
              onClick={handleSubmitTemplates}
              disabled={isLoading || selectedTemplates.length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isLoading ? 'Creando...' : `Crear ${selectedTemplates.length} sección(es)`}
            </button>
          </div>
        </div>
      ) : (
        /* Custom section form */
        <form onSubmit={handleSubmitCustom} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                placeholder="Competencia Internacional"
              />
            </div>

            <div>
              <label htmlFor="slug" className="block text-sm font-medium text-gray-700">
                Slug *
              </label>
              <input
                type="text"
                id="slug"
                value={formData.slug}
                onChange={(e) => handleChange('slug', e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="competencia-internacional"
              />
            </div>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Descripción
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={3}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isCompetitive"
                checked={formData.isCompetitive}
                onChange={(e) => handleChange('isCompetitive', e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="isCompetitive" className="ml-2 block text-sm text-gray-900">
                Es sección competitiva (tiene jurado y premios)
              </label>
            </div>

            <div>
              <label htmlFor="displayOrder" className="block text-sm font-medium text-gray-700">
                Orden de visualización
              </label>
              <input
                type="number"
                id="displayOrder"
                value={formData.displayOrder}
                onChange={(e) => handleChange('displayOrder', parseInt(e.target.value) || 0)}
                min="0"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <Link
              href={`/admin/festival-editions/${editionId}`}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={isLoading || !formData.name || !formData.slug}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isLoading ? 'Creando...' : 'Crear sección'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
