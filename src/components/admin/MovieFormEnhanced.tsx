// src/components/admin/MovieFormEnhanced.tsx
'use client'

import { useState, useEffect } from 'react'
import { 
  Plus, 
  X, 
  Search, 
  UserPlus,
  Building,
  Globe,
  Languages,
  Hash,
  Trash2
} from 'lucide-react'

interface MovieFormEnhancedProps {
  onGenresChange: (genres: number[]) => void
  onCastChange: (cast: any[]) => void
  onCrewChange: (crew: any[]) => void
  onCountriesChange: (countries: number[]) => void
  onLanguagesChange: (languages: number[]) => void
  onProductionCompaniesChange: (companies: number[]) => void
  onDistributionCompaniesChange: (companies: number[]) => void
  initialData?: {
    genres?: any[]
    cast?: any[]
    crew?: any[]
    countries?: any[]
    languages?: any[]
    productionCompanies?: any[]
    distributionCompanies?: any[]
  }
}

export default function MovieFormEnhanced({
  onGenresChange,
  onCastChange,
  onCrewChange,
  onCountriesChange,
  onLanguagesChange,
  onProductionCompaniesChange,
  onDistributionCompaniesChange,
  initialData
}: MovieFormEnhancedProps) {
  // Estados para las listas disponibles
  const [availableGenres, setAvailableGenres] = useState([])
  const [availablePeople, setAvailablePeople] = useState([])
  const [availableCountries, setAvailableCountries] = useState([])
  const [availableLanguages, setAvailableLanguages] = useState([])
  const [availableProductionCompanies, setAvailableProductionCompanies] = useState([])
  const [availableDistributionCompanies, setAvailableDistributionCompanies] = useState([])

  // Estados para las selecciones
  const [selectedGenres, setSelectedGenres] = useState<number[]>([])
  const [cast, setCast] = useState<any[]>([])
  const [crew, setCrew] = useState<any[]>([])
  const [selectedCountries, setSelectedCountries] = useState<number[]>([])
  const [selectedLanguages, setSelectedLanguages] = useState<number[]>([])
  const [selectedProductionCompanies, setSelectedProductionCompanies] = useState<number[]>([])
  const [selectedDistributionCompanies, setSelectedDistributionCompanies] = useState<number[]>([])

  // Estados para búsqueda
  const [personSearch, setPersonSearch] = useState('')
  const [showPersonSearch, setShowPersonSearch] = useState(false)
  const [addingType, setAddingType] = useState<'cast' | 'crew' | null>(null)

  // Estado para nuevo actor/crew
  const [newPerson, setNewPerson] = useState({
    personId: 0,
    characterName: '',
    role: '',
    department: '',
    billingOrder: 0
  })

  // Cargar datos iniciales
  useEffect(() => {
    fetchInitialData()
  }, [])

  // Inicializar con datos existentes
  useEffect(() => {
    if (initialData) {
      if (initialData.genres) {
        setSelectedGenres(initialData.genres.map(g => g.genreId))
      }
      if (initialData.cast) {
        setCast(initialData.cast)
      }
      if (initialData.crew) {
        setCrew(initialData.crew)
      }
      if (initialData.countries) {
        setSelectedCountries(initialData.countries.map(c => c.countryId))
      }
      if (initialData.languages) {
        setSelectedLanguages(initialData.languages.map(l => l.languageId))
      }
      if (initialData.productionCompanies) {
        setSelectedProductionCompanies(initialData.productionCompanies.map(c => c.companyId))
      }
      if (initialData.distributionCompanies) {
        setSelectedDistributionCompanies(initialData.distributionCompanies.map(c => c.companyId))
      }
    }
  }, [initialData])

  // Notificar cambios al componente padre
  useEffect(() => {
    onGenresChange(selectedGenres)
  }, [selectedGenres])

  useEffect(() => {
    onCastChange(cast)
  }, [cast])

  useEffect(() => {
    onCrewChange(crew)
  }, [crew])

  useEffect(() => {
    onCountriesChange(selectedCountries)
  }, [selectedCountries])

  useEffect(() => {
    onLanguagesChange(selectedLanguages)
  }, [selectedLanguages])

  useEffect(() => {
    onProductionCompaniesChange(selectedProductionCompanies)
  }, [selectedProductionCompanies])

  useEffect(() => {
    onDistributionCompaniesChange(selectedDistributionCompanies)
  }, [selectedDistributionCompanies])

  // Cargar datos de la API
  const fetchInitialData = async () => {
    try {
      const [genres, countries, languages, prodCompanies, distCompanies] = await Promise.all([
        fetch('/api/genres').then(r => r.json()),
        fetch('/api/countries').then(r => r.json()),
        fetch('/api/languages').then(r => r.json()),
        fetch('/api/companies/production').then(r => r.json()),
        fetch('/api/companies/distribution').then(r => r.json())
      ])

      setAvailableGenres(genres)
      setAvailableCountries(countries)
      setAvailableLanguages(languages)
      setAvailableProductionCompanies(prodCompanies)
      setAvailableDistributionCompanies(distCompanies)
    } catch (error) {
      console.error('Error loading initial data:', error)
    }
  }

  // Buscar personas
  const searchPeople = async (search: string) => {
    if (search.length < 2) return
    
    try {
      const response = await fetch(`/api/people?search=${encodeURIComponent(search)}&limit=10`)
      const data = await response.json()
      setAvailablePeople(data)
    } catch (error) {
      console.error('Error searching people:', error)
    }
  }

  // Agregar persona al cast o crew
  const addPerson = () => {
    if (!newPerson.personId) return

    const selectedPerson = availablePeople.find((p: any) => p.id === newPerson.personId)
    if (!selectedPerson) return

    if (addingType === 'cast') {
      setCast([...cast, {
        personId: newPerson.personId,
        person: selectedPerson,
        characterName: newPerson.characterName,
        billingOrder: cast.length + 1,
        isPrincipal: cast.length < 5
      }])
    } else if (addingType === 'crew') {
      setCrew([...crew, {
        personId: newPerson.personId,
        person: selectedPerson,
        role: newPerson.role,
        department: newPerson.department,
        billingOrder: crew.filter(c => c.role === newPerson.role).length + 1
      }])
    }

    // Limpiar formulario
    setNewPerson({
      personId: 0,
      characterName: '',
      role: '',
      department: '',
      billingOrder: 0
    })
    setShowPersonSearch(false)
    setAddingType(null)
    setPersonSearch('')
  }

  // Crear nueva persona
  const createNewPerson = async () => {
    if (!personSearch) return

    try {
      const response = await fetch('/api/people', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: personSearch })
      })

      if (response.ok) {
        const newPersonData = await response.json()
        setAvailablePeople([newPersonData])
        setNewPerson({ ...newPerson, personId: newPersonData.id })
      }
    } catch (error) {
      console.error('Error creating person:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Géneros */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
          <Hash className="w-5 h-5" />
          Géneros
        </h3>
        <div className="flex flex-wrap gap-2">
          {availableGenres.map((genre: any) => (
            <label
              key={genre.id}
              className="inline-flex items-center"
            >
              <input
                type="checkbox"
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                checked={selectedGenres.includes(genre.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedGenres([...selectedGenres, genre.id])
                  } else {
                    setSelectedGenres(selectedGenres.filter(id => id !== genre.id))
                  }
                }}
              />
              <span className="ml-2 text-sm text-gray-700">{genre.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Cast */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
          <UserPlus className="w-5 h-5" />
          Reparto
        </h3>
        
        {cast.length > 0 && (
          <div className="mb-4 space-y-2">
            {cast.map((member, index) => (
              <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <span className="font-medium">{member.person.name}</span>
                  {member.characterName && (
                    <span className="text-gray-500"> como {member.characterName}</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setCast(cast.filter((_, i) => i !== index))}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            setAddingType('cast')
            setShowPersonSearch(true)
          }}
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <Plus className="w-4 h-4" />
          Agregar Actor/Actriz
        </button>
      </div>

      {/* Crew */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
          <UserPlus className="w-5 h-5" />
          Equipo Técnico
        </h3>
        
        {crew.length > 0 && (
          <div className="mb-4 space-y-2">
            {crew.map((member, index) => (
              <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <span className="font-medium">{member.person.name}</span>
                  <span className="text-gray-500"> - {member.role}</span>
                  {member.department && (
                    <span className="text-gray-400"> ({member.department})</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setCrew(crew.filter((_, i) => i !== index))}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            setAddingType('crew')
            setShowPersonSearch(true)
          }}
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <Plus className="w-4 h-4" />
          Agregar Miembro del Equipo
        </button>
      </div>

      {/* Países */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
          <Globe className="w-5 h-5" />
          Países Coproductores
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {availableCountries.map((country: any) => (
            <label
              key={country.id}
              className="inline-flex items-center"
            >
              <input
                type="checkbox"
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                checked={selectedCountries.includes(country.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedCountries([...selectedCountries, country.id])
                  } else {
                    setSelectedCountries(selectedCountries.filter(id => id !== country.id))
                  }
                }}
              />
              <span className="ml-2 text-sm text-gray-700">{country.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Idiomas */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
          <Languages className="w-5 h-5" />
          Idiomas
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {availableLanguages.map((language: any) => (
            <label
              key={language.id}
              className="inline-flex items-center"
            >
              <input
                type="checkbox"
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                checked={selectedLanguages.includes(language.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedLanguages([...selectedLanguages, language.id])
                  } else {
                    setSelectedLanguages(selectedLanguages.filter(id => id !== language.id))
                  }
                }}
              />
              <span className="ml-2 text-sm text-gray-700">{language.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Productoras */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
          <Building className="w-5 h-5" />
          Productoras
        </h3>
        <select
          multiple
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={selectedProductionCompanies.map(String)}
          onChange={(e) => {
            const selected = Array.from(e.target.selectedOptions, option => parseInt(option.value))
            setSelectedProductionCompanies(selected)
          }}
        >
          {availableProductionCompanies.map((company: any) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </select>
        <p className="mt-1 text-sm text-gray-500">
          Mantén presionado Ctrl/Cmd para seleccionar múltiples opciones
        </p>
      </div>

      {/* Distribuidoras */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
          <Building className="w-5 h-5" />
          Distribuidoras
        </h3>
        <select
          multiple
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={selectedDistributionCompanies.map(String)}
          onChange={(e) => {
            const selected = Array.from(e.target.selectedOptions, option => parseInt(option.value))
            setSelectedDistributionCompanies(selected)
          }}
        >
          {availableDistributionCompanies.map((company: any) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </select>
        <p className="mt-1 text-sm text-gray-500">
          Mantén presionado Ctrl/Cmd para seleccionar múltiples opciones
        </p>
      </div>

      {/* Modal de búsqueda de personas */}
      {showPersonSearch && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {addingType === 'cast' ? 'Agregar Actor/Actriz' : 'Agregar Miembro del Equipo'}
            </h3>

            <div className="space-y-4">
              {/* Búsqueda de persona */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Buscar Persona
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={personSearch}
                    onChange={(e) => {
                      setPersonSearch(e.target.value)
                      searchPeople(e.target.value)
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Escriba el nombre..."
                  />
                  <Search className="absolute right-3 top-2.5 w-5 h-5 text-gray-400" />
                </div>
                
                {availablePeople.length > 0 && (
                  <div className="mt-2 border border-gray-200 rounded-lg max-h-40 overflow-y-auto">
                    {availablePeople.map((person: any) => (
                      <button
                        key={person.id}
                        type="button"
                        onClick={() => setNewPerson({ ...newPerson, personId: person.id })}
                        className={`w-full text-left px-3 py-2 hover:bg-gray-50 ${
                          newPerson.personId === person.id ? 'bg-blue-50' : ''
                        }`}
                      >
                        {person.name}
                      </button>
                    ))}
                  </div>
                )}

                {personSearch && availablePeople.length === 0 && (
                  <button
                    type="button"
                    onClick={createNewPerson}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                  >
                    Crear nueva persona: "{personSearch}"
                  </button>
                )}
              </div>

              {/* Campos específicos según el tipo */}
              {addingType === 'cast' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Personaje
                  </label>
                  <input
                    type="text"
                    value={newPerson.characterName}
                    onChange={(e) => setNewPerson({ ...newPerson, characterName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nombre del personaje"
                  />
                </div>
              )}

              {addingType === 'crew' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Rol
                    </label>
                    <select
                      value={newPerson.role}
                      onChange={(e) => setNewPerson({ ...newPerson, role: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Seleccionar...</option>
                      <option value="Director">Director</option>
                      <option value="Guionista">Guionista</option>
                      <option value="Productor">Productor</option>
                      <option value="Productor Ejecutivo">Productor Ejecutivo</option>
                      <option value="Director de Fotografía">Director de Fotografía</option>
                      <option value="Editor">Editor</option>
                      <option value="Compositor">Compositor</option>
                      <option value="Director de Arte">Director de Arte</option>
                      <option value="Diseñador de Vestuario">Diseñador de Vestuario</option>
                      <option value="Maquillador">Maquillador</option>
                      <option value="Sonidista">Sonidista</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Departamento
                    </label>
                    <select
                      value={newPerson.department}
                      onChange={(e) => setNewPerson({ ...newPerson, department: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Seleccionar...</option>
                      <option value="Dirección">Dirección</option>
                      <option value="Guión">Guión</option>
                      <option value="Producción">Producción</option>
                      <option value="Fotografía">Fotografía</option>
                      <option value="Montaje">Montaje</option>
                      <option value="Música">Música</option>
                      <option value="Arte">Arte</option>
                      <option value="Vestuario">Vestuario</option>
                      <option value="Maquillaje">Maquillaje</option>
                      <option value="Sonido">Sonido</option>
                      <option value="Efectos Especiales">Efectos Especiales</option>
                    </select>
                  </div>
                </>
              )}
            </div>

            {/* Botones de acción */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowPersonSearch(false)
                  setAddingType(null)
                  setPersonSearch('')
                  setNewPerson({
                    personId: 0,
                    characterName: '',
                    role: '',
                    department: '',
                    billingOrder: 0
                  })
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={addPerson}
                disabled={!newPerson.personId || (addingType === 'crew' && !newPerson.role)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}