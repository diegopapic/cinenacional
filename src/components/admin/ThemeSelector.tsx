// src/components/admin/ThemeSelector.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Search, Tag } from 'lucide-react'

interface Theme {
  id: number
  name: string
  slug: string
  movieCount?: number
}

interface ThemeSelectorProps {
  availableThemes: Theme[]
  selectedThemes: number[]
  onChange: (themes: number[]) => void
  placeholder?: string
}

export function ThemeSelector({
  availableThemes,
  selectedThemes,
  onChange,
  placeholder = "Buscar theme..."
}: ThemeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredThemes = availableThemes.filter(theme =>
    theme.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const selectedThemeObjects = availableThemes.filter(theme => 
    selectedThemes.includes(theme.id)
  )

  const toggleTheme = (themeId: number) => {
    if (selectedThemes.includes(themeId)) {
      onChange(selectedThemes.filter(id => id !== themeId))
    } else {
      onChange([...selectedThemes, themeId])
    }
  }

  const removeTheme = (themeId: number) => {
    onChange(selectedThemes.filter(id => id !== themeId))
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Themes seleccionados */}
      {selectedThemeObjects.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedThemeObjects.map(theme => (
            <span
              key={theme.id}
              className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
            >
              <Tag className="w-3 h-3" />
              {theme.name}
              <button
                type="button"
                onClick={() => removeTheme(theme.id)}
                className="ml-1 hover:text-blue-900"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      
      <p className="text-sm text-gray-500 mb-2">
        {selectedThemes.length} seleccionado{selectedThemes.length !== 1 ? 's' : ''}
      </p>

      {/* Input de búsqueda */}
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
        />
        <Search className="absolute right-3 top-2.5 w-5 h-5 text-gray-400 pointer-events-none" />
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filteredThemes.length === 0 ? (
            <p className="p-3 text-sm text-gray-500">No se encontraron themes</p>
          ) : (
            filteredThemes.map(theme => (
              <button
                key={theme.id}
                type="button"
                onClick={() => toggleTheme(theme.id)}
                className={`w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center justify-between ${
                  selectedThemes.includes(theme.id) ? 'bg-blue-50' : ''
                }`}
              >
                <span className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-gray-400" />
                  {theme.name}
                  {theme.movieCount !== undefined && theme.movieCount > 0 && (
                    <span className="text-xs text-gray-500">({theme.movieCount})</span>
                  )}
                </span>
                {selectedThemes.includes(theme.id) && (
                  <span className="text-blue-600">✓</span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}