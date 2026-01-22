// src/components/admin/festivals/FestivalEditionForm.tsx

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { FestivalEdition, FestivalEditionFormData, festivalEditionFormSchema } from '@/lib/festivals/festivalTypes'
import { DateInput } from '@/components/admin/ui/DateInput'
import toast from 'react-hot-toast'

interface FestivalEditionFormProps {
  festivalId: number
  festivalName: string
  edition?: FestivalEdition
}

export default function FestivalEditionForm({ festivalId, festivalName, edition }: FestivalEditionFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState<Partial<FestivalEditionFormData>>({
    festivalId,
    editionNumber: edition?.editionNumber || undefined,
    year: edition?.year || new Date().getFullYear(),
    startDate: edition?.startDate ? new Date(edition.startDate).toISOString().split('T')[0] : '',
    endDate: edition?.endDate ? new Date(edition.endDate).toISOString().split('T')[0] : '',
    theme: edition?.theme || '',
    description: edition?.description || '',
    posterUrl: edition?.posterUrl || '',
    websiteUrl: edition?.websiteUrl || '',
    isPublished: edition?.isPublished ?? false,
  })

  // Auto-set year when dates change
  useEffect(() => {
    if (formData.startDate) {
      const year = new Date(formData.startDate).getFullYear()
      if (year !== formData.year) {
        setFormData(prev => ({ ...prev, year }))
      }
    }
  }, [formData.startDate])

  const handleChange = (field: keyof FestivalEditionFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validate
    const validation = festivalEditionFormSchema.safeParse(formData)
    if (!validation.success) {
      const firstError = validation.error.errors[0]
      setError(firstError.message)
      return
    }

    // Validate date range
    if (formData.startDate && formData.endDate) {
      if (new Date(formData.startDate) > new Date(formData.endDate)) {
        setError('La fecha de inicio debe ser anterior a la fecha de fin')
        return
      }
    }

    setIsLoading(true)

    try {
      const url = edition
        ? `/api/festival-editions/${edition.id}`
        : `/api/festivals/${festivalId}/editions`

      const method = edition ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al guardar la edición')
      }

      toast.success(edition ? 'Edición actualizada' : 'Edición creada')
      router.push(`/admin/festivals/${festivalId}`)
      router.refresh()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al guardar la edición')
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

      <div className="bg-gray-50 px-4 py-3 rounded-md">
        <p className="text-sm text-gray-600">
          Festival: <span className="font-medium text-gray-900">{festivalName}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Número de edición */}
        <div>
          <label htmlFor="editionNumber" className="block text-sm font-medium text-gray-700">
            Número de edición *
          </label>
          <input
            type="number"
            id="editionNumber"
            value={formData.editionNumber || ''}
            onChange={(e) => handleChange('editionNumber', e.target.value ? parseInt(e.target.value) : undefined)}
            required
            min="1"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="25"
          />
          <p className="mt-1 text-sm text-gray-500">
            Ej: 25° edición
          </p>
        </div>

        {/* Año */}
        <div>
          <label htmlFor="year" className="block text-sm font-medium text-gray-700">
            Año *
          </label>
          <input
            type="number"
            id="year"
            value={formData.year || ''}
            onChange={(e) => handleChange('year', e.target.value ? parseInt(e.target.value) : undefined)}
            required
            min="1900"
            max="2100"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        {/* Tema */}
        <div>
          <label htmlFor="theme" className="block text-sm font-medium text-gray-700">
            Tema (opcional)
          </label>
          <input
            type="text"
            id="theme"
            value={formData.theme || ''}
            onChange={(e) => handleChange('theme', e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Cine latinoamericano"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Fecha de inicio */}
        <div>
          <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
            Fecha de inicio *
          </label>
          <DateInput
            value={formData.startDate || ''}
            onChange={(value: string) => handleChange('startDate', value)}
          />
        </div>

        {/* Fecha de fin */}
        <div>
          <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
            Fecha de fin *
          </label>
          <DateInput
            value={formData.endDate || ''}
            onChange={(value: string) => handleChange('endDate', value)}
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
          placeholder="Descripción de esta edición del festival..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* URL del afiche */}
        <div>
          <label htmlFor="posterUrl" className="block text-sm font-medium text-gray-700">
            URL del afiche
          </label>
          <input
            type="url"
            id="posterUrl"
            value={formData.posterUrl || ''}
            onChange={(e) => handleChange('posterUrl', e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="https://..."
          />
        </div>

        {/* Website de la edición */}
        <div>
          <label htmlFor="websiteUrl" className="block text-sm font-medium text-gray-700">
            Sitio web de la edición
          </label>
          <input
            type="url"
            id="websiteUrl"
            value={formData.websiteUrl || ''}
            onChange={(e) => handleChange('websiteUrl', e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="https://..."
          />
        </div>
      </div>

      {/* Publicado */}
      <div className="flex items-center">
        <input
          type="checkbox"
          id="isPublished"
          checked={formData.isPublished}
          onChange={(e) => handleChange('isPublished', e.target.checked)}
          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
        />
        <label htmlFor="isPublished" className="ml-2 block text-sm text-gray-900">
          Edición publicada (visible en el sitio público)
        </label>
      </div>

      {/* Botones */}
      <div className="flex justify-end gap-4">
        <Link
          href={`/admin/festivals/${festivalId}`}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={isLoading || !formData.editionNumber || !formData.startDate || !formData.endDate}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          {isLoading ? 'Guardando...' : (edition ? 'Actualizar' : 'Crear')}
        </button>
      </div>
    </form>
  )
}
