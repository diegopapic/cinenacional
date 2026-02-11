// src/components/admin/movies/MovieModal/tabs/BasicInfoTab.tsx
import { TIPOS_DURACION, DATA_COMPLETENESS_LEVELS, SOUND_TYPES } from '@/lib/movies/movieConstants'
import { MONTHS } from '@/lib/shared/dateUtils'
import { getErrorMessage } from '@/lib/movies/movieUtils'
import { useMovieModalContext } from '@/contexts/MovieModalContext'
import MovieFormEnhanced from '@/components/admin/MovieFormEnhanced'
import { DateInput } from '@/components/admin/ui/DateInput'

export default function BasicInfoTab() {
  // Obtener todos los datos necesarios del context
  const {
    // Form methods
    register,
    watch,
    setValue,
    formState,

    // Date states
    isPartialDate,
    setIsPartialDate,
    partialReleaseDate,
    setPartialReleaseDate,

    // UI states
    tipoDuracionDisabled,

    // Metadata
    availableRatings,
    availableColorTypes,

    // Data and handlers
    movieFormInitialData,
    editingMovie,
    handleGenresChange,
    handleCountriesChange,
    handleThemesChange,
    handleScreeningVenuesChange
  } = useMovieModalContext()

  const errors = formState?.errors || {}
  const editingMovieId = editingMovie?.id

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Columna izquierda */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Información Principal
          </h3>

          {/* Título */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Título *
            </label>
            <input
              type="text"
              {...register('title')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600">{getErrorMessage(errors.title)}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Año */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Año
              </label>
              <input
                type="number"
                {...register('year', { valueAsNumber: true })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              />
              {errors.year && (
                <p className="mt-1 text-sm text-red-600">{getErrorMessage(errors.year)}</p>
              )}
            </div>

            {/* Fecha de Estreno */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de Estreno
              </label>

              <div className="mb-2">
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={isPartialDate}
                    onChange={(e) => setIsPartialDate(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-600">
                    Fecha incompleta
                  </span>
                </label>
              </div>

              {!isPartialDate ? (
                <DateInput
                  value={watch('releaseDate') || ''}
                  onChange={(value) => setValue('releaseDate', value, { shouldValidate: true })}
                />
              ) : (
                <div className="flex gap-2">
                  <div className="flex-1">
                    <input
                      type="number"
                      placeholder="Año"
                      min="1800"
                      max="2100"
                      value={partialReleaseDate.year || ''}
                      onChange={(e) => setPartialReleaseDate({
                        ...partialReleaseDate,
                        year: e.target.value ? parseInt(e.target.value) : null
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    />
                  </div>
                  <div className="flex-1">
                    <select
                      value={partialReleaseDate.month || ''}
                      onChange={(e) => setPartialReleaseDate({
                        ...partialReleaseDate,
                        month: e.target.value ? parseInt(e.target.value) : null
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    >
                      <option value="">Mes</option>
                      {MONTHS.map(month => (
                        <option key={month.value} value={month.value}>
                          {month.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Duración */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duración (minutos)
              </label>
              <input
                type="number"
                {...register('duration', { valueAsNumber: true })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Segundos
              </label>
              <input
                type="number"
                min="0"
                max="59"
                {...register('durationSeconds', { valueAsNumber: true })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                placeholder="0-59"
              />
            </div>
          </div>

          {/* Tipo de duración */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de duración
              {tipoDuracionDisabled && (
                <span className="ml-2 text-xs text-green-600 font-normal">
                  (Calculado automáticamente)
                </span>
              )}
            </label>
            <select
              {...register('tipoDuracion')}
              disabled={tipoDuracionDisabled}
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 ${tipoDuracionDisabled ? 'bg-gray-100' : ''
                }`}
            >
              <option value="">Seleccionar tipo...</option>
              {TIPOS_DURACION.map((tipo) => (
                <option key={tipo.value} value={tipo.value}>
                  {tipo.label}
                </option>
              ))}
            </select>
          </div>

          {/* Información Técnica */}
          <div className="space-y-4 pt-4 border-t border-gray-200">
            <h4 className="text-md font-medium text-gray-900">
              Información Técnica
            </h4>

            <div className="grid grid-cols-2 gap-4">
              {/* Color */}
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

              {/* Sonido */}
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

            {/* Calificación */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Calificación
              </label>
              <select
                {...register('ratingId', {
                  setValueAs: (v: string | number) => {
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
          </div>
        </div>

        {/* Columna derecha */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Información Adicional
          </h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sinopsis
              {watch('synopsisLocked') && (
                <span className="ml-2 text-xs text-green-600 font-semibold">
                  🔒 BLOQUEADA
                </span>
              )}
            </label>
            <textarea
    {...register('synopsis')}
    rows={4}
    readOnly={watch('synopsisLocked')}  // ✅ CAMBIO PRINCIPAL
    className={`w-full px-3 py-2 border rounded-lg transition-all duration-200 ${
      watch('synopsisLocked')
        ? 'bg-gray-200 text-gray-700 border-gray-400 cursor-not-allowed shadow-inner'
        : 'bg-white text-gray-900 border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
    }`}
  />
          </div>
          {/* Checkbox para bloquear sinopsis */}
          <div className="mt-2">
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                {...register('synopsisLocked')}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-600">
                🔒 Bloquear sinopsis (sinopsis correcta y verificada)
              </span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tagline
            </label>
            <input
              type="text"
              {...register('tagline')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                IMDb ID
              </label>
              <input
                type="text"
                {...register('imdbId')}
                placeholder="tt0123456"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                TMDb ID
              </label>
              <input
                type="number"
                {...register('tmdbId', { valueAsNumber: true })}
                placeholder="12345"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nivel de información cargada *
            </label>
            <select
              {...register('dataCompleteness')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            >
              {DATA_COMPLETENESS_LEVELS.map(level => (
                <option key={level.value} value={level.value}>
                  {level.icon} {level.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Indica el nivel de detalle cargado
            </p>
          </div>
        </div>
      </div>

      {/* Géneros, Países, Screening Venues y Temas */}
      <MovieFormEnhanced
        key={editingMovieId || 'new'}
        onGenresChange={handleGenresChange}
        onCastChange={() => { }}
        onCrewChange={() => { }}
        onCountriesChange={handleCountriesChange}
        onProductionCompaniesChange={() => { }}
        onDistributionCompaniesChange={() => { }}
        onThemesChange={handleThemesChange}
        onScreeningVenuesChange={handleScreeningVenuesChange}
        initialData={movieFormInitialData}
        showOnlyBasicInfo={true}
      />
    </div>
  )
}