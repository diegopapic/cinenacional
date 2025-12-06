// src/components/admin/movies/MovieModal/tabs/ImagesTab/ImageEditModal.tsx
'use client'

import { useState, useEffect } from 'react'
import { X, Save, Trash2, GripVertical } from 'lucide-react'
import { 
  ImageWithRelations, 
  ImageType,
  MOVIE_IMAGE_TYPES,
  IMAGE_TYPE_LABELS 
} from '@/lib/images/imageTypes'
import { imagePresets, generateImageCaption } from '@/lib/images/imageUtils'
import { imagesService } from '@/services/images.service'
import { toast } from 'react-hot-toast'

interface MoviePerson {
  personId: number
  person: {
    id: number
    firstName?: string | null
    lastName?: string | null
  }
}

interface ImageEditModalProps {
  image: ImageWithRelations
  moviePeople: MoviePerson[]  // Cast + Crew de la película
  onClose: () => void
  onSave: (image: ImageWithRelations) => void
  onDelete: (imageId: number) => void
}

interface SelectedPerson {
  personId: number
  position: number
  name: string
}

export function ImageEditModal({ 
  image, 
  moviePeople,
  onClose, 
  onSave,
  onDelete 
}: ImageEditModalProps) {
  const [type, setType] = useState<ImageType>(image.type)
  const [photoDate, setPhotoDate] = useState(image.photoDate?.split('T')[0] || '')
  const [photographerCredit, setPhotographerCredit] = useState(image.photographerCredit || '')
  const [eventName, setEventName] = useState(image.eventName || '')
  const [selectedPeople, setSelectedPeople] = useState<SelectedPerson[]>([])
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Inicializar personas seleccionadas
  useEffect(() => {
    if (image.people) {
      const people = image.people.map(ip => ({
        personId: ip.personId,
        position: ip.position,
        name: ip.person 
          ? `${ip.person.firstName || ''} ${ip.person.lastName || ''}`.trim()
          : `Persona ${ip.personId}`
      }))
      setSelectedPeople(people.sort((a, b) => a.position - b.position))
    }
  }, [image])

  // Generar preview del caption
  const previewCaption = generateImageCaption({
    ...image,
    type,
    eventName: eventName || null,
    people: selectedPeople.map((sp, idx) => ({
      personId: sp.personId,
      position: idx,
      person: moviePeople.find(mp => mp.personId === sp.personId)?.person || {
        id: sp.personId,
        firstName: sp.name.split(' ')[0],
        lastName: sp.name.split(' ').slice(1).join(' ')
      }
    }))
  })

  const handleAddPerson = (personId: number) => {
    const moviePerson = moviePeople.find(mp => mp.personId === personId)
    if (!moviePerson || selectedPeople.some(sp => sp.personId === personId)) return

    const name = `${moviePerson.person.firstName || ''} ${moviePerson.person.lastName || ''}`.trim()
    setSelectedPeople(prev => [
      ...prev,
      { personId, position: prev.length, name }
    ])
  }

  const handleRemovePerson = (personId: number) => {
    setSelectedPeople(prev => 
      prev.filter(p => p.personId !== personId)
        .map((p, idx) => ({ ...p, position: idx }))
    )
  }

  const handleMovePerson = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === selectedPeople.length - 1)
    ) return

    const newPeople = [...selectedPeople]
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    ;[newPeople[index], newPeople[swapIndex]] = [newPeople[swapIndex], newPeople[index]]
    
    setSelectedPeople(newPeople.map((p, idx) => ({ ...p, position: idx })))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await imagesService.update(image.id, {
        cloudinaryPublicId: image.cloudinaryPublicId,
        type,
        photoDate: photoDate || null,
        photographerCredit: photographerCredit || null,
        eventName: eventName || null,
        movieId: image.movieId,
        people: selectedPeople.map((p, idx) => ({
          personId: p.personId,
          position: idx
        }))
      })
      toast.success('Imagen actualizada')
      onSave(updated)
    } catch (error) {
      console.error('Error guardando imagen:', error)
      toast.error('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('¿Eliminar esta imagen?')) return
    
    setDeleting(true)
    try {
      await imagesService.delete(image.id)
      toast.success('Imagen eliminada')
      onDelete(image.id)
    } catch (error) {
      console.error('Error eliminando imagen:', error)
      toast.error('Error al eliminar')
    } finally {
      setDeleting(false)
    }
  }

  // Personas disponibles (que no están seleccionadas)
  const availablePeople = moviePeople.filter(
    mp => !selectedPeople.some(sp => sp.personId === mp.personId)
  )

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Editar imagen</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-4 max-h-[calc(90vh-8rem)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Preview de imagen */}
            <div>
              <img
                src={imagePresets.gallery(image.cloudinaryPublicId)}
                alt="Preview"
                className="w-full rounded-lg shadow-md"
              />
              {/* Preview del caption */}
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Caption generado:</p>
                <p className="text-sm text-gray-700 italic">{previewCaption}</p>
              </div>
            </div>

            {/* Formulario */}
            <div className="space-y-4">
              {/* Tipo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de imagen
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as ImageType)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  {MOVIE_IMAGE_TYPES.map(t => (
                    <option key={t} value={t}>{IMAGE_TYPE_LABELS[t]}</option>
                  ))}
                </select>
              </div>

              {/* Evento (solo para PREMIERE) */}
              {type === 'PREMIERE' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del evento
                  </label>
                  <input
                    type="text"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    placeholder="Ej: Festival de Cannes"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Fecha */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de la foto
                </label>
                <input
                  type="date"
                  value={photoDate}
                  onChange={(e) => setPhotoDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Fotógrafo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Crédito del fotógrafo
                </label>
                <input
                  type="text"
                  value={photographerCredit}
                  onChange={(e) => setPhotographerCredit(e.target.value)}
                  placeholder="Nombre del fotógrafo"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Personas */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Personas en la imagen
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  El orden determina cómo aparecen en el caption
                </p>

                {/* Lista de personas seleccionadas */}
                {selectedPeople.length > 0 && (
                  <div className="space-y-1 mb-3">
                    {selectedPeople.map((person, idx) => (
                      <div 
                        key={person.personId}
                        className="flex items-center gap-2 bg-blue-50 rounded px-2 py-1"
                      >
                        <span className="text-xs text-gray-400 w-4">{idx + 1}</span>
                        <span className="flex-1 text-sm">{person.name}</span>
                        <button
                          type="button"
                          onClick={() => handleMovePerson(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMovePerson(idx, 'down')}
                          disabled={idx === selectedPeople.length - 1}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemovePerson(person.personId)}
                          className="p-1 text-red-400 hover:text-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Selector de personas disponibles */}
                {availablePeople.length > 0 && (
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddPerson(parseInt(e.target.value))
                        e.target.value = ''
                      }
                    }}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    defaultValue=""
                  >
                    <option value="">+ Agregar persona del cast/crew...</option>
                    {availablePeople.map(mp => (
                      <option key={mp.personId} value={mp.personId}>
                        {`${mp.person.firstName || ''} ${mp.person.lastName || ''}`.trim()}
                      </option>
                    ))}
                  </select>
                )}

                {moviePeople.length === 0 && (
                  <p className="text-sm text-gray-500 italic">
                    Agrega personas al cast o crew para poder seleccionarlas aquí
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-gray-50">
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting || saving}
            className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            {deleting ? 'Eliminando...' : 'Eliminar'}
          </button>
          
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || deleting}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}