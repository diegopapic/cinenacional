// src/components/admin/people/PersonFormFields/NationalitiesField.tsx

import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { apiClient } from '@/services/api-client'

interface Location {
  id: number
  name: string
  slug: string
}

interface NationalitiesFieldProps {
  value: number[]
  onChange: (nationalities: number[]) => void
  disabled?: boolean
}

export default function NationalitiesField({
  value = [],
  onChange,
  disabled = false
}: NationalitiesFieldProps) {
  const [countries, setCountries] = useState<Location[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedCountries, setSelectedCountries] = useState<Location[]>([])

  // Cargar países (locations sin parent)
  useEffect(() => {
    loadCountries()
  }, [])

  // Cargar países seleccionados
  useEffect(() => {
    if (value.length > 0 && countries.length > 0) {
      const selected = countries.filter(c => value.includes(c.id))
      setSelectedCountries(selected)
    }
  }, [value, countries])

  const loadCountries = async () => {
    try {
      const response = await apiClient.get<Location[]>('/locations/countries')
      setCountries(response)
    } catch (error) {
      console.error('Error loading countries:', error)
    }
  }

  const filteredCountries = countries.filter(
    country => 
      !value.includes(country.id) && 
      country.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleAddCountry = (country: Location) => {
    const newValue = [...value, country.id]
    onChange(newValue)
    setSelectedCountries([...selectedCountries, country])
    setSearchTerm('')
    setShowDropdown(false)
  }

  const handleRemoveCountry = (countryId: number) => {
    const newValue = value.filter(id => id !== countryId)
    onChange(newValue)
    setSelectedCountries(selectedCountries.filter(c => c.id !== countryId))
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Nacionalidades
      </label>
      
      {/* Tags de nacionalidades seleccionadas */}
      {selectedCountries.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedCountries.map(country => (
            <span
              key={country.id}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
            >
              {country.name}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemoveCountry(country.id)}
                  className="ml-1 hover:text-blue-600"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Campo de búsqueda */}
      {!disabled && (
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setShowDropdown(true)
            }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Buscar país para agregar..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          />
          
          {/* Dropdown de resultados */}
          {showDropdown && searchTerm && filteredCountries.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg max-h-48 overflow-y-auto border border-gray-200">
              {filteredCountries.slice(0, 10).map(country => (
                <button
                  key={country.id}
                  type="button"
                  onClick={() => handleAddCountry(country)}
                  className="w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                >
                  {country.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Click outside to close dropdown */}
      {showDropdown && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  )
}