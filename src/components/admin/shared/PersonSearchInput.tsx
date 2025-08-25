// components/admin/shared/PersonSearchInput.tsx
import { useState, useEffect, useRef } from 'react'
import { Search, User, X, Plus } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'
import { peopleService } from '@/services/people.service'
import toast from 'react-hot-toast' // Agregar import de toast

interface Person {
  id: number
  firstName?: string | null
  lastName?: string | null
  slug: string
  name?: string  // Algunos endpoints retornan name directamente
}

interface PersonSearchInputProps {
  value?: number
  onChange: (personId: number, personName?: string) => void
  placeholder?: string
  disabled?: boolean
  required?: boolean
}

export default function PersonSearchInput({
  value,
  onChange,
  placeholder = "Buscar persona...",
  disabled = false,
  required = false
}: PersonSearchInputProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [people, setPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false) // Nuevo estado para crear persona
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const debouncedSearch = useDebounce(searchTerm, 300)

  // Cargar persona seleccionada si existe
  useEffect(() => {
    if (value && value > 0) {
      peopleService.getById(value)
        .then((person: any) => {
          const fullName = person.name || `${person.firstName || ''} ${person.lastName || ''}`.trim()
          setSelectedPerson(person)
          setSearchTerm(fullName)
        })
        .catch(err => console.error('Error cargando persona:', err))
    }
  }, [value])

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Buscar personas
  useEffect(() => {
    const searchPeople = async () => {
      if (!debouncedSearch || debouncedSearch.length < 2) {
        setPeople([])
        return
      }

      setLoading(true)
      try {
        // IMPORTANTE: Usar limit=10 para activar la búsqueda SQL concatenada
        const response = await fetch(`/api/people?search=${encodeURIComponent(debouncedSearch)}&limit=10`)
        const result = await response.json()
        
        console.log('🔍 Search response:', result)
        
        // El endpoint devuelve directamente un array para búsquedas con limit <= 10
        let peopleData: Person[] = []
        
        if (Array.isArray(result)) {
          // Si es un array directo (búsqueda autocomplete)
          peopleData = result
        } else if (result.data && Array.isArray(result.data)) {
          // Si viene envuelto en { data: [...] } (búsqueda paginada)
          peopleData = result.data
        } else {
          console.warn('Formato de respuesta inesperado:', result)
          peopleData = []
        }
        
        setPeople(peopleData)
      } catch (error) {
        console.error('Error buscando personas:', error)
        setPeople([])
      } finally {
        setLoading(false)
      }
    }

    if (isOpen) {
      searchPeople()
    }
  }, [debouncedSearch, isOpen])

  const handleSelectPerson = (person: Person) => {
    const fullName = formatPersonName(person)
    setSelectedPerson(person)
    setSearchTerm(fullName)
    onChange(person.id, fullName)
    setIsOpen(false)
  }

  const handleClear = () => {
    setSearchTerm('')
    setSelectedPerson(null)
    onChange(0, '')
    setIsOpen(false)
  }

  const formatPersonName = (person: Person) => {
    // Si tiene name directamente, usarlo
    if (person.name) {
      return person.name
    }
    // Si no, construir desde firstName y lastName
    return `${person.firstName || ''} ${person.lastName || ''}`.trim() || 'Sin nombre'
  }

  // Función mejorada para crear nueva persona
  const handleCreatePerson = async () => {
    if (!debouncedSearch || debouncedSearch.length < 2) {
      toast.error('El nombre debe tener al menos 2 caracteres')
      return
    }

    setCreating(true)
    
    try {
      console.log('🚀 Creando nueva persona:', debouncedSearch)
      
      const response = await fetch('/api/people', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ 
          name: debouncedSearch.trim() 
        })
      })

      if (!response.ok) {
        const errorData = await response.text()
        console.error('❌ Error response:', errorData)
        throw new Error(`Error ${response.status}: ${errorData || response.statusText}`)
      }

      const newPerson = await response.json()
      console.log('✅ Persona creada:', newPerson)
      
      // Mostrar toast de éxito
      toast.success(`Persona "${formatPersonName(newPerson)}" creada exitosamente`)
      
      // Seleccionar la nueva persona
      handleSelectPerson(newPerson)
      
    } catch (error) {
      console.error('❌ Error creando persona:', error)
      toast.error(error instanceof Error ? error.message : 'Error al crear la persona')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value)
            if (!isOpen) setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled || creating}
          required={required}
          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        {searchTerm && !disabled && !creating && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {creating && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          </div>
        )}
      </div>

      {/* Dropdown de resultados */}
      {isOpen && !disabled && !creating && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
          {loading ? (
            <div className="p-3 text-center text-gray-500">
              <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
              <span className="ml-2">Buscando personas...</span>
            </div>
          ) : debouncedSearch.length < 2 ? (
            <div className="p-3 text-center text-gray-500">
              Escribe al menos 2 caracteres para buscar
            </div>
          ) : !Array.isArray(people) || people.length === 0 ? (
            <>
              <div className="p-3 text-center text-gray-500">
                No se encontraron personas con "{debouncedSearch}"
              </div>
              {/* Opción para crear nueva persona cuando no hay resultados */}
              <div className="border-t border-gray-200">
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-green-50 flex items-center space-x-2 text-green-700 transition-colors"
                  onClick={handleCreatePerson}
                >
                  <Plus className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    Crear nueva persona: "{debouncedSearch}"
                  </span>
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="py-1">
                {people.map(person => (
                  <button
                    key={person.id}
                    type="button"
                    onClick={() => handleSelectPerson(person)}
                    className="w-full text-left px-3 py-2 hover:bg-blue-50 flex items-center space-x-3 transition-colors"
                  >
                    <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {formatPersonName(person)}
                      </div>
                      <div className="text-xs text-gray-500">
                        ID: {person.id} • {person.slug}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              {/* También mostrar opción de crear si no encontró exactamente lo que busca */}
              <div className="border-t border-gray-200">
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-green-50 flex items-center space-x-2 text-green-700 text-sm transition-colors"
                  onClick={handleCreatePerson}
                >
                  <Plus className="h-4 w-4" />
                  <span>¿No encuentras a quien buscas? Crear: "{debouncedSearch}"</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}