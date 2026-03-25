// components/admin/RoleSelector.tsx
import { useState, useRef, useCallback } from 'react'
import { useClickOutside } from '@/hooks/useClickOutside'
import { useValueChange } from '@/hooks/useValueChange'
import { useQuery } from '@tanstack/react-query'
import { useDebounce } from '@/hooks/useDebounce'
import { Search, X } from 'lucide-react'
import { rolesService } from '@/services/roles.service'
import { createLogger } from '@/lib/logger'

const log = createLogger('RoleSelector')
import {
  Department,
  getDepartmentLabel,
  getDepartmentColor,
  type Role,
  type RoleFilters
} from '@/lib/roles/rolesTypes'

interface RoleSelectorProps {
  value?: number
  onChange: (roleId: number, roleName: string, department?: string) => void
  placeholder?: string
  disabled?: boolean
  /** When set, locks the department filter and hides the dropdown */
  fixedDepartment?: Department | null
}

export default function RoleSelector({
  value,
  onChange,
  placeholder = "Buscar rol...",
  disabled = false,
  fixedDepartment = null,
}: RoleSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState<Department | ''>('')
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)

  // Departamento efectivo: fixedDepartment tiene prioridad
  const effectiveDepartment = fixedDepartment || selectedDepartment || ''

  const containerRef = useRef<HTMLDivElement>(null)
  const debouncedSearch = useDebounce(searchTerm, 300)

  // Cargar rol seleccionado por ID
  const { data: loadedRole } = useQuery({
    queryKey: ['role-by-id', value],
    queryFn: () => rolesService.getById(value!),
    enabled: !!value && value > 0,
    staleTime: 5 * 60 * 1000,
  })

  // Sync loadedRole → local state
  useValueChange(loadedRole, (role) => {
    if (role) {
      setSelectedRole(role)
      setSearchTerm(role.name)
    }
  })

  // Cerrar dropdown al hacer click fuera
  useClickOutside(containerRef, useCallback(() => setIsOpen(false), []))

  // Buscar roles via React Query
  const { data: rolesData, isLoading: loading } = useQuery<Role[]>({
    queryKey: ['role-search', debouncedSearch, effectiveDepartment],
    queryFn: async () => {
      if (debouncedSearch && debouncedSearch.length >= 2) {
        return rolesService.search(debouncedSearch, effectiveDepartment || undefined, 50)
      }
      const filters: RoleFilters = {
        department: effectiveDepartment || undefined,
        isActive: true,
        limit: 100
      }
      const response = await rolesService.getAll(filters)
      return response.data
    },
    enabled: isOpen,
    staleTime: 30 * 1000,
  })
  const roles = rolesData ?? []

  const handleSelectRole = (role: Role) => {
    setSelectedRole(role)
    setSearchTerm(role.name)
    onChange(role.id, role.name, role.department)
    setIsOpen(false)
  }

  const handleClear = () => {
    setSearchTerm('')
    setSelectedRole(null)
    setSelectedDepartment('')
    onChange(0, '', undefined)
    setIsOpen(false)
  }

  // Agrupar roles por departamento
  const groupedRoles = roles.reduce((acc, role) => {
    const deptLabel = getDepartmentLabel(role.department)
    if (!acc[deptLabel]) acc[deptLabel] = []
    acc[deptLabel].push(role)
    return acc
  }, {} as Record<string, Role[]>)

  // Ordenar departamentos para mostrar
  const sortedDepartments = Object.keys(groupedRoles).sort((a, b) => {
    // Poner "Otros" al final
    if (a === 'Otros') return 1
    if (b === 'Otros') return -1
    return a.localeCompare(b)
  })

  return (
    <div className="relative" ref={containerRef}>
      {/* Filtro por Departamento (solo si no hay fixedDepartment) */}
      {!disabled && !fixedDepartment && (
        <div className="mb-2 flex gap-2">
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value as Department | '')}
            className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Todos los departamentos</option>
            {Object.values(Department).map(dept => (
              <option key={dept} value={dept}>
                {getDepartmentLabel(dept)}
              </option>
            ))}
          </select>
          
          {selectedDepartment && (
            <button
              type="button"
              onClick={() => setSelectedDepartment('')}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Limpiar filtro
            </button>
          )}
        </div>
      )}

      {/* Campo de búsqueda */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              if (!isOpen) setIsOpen(true)
            }}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
          />
          {searchTerm && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Dropdown de resultados */}
        {isOpen && !disabled && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-96 overflow-auto">
            {loading ? (
              <div className="p-3 text-center text-gray-500">
                <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                <span className="ml-2">Buscando roles...</span>
              </div>
            ) : roles.length === 0 ? (
              <div className="p-3 text-center text-gray-500">
                {debouncedSearch && debouncedSearch.length >= 2 ? 
                  `No se encontraron roles con "${debouncedSearch}"` : 
                  selectedDepartment ? 
                    'No hay roles en este departamento' :
                    'Escribe al menos 2 caracteres para buscar'}
              </div>
            ) : (
              <div className="py-1">
                {sortedDepartments.map(deptLabel => {
                  const deptRoles = groupedRoles[deptLabel]
                  const firstRole = deptRoles[0]
                  const deptColor = getDepartmentColor(firstRole.department)
                  
                  return (
                    <div key={deptLabel}>
                      {/* Header del departamento con color */}
                      <div 
                        className="px-3 py-1.5 text-xs font-semibold text-white sticky top-0 flex justify-between items-center"
                        style={{ backgroundColor: deptColor }}
                      >
                        <span>{deptLabel}</span>
                        <span className="bg-white/20 px-1.5 py-0.5 rounded-sm text-xs">
                          {deptRoles.length}
                        </span>
                      </div>
                      
                      {/* Roles del departamento */}
                      {deptRoles.map(role => (
                        <button
                          key={role.id}
                          type="button"
                          onClick={() => handleSelectRole(role)}
                          className="w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors flex items-center justify-between group"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">
                                {role.name}
                              </span>
                              {role.isMainRole && (
                                <span className="text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded-sm font-medium">
                                  Principal
                                </span>
                              )}
                            </div>
                            {role.description && (
                              <div className="text-xs text-gray-500 truncate mt-0.5">
                                {role.description}
                              </div>
                            )}
                          </div>
                          {role._count?.crewRoles && role._count.crewRoles > 0 && (
                            <span className="ml-2 text-xs text-gray-400 group-hover:text-gray-600">
                              {role._count.crewRoles} {role._count.crewRoles === 1 ? 'uso' : 'usos'}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Sugerencias útiles */}
            {!loading && !debouncedSearch && isOpen && roles.length > 0 && (
              <div className="p-3 border-t border-gray-200 bg-gray-50">
                <p className="text-xs text-gray-500">
                  💡 Mostrando {roles.length} roles{effectiveDepartment ? ` de ${getDepartmentLabel(effectiveDepartment as Department)}` : ''}
                </p>
              </div>
            )}

            {/* Opción para crear nuevo rol si no se encuentra */}
            {!loading && debouncedSearch && debouncedSearch.length >= 2 && roles.length === 0 && (
              <div className="border-t border-gray-200">
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-green-50 flex items-center space-x-2 text-green-700"
                  onClick={() => {
                    log.debug('Create new role requested', { name: debouncedSearch })
                    setIsOpen(false)
                  }}
                >
                  <span className="text-sm">
                    ¿No encuentras el rol? Solicita agregarlo: &quot;{debouncedSearch}&quot;
                  </span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mostrar rol seleccionado con badge de color */}
      {selectedRole && !isOpen && (
        <div className="mt-2 flex items-center gap-2">
          <span 
            className="inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium text-white"
            style={{ backgroundColor: getDepartmentColor(selectedRole.department) }}
          >
            {getDepartmentLabel(selectedRole.department)}
          </span>
          <span className="text-sm text-gray-700 font-medium">
            {selectedRole.name}
          </span>
          {selectedRole.isMainRole && (
            <span className="text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded-sm">
              Principal
            </span>
          )}
        </div>
      )}
    </div>
  )
}