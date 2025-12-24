// src/app/admin/stats/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { ArrowUpDown, BarChart3, Film, Users, RefreshCw } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface MovieStat {
  movieId: number
  title: string
  slug: string
  viewsWeek: number
  viewsMonth: number
  viewsYear: number
  viewsTotal: number
}

interface PersonStat {
  personId: number
  name: string
  slug: string
  views: number
}

interface Stats {
  totalViews: number
  viewsByType: { pageType: string; views: number }[]
  topMovies: MovieStat[]
  topPeople: PersonStat[]
  lastUpdated: string | null
}

type SortField = 'viewsWeek' | 'viewsMonth' | 'viewsYear' | 'viewsTotal' | 'title'
type SortOrder = 'asc' | 'desc'

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortField, setSortField] = useState<SortField>('viewsMonth')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  const fetchStats = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/stats')
      if (!response.ok) throw new Error('Error al cargar estadísticas')
      const data = await response.json()
      setStats(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const sortedMovies = stats?.topMovies?.slice().sort((a, b) => {
    if (sortField === 'title') {
      return sortOrder === 'asc' 
        ? a.title.localeCompare(b.title)
        : b.title.localeCompare(a.title)
    }
    const aVal = a[sortField] || 0
    const bVal = b[sortField] || 0
    return sortOrder === 'asc' ? aVal - bVal : bVal - aVal
  }) || []

  const SortHeader = ({ field, label }: { field: SortField; label: string }) => (
    <th
      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown className={`w-4 h-4 ${sortField === field ? 'text-blue-600' : 'text-gray-400'}`} />
      </div>
    </th>
  )

  const getPageTypeLabel = (pageType: string) => {
    const labels: Record<string, string> = {
      'MOVIE': 'Películas',
      'PERSON': 'Personas',
      'HOME': 'Home',
      'RELEASES': 'Estrenos',
      'EPHEMERIS': 'Efemérides',
      'OBITUARIES': 'Obituarios',
      'PERSON_LIST': 'Listado personas'
    }
    return labels[pageType] || pageType
  }

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-6">Estadísticas</h1>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-6">Estadísticas</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchStats}
            className="mt-2 text-sm text-red-600 underline hover:no-underline"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Estadísticas</h1>
        <button
          onClick={fetchStats}
          className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 rounded-lg text-sm shadow"
        >
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      {/* Resumen general */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-blue-500" />
            <div>
              <p className="text-sm text-gray-600">Total visitas</p>
              <p className="text-2xl font-bold">{stats?.totalViews?.toLocaleString() || 0}</p>
            </div>
          </div>
        </div>
        
        {stats?.viewsByType?.map((type) => (
          <div key={type.pageType} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3">
              {type.pageType === 'MOVIE' ? (
                <Film className="w-8 h-8 text-green-500" />
              ) : type.pageType === 'PERSON' ? (
                <Users className="w-8 h-8 text-purple-500" />
              ) : (
                <BarChart3 className="w-8 h-8 text-gray-500" />
              )}
              <div>
                <p className="text-sm text-gray-600">{getPageTypeLabel(type.pageType)}</p>
                <p className="text-2xl font-bold">{type.views?.toLocaleString() || 0}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Última actualización */}
      {stats?.lastUpdated && (
        <p className="text-sm text-gray-600 mb-4">
          Estadísticas actualizadas: {new Date(stats.lastUpdated).toLocaleString('es-AR')}
        </p>
      )}

      {/* Tabla de películas */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Film className="w-5 h-5" />
            Películas más vistas
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                  #
                </th>
                <SortHeader field="title" label="Película" />
                <SortHeader field="viewsWeek" label="7 días" />
                <SortHeader field="viewsMonth" label="30 días" />
                <SortHeader field="viewsYear" label="365 días" />
                <SortHeader field="viewsTotal" label="Total" />
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedMovies.map((movie, index) => (
                <tr key={movie.movieId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {index + 1}
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={`/pelicula/${movie.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {movie.title}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {movie.viewsWeek?.toLocaleString() || 0}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {movie.viewsMonth?.toLocaleString() || 0}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {movie.viewsYear?.toLocaleString() || 0}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold">
                    {movie.viewsTotal?.toLocaleString() || 0}
                  </td>
                </tr>
              ))}
              {sortedMovies.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No hay datos de estadísticas todavía
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabla de personas */}
      {stats?.topPeople && stats.topPeople.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Users className="w-5 h-5" />
              Personas más vistas (últimos 30 días)
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                    #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Persona
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Visitas
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stats.topPeople.map((person, index) => (
                  <tr key={person.personId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={`/persona/${person.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline font-medium"
                      >
                        {person.name}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold">
                      {person.views?.toLocaleString() || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}