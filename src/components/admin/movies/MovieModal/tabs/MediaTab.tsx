// src/components/admin/movies/MovieModal/tabs/MediaTab.tsx
import { UseFormRegister, UseFormWatch, UseFormSetValue } from 'react-hook-form'
import { MovieFormData } from '@/lib/movies/movieTypes'
import { CloudinaryUploadWidget } from '@/components/admin/CloudinaryUploadWidget'

interface MediaTabProps {
  register: UseFormRegister<MovieFormData>
  watch: UseFormWatch<MovieFormData>
  setValue: UseFormSetValue<MovieFormData>
  editingMovieId?: number
}

export default function MediaTab({ 
  register, 
  watch, 
  setValue, 
  editingMovieId 
}: MediaTabProps) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        Imágenes y Videos
      </h3>

      <CloudinaryUploadWidget
        value={watch('posterUrl')}
        onChange={(url, publicId) => {
          setValue('posterUrl', url)
          setValue('posterPublicId', publicId)
        }}
        label="Afiche de la Película"
        type="poster"
        movieId={editingMovieId}
      />

      <CloudinaryUploadWidget
        value={watch('backdropUrl')}
        onChange={(url, publicId) => {
          setValue('backdropUrl', url)
          setValue('backdropPublicId', publicId)
        }}
        label="Imagen de Fondo"
        type="backdrop"
        movieId={editingMovieId}
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          URL del Trailer
        </label>
        <input
          type="url"
          {...register('trailerUrl')}
          placeholder="https://youtube.com/watch?v=..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
        />
        <p className="mt-1 text-sm text-gray-500">
          Ingresa la URL completa del video en YouTube, Vimeo u otra plataforma
        </p>
      </div>
    </div>
  )
}