// components/admin/movies/MovieModal/tabs/CrewTab.tsx
import { useState, useEffect } from 'react'
import { useMovieModalContext } from '@/contexts/MovieModalContext'
import { Trash2, Plus } from 'lucide-react'
import PersonSearchInput from '@/components/admin/shared/PersonSearchInput'
import RoleSelector from '../../RoleSelector'

interface CrewMember {
  personId: number
  personName?: string
  roleId?: number | null
  role?: any  // Puede ser string o objeto
  department?: string
  billingOrder?: number
  note?: string
  person?: any  // Para mantener referencia a la persona completa
}

export default function CrewTab() {
  const {
    movieFormInitialData,  // 👈 USAR ESTO en lugar de editingMovie
    handleCrewChange
  } = useMovieModalContext()

  const [crew, setCrew] = useState<CrewMember[]>([])

  // Cargar datos del crew desde movieFormInitialData
  useEffect(() => {
    console.log('🎬 CrewTab - movieFormInitialData:', movieFormInitialData)

    if (movieFormInitialData?.crew && movieFormInitialData.crew.length > 0) {
      console.log('🎬 CrewTab - Cargando crew:', movieFormInitialData.crew)

      const formattedCrew = movieFormInitialData.crew.map((member: any) => {
        console.log('🎬 Procesando miembro:', member)

        // Determinar el nombre de la persona
        let personName = ''
        if (member.person) {
          personName = `${member.person.firstName || ''} ${member.person.lastName || ''}`.trim()
        }

        // Determinar el roleId
        let roleId = member.roleId
        if (!roleId && member.role && typeof member.role === 'object') {
          roleId = member.role.id
        }

        // Determinar el nombre del rol
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
          person: member.person  // Mantener la referencia completa
        }

        console.log('🎬 Miembro formateado:', formatted)
        return formatted
      })

      setCrew(formattedCrew)
      // NO llamar handleCrewChange aquí para evitar loops
    } else {
      // Si no hay crew inicial, empezar con array vacío
      setCrew([])
    }
  }, [movieFormInitialData?.crew]) // Solo reaccionar a cambios en el crew inicial

  // Notificar cambios al contexto
  useEffect(() => {
    // Solo notificar si hay cambios reales
    if (crew.length > 0 || movieFormInitialData?.crew?.length > 0) {
      handleCrewChange(crew)
    }
  }, [crew])

  // Función para actualizar un miembro del crew
  const updateCrewMember = (index: number, updates: Partial<CrewMember>) => {
    console.log('🔄 Actualizando miembro:', index, updates)
    const updatedCrew = [...crew]
    updatedCrew[index] = {
      ...updatedCrew[index],
      ...updates,
      // Si viene person en updates pero no personId, extraerlo
      personId: updates.personId || updatedCrew[index].personId || 0
    }
    setCrew(updatedCrew)
  }

  // Agregar nuevo miembro al crew
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

  // Eliminar miembro del crew
  const removeCrewMember = (index: number) => {
    const updatedCrew = crew.filter((_, i) => i !== index)
    // Reajustar billingOrder
    updatedCrew.forEach((member, i) => {
      member.billingOrder = i
    })
    setCrew(updatedCrew)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900">Equipo Técnico</h3>
        <button
          type="button"
          onClick={addCrewMember}
          className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-4 w-4 mr-1" />
          Agregar Miembro
        </button>
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
        <div className="space-y-3">
          {crew.map((member, index) => (
            <div key={index} className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-12 gap-2">
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
                <div className="col-span-3">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Departamento
                  </label>
                  <input
                    type="text"
                    value={member.department || ''}
                    placeholder="Departamento"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed"
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

                {/* Orden de facturación */}
                <div className="col-span-3">
                  <input
                    type="number"
                    value={member.billingOrder !== undefined ? member.billingOrder : index}
                    onChange={(e) => updateCrewMember(index, {
                      billingOrder: parseInt(e.target.value) || 0
                    })}
                    placeholder="Orden"
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md"
                    min="0"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
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