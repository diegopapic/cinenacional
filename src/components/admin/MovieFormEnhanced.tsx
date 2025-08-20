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
  Hash,
  Trash2,
  Tag
} from 'lucide-react'
import ScreeningVenueSelector from './ScreeningVenueSelector'


interface MovieFormEnhancedProps {
  onGenresChange: (genres: number[]) => void
  onCastChange: (cast: any[]) => void
  onCrewChange: (crew: any[]) => void
  onCountriesChange: (countries: number[]) => void
  onProductionCompaniesChange: (companies: number[]) => void
  onDistributionCompaniesChange: (companies: number[]) => void
  onScreeningVenuesChange: (venues: any[]) => void
  onThemesChange?: (themes: number[]) => void
  initialData?: {
    genres?: any[]
    cast?: any[]
    crew?: any[]
    countries?: any[]
    productionCompanies?: any[]
    distributionCompanies?: any[]
    themes?: any[]
    screeningVenues?: any[]
  }
  showOnlyBasicInfo?: boolean
  showOnlyCast?: boolean
  showOnlyCrew?: boolean
  showOnlyCompanies?: boolean
}

export default function MovieFormEnhanced({
  onGenresChange,
  onCastChange,
  onCrewChange,
  onCountriesChange,
  onProductionCompaniesChange,
  onDistributionCompaniesChange,
  onScreeningVenuesChange,
  onThemesChange = () => { },
  initialData,
  showOnlyBasicInfo = false,
  showOnlyCast = false,
  showOnlyCrew = false,
  showOnlyCompanies = false
}: MovieFormEnhancedProps) {
  // Estados para las listas disponibles
  const [availableGenres, setAvailableGenres] = useState<any[]>([])
  const [availablePeople, setAvailablePeople] = useState<any[]>([])
  const [availableCountries, setAvailableCountries] = useState<any[]>([])
  const [availableProductionCompanies, setAvailableProductionCompanies] = useState<any[]>([])
  const [availableDistributionCompanies, setAvailableDistributionCompanies] = useState<any[]>([])
  const [availableThemes, setAvailableThemes] = useState<any[]>([])

  // Estados para las selecciones
  const [selectedGenres, setSelectedGenres] = useState<number[]>([])
  const [cast, setCast] = useState<any[]>([])
  const [crew, setCrew] = useState<any[]>([])
  const [selectedCountries, setSelectedCountries] = useState<number[]>([])
  const [selectedProductionCompanies, setSelectedProductionCompanies] = useState<number[]>([])
  const [selectedDistributionCompanies, setSelectedDistributionCompanies] = useState<number[]>([])
  const [selectedThemes, setSelectedThemes] = useState<number[]>([])
  const [screeningVenues, setScreeningVenues] = useState<any[]>([])

  // Estados para búsqueda
  const [personSearch, setPersonSearch] = useState('')
  const [themeSearch, setThemeSearch] = useState('')
  const [countrySearch, setCountrySearch] = useState('')
  const [showPersonSearch, setShowPersonSearch] = useState(false)
  const [addingType, setAddingType] = useState<'cast' | 'crew' | null>(null)

  const [availableRoles, setAvailableRoles] = useState<any[]>([])

  const [dataReady, setDataReady] = useState(false)

  // Estado para nuevo actor/crew
  const [newPerson, setNewPerson] = useState({
    personId: 0,
    characterName: '',
    roleId: 0,
    billingOrder: 0
  })

  const [isInitialized, setIsInitialized] = useState(false)

  // Cargar datos iniciales
  useEffect(() => {
    fetchInitialData()
  }, [])

  useEffect(() => {
    setIsInitialized(false)  // Resetear cuando cambia initialData
  }, [initialData])

  // Inicializar con datos existentes - CORREGIDO
  useEffect(() => {
    if (initialData && !isInitialized) {
      if (initialData.genres) {
        const genreIds = initialData.genres.map(g => g.genreId || g.id)
        setSelectedGenres(genreIds)
      }

      if (initialData.cast) {
        setCast(initialData.cast)
      }

      if (initialData.crew) {
        console.log('🎬 Crew data received:', initialData.crew)
        setCrew(initialData.crew)
      }

      if (initialData.screeningVenues) {
        setScreeningVenues(initialData.screeningVenues)
      }

      // CORRECCIÓN IMPORTANTE: Manejar correctamente los países
      if (initialData.countries) {
        const countryIds = initialData.countries.map(c => {
          // Manejar diferentes estructuras posibles
          if (typeof c === 'number') return c
          if (c.countryId) return c.countryId  // Si viene de movieCountries
          if (c.id) return c.id
          if (c.country && c.country.id) return c.country.id
          return null
        }).filter(id => id !== null)

        setSelectedCountries(countryIds)
      }

      if (initialData.productionCompanies) {
        const companyIds = initialData.productionCompanies.map(c => c.companyId || c.id || c.company?.id)
        setSelectedProductionCompanies(companyIds)
      }

      if (initialData.distributionCompanies) {
        const companyIds = initialData.distributionCompanies.map(c => c.companyId || c.id || c.company?.id)
        setSelectedDistributionCompanies(companyIds)
      }

      if (initialData.themes) {
        const themeIds = initialData.themes.map(t => t.themeId || t.id)
        setSelectedThemes(themeIds)
      }

      setIsInitialized(true)
    }
  }, [initialData, isInitialized])

  // Notificar cambios al componente padre
  useEffect(() => {
    if (isInitialized) {
      onGenresChange(selectedGenres)
    }
  }, [selectedGenres, onGenresChange, isInitialized])

  useEffect(() => {
    if (isInitialized) {
      onScreeningVenuesChange(screeningVenues)
    }
  }, [screeningVenues, onScreeningVenuesChange, isInitialized])

  useEffect(() => {
    if (isInitialized) {
      onCastChange(cast)
    }
  }, [cast, onCastChange, isInitialized])

  useEffect(() => {
    if (isInitialized) {
      onCrewChange(crew)
    }
  }, [crew, onCrewChange, isInitialized])

  useEffect(() => {
    if (isInitialized) {
      onCountriesChange(selectedCountries)
    }
  }, [selectedCountries, onCountriesChange, isInitialized])

  useEffect(() => {
    if (isInitialized) {
      onProductionCompaniesChange(selectedProductionCompanies)
    }
  }, [selectedProductionCompanies, onProductionCompaniesChange, isInitialized])

  useEffect(() => {
    if (isInitialized) {
      onDistributionCompaniesChange(selectedDistributionCompanies)
    }
  }, [selectedDistributionCompanies, onDistributionCompaniesChange, isInitialized])

  useEffect(() => {
    if (isInitialized) {
      onThemesChange(selectedThemes)
    }
  }, [selectedThemes, onThemesChange, isInitialized])

  // Cargar datos de la API
  const fetchInitialData = async () => {
    try {
      const [genresRes, countriesRes, prodCompaniesRes, distCompaniesRes, themesRes, rolesRes] = await Promise.all([
        fetch('/api/genres'),
        fetch('/api/countries'),
        fetch('/api/companies/production'),
        fetch('/api/companies/distribution'),
        fetch('/api/themes').catch(() => ({ ok: false, json: () => [] })),
        fetch('/api/roles?limit=100')
      ])

      // Verificar que todas las respuestas sean OK
      if (!genresRes.ok || !countriesRes.ok || !prodCompaniesRes.ok || !distCompaniesRes.ok) {
        throw new Error('Error fetching data')
      }

      const [genres, countries, prodCompanies, distCompanies, themes, roles] = await Promise.all([
        genresRes.json(),
        countriesRes.json(),
        prodCompaniesRes.json(),
        distCompaniesRes.json(),
        themesRes.ok ? themesRes.json() : [],
        rolesRes.ok ? rolesRes.json() : { data: [] }
      ])

      // Asegurar que siempre sean arrays
      setAvailableGenres(Array.isArray(genres) ? genres : [])
      setAvailableCountries(Array.isArray(countries) ? countries : [])
      setAvailableProductionCompanies(Array.isArray(prodCompanies) ? prodCompanies : [])
      setAvailableDistributionCompanies(Array.isArray(distCompanies) ? distCompanies : [])
      setAvailableThemes(Array.isArray(themes) ? themes : [])
      setAvailableRoles(roles.data || [])

    } catch (error) {
      console.error('Error loading initial data:', error)
      // Asegurar que los estados sean arrays vacíos en caso de error
      setAvailableGenres([])
      setAvailableCountries([])
      setAvailableProductionCompanies([])
      setAvailableDistributionCompanies([])
      setAvailableThemes([])
      setAvailableRoles([])
    }
  }

  // Buscar personas
  const searchPeople = async (search: string) => {
  if (search.length < 2) return

  try {
    const response = await fetch(`/api/people?search=${encodeURIComponent(search)}&limit=10`)
    const result = await response.json()

    // CAMBIO IMPORTANTE: Manejar tanto array directo como objeto con data
    const peopleData = Array.isArray(result) ? result : (result.data || [])
    
    // Ya no necesitas formatear el nombre porque ya viene formateado del backend
    setAvailablePeople(peopleData)
    
  } catch (error) {
    console.error('Error searching people:', error)
    setAvailablePeople([])
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
      // Solo buscar el rol cuando es crew
      const selectedRole = availableRoles.find(r => r.id === newPerson.roleId)

      setCrew([...crew, {
        personId: newPerson.personId,
        person: selectedPerson,
        roleId: newPerson.roleId,
        role: selectedRole,  // Incluir el objeto role para mostrar el nombre
        billingOrder: crew.filter(c => c.roleId === newPerson.roleId).length + 1
      }])
    }

    // Limpiar formulario
    setNewPerson({
      personId: 0,
      characterName: '',
      roleId: 0,
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

  // Renderizar solo las secciones necesarias según las props
  if (showOnlyBasicInfo) {
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

        {/* Países */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Países Coproductores
          </h3>

          {/* Tags de países seleccionados */}
          {selectedCountries.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {selectedCountries.map(countryId => {
                const country = availableCountries.find(c => c.id === countryId)
                if (!country) return null
                return (
                  <span
                    key={country.id}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                  >
                    {country.name}
                    <button
                      type="button"
                      onClick={() => setSelectedCountries(selectedCountries.filter(id => id !== country.id))}
                      className="ml-1 hover:text-blue-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )
              })}
            </div>
          )}

          {/* Buscador de países */}
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar países..."
              value={countrySearch}
              onChange={(e) => setCountrySearch(e.target.value)}
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <Search className="absolute right-3 top-2.5 w-5 h-5 text-gray-400" />
          </div>

          {/* Lista filtrada de países */}
          {countrySearch && (
            <div className="mt-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
              {availableCountries
                .filter((country: any) =>
                  country.name.toLowerCase().includes(countrySearch.toLowerCase()) &&
                  !selectedCountries.includes(country.id)
                )
                .map((country: any) => (
                  <button
                    key={country.id}
                    type="button"
                    onClick={() => {
                      setSelectedCountries([...selectedCountries, country.id])
                      setCountrySearch('')
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                  >
                    <span className="text-sm text-gray-700">{country.name}</span>
                  </button>
                ))}
              {availableCountries.filter((country: any) =>
                country.name.toLowerCase().includes(countrySearch.toLowerCase()) &&
                !selectedCountries.includes(country.id)
              ).length === 0 && (
                  <div className="px-3 py-2 text-sm text-gray-500">
                    No se encontraron países
                  </div>
                )}
            </div>
          )}

          <p className="mt-1 text-xs text-gray-500">
            Escribe para buscar y agregar países
          </p>
        </div>
        <div className="col-span-2 mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Pantallas de Estreno
          </label>
          <ScreeningVenueSelector
            selectedVenueIds={screeningVenues}
            onChange={(venues) => {
              setScreeningVenues(venues)
            }}
          />
          <p className="mt-1 text-sm text-gray-500">
            Selecciona las pantallas donde se estrenó o estrenará la película
          </p>
        </div>
        {/* Temas */}
        {availableThemes.length > 0 && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <Tag className="w-5 h-5" />
              Temas / Palabras Clave
            </h3>

            {/* Tags de temas seleccionados */}
            {selectedThemes.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {selectedThemes.map(themeId => {
                  const theme = availableThemes.find(t => t.id === themeId)
                  if (!theme) return null
                  return (
                    <span
                      key={theme.id}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800"
                    >
                      {theme.name}
                      <button
                        type="button"
                        onClick={() => setSelectedThemes(selectedThemes.filter(id => id !== theme.id))}
                        className="ml-1 hover:text-purple-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )
                })}
              </div>
            )}

            {/* Buscador de temas */}
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar temas..."
                value={themeSearch}
                onChange={(e) => setThemeSearch(e.target.value)}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <Search className="absolute right-3 top-2.5 w-5 h-5 text-gray-400" />
            </div>

            {/* Lista filtrada de temas */}
            {themeSearch && (
              <div className="mt-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                {availableThemes
                  .filter((theme: any) =>
                    theme.name.toLowerCase().includes(themeSearch.toLowerCase()) &&
                    !selectedThemes.includes(theme.id)
                  )
                  .map((theme: any) => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => {
                        setSelectedThemes([...selectedThemes, theme.id])
                        setThemeSearch('')
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                    >
                      <span className="text-sm text-gray-700">{theme.name}</span>
                    </button>
                  ))}
                {availableThemes.filter((theme: any) =>
                  theme.name.toLowerCase().includes(themeSearch.toLowerCase()) &&
                  !selectedThemes.includes(theme.id)
                ).length === 0 && (
                    <div className="px-3 py-2 text-sm text-gray-500">
                      No se encontraron temas
                    </div>
                  )}
              </div>
            )}

            <p className="mt-1 text-xs text-gray-500">
              Escribe para buscar y agregar temas
            </p>
          </div>
        )}
      </div>
    )
  }

  if (showOnlyCast) {
    return (
      <div className="space-y-6">
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
                    <span className="font-medium">
                      {member.person ? `${member.person.firstName || ''} ${member.person.lastName || ''}`.trim() : 'Sin nombre'}
                    </span>
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
                          className={`w-full text-left px-3 py-2 hover:bg-gray-50 ${newPerson.personId === person.id ? 'bg-blue-50' : ''
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
                        value={newPerson.roleId}
                        onChange={(e) => setNewPerson({ ...newPerson, roleId: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Seleccionar...</option>
                        {availableRoles
                          .sort((a, b) => a.department.localeCompare(b.department))
                          .map((role: any) => (
                            <option key={role.id} value={role.id}>
                              {role.name} ({role.department})
                            </option>
                          ))}
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
                      roleId: 0,
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
                  disabled={!newPerson.personId || (addingType === 'crew' && !newPerson.roleId)}
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

  if (showOnlyCrew) {
    return (
      <div className="space-y-6">
        {/* Crew */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Equipo Técnico
          </h3>

          {crew.length > 0 && (
            <div className="mb-4 space-y-2">
              {crew.map((member, index) => {
                console.log('🎭 Member:', member) // ← AGREGADO
                console.log('Person:', member.person)  // ← AGREGAR
                console.log('Role:', member.role)      // ← AGREGAR
                return (
                  <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <span className="font-medium">
                        {member.person ? `${member.person.firstName || ''} ${member.person.lastName || ''}`.trim() : 'Sin nombre'}
                      </span>
                      <span className="text-gray-500"> - {member.role?.name || 'Sin rol'}</span>
                      {member.role?.department && (
                        <span className="text-gray-400"> ({member.role.department})</span>
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
                )
              })}
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
                          className={`w-full text-left px-3 py-2 hover:bg-gray-50 ${newPerson.personId === person.id ? 'bg-blue-50' : ''
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
                        value={newPerson.roleId}  // ✅ Cambiar a roleId
                        onChange={(e) => setNewPerson({ ...newPerson, roleId: parseInt(e.target.value) })}  // ✅ Cambiar a roleId
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Seleccionar...</option>
                        {availableRoles
                          .sort((a, b) => a.department.localeCompare(b.department))
                          .map((role: any) => (
                            <option key={role.id} value={role.id}>
                              {role.name} ({role.department})
                            </option>
                          ))}
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
                      roleId: 0,
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
                  disabled={!newPerson.personId || (addingType === 'crew' && !newPerson.roleId)}
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

  if (showOnlyCompanies) {
    return (
      <div className="space-y-6">
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
      </div>
    )
  }

  // Renderizar todo por defecto
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
                  <span className="font-medium">
                    {member.person ? `${member.person.firstName || ''} ${member.person.lastName || ''}`.trim() : 'Sin nombre'}
                  </span>
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
                  <span className="font-medium">{member.person?.name || 'Sin nombre'}</span>
                  <span className="text-gray-500"> - {member.role?.name || 'Sin rol'}</span>  // ✅
                  {member.role?.department && (  // ✅
                    <span className="text-gray-400"> ({member.role.department})</span>
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
        <div className="flex flex-wrap gap-2">
          {availableCountries.map((country: any) => (
            <button
              key={country.id}
              type="button"
              onClick={() => {
                if (selectedCountries.includes(country.id)) {
                  setSelectedCountries(selectedCountries.filter(id => id !== country.id))
                } else {
                  setSelectedCountries([...selectedCountries, country.id])
                }
              }}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${selectedCountries.includes(country.id)
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
            >
              {country.name}
            </button>
          ))}
        </div>
      </div>

      {/* Temas */}
      {availableThemes.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Tag className="w-5 h-5" />
            Temas / Palabras Clave
          </h3>

          {/* Tags de temas seleccionados */}
          {selectedThemes.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {selectedThemes.map(themeId => {
                const theme = availableThemes.find(t => t.id === themeId)
                if (!theme) return null
                return (
                  <span
                    key={theme.id}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800"
                  >
                    {theme.name}
                    <button
                      type="button"
                      onClick={() => setSelectedThemes(selectedThemes.filter(id => id !== theme.id))}
                      className="ml-1 hover:text-purple-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )
              })}
            </div>
          )}

          {/* Buscador de temas */}
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar temas..."
              value={themeSearch}
              onChange={(e) => setThemeSearch(e.target.value)}
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <Search className="absolute right-3 top-2.5 w-5 h-5 text-gray-400" />
          </div>

          {/* Lista filtrada de temas */}
          {themeSearch && (
            <div className="mt-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
              {availableThemes
                .filter((theme: any) =>
                  theme.name.toLowerCase().includes(themeSearch.toLowerCase()) &&
                  !selectedThemes.includes(theme.id)
                )
                .map((theme: any) => (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => {
                      setSelectedThemes([...selectedThemes, theme.id])
                      setThemeSearch('')
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                  >
                    <span className="text-sm text-gray-700">{theme.name}</span>
                  </button>
                ))}
              {availableThemes.filter((theme: any) =>
                theme.name.toLowerCase().includes(themeSearch.toLowerCase()) &&
                !selectedThemes.includes(theme.id)
              ).length === 0 && (
                  <div className="px-3 py-2 text-sm text-gray-500">
                    No se encontraron temas
                  </div>
                )}
            </div>
          )}

          <p className="mt-1 text-xs text-gray-500">
            Escribe para buscar y agregar temas
          </p>
        </div>
      )}

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
                        className={`w-full text-left px-3 py-2 hover:bg-gray-50 ${newPerson.personId === person.id ? 'bg-blue-50' : ''
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
                      value={newPerson.roleId}
                      onChange={(e) => setNewPerson({ ...newPerson, roleId: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Seleccionar...</option>
                      {availableRoles
                        .sort((a, b) => a.department.localeCompare(b.department))
                        .map((role: any) => (
                          <option key={role.id} value={role.id}>
                            {role.name} ({role.department})
                          </option>
                        ))}
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
                    roleId: 0,
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
                disabled={!newPerson.personId || (addingType === 'crew' && !newPerson.roleId)}
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