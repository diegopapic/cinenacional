// src/components/admin/MoviesTable.tsx
import { Film, Eye, Edit, Trash2, Loader2, Star } from 'lucide-react'

interface Director {
  id: number
  name: string
}

interface Movie {
  id: number
  slug: string
  title: string
  originalTitle?: string
  year: number
  releaseDate?: string
  duration?: number
  rating?: number
  posterUrl?: string
  status: string
  stage?: string
  dataCompleteness?: string
  directors?: Director[]
}

interface MoviesTableProps {
  movies: Movie[]
  loading: boolean
  deletingMovieId: number | null
  onEdit: (movie: Movie) => void
  onDelete: (id: number) => void
}

export default function MoviesTable({
  movies,
  loading,
  deletingMovieId,
  onEdit,
  onDelete
}: MoviesTableProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      </div>
    )
  }

  if (!movies || movies.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="text-center py-12">
          <Film className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No se encontraron películas</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Película
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Año
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Director
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Completitud
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rating
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {movies.map((movie) => (
              <tr key={movie.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      {movie.posterUrl ? (
                        <img
                          className="h-10 w-10 rounded-lg object-cover"
                          src={movie.posterUrl}
                          alt={movie.title}
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-gray-200 flex items-center justify-center">
                          <Film className="w-5 h-5 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {movie.title}
                      </div>
                      {movie.originalTitle && (
                        <div className="text-sm text-gray-500">
                          {movie.originalTitle}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {movie.year}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {movie.directors?.map(d => d.name).join(', ') || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    movie.status === 'PUBLISHED'
                      ? 'bg-green-100 text-green-800'
                      : movie.status === 'DRAFT'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                  }`}>
                    {movie.status === 'PUBLISHED' ? 'Publicado' :
                      movie.status === 'DRAFT' ? 'Borrador' : 'Archivado'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-400">-</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {movie.rating ? (
                    <div className="flex items-center">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="ml-1 text-sm text-gray-900">
                        {movie.rating}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-2">
                    <a
                      href={`/pelicula/${movie.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-600 hover:text-gray-900 transition-colors"
                      title="Ver película"
                    >
                      <Eye className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => onEdit(movie)}
                      className="text-blue-600 hover:text-blue-900 transition-colors"
                      title="Editar"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(movie.id)}
                      disabled={deletingMovieId === movie.id}
                      className="text-red-600 hover:text-red-900 transition-colors disabled:opacity-50"
                      title="Eliminar"
                    >
                      {deletingMovieId === movie.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}