// src/components/admin/movies/MoviesFilters.tsx
import { Search, Plus } from 'lucide-react'

export interface MovieFilters {
  searchTerm: string
  selectedStage: string
  selectedYear: string
  currentPage: number
}

interface MoviesFiltersProps {
  filters: MovieFilters
  onFiltersChange: (filters: Partial<MovieFilters>) => void
  onNewMovie: () => void
}

export default function MoviesFilters({ 
  filters, 
  onFiltersChange, 
  onNewMovie 
}: MoviesFiltersProps) {
  // Generar años desde el actual hasta 50 años atrás
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 50 }, (_, i) => currentYear - i)

  const handleFilterChange = (key: keyof MovieFilters, value: string | number) => {
    onFiltersChange({ 
      [key]: value,
      // Resetear a página 1 cuando cambian los filtros
      currentPage: key !== 'currentPage' ? 1 : filters.currentPage 
    })
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Búsqueda */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar películas..."
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            value={filters.searchTerm}
            onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
          />
        </div>

        {/* Filtro por año */}
        <select
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
          value={filters.selectedYear}
          onChange={(e) => handleFilterChange('selectedYear', e.target.value)}
        >
          <option value="">Todos los años</option>
          {years.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>

        {/* Botón nueva película */}
        <button
          onClick={onNewMovie}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Nueva Película
        </button>
      </div>
    </div>
  )
}