// src/components/admin/CountrySelector.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Globe, Search } from 'lucide-react'

interface Country {
  id: number
  name: string
  code?: string
}

interface CountrySelectorProps {
  availableCountries: Country[]
  selectedCountries: number[]
  onChange: (countries: number[]) => void
  placeholder?: string
}

export function CountrySelector({
  availableCountries,
  selectedCountries,
  onChange,
  placeholder = "Buscar país..."
}: CountrySelectorProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Países frecuentes para mostrar primero
  const frequentCountries = ['Argentina', 'España', 'Francia', 'Brasil', 'México', 'Chile', 'Uruguay', 'Estados Unidos', 'Italia', 'Alemania']

  // Obtener los objetos de países seleccionados
  const selectedCountryObjects = selectedCountries
    .map(id => availableCountries.find(c => c.id === id))
    .filter(Boolean) as Country[]

  // Filtrar países disponibles (excluyendo los ya seleccionados)
  const filteredCountries = availableCountries
    .filter(country => !selectedCountries.includes(country.id))
    .filter(country => 
      searchTerm === '' || 
      country.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      // Priorizar países frecuentes
      const aIsFrequent = frequentCountries.includes(a.name)
      const bIsFrequent = frequentCountries.includes(b.name)
      
      if (aIsFrequent && !bIsFrequent) return -1
      if (!aIsFrequent && bIsFrequent) return 1
      
      // Luego ordenar alfabéticamente
      return a.name.localeCompare(b.name)
    })

  // Manejar click fuera del componente
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Manejar navegación con teclado
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex(prev => 
        prev < filteredCountries.length - 1 ? prev + 1 : prev
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (highlightedIndex >= 0 && highlightedIndex < filteredCountries.length) {
        handleSelectCountry(filteredCountries[highlightedIndex])
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
      setHighlightedIndex(-1)
    }
  }

  const handleSelectCountry = (country: Country) => {
    onChange([...selectedCountries, country.id])
    setSearchTerm('')
    setShowSuggestions(false)
    setHighlightedIndex(-1)
    inputRef.current?.focus()
  }

  const handleRemoveCountry = (countryId: number) => {
    onChange(selectedCountries.filter(id => id !== countryId))
  }

  return (
    <div ref={containerRef} className="space-y-3">
      {/* Campo de búsqueda */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setShowSuggestions(true)
              setHighlightedIndex(-1)
            }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
          />
        </div>

        {/* Lista de sugerencias */}
        {showSuggestions && (searchTerm || filteredCountries.length > 0) && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
            {filteredCountries.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500">
                No se encontraron países
              </div>
            ) : (
              <>
                {searchTerm === '' && (
                  <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    Países frecuentes
                  </div>
                )}
                {filteredCountries.map((country, index) => {
                  const isFrequent = searchTerm === '' && frequentCountries.includes(country.name)
                  const isHighlighted = index === highlightedIndex
                  
                  return (
                    <div
                      key={country.id}
                      onClick={() => handleSelectCountry(country)}
                      className={`px-4 py-2 cursor-pointer transition-colors ${
                        isHighlighted 
                          ? 'bg-blue-50 text-blue-700' 
                          : 'hover:bg-gray-50 text-gray-900'
                      } ${!isFrequent && searchTerm === '' && index === frequentCountries.filter(fc => 
                        availableCountries.some(ac => ac.name === fc && !selectedCountries.includes(ac.id))
                      ).length ? 'border-t border-gray-100' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm">{country.name}</span>
                        {isFrequent && searchTerm === '' && (
                          <span className="text-xs text-gray-400">Frecuente</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </>
            )}
          </div>
        )}
      </div>

      {/* Países seleccionados como chips */}
      {selectedCountryObjects.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedCountryObjects.map((country) => (
            <div
              key={country.id}
              className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
            >
              <Globe className="w-3 h-3" />
              <span>{country.name}</span>
              <button
                type="button"
                onClick={() => handleRemoveCountry(country.id)}
                className="ml-1 hover:text-blue-900 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Texto de ayuda */}
      <p className="text-xs text-gray-500">
        {selectedCountryObjects.length === 0 
          ? "Comienza a escribir para buscar países coproductores" 
          : `${selectedCountryObjects.length} ${selectedCountryObjects.length === 1 ? 'país seleccionado' : 'países seleccionados'}`
        }
      </p>
    </div>
  )
}