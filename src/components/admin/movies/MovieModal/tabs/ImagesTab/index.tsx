// src/components/admin/movies/MovieModal/tabs/ImagesTab/index.tsx
'use client'

import { useState } from 'react'
import Image from 'next/image'
import cloudinaryLoader from '@/lib/images/cloudinaryLoader'
import { useQuery } from '@tanstack/react-query'
import { ImageIcon, Loader2, Trash2, X, CheckSquare } from 'lucide-react'
import { useMovieModalContext } from '@/contexts/MovieModalContext'
import { ImageWithRelations } from '@/lib/images/imageTypes'
import { imagePresets, generateImageCaption } from '@/lib/images/imageUtils'
import { imagesService } from '@/services/images.service'
import { MultiImageUpload } from './MultiImageUpload'
import { ImageEditModal } from './ImageEditModal'
import { toast } from 'react-hot-toast'
import { createLogger } from '@/lib/logger'

const log = createLogger('ImagesTab')

interface MoviePerson {
    personId: number
    person: {
        id: number
        firstName?: string | null
        lastName?: string | null
    }
}

export default function ImagesTab() {
    const { editingMovie } = useMovieModalContext()

    const [localImages, setLocalImages] = useState<ImageWithRelations[] | null>(null)
    const [editingImage, setEditingImage] = useState<ImageWithRelations | null>(null)
    const [selectionMode, setSelectionMode] = useState(false)
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
    const [deleting, setDeleting] = useState(false)

    const movieId = editingMovie?.id

    // Cargar imágenes via React Query
    const { data: queryImages, isLoading: loading } = useQuery<ImageWithRelations[]>({
        queryKey: ['movie-images', movieId],
        queryFn: () => imagesService.getByMovieId(movieId!),
        enabled: !!movieId,
    })

    // Local override for optimistic updates after upload/edit/delete
    const images = localImages ?? queryImages ?? []

    // Cargar personas del cast+crew via React Query
    const { data: moviePeople = [] } = useQuery<MoviePerson[]>({
        queryKey: ['movie-people', movieId],
        queryFn: async () => {
            const response = await fetch(`/api/movies/${movieId}`)
            const movie = await response.json()

            const people: MoviePerson[] = []
            const seenIds = new Set<number>()

            if (movie.cast && Array.isArray(movie.cast)) {
                movie.cast.forEach((c: { person?: { id: number; firstName?: string | null; lastName?: string | null } }) => {
                    if (c.person && c.person.id && !seenIds.has(c.person.id)) {
                        seenIds.add(c.person.id)
                        people.push({
                            personId: c.person.id,
                            person: { id: c.person.id, firstName: c.person.firstName, lastName: c.person.lastName }
                        })
                    }
                })
            }

            if (movie.crew && Array.isArray(movie.crew)) {
                movie.crew.forEach((c: { person?: { id: number; firstName?: string | null; lastName?: string | null } }) => {
                    if (c.person && c.person.id && !seenIds.has(c.person.id)) {
                        seenIds.add(c.person.id)
                        people.push({
                            personId: c.person.id,
                            person: { id: c.person.id, firstName: c.person.firstName, lastName: c.person.lastName }
                        })
                    }
                })
            }

            people.sort((a, b) => {
                const nameA = `${a.person.firstName || ''} ${a.person.lastName || ''}`.trim()
                const nameB = `${b.person.firstName || ''} ${b.person.lastName || ''}`.trim()
                return nameA.localeCompare(nameB)
            })

            return people
        },
        enabled: !!movieId,
        staleTime: 60 * 1000,
    })

    // Manejar subida masiva
    const handleUploadComplete = async (publicIds: string[]) => {
        if (!movieId || publicIds.length === 0) return

        try {
            const newImages = await imagesService.createBulk(movieId, publicIds, 'STILL')
            setLocalImages(prev => [...newImages, ...(prev ?? queryImages ?? [])])
        } catch (error) {
            log.error('Error saving images', error)
            toast.error('Error al guardar algunas imágenes')
        }
    }

    // Manejar actualización de imagen
    const handleImageSave = (updatedImage: ImageWithRelations) => {
        setLocalImages(prev => (prev ?? queryImages ?? []).map(img =>
            img.id === updatedImage.id ? updatedImage : img
        ))
        setEditingImage(null)
    }

    // Manejar eliminación de imagen
    const handleImageDelete = (imageId: number) => {
        setLocalImages(prev => (prev ?? queryImages ?? []).filter(img => img.id !== imageId))
        setEditingImage(null)
    }

    // Toggle selección de una imagen
    const toggleSelection = (imageId: number) => {
        setSelectedIds(prev => {
            const next = new Set(prev)
            if (next.has(imageId)) {
                next.delete(imageId)
            } else {
                next.add(imageId)
            }
            return next
        })
    }

    // Salir del modo selección
    const exitSelectionMode = () => {
        setSelectionMode(false)
        setSelectedIds(new Set())
    }

    // Eliminar imágenes seleccionadas
    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return
        const count = selectedIds.size
        if (!confirm(`¿Eliminar ${count} imagen${count !== 1 ? 'es' : ''}? Esta acción no se puede deshacer.`)) return

        setDeleting(true)
        try {
            await imagesService.deleteBulk(Array.from(selectedIds))
            setLocalImages(prev => (prev ?? queryImages ?? []).filter(img => !selectedIds.has(img.id)))
            toast.success(`${count} imagen${count !== 1 ? 'es' : ''} eliminada${count !== 1 ? 's' : ''}`)
            exitSelectionMode()
        } catch (error) {
            log.error('Error deleting images', error)
            toast.error('Error al eliminar imágenes')
        } finally {
            setDeleting(false)
        }
    }

    // Si no hay película, mostrar mensaje
    if (!movieId) {
        return (
            <div className="text-center py-12">
                <ImageIcon className="mx-auto h-12 w-12 text-gray-300" />
                <p className="mt-4 text-gray-500">
                    Guardá la película primero para poder agregar imágenes
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Subida múltiple */}
            <MultiImageUpload
                movieId={movieId}
                onUploadComplete={handleUploadComplete}
            />

            {/* Galería de imágenes */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
            ) : images.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    No hay imágenes cargadas
                </div>
            ) : (
                <>
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-700">
                            {selectionMode && selectedIds.size > 0
                                ? `${selectedIds.size} de ${images.length} seleccionada${selectedIds.size !== 1 ? 's' : ''}`
                                : `${images.length} imagen${images.length !== 1 ? 'es' : ''}`
                            }
                        </h4>
                        <div className="flex items-center gap-2">
                            {selectionMode ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (selectedIds.size === images.length) {
                                                setSelectedIds(new Set())
                                            } else {
                                                setSelectedIds(new Set(images.map(img => img.id)))
                                            }
                                        }}
                                        className="text-xs text-blue-600 hover:text-blue-800"
                                    >
                                        {selectedIds.size === images.length ? 'Deseleccionar todas' : 'Seleccionar todas'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleBulkDelete}
                                        disabled={selectedIds.size === 0 || deleting}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                                        Eliminar{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={exitSelectionMode}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                                    >
                                        <X className="w-3 h-3" />
                                        Cancelar
                                    </button>
                                </>
                            ) : (
                                <>
                                    <p className="text-xs text-gray-500">
                                        Click en una imagen para editarla
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => setSelectionMode(true)}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                                    >
                                        <CheckSquare className="w-3 h-3" />
                                        Seleccionar
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {images.map(image => {
                            const isSelected = selectedIds.has(image.id)
                            return (
                                <div
                                    key={image.id}
                                    onClick={() => selectionMode ? toggleSelection(image.id) : setEditingImage(image)}
                                    className={`group relative aspect-3/2 rounded-lg overflow-hidden bg-gray-100 cursor-pointer transition-all ${
                                        isSelected
                                            ? 'ring-2 ring-blue-500 ring-offset-2'
                                            : 'hover:ring-2 hover:ring-blue-500'
                                    }`}
                                >
                                    <Image
                                        loader={cloudinaryLoader}
                                        src={imagePresets.card(image.cloudinaryPublicId)}
                                        alt={generateImageCaption(image)}
                                        fill
                                        sizes="200px"
                                        className={`object-cover transition-opacity ${isSelected ? 'opacity-75' : ''}`}
                                    />

                                    {/* Checkbox de selección */}
                                    {selectionMode && (
                                        <div className="absolute top-2 left-2 z-10">
                                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                                isSelected
                                                    ? 'bg-blue-600 border-blue-600'
                                                    : 'bg-white/80 border-gray-400'
                                            }`}>
                                                {isSelected && (
                                                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Overlay con info */}
                                    <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="absolute bottom-0 left-0 right-0 p-2">
                                            <p className="text-white text-xs line-clamp-2">
                                                {generateImageCaption(image)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Badge de personas */}
                                    {!selectionMode && image.people && image.people.length > 0 && (
                                        <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-sm">
                                            {image.people.length}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </>
            )}

            {/* Modal de edición */}
            {editingImage && (
                <ImageEditModal
                    image={editingImage}
                    moviePeople={moviePeople}
                    onClose={() => setEditingImage(null)}
                    onSave={handleImageSave}
                    onDelete={handleImageDelete}
                />
            )}
        </div>
    )
}