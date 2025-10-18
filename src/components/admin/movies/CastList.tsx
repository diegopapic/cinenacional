// src/components/admin/movies/CastList.tsx
'use client'

import { useState } from 'react'
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core'
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2 } from 'lucide-react'

interface CastMember {
    personId: number
    person: {
        id: number
        firstName?: string
        lastName?: string
        name?: string
    }
    characterName?: string
    billingOrder?: number
    isPrincipal?: boolean
    notes?: string
}

interface CastListProps {
    cast: CastMember[]
    onCastChange: (cast: CastMember[]) => void
}

interface SortableCastItemProps {
    member: CastMember
    index: number
    onRemove: () => void
    onNotesChange: (notes: string) => void
}

function SortableCastItem({ member, index, onRemove, onNotesChange }: SortableCastItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: member.personId.toString() })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    }

    const personName = member.person.name ||
        `${member.person.firstName || ''} ${member.person.lastName || ''}`.trim() ||
        'Sin nombre'

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
        >
            {/* Drag Handle */}
            <button
                type="button"
                className="mt-2 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
                {...attributes}
                {...listeners}
            >
                <GripVertical className="w-5 h-5" />
            </button>

            {/* Content */}
            <div className="flex-1 space-y-2">
                {/* Nombre y personaje */}
                <div>
                    <span className="font-medium text-gray-900">{personName}</span>
                    {member.characterName && (
                        <span className="text-gray-500"> como {member.characterName}</span>
                    )}
                    {member.isPrincipal && (
                        <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                            Principal
                        </span>
                    )}
                </div>

                {/* Campo de comentarios */}
                <div>
                    <label className="block text-xs text-gray-600 mb-1">Personaje:</label>
                    <input
                        type="text"
                        value={member.characterName || ''}  // ✅ Cambiar de notes a characterName
                        onChange={(e) => onNotesChange(e.target.value)}
                        placeholder="Nombre del personaje..."
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>

                {/* Orden */}
                <div className="text-xs text-gray-500">
                    Orden: {index + 1}
                </div>
            </div>

            {/* Delete button */}
            <button
                type="button"
                onClick={onRemove}
                className="mt-2 text-red-600 hover:text-red-800"
            >
                <Trash2 className="w-4 h-4" />
            </button>
        </div>
    )
}

export default function CastList({ cast, onCastChange }: CastListProps) {
    console.log('🎬 CastList RENDER - cast recibido:', cast)
    console.log('🎬 Cantidad de items:', cast.length)
    cast.forEach((item, i) => {
        console.log(`🎬 Item ${i}:`, {
            personId: item.personId,
            hasPersonId: !!item.personId,
            personFromObject: item.person?.id
        })
    })
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event

        if (over && active.id !== over.id) {
            const oldIndex = cast.findIndex((item) => item.personId.toString() === active.id)
            const newIndex = cast.findIndex((item) => item.personId.toString() === over.id)

            // Reordenar array
            const newCast = arrayMove(cast, oldIndex, newIndex)

            // Actualizar billingOrder y isPrincipal
            const updatedCast = newCast.map((member, index) => ({
                ...member,
                billingOrder: index + 1,
                isPrincipal: index < 5, // Los primeros 5 son principales
            }))

            onCastChange(updatedCast)
        }
    }

    const handleRemove = (index: number) => {
        const newCast = cast.filter((_, i) => i !== index)
        // Actualizar billingOrder después de eliminar
        const updatedCast = newCast.map((member, idx) => ({
            ...member,
            billingOrder: idx + 1,
            isPrincipal: idx < 5,
        }))
        onCastChange(updatedCast)
    }

    const handleCharacterNameChange = (index: number, characterName: string) => {
        const newCast = [...cast]
        newCast[index] = {
            ...newCast[index],
            characterName,  // ✅ Actualizar characterName
        }
        onCastChange(newCast)
    }

    if (cast.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500">
                No hay actores agregados. Usa el botón de abajo para agregar.
            </div>
        )
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
        >
            <SortableContext
                items={cast.map((item) => item.personId.toString())}
                strategy={verticalListSortingStrategy}
            >
                <div className="space-y-2">
                    {cast.map((member, index) => (
                        <SortableCastItem
                            key={member.personId}
                            member={member}
                            index={index}
                            onRemove={() => handleRemove(index)}
                            onNotesChange={(notes) => handleCharacterNameChange(index, notes)}
                        />
                    ))}
                </div>
            </SortableContext>
        </DndContext>
    )
}