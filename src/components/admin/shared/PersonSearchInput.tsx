// components/admin/shared/PersonSearchInput.tsx
import { useState, useEffect, useRef } from 'react'
import { Search, User, X, Plus } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'
import { peopleService } from '@/services/people.service'

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

  // Buscar personas - CORREGIDO
  useEffect(() => {
    const searchPeople = async () => {
      if (!debouncedSearch || debouncedSearch.length < 2) {
        setPeople([])
        return
      }

      setLoading(true)
      try {
        // Usar el endpoint directo para búsqueda
        const response = await fetch(`/api/people?search=${encodeURIComponent(debouncedSearch)}&limit=20`)
        const result = await response.json()
        
        console.log('🔍 Search response:', result)
        
        // Manejar diferentes formatos de respuesta
        let peopleData: Person[] = []
        
        if (Array.isArray(result)) {
          // Si es un array directo
          peopleData = result
        } else if (result.data && Array.isArray(result.data)) {
          // Si viene envuelto en { data: [...] }
          peopleData = result.data
        } else if (result.people && Array.isArray(result.people)) {
          // Si viene como { people: [...] }
          peopleData = result.people
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
          disabled={disabled}
          required={required}
          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
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
            <div className="p-3 text-center text-gray-500">
              No se encontraron personas con "{debouncedSearch}"
            </div>
          ) : (
            <div className="py-1">
              {people.map(person => (
                <button
                  key={person.id}
                  type="button"
                  onClick={() => handleSelectPerson(person)}
                  className="w-full text-left px-3 py-2 hover:bg-blue-50 flex items-center space-x-3"
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
          )}

          {/* Opción para crear nueva persona */}
          {!loading && debouncedSearch.length >= 2 && people.length === 0 && (
            <div className="border-t border-gray-200">
              <button
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-green-50 flex items-center space-x-2 text-green-700"
                onClick={() => {
                  // Aquí podrías abrir un modal para crear nueva persona
                  console.log('Crear nueva persona:', debouncedSearch)
                  setIsOpen(false)
                }}
              >
                <Plus className="h-4 w-4" />
                <span className="text-sm">Crear nueva persona: "{debouncedSearch}"</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}