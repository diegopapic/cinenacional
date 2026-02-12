// src/components/admin/movies/MovieModal/tabs/CastTab.tsx
import { useMemo } from 'react'
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
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface CastMember {
  personId: number
  personName?: string
  alternativeNameId?: number | null
  alternativeName?: string | null
  characterName?: string
  billingOrder?: number
  isPrincipal?: boolean
  isActor?: boolean
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

  // Determinar el nombre a mostrar (alternativo o principal)
  const displayName = member.alternativeName || member.personName || ''

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
        <div className="flex-1 min-w-0" style={{ maxWidth: '250px' }}>
          <PersonSearchInput
            value={member.personId}
            alternativeNameId={member.alternativeNameId}
            initialPersonName={displayName}
            onChange={(personId, personName, alternativeNameId, alternativeName) => updateCastMember(index, {
              personId,
              personName: personName,
              alternativeNameId: alternativeNameId || null,
              alternativeName: alternativeName || null
            })}
            placeholder="Buscar actor/actriz..."
          />
        </div>

        {/* Nombre del personaje */}
        <div className="flex-1 min-w-0" style={{ maxWidth: '180px' }}>
          <input
            type="text"
            value={member.characterName || ''}
            onChange={(e) => updateCastMember(index, { characterName: e.target.value })}
            placeholder="Personaje..."
            className="w-full px-2 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </div>

        {/* Checkbox Es Actor */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <input
            type="checkbox"
            id={`isActor-${index}`}
            checked={member.isActor !== false}
            onChange={(e) => updateCastMember(index, { isActor: e.target.checked })}
            className="rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer"
          />
          <label
            htmlFor={`isActor-${index}`}
            className="text-xs text-gray-700 cursor-pointer select-none whitespace-nowrap"
            title="Desmarcar si aparece como si mismo (entrevistado, documental)"
          >
            Actor
          </label>
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
        <div className="flex-shrink-0" style={{ width: '50px' }}>
          <input
            type="number"
            value={member.billingOrder !== undefined ? member.billingOrder : index + 1}
            readOnly
            className="w-full px-2 py-2 text-sm border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed text-center"
            title="Orden (se actualiza al arrastrar)"
          />
        </div>

        {/* Boton eliminar */}
        <button
          type="button"
          onClick={() => removeCastMember(index)}
          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded flex-shrink-0"
          title="Eliminar"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export default function CastTab() {
  const {
    movieRelations,
    movieFormInitialData,
    addCastMember,
    removeCastMember,
    updateCastMember,
    reorderCast,
  } = useMovieModalContext()

  // Leer cast directamente de movieRelations (fuente unica de verdad)
  const cast = movieRelations.cast

  // Detectar si la pelicula es documental basandose en los generos
  const isDocumental = useMemo(() => {
    const genres = movieFormInitialData?.genres || []
    return genres.some((g: any) => {
      const slug = g.slug || g.genre?.slug || ''
      const name = g.name || g.genre?.name || ''
      return slug.toLowerCase().includes('documental') ||
             name.toLowerCase().includes('documental')
    })
  }, [movieFormInitialData?.genres])

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

  // Manejar el fin del drag
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = cast.findIndex((_: any, i: number) => `cast-${i}` === active.id)
      const newIndex = cast.findIndex((_: any, i: number) => `cast-${i}` === over.id)
      reorderCast(oldIndex, newIndex)
    }
  }

  // Wrapper para agregar miembro con override de isActor para documentales
  const handleAddCastMember = () => {
    addCastMember({ isActor: !isDocumental })
  }

  // Contadores para el resumen
  const actoresCount = cast.filter((c: any) => c.isActor !== false).length
  const siMismosCount = cast.filter((c: any) => c.isActor === false).length

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Reparto</h3>
          {isDocumental && (
            <p className="text-xs text-amber-600 mt-1">
              Pelicula documental - Las personas se agregan como "si mismos" por defecto
            </p>
          )}
        </div>
        <span className="text-sm text-gray-500">
          Arrastra para reordenar
        </span>
      </div>

      {cast.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No hay personas en el reparto</p>
          <button
            type="button"
            onClick={handleAddCastMember}
            className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Agregar la primera persona
          </button>
        </div>
      ) : (
        <>
          {/* Encabezados de columnas */}
          <div className="flex items-center gap-2 px-3 pb-2 text-xs font-medium text-gray-500 border-b border-gray-200">
            <div className="w-7 flex-shrink-0"></div>
            <div className="flex-1 min-w-0" style={{ maxWidth: '250px' }}>Persona</div>
            <div className="flex-1 min-w-0" style={{ maxWidth: '180px' }}>Personaje</div>
            <div className="flex-shrink-0 w-14 text-center" title="Marcar si interpreta un personaje">Actor</div>
            <div className="flex-shrink-0 w-16 text-center">Principal</div>
            <div className="flex-shrink-0 text-center" style={{ width: '50px' }}>Orden</div>
            <div className="w-10 flex-shrink-0"></div>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={cast.map((_: any, i: number) => `cast-${i}`)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {cast.map((member: any, index: number) => (
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

          {/* Boton agregar despues de la lista */}
          <button
            type="button"
            onClick={handleAddCastMember}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-1" />
            Agregar Persona
          </button>
        </>
      )}

      {/* Resumen */}
      {cast.length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>{cast.length}</strong> persona{cast.length !== 1 ? 's' : ''} en el reparto
            {actoresCount > 0 && (
              <span className="ml-2">
                • {actoresCount} actor{actoresCount !== 1 ? 'es' : ''}
              </span>
            )}
            {siMismosCount > 0 && (
              <span className="ml-2">
                • {siMismosCount} como si mismo{siMismosCount !== 1 ? 's' : ''}
              </span>
            )}
            {cast.filter((c: any) => c.isPrincipal).length > 0 && (
              <span className="ml-2">
                • {cast.filter((c: any) => c.isPrincipal).length} principal{cast.filter((c: any) => c.isPrincipal).length !== 1 ? 'es' : ''}
              </span>
            )}
          </p>
        </div>
      )}

      {/* Leyenda explicativa */}
      <div className="text-xs text-gray-500 border-t pt-3 mt-3">
        <p><strong>Actor:</strong> Marca si la persona interpreta un personaje ficticio.</p>
        <p>Desmarca si aparece como si misma (entrevistado, documental, cameo real).</p>
      </div>
    </div>
  )
}
