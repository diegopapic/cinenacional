// src/components/admin/shared/PersonSearchInput.tsx
import { useState, useEffect, useRef } from 'react'
import { User, X, Plus, ArrowRight } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'
import { peopleService } from '@/services/people.service'
import toast from 'react-hot-toast'
import GenderSelectionModal from './GenderSelectionModal'
import NameSplitModal from './NameSplitModal'

interface PersonAlternativeName {
  id: number
  fullName: string
}

interface Person {
  id: number
  firstName?: string | null
  lastName?: string | null
  slug: string
  name?: string
  alternativeNames?: PersonAlternativeName[]
  matchedAlternativeName?: string | null
  matchedAlternativeNameId?: number | null
  activeYears?: { from: number; to: number } | null
  departments?: string[]
}

interface PersonSearchInputProps {
  value?: number
  alternativeNameId?: number | null
  initialPersonName?: string
  onChange: (
    personId: number, 
    personName?: string, 
    alternativeNameId?: number | null,
    alternativeName?: string | null
  ) => void
  placeholder?: string
  disabled?: boolean
  required?: boolean
  showAlternativeNames?: boolean
}

// Función para consultar el género de un nombre
async function checkFirstNameGender(firstName: string): Promise<{
  found: boolean
  gender: 'MALE' | 'FEMALE' | 'UNISEX' | null
}> {
  try {
    const response = await fetch(`/api/first-name-gender?name=${encodeURIComponent(firstName)}`)
    if (!response.ok) {
      throw new Error('Error consultando género')
    }
    return response.json()
  } catch (error) {
    console.error('Error consultando género del nombre:', error)
    return { found: false, gender: null }
  }
}

// Función para guardar un nombre con su género
async function saveFirstNameGender(firstName: string, gender: 'MALE' | 'FEMALE'): Promise<boolean> {
  console.log(`💾 Intentando guardar nombre "${firstName}" con género ${gender}...`)
  
  try {
    const response = await fetch('/api/first-name-gender', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: firstName, gender })
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      console.error('❌ Error en respuesta:', data)
      throw new Error(data.error || 'Error guardando género')
    }
    
    console.log(`✅ Nombre "${firstName}" guardado exitosamente en first_name_genders:`, data)
    return true
  } catch (error) {
    console.error('❌ Error guardando género del nombre:', error)
    throw error
  }
}

// Detectar si una palabra es inicial (A., J., O., etc.)
function isInitial(word: string): boolean {
  return /^[A-ZÁÉÍÓÚÑÜ]{1,2}\.$/i.test(word)
}

// Detectar si una palabra es apodo (entre comillas)
function isNickname(word: string): boolean {
  const quotePatterns = [
    /^".*"$/,
    /^'.*'$/,
    /^«.*»$/,
    /^".*"$/,
  ]
  return quotePatterns.some(pattern => pattern.test(word))
}

// Tokenizar nombre respetando apodos
function tokenizeName(fullName: string): string[] {
  const tokens: string[] = []
  let current = ''
  let inQuotes = false
  let quoteChar = ''
  
  for (let i = 0; i < fullName.length; i++) {
    const char = fullName[i]
    const prevChar = i > 0 ? fullName[i - 1] : ''
    
    if (!inQuotes && (char === '"' || char === "'" || char === '«' || char === '"')) {
      if (prevChar === ' ' || i === 0) {
        inQuotes = true
        quoteChar = char === '«' ? '»' : (char === '"' ? '"' : char)
        current += char
        continue
      }
    }
    
    if (inQuotes && (char === quoteChar || (quoteChar === '"' && char === '"'))) {
      current += char
      inQuotes = false
      quoteChar = ''
      continue
    }
    
    if (char === ' ' && !inQuotes) {
      if (current.trim()) {
        tokens.push(current.trim())
      }
      current = ''
    } else {
      current += char
    }
  }
  
  if (current.trim()) {
    tokens.push(current.trim())
  }
  
  return tokens
}

