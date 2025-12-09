// src/components/admin/movies/MovieModal/tabs/CastTab.tsx
import { useState, useEffect } from 'react'
import { useMovieModalContext } from '@/contexts/MovieModalContext'
import { Trash2, Plus, GripVertical } from 'lucide-react'
import PersonSearchInput from '@/components/admin/shared/PersonSearchInput'

// Imports para drag and drop
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

interface CastMember {
  personId: number
  personName?: string
  characterName?: string
  billingOrder?: number
  isPrincipal?: boolean
  person?: any
}

// Componente para cada fila draggable
function SortableCastMember({
  member,
  index,
  updateCastMember,
  removeCastMember
}: {
  member: CastMember
  index: number
  updateCastMember: (index: number, updates: Partial<CastMember>) => void
  removeCastMember: (index: number) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `cast-${index}` })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-gray-50 p-3 rounded-lg ${isDragging ? 'shadow-lg ring-2 ring-blue-500' : ''}`}
    >
      <div className="flex items-center gap-2">
        {/* Handle para arrastrar */}
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-200 rounded touch-none flex-shrink-0"
          {...attributes}
          {...listeners}
          title="Arrastrar para reordenar"
        >
          <GripVertical className="h-5 w-5 text-gray-400" />
        </button>

        {/* Selector de Persona */}
        <div className="flex-1 min-w-0" style={{ maxWidth: '280px' }}>
          <PersonSearchInput
            value={member.personId}
            onChange={(personId, personName) => updateCastMember(index, {
              personId,
              personName
            })}
            placeholder="Buscar actor/actriz..."
          />
        </div>

        {/* Nombre del personaje */}
        <div className="flex-1 min-w-0" style={{ maxWidth: '220px' }}>
          <input
            type="text"
            value={member.characterName || ''}
            onChange={(e) => updateCastMember(index, { characterName: e.target.value })}
            placeholder="Personaje..."
            className="w-full px-2 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </div>

        {/* Checkbox Principal */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <input
            type="checkbox"
            id={`principal-${index}`}
            checked={member.isPrincipal || false}
            onChange={(e) => updateCastMember(index, { isPrincipal: e.target.checked })}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
          />
          <label
            htmlFor={`principal-${index}`}
            className="text-xs text-gray-700 cursor-pointer select-none whitespace-nowrap"
          >
            Principal
          </label>
        </div>

        {/* Orden (read-only) */}
        <div className="flex-shrink-0" style={{ width: '60px' }}>
          <input
            type="number"
            value={member.billingOrder !== undefined ? member.billingOrder : index + 1}
            readOnly
            className="w-full px-2 py-2 text-sm border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed text-center"
            title="Orden (se actualiza al arrastrar)"
          />
        </div>

        {/* Botón eliminar */}
        <button
          type="button"
          onClick={() => removeCastMember(index)}
          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded flex-shrink-0"
          title="Eliminar actor"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export default function CastTab() {
  const {
    movieFormInitialData,
    handleCastChange
  } = useMovieModalContext()

  const [cast, setCast] = useState<CastMember[]>([])

  // Configurar sensores para drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Cargar datos del cast desde movieFormInitialData
  useEffect(() => {
    console.log('🎬 CastTab - movieFormInitialData:', movieFormInitialData)

    if (movieFormInitialData?.cast && movieFormInitialData.cast.length > 0) {
      console.log('🎬 CastTab - Cargando cast:', movieFormInitialData.cast)

      const formattedCast = movieFormInitialData.cast.map((member: any) => {
        console.log('🎬 Procesando miembro:', member)

        let personName = ''
        if (member.person) {
          personName = member.person.name || `${member.person.firstName || ''} ${member.person.lastName || ''}`.trim()
        }

        const formatted = {
          personId: member.personId || member.person?.id || 0,
          personName: personName,
          characterName: member.characterName || '',
          billingOrder: member.billingOrder || 0,
          isPrincipal: member.isPrincipal || false,
          person: member.person
        }

        console.log('🎬 Miembro formateado:', formatted)
        return formatted
      })

      // Ordenar por billingOrder
      formattedCast.sort((a: CastMember, b: CastMember) => (a.billingOrder || 0) - (b.billingOrder || 0))
      setCast(formattedCast)
    } else {
      setCast([])
    }
  }, [movieFormInitialData?.cast])

  // Notificar cambios al contexto
  useEffect(() => {
    if (cast.length > 0 || movieFormInitialData?.cast?.length > 0) {
      handleCastChange(cast)
    }
  }, [cast])

  // Manejar el fin del drag
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = cast.findIndex((_, i) => `cast-${i}` === active.id)
      const newIndex = cast.findIndex((_, i) => `cast-${i}` === over.id)

      const reorderedCast = arrayMove(cast, oldIndex, newIndex)

      // Actualizar billingOrder para todos los miembros
      const updatedCast = reorderedCast.map((member, index) => ({
        ...member,
        billingOrder: index + 1
      }))

      setCast(updatedCast)
      console.log('🔄 Cast reordenado:', updatedCast)
    }
  }

  const updateCastMember = (index: number, updates: Partial<CastMember>) => {
    console.log('🔄 Actualizando miembro:', index, updates)
    const updatedCast = [...cast]
    updatedCast[index] = {
      ...updatedCast[index],
      ...updates,
      personId: updates.personId || updatedCast[index].personId || 0
    }
    setCast(updatedCast)
  }

  const addCastMember = () => {
    const newMember: CastMember = {
      personId: 0,
      personName: '',
      characterName: '',
      billingOrder: cast.length + 1,
      isPrincipal: cast.length < 5 // Primeros 5 son principales por defecto
    }
    setCast([...cast, newMember])
  }

  const removeCastMember = (index: number) => {
    const updatedCast = cast.filter((_, i) => i !== index)
    // Reajustar billingOrder después de eliminar
    updatedCast.forEach((member, i) => {
      member.billingOrder = i + 1
    })
    setCast(updatedCast)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900">Reparto</h3>
        <span className="text-sm text-gray-500">
          Arrastra para reordenar
        </span>
      </div>

      {cast.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No hay actores en el reparto</p>
          <button
            type="button"
            onClick={addCastMember}
            className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Agregar el primer actor/actriz
          </button>
        </div>
      ) : (
        <>
          {/* Encabezados de columnas */}
          <div className="flex items-center gap-2 px-3 pb-2 text-xs font-medium text-gray-500 border-b border-gray-200">
            <div className="w-7 flex-shrink-0"></div>
            <div className="flex-1 min-w-0" style={{ maxWidth: '280px' }}>Actor/Actriz</div>
            <div className="flex-1 min-w-0" style={{ maxWidth: '220px' }}>Personaje</div>
            <div className="flex-shrink-0 w-20 text-center">Principal</div>
            <div className="flex-shrink-0 text-center" style={{ width: '60px' }}>Orden</div>
            <div className="w-10 flex-shrink-0"></div>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={cast.map((_, i) => `cast-${i}`)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {cast.map((member, index) => (
                  <SortableCastMember
                    key={`cast-${index}`}
                    member={member}
                    index={index}
                    updateCastMember={updateCastMember}
                    removeCastMember={removeCastMember}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {/* Botón agregar después de la lista */}
          <button
            type="button"
            onClick={addCastMember}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-1" />
            Agregar Actor/Actriz
          </button>
        </>
      )}

      {/* Resumen */}
      {cast.length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>{cast.length}</strong> actor{cast.length !== 1 ? 'es' : ''} en el reparto
            {cast.filter(c => c.isPrincipal).length > 0 && (
              <span className="ml-2">
                ({cast.filter(c => c.isPrincipal).length} principal{cast.filter(c => c.isPrincipal).length !== 1 ? 'es' : ''})
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  )
}