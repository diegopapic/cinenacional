// src/components/admin/movies/MovieModal/tabs/AdvancedTab.tsx
import { UseFormRegister, UseFormWatch } from 'react-hook-form'
import { MovieFormData } from '@/lib/movies/movieTypes'
import { SOUND_TYPES } from '@/lib/movies/movieConstants'
import AlternativeTitlesManager from '@/components/admin/AlternativeTitlesManager'
import MovieFormEnhanced from '@/components/admin/MovieFormEnhanced'

interface AdvancedTabProps {
  register: UseFormRegister<MovieFormData>
  watch: UseFormWatch<MovieFormData>

  // Metadata
  availableRatings: any[]
  availableColorTypes: any[]

  // Títulos alternativos
  alternativeTitles: any[]
  setAlternativeTitles: (titles: any[]) => void

  // Compañías
  movieFormInitialData: any
  handleProductionCompaniesChange: (companies: number[]) => void
  handleDistributionCompaniesChange: (companies: number[]) => void

  editingMovieId?: number
}

export default function AdvancedTab({
  register,
  watch,
  availableRatings,
  availableColorTypes,
  alternativeTitles,
  setAlternativeTitles,
  movieFormInitialData,
  handleProductionCompaniesChange,
  handleDistributionCompaniesChange,
  editingMovieId
}: AdvancedTabProps) {
  return (
    <div className="space-y-6">
      {/* Información técnica */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Información Técnica
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Color
            </label>
            <select
              {...register('colorTypeId', { valueAsNumber: true })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            >
              <option value="">Seleccionar...</option>
              {availableColorTypes.map((colorType) => (
                <option key={colorType.id} value={colorType.id}>
                  {colorType.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sonido
            </label>
            <select
              {...register('soundType')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            >
              <option value="">Seleccionar...</option>
              {SOUND_TYPES.map(sound => (
                <option key={sound.value} value={sound.value}>
                  {sound.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Clasificación */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Calificación
        </label>
        <select
          {...register('ratingId', {
            setValueAs: (v) => {
              if (v === '' || v === '0' || v === 0) return null;
              return Number(v);
            }
          })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
        >
          <option value="">Sin calificación</option>
          {availableRatings.map((rating) => (
            <option key={rating.id} value={rating.id}>
              {rating.name} {rating.abbreviation && `(${rating.abbreviation})`}
            </option>
          ))}
        </select>
        {(() => {
          const selectedRating = availableRatings.find(r => r.id === watch('ratingId'))
          return selectedRating?.description && (
            <p className="mt-1 text-sm text-gray-500">
              {selectedRating.description}
            </p>
          )
        })()}
      </div>

      {/* Títulos Alternativos */}
      <div className="mt-6">
        <AlternativeTitlesManager
          onChange={setAlternativeTitles}
          initialTitles={editingMovieId ? alternativeTitles : []}
        />
      </div>

      {/* Productoras y Distribuidoras */}
      <MovieFormEnhanced
        key={editingMovieId || 'new'}
        onGenresChange={() => { }}
        onCastChange={() => { }}
        onCrewChange={() => { }}
        onCountriesChange={() => { }}
        onProductionCompaniesChange={handleProductionCompaniesChange}
        onDistributionCompaniesChange={handleDistributionCompaniesChange}
        onThemesChange={() => { }}
        onScreeningVenuesChange={() => { }}
        initialData={movieFormInitialData}
        showOnlyCompanies={true}
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notas Internas
        </label>
        <textarea
          {...register('notes')}  // 👈 Usar register como los otros campos
          rows={4}
          placeholder="Anotaciones internas sobre esta película. No se mostrarán públicamente."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
        />
        <p className="mt-1 text-sm text-gray-500">
          Este campo es solo para uso interno del equipo editorial.
        </p>
      </div>
    </div>
  )
}