// src/components/admin/movies/MovieModal/MovieModalHeader.tsx
import { X } from 'lucide-react'
import { useMovieModalContext } from '@/contexts/MovieModalContext'

interface MovieModalHeaderProps {
  onClose: () => void
}

export default function MovieModalHeader({ onClose }: MovieModalHeaderProps) {
  // Obtener editingMovie del context para determinar si estamos editando
  const { editingMovie } = useMovieModalContext()
  
  const isEditing = !!editingMovie

  return (
    <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditing ? 'Editar Película' : 'Nueva Película'}
          </h2>
          {isEditing && editingMovie && (
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-[10px] font-medium bg-gray-200 text-gray-600">
                ID: {editingMovie.id}
              </span>
              {editingMovie.tmdbId && (
                <a
                  href={`https://www.themoviedb.org/movie/${editingMovie.tmdbId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-1 py-0.5 rounded-sm text-[10px] font-medium bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors"
                  title="Ver en TMDB"
                >
                  TMDB
                </a>
              )}
              {editingMovie.imdbId && (
                <a
                  href={`https://www.imdb.com/title/${editingMovie.imdbId}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-1 py-0.5 rounded-sm text-[10px] font-medium bg-yellow-100 text-yellow-700 hover:bg-yellow-200 transition-colors"
                  title="Ver en IMDb"
                >
                  IMDb
                </a>
              )}
              {editingMovie.slug && (
                <a
                  href={`/pelicula/${editingMovie.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-1 py-0.5 rounded-sm text-[10px] font-medium bg-cyan-100 text-cyan-700 hover:bg-cyan-200 transition-colors"
                  title="Ver en el sitio"
                >
                  Web
                </a>
              )}
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-500"
        >
          <X className="w-6 h-6" />
        </button>
      </div>
    </div>
  )
}