// Verificar si el nombre tiene apodos o iniciales
function hasNicknameOrInitial(fullName: string): boolean {
  const tokens = tokenizeName(fullName)
  return tokens.some(t => isNickname(t) || isInitial(t))
}

// Abreviaciones cortas para departamentos en resultados de búsqueda
const DEPT_SHORT: Record<string, { label: string; color: string }> = {
  'ACTUACION': { label: 'Act', color: '#b91c1c' },
  'DIRECCION': { label: 'Dir', color: '#dc2626' },
  'PRODUCCION': { label: 'Prod', color: '#059669' },
  'GUION': { label: 'Guión', color: '#7c3aed' },
  'FOTOGRAFIA': { label: 'Fot', color: '#2563eb' },
  'ARTE': { label: 'Arte', color: '#ea580c' },
  'MONTAJE': { label: 'Mont', color: '#be185d' },
  'SONIDO': { label: 'Son', color: '#0891b2' },
  'MUSICA': { label: 'Mús', color: '#7c2d12' },
  'VESTUARIO': { label: 'Vest', color: '#9333ea' },
  'MAQUILLAJE': { label: 'Maq', color: '#c2410c' },
  'EFECTOS': { label: 'VFX', color: '#0369a1' },
  'ANIMACION': { label: 'Anim', color: '#ca8a04' },
  'POSTPRODUCCION': { label: 'Post', color: '#4f46e5' },
  'OTROS': { label: 'Otros', color: '#6b7280' },
}

