// components/admin/movies/MovieModal/tabs/CrewTab.tsx
import { useState, useEffect } from 'react'
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
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface CrewMember {
  personId: number
  personName?: string
  roleId?: number | null
  role?: any
  department?: string
  billingOrder?: number
  note?: string
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
            onChange={(personId, personName) => updateCrewMember(index, {
              personId,
              personName
            })}
            placeholder="Buscar persona..."
          />
          {member.personName && (
            <p className="text-xs text-gray-500 mt-1">{member.personName}</p>
          )}
        </div>

        {/* Selector de Rol con búsqueda */}
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

        {/* Botón eliminar */}
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
            value={member.note || ''}
            onChange={(e) => updateCrewMember(index, { note: e.target.value })}
            placeholder="Nota adicional (opcional)"
            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md"
          />
        </div>

        {/* Orden de facturación (ahora read-only) */}
        <div className="col-span-2">
          <input
            type="number"
            value={member.billingOrder !== undefined ? member.billingOrder : index}
            readOnly
            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed"
            title="El orden se actualiza automáticamente al arrastrar"
          />
        </div>
      </div>
    </div>
  )
}

export default function CrewTab() {
  const {
    movieFormInitialData,
    handleCrewChange
  } = useMovieModalContext()

  const [crew, setCrew] = useState<CrewMember[]>([])

  // Configurar sensores para drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px de movimiento antes de activar el drag
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Cargar datos del crew desde movieFormInitialData
  useEffect(() => {
    console.log('🎬 CrewTab - movieFormInitialData:', movieFormInitialData)

    if (movieFormInitialData?.crew && movieFormInitialData.crew.length > 0) {
      console.log('🎬 CrewTab - Cargando crew:', movieFormInitialData.crew)

      const formattedCrew = movieFormInitialData.crew.map((member: any) => {
        console.log('🎬 Procesando miembro:', member)

        let personName = ''
        if (member.person) {
          personName = `${member.person.firstName || ''} ${member.person.lastName || ''}`.trim()
        }

        let roleId = member.roleId
        if (!roleId && member.role && typeof member.role === 'object') {
          roleId = member.role.id
        }

        let roleName = ''
        if (typeof member.role === 'string') {
          roleName = member.role
        } else if (member.role && typeof member.role === 'object') {
          roleName = member.role.name || ''
        }

        const formatted = {
          personId: member.personId || member.person?.id || 0,
          personName: personName,
          roleId: roleId || null,
          role: roleName,
          department: member.department || member.role?.department || '',
          billingOrder: member.billingOrder || 0,
          note: member.note || '',
          person: member.person
        }

        console.log('🎬 Miembro formateado:', formatted)
        return formatted
      })

      // Ordenar por billingOrder
      formattedCrew.sort((a: any, b: any) => (a.billingOrder || 0) - (b.billingOrder || 0))
      setCrew(formattedCrew)
    } else {
      setCrew([])
    }
  }, [movieFormInitialData?.crew])

  // Notificar cambios al contexto
  useEffect(() => {
    if (crew.length > 0 || movieFormInitialData?.crew?.length > 0) {
      handleCrewChange(crew)
    }
  }, [crew])

  // Manejar el fin del drag
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = crew.findIndex((_, i) => `crew-${i}` === active.id)
      const newIndex = crew.findIndex((_, i) => `crew-${i}` === over.id)

      const reorderedCrew = arrayMove(crew, oldIndex, newIndex)
      
      // Actualizar billingOrder para todos los miembros
      const updatedCrew = reorderedCrew.map((member, index) => ({
        ...member,
        billingOrder: index
      }))

      setCrew(updatedCrew)
      console.log('🔄 Crew reordenado:', updatedCrew)
    }
  }

  const updateCrewMember = (index: number, updates: Partial<CrewMember>) => {
    console.log('📄 Actualizando miembro:', index, updates)
    const updatedCrew = [...crew]
    updatedCrew[index] = {
      ...updatedCrew[index],
      ...updates,
      personId: updates.personId || updatedCrew[index].personId || 0
    }
    setCrew(updatedCrew)
  }

  const addCrewMember = () => {
    const newMember: CrewMember = {
      personId: 0,
      personName: '',
      roleId: null,
      role: '',
      department: '',
      billingOrder: crew.length,
      note: ''
    }
    setCrew([...crew, newMember])
  }

  const removeCrewMember = (index: number) => {
    const updatedCrew = crew.filter((_, i) => i !== index)
    // Reajustar billingOrder después de eliminar
    updatedCrew.forEach((member, i) => {
      member.billingOrder = i
    })
    setCrew(updatedCrew)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900">Equipo Técnico</h3>
        <span className="text-sm text-gray-500">
          Arrastra para reordenar
        </span>
      </div>

      {crew.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No hay miembros del equipo técnico</p>
          <button
            type="button"
            onClick={addCrewMember}
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
              items={crew.map((_, i) => `crew-${i}`)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {crew.map((member, index) => (
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

          {/* BOTÓN AGREGAR - DESPUÉS DE LA LISTA */}
          <button
            type="button"
            onClick={addCrewMember}
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
            <strong>{crew.length}</strong> miembro{crew.length !== 1 ? 's' : ''} en el equipo técnico
          </p>
        </div>
      )}
    </div>
  )
}