// components/admin/movies/MovieModal/tabs/CrewTab.tsx
import { useMovieModalContext } from '@/contexts/MovieModalContext'
import { Trash2, Plus, GripVertical } from 'lucide-react'
import PersonSearchInput from '@/components/admin/shared/PersonSearchInput'
import RoleSelector from '../../RoleSelector'

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

interface CrewMember {
  personId: number
  personName?: string
  alternativeNameId?: number | null
  alternativeName?: string | null
  roleId?: number | null
  role?: any
  department?: string
  billingOrder?: number
  notes?: string
  person?: any
}

// Componente para cada fila draggable
function SortableCrewMember({
  member,
  index,
  updateCrewMember,
  removeCrewMember
}: {
  member: CrewMember
  index: number
  updateCrewMember: (index: number, updates: Partial<CrewMember>) => void
  removeCrewMember: (index: number) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `crew-${index}` })

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
      className={`bg-gray-50 p-4 rounded-lg ${isDragging ? 'shadow-lg ring-2 ring-blue-500' : ''}`}
    >
      <div className="grid grid-cols-12 gap-2">
        {/* Handle para arrastrar */}
        <div className="col-span-1 flex items-center justify-center">
          <button
            type="button"
            className="cursor-grab active:cursor-grabbing p-2 hover:bg-gray-200 rounded touch-none"
            {...attributes}
            {...listeners}
            title="Arrastrar para reordenar"
          >
            <GripVertical className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Selector de Persona */}
        <div className="col-span-4">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Persona
          </label>
          <PersonSearchInput
            value={member.personId}
            alternativeNameId={member.alternativeNameId}
            initialPersonName={displayName}
            onChange={(personId, personName, alternativeNameId, alternativeName) => updateCrewMember(index, {
              personId,
              personName: personName,
              alternativeNameId: alternativeNameId || null,
              alternativeName: alternativeName || null
            })}
            placeholder="Buscar persona..."
          />
          {member.personName && !member.alternativeName && (
            <p className="text-xs text-gray-500 mt-1">{member.personName}</p>
          )}
        </div>

        {/* Selector de Rol con busqueda */}
        <div className="col-span-4">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Rol
          </label>
          <RoleSelector
            value={member.roleId || undefined}
            onChange={(roleId, roleName, department) => updateCrewMember(index, {
              roleId,
              role: roleName,
              department: department || member.department
            })}
            placeholder="Buscar rol..."
          />
          {member.role && typeof member.role === 'string' && (
            <p className="text-xs text-gray-500 mt-1">{member.role}</p>
          )}
        </div>

        {/* Departamento (auto-completado) */}
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Departamento
          </label>
          <input
            type="text"
            value={member.department || ''}
            placeholder="Depto"
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed text-sm"
            disabled
            readOnly
          />
        </div>

        {/* Boton eliminar */}
        <div className="col-span-1 flex items-end">
          <button
            type="button"
            onClick={() => removeCrewMember(index)}
            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
            title="Eliminar miembro"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Campos adicionales (segunda fila) */}
      <div className="grid grid-cols-12 gap-2 mt-2">
        <div className="col-span-1"></div> {/* Espacio para alinear con el handle */}

        {/* Nota */}
        <div className="col-span-8">
          <input
            type="text"
            value={member.notes || ''}
            onChange={(e) => updateCrewMember(index, { notes: e.target.value })}
            placeholder="Nota adicional (opcional)"
            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md"
          />
        </div>

        {/* Orden de facturacion (ahora read-only) */}
        <div className="col-span-2">
          <input
            type="number"
            value={member.billingOrder !== undefined ? member.billingOrder : index}
            readOnly
            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed"
            title="El orden se actualiza automaticamente al arrastrar"
          />
        </div>
      </div>
    </div>
  )
}

export default function CrewTab() {
  const {
    movieRelations,
    addCrewMember,
    removeCrewMember,
    updateCrewMember,
    reorderCrew,
  } = useMovieModalContext()

  // Leer crew directamente de movieRelations (fuente unica de verdad)
  const crew = movieRelations.crew

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
      const oldIndex = crew.findIndex((_: any, i: number) => `crew-${i}` === active.id)
      const newIndex = crew.findIndex((_: any, i: number) => `crew-${i}` === over.id)
      reorderCrew(oldIndex, newIndex)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900">Equipo Tecnico</h3>
        <span className="text-sm text-gray-500">
          Arrastra para reordenar
        </span>
      </div>

      {crew.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No hay miembros del equipo tecnico</p>
          <button
            type="button"
            onClick={() => addCrewMember()}
            className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Agregar el primer miembro
          </button>
        </div>
      ) : (
        <>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={crew.map((_: any, i: number) => `crew-${i}`)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {crew.map((member: any, index: number) => (
                  <SortableCrewMember
                    key={`crew-${index}`}
                    member={member}
                    index={index}
                    updateCrewMember={updateCrewMember}
                    removeCrewMember={removeCrewMember}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {/* BOTON AGREGAR - DESPUES DE LA LISTA */}
          <button
            type="button"
            onClick={() => addCrewMember()}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-1" />
            Agregar Miembro
          </button>
        </>
      )}

      {/* Resumen */}
      {crew.length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>{crew.length}</strong> miembro{crew.length !== 1 ? 's' : ''} en el equipo tecnico
          </p>
        </div>
      )}
    </div>
  )
}