export default function PersonSearchInput({
  value,
  alternativeNameId,
  initialPersonName,
  onChange,
  placeholder = "Buscar persona...",
  disabled = false,
  required = false,
  showAlternativeNames = true
}: PersonSearchInputProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [people, setPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null)
  const [selectedAlternativeNameId, setSelectedAlternativeNameId] = useState<number | null>(alternativeNameId || null)
  
  // Estado para el modal de selección de género (caso con apodo/inicial)
  const [showGenderModal, setShowGenderModal] = useState(false)
  const [pendingPersonName, setPendingPersonName] = useState('')
  const [pendingFirstName, setPendingFirstName] = useState('')
  
  // Estado para el modal de separación de nombre (caso sin nombres conocidos)
  const [showNameSplitModal, setShowNameSplitModal] = useState(false)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const debouncedSearch = useDebounce(searchTerm, 300)

  // Cargar persona seleccionada si existe
  useEffect(() => {
    if (value && value > 0) {
      if (initialPersonName) {
        setSearchTerm(initialPersonName)
        return
      }
      
      peopleService.getById(value)
        .then((person: any) => {
          let displayName = person.name || `${person.firstName || ''} ${person.lastName || ''}`.trim()
          
          if (alternativeNameId && person.alternativeNames) {
            const altName = person.alternativeNames.find((an: any) => an.id === alternativeNameId)
            if (altName) {
              displayName = altName.fullName
            }
          }
          
          setSelectedPerson(person)
          setSearchTerm(displayName)
          setSelectedAlternativeNameId(alternativeNameId || null)
        })
        .catch(err => console.error('Error cargando persona:', err))
    }
  }, [value, alternativeNameId, initialPersonName])

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
        const response = await fetch(`/api/people?search=${encodeURIComponent(debouncedSearch)}&limit=10`)
        const result = await response.json()
        
        let peopleData: Person[] = []
        
        if (Array.isArray(result)) {
          peopleData = result
        } else if (result.data && Array.isArray(result.data)) {
          peopleData = result.data
        } else {
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

  // Seleccionar nombre principal de la persona
  const handleSelectPerson = (person: Person, useAlternativeName?: { id: number; name: string }) => {
    let displayName: string
    let altNameId: number | null = null
    let altName: string | null = null
    
    if (useAlternativeName) {
      displayName = useAlternativeName.name
      altNameId = useAlternativeName.id
      altName = useAlternativeName.name
    } else {
      displayName = formatPersonName(person)
    }
    
    setSelectedPerson(person)
    setSearchTerm(displayName)
    setSelectedAlternativeNameId(altNameId)
    onChange(person.id, displayName, altNameId, altName)
    setIsOpen(false)
  }

  const handleClear = () => {
    setSearchTerm('')
    setSelectedPerson(null)
    setSelectedAlternativeNameId(null)
    onChange(0, '', null, null)
    setIsOpen(false)
  }

  const formatPersonName = (person: Person) => {
    if (person.name) {
      return person.name
    }
    return `${person.firstName || ''} ${person.lastName || ''}`.trim() || 'Sin nombre'
  }

  // Función mejorada para crear nueva persona con detección de género
  const handleCreatePerson = async () => {
    if (!debouncedSearch || debouncedSearch.length < 2) {
      toast.error('El nombre debe tener al menos 2 caracteres')
      return
    }

    const fullName = debouncedSearch.trim()
    const tokens = tokenizeName(fullName)
    const firstToken = tokens[0]

    // Guardar datos para uso posterior
    setPendingPersonName(fullName)
    setPendingFirstName(firstToken)

    setCreating(true)
    setIsOpen(false)

    try {
      // 1. Consultar el género del primer token (si no es inicial ni apodo)
      if (!isInitial(firstToken) && !isNickname(firstToken)) {
        console.log(`🔍 Consultando género para "${firstToken}"...`)
        const genderResult = await checkFirstNameGender(firstToken)
        
        if (genderResult.found && genderResult.gender && genderResult.gender !== 'UNISEX') {
          // Género determinado automáticamente
          console.log(`✅ Género determinado automáticamente: ${genderResult.gender}`)
          await createPersonWithGender(fullName, genderResult.gender)
          return
        }
      }
      
      // 2. Si no se encontró el género, decidir qué modal mostrar
      setCreating(false)
      
      if (hasNicknameOrInitial(fullName)) {
        // Tiene apodo o inicial → el algoritmo puede separar bien, solo pedir género
        console.log(`❓ Nombre tiene apodo/inicial, mostrando modal de género`)
        setShowGenderModal(true)
      } else {
        // No tiene nada conocido → mostrar modal de separación + género
        console.log(`❓ No se reconoce ningún nombre, mostrando modal de separación`)
        setShowNameSplitModal(true)
      }
    } catch (error) {
      console.error('Error en proceso de creación:', error)
      toast.error('Error al procesar la solicitud')
      setCreating(false)
    }
  }

  // Función para crear persona con género ya determinado (separación automática por API)
  const createPersonWithGender = async (
    fullName: string, 
    gender: 'MALE' | 'FEMALE' | 'OTHER' | null
  ) => {
    try {
      console.log(`🚀 Creando persona "${fullName}" con género: ${gender || 'sin especificar'}`)
      
      const response = await fetch('/api/people', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: fullName,
          gender: gender
        })
      })

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(`Error ${response.status}: ${errorData || response.statusText}`)
      }

      const newPerson = await response.json()
      console.log('✅ Persona creada:', newPerson)
      
      toast.success(`Persona "${formatPersonName(newPerson)}" creada exitosamente`)
      
      handleSelectPerson(newPerson)
      
    } catch (error) {
      console.error('❌ Error creando persona:', error)
      toast.error(error instanceof Error ? error.message : 'Error al crear la persona')
    } finally {
      setCreating(false)
    }
  }

  // Función para crear persona con nombre y apellido ya separados
  const createPersonWithSplit = async (
    firstName: string,
    lastName: string,
    gender: 'MALE' | 'FEMALE' | 'OTHER' | null
  ) => {
    try {
      console.log(`🚀 Creando persona firstName="${firstName}", lastName="${lastName}", gender=${gender}`)
      
      const response = await fetch('/api/people', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          firstName,
          lastName,
          gender
        })
      })

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(`Error ${response.status}: ${errorData || response.statusText}`)
      }

      const newPerson = await response.json()
      console.log('✅ Persona creada:', newPerson)
      
      toast.success(`Persona "${formatPersonName(newPerson)}" creada exitosamente`)
      
      handleSelectPerson(newPerson)
      
    } catch (error) {
      console.error('❌ Error creando persona:', error)
      toast.error(error instanceof Error ? error.message : 'Error al crear la persona')
    } finally {
      setCreating(false)
    }
  }

  // Handler para cuando se selecciona género en el modal simple
  const handleGenderSelect = async (
    gender: 'MALE' | 'FEMALE' | 'OTHER' | null, 
    saveToDatabase: boolean
  ) => {
    console.log(`🎯 handleGenderSelect:`, { gender, saveToDatabase, pendingFirstName, pendingPersonName })
    
    setShowGenderModal(false)
    setCreating(true)

    try {
      // Si es MALE o FEMALE, guardar el nombre en first_name_genders
      if (saveToDatabase && (gender === 'MALE' || gender === 'FEMALE')) {
        console.log(`💾 Guardando "${pendingFirstName}" como ${gender}...`)
        
        try {
          await saveFirstNameGender(pendingFirstName, gender)
          toast.success(`El nombre "${pendingFirstName}" se guardó como ${gender === 'MALE' ? 'masculino' : 'femenino'}`)
        } catch (saveError) {
          console.error('⚠️ Error guardando en first_name_genders:', saveError)
          toast.error(`No se pudo guardar el nombre "${pendingFirstName}" en la base de datos de nombres`)
        }
      }

      // Crear la persona con el género seleccionado (la API separa automáticamente)
      await createPersonWithGender(pendingPersonName, gender)
      
    } catch (error) {
      console.error('Error en selección de género:', error)
      toast.error('Error al procesar la selección')
      setCreating(false)
    }
  }

  // Handler para cuando se confirma el modal de separación
  const handleNameSplitConfirm = async (
    firstName: string,
    lastName: string,
    gender: 'MALE' | 'FEMALE' | 'OTHER' | null,
    saveToDatabase: boolean
  ) => {
    console.log(`🎯 handleNameSplitConfirm:`, { firstName, lastName, gender, saveToDatabase })
    
    setShowNameSplitModal(false)
    setCreating(true)

    try {
      // Si es MALE o FEMALE, guardar CADA PALABRA del nombre en first_name_genders
      if (saveToDatabase && (gender === 'MALE' || gender === 'FEMALE')) {
        const firstNameWords = tokenizeName(firstName).filter(w => !isInitial(w) && !isNickname(w))
        
        console.log(`💾 Guardando ${firstNameWords.length} nombre(s): ${firstNameWords.join(', ')}`)
        
        for (const word of firstNameWords) {
          try {
            await saveFirstNameGender(word, gender)
            console.log(`✅ "${word}" guardado como ${gender}`)
          } catch (saveError) {
            // Puede fallar si ya existe, ignorar
            console.log(`⚠️ "${word}" ya existe o error:`, saveError)
          }
        }
        
        if (firstNameWords.length > 0) {
          toast.success(`Nombre(s) guardado(s): ${firstNameWords.join(', ')}`)
        }
      }

      // Crear la persona con firstName y lastName ya separados
      await createPersonWithSplit(firstName, lastName, gender)
      
    } catch (error) {
      console.error('Error en confirmación de nombre:', error)
      toast.error('Error al procesar la solicitud')
      setCreating(false)
    }
  }

  // Handler para cancelar el modal de género
  const handleGenderCancel = () => {
    setShowGenderModal(false)
    setPendingPersonName('')
    setPendingFirstName('')
    setIsOpen(true)
  }

  // Handler para cancelar el modal de separación
  const handleNameSplitCancel = () => {
    setShowNameSplitModal(false)
    setPendingPersonName('')
    setPendingFirstName('')
    setIsOpen(true)
  }

  // Renderizar un resultado de persona con sus nombres alternativos
  const renderPersonResult = (person: Person) => {
    const mainName = formatPersonName(person)
    const hasMatchedAlternative = person.matchedAlternativeName && person.matchedAlternativeNameId

    return (
      <div key={person.id} className="border-b border-gray-100 last:border-b-0">
        {/* Nombre principal */}
        <button
          type="button"
          onClick={() => handleSelectPerson(person)}
          className={`w-full text-left px-3 py-2 hover:bg-blue-50 flex items-center space-x-3 transition-colors ${
            hasMatchedAlternative ? 'bg-gray-50' : ''
          }`}
        >
          <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-gray-900 truncate">
              {mainName}
            </div>
            <div className="text-xs text-gray-500 flex items-center gap-1.5 flex-wrap">
              <span>ID: {person.id} • {person.slug}</span>
              {person.activeYears && (
                <>
                  <span className="text-gray-300">|</span>
                  <span className="text-gray-600 font-medium tabular-nums">
                    {person.activeYears.from === person.activeYears.to
                      ? person.activeYears.from
                      : `${person.activeYears.from}–${person.activeYears.to}`}
                  </span>
                </>
              )}
            </div>
            {person.departments && person.departments.length > 0 && (
              <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                {person.departments.map(dept => {
                  const info = DEPT_SHORT[dept] || { label: dept, color: '#6b7280' }
                  return (
                    <span
                      key={dept}
                      className="inline-block px-1.5 py-0 text-[10px] leading-4 font-medium rounded-sm text-white"
                      style={{ backgroundColor: info.color }}
                    >
                      {info.label}
                    </span>
                  )
                })}
              </div>
            )}
          </div>
        </button>
        
        {/* Nombre alternativo que hizo match (si aplica) */}
        {hasMatchedAlternative && (
          <button
            type="button"
            onClick={() => handleSelectPerson(person, { 
              id: person.matchedAlternativeNameId!, 
              name: person.matchedAlternativeName! 
            })}
            className="w-full text-left px-3 py-2 pl-10 hover:bg-yellow-50 flex items-center space-x-2 transition-colors bg-yellow-25"
          >
            <ArrowRight className="h-3 w-3 text-yellow-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm text-yellow-800 truncate">
                <span className="font-medium">{person.matchedAlternativeName}</span>
                <span className="text-yellow-600 ml-2">→ {mainName}</span>
              </div>
              <div className="text-xs text-yellow-600">
                Nombre alternativo
              </div>
            </div>
          </button>
        )}
        
        {/* Otros nombres alternativos */}
        {showAlternativeNames && person.alternativeNames && person.alternativeNames.length > 0 && (
          <>
            {person.alternativeNames
              .filter(alt => alt.id !== person.matchedAlternativeNameId)
              .map(alt => (
                <button
                  key={alt.id}
                  type="button"
                  onClick={() => handleSelectPerson(person, { id: alt.id, name: alt.fullName })}
                  className="w-full text-left px-3 py-1.5 pl-10 hover:bg-gray-50 flex items-center space-x-2 transition-colors text-sm"
                >
                  <ArrowRight className="h-3 w-3 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-gray-600 truncate">
                      {alt.fullName}
                      <span className="text-gray-400 ml-2">→ {mainName}</span>
                    </span>
                  </div>
                </button>
              ))
            }
          </>
        )}
      </div>
    )
  }

  return (
    <>
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

        {/* Indicador de nombre alternativo seleccionado */}
        {selectedAlternativeNameId && selectedPerson && (
          <div className="mt-1 text-xs text-yellow-700 bg-yellow-50 px-2 py-1 rounded flex items-center">
            <ArrowRight className="h-3 w-3 mr-1" />
            <span>Usando nombre alternativo de: {formatPersonName(selectedPerson)}</span>
          </div>
        )}

        {/* Dropdown de resultados */}
        {isOpen && !disabled && !creating && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-80 overflow-auto">
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
                  {people.map(person => renderPersonResult(person))}
                </div>
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

      {/* Modal de selección de género (para casos con apodo/inicial) */}
      <GenderSelectionModal
        isOpen={showGenderModal}
        firstName={pendingFirstName}
        onSelect={handleGenderSelect}
        onCancel={handleGenderCancel}
      />

      {/* Modal de separación de nombre (para casos sin nombres conocidos) */}
      <NameSplitModal
        isOpen={showNameSplitModal}
        fullName={pendingPersonName}
        onConfirm={handleNameSplitConfirm}
        onCancel={handleNameSplitCancel}
      />
    </>
  )
}