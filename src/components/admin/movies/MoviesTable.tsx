// src/components/admin/movies/MoviesTable.tsx
import { useState } from 'react'
import { Film, Edit, Trash2, Eye, Star, Loader2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { type Movie } from '@/lib/movies/movieTypes'

interface MoviesTableProps {
  movies: Movie[]
  loading: boolean
  onEdit: (movie: Movie) => void
  onDelete: (id: number) => Promise<void>
}

export default function MoviesTable({ 
  movies, 
  loading, 
  onEdit, 
  onDelete 
}: MoviesTableProps) {
  const [deletingMovieId, setDeletingMovieId] = useState<number | null>(null)

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar esta película?')) return
    
    try {
      setDeletingMovieId(id)
      await onDelete(id)
      toast.success('Película eliminada')
    } catch (error) {
      toast.error('Error al eliminar la película')
    } finally {
      setDeletingMovieId(null)
    }
  }

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
                Rating
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {movies.map((movie) => (
              <MovieRow
                key={movie.id}
                movie={movie}
                onEdit={onEdit}
                onDelete={handleDelete}
                isDeleting={deletingMovieId === movie.id}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Componente interno para cada fila
interface MovieRowProps {
  movie: Movie
  onEdit: (movie: Movie) => void
  onDelete: (id: number) => void
  isDeleting: boolean
}

function MovieRow({ movie, onEdit, onDelete, isDeleting }: MovieRowProps) {
  return (
    <tr className="hover:bg-gray-50">
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
            <div className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
              {movie.title}
              {movie.tmdbId && (
                <a
                  href={`https://www.themoviedb.org/movie/${movie.tmdbId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-1 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors"
                  title="Ver en TMDB"
                >
                  TMDB
                </a>
              )}
              {movie.imdbId && (
                <a
                  href={`https://www.imdb.com/title/${movie.imdbId}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-1 py-0.5 rounded text-[10px] font-medium bg-yellow-100 text-yellow-700 hover:bg-yellow-200 transition-colors"
                  title="Ver en IMDb"
                >
                  IMDb
                </a>
              )}
              {movie.slug && (
                <a
                  href={`/pelicula/${movie.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-1 py-0.5 rounded text-[10px] font-medium bg-cyan-100 text-cyan-700 hover:bg-cyan-200 transition-colors"
                  title="Ver en el sitio"
                >
                  Web
                </a>
              )}
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
            disabled={isDeleting}
            className="text-red-600 hover:text-red-900 transition-colors disabled:opacity-50"
            title="Eliminar"
          >
            {isDeleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </td>
    </tr>
  )
}