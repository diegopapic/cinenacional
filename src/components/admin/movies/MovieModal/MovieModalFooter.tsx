// src/components/admin/movies/MovieModal/MovieModalFooter.tsx
import { Save, Loader2 } from 'lucide-react'
import { useMovieModalContext } from '@/contexts/MovieModalContext'

interface MovieModalFooterProps {
  onCancel: () => void
}

export default function MovieModalFooter({ onCancel }: MovieModalFooterProps) {
  // Obtener todos los datos necesarios del context
  const {
    isSubmitting,
    editingMovie,
    formState,
    setShouldClose
  } = useMovieModalContext()

  const isEditing = !!editingMovie
  const errors = formState?.errors || {}

  return (
    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-4">
      <button
        type="button"
        onClick={onCancel}
        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
      >
        Cancelar
      </button>

      {Object.keys(errors).length > 0 && (
        <div className="px-6 py-2 bg-red-50 text-red-800 text-sm">
          Errores: {Object.keys(errors).join(', ')}
          <div className="text-xs mt-1">
            {Object.entries(errors).map(([key, error]: [string, any]) => (
              <div key={key}>
                {key}: {error?.message || error?.type || 'Error desconocido'}
              </div>
            ))}
          </div>
        </div>
      )}

      {isEditing && (
        <button
          type="submit"
          disabled={isSubmitting}
          onClick={() => setShouldClose(false)}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Actualizar
            </>
          )}
        </button>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        onClick={() => setShouldClose(true)}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Guardando...
          </>
        ) : (
          <>
            <Save className="w-4 h-4" />
            {isEditing ? 'Actualizar y cerrar' : 'Crear'} Película
          </>
        )}
      </button>
    </div>
  )
}
