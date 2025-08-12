// src/components/admin/movies/MovieModal/tabs/BasicInfoTab.tsx
import { UseFormRegister, UseFormWatch, UseFormSetValue, FieldErrors } from 'react-hook-form'
import { MovieFormData, PartialReleaseDate, PartialFilmingDate } from '@/lib/movies/movieTypes'
import { MOVIE_STATUS, MONTHS, TIPOS_DURACION, DATA_COMPLETENESS_LEVELS } from '@/lib/movies/movieConstants'
import { getErrorMessage } from '@/lib/movies/movieUtils'
import MovieFormEnhanced from '@/components/admin/MovieFormEnhanced'
import MovieLinksManager from '@/components/admin/MovieLinksManager'

interface BasicInfoTabProps {
  register: UseFormRegister<MovieFormData>
  watch: UseFormWatch<MovieFormData>
  setValue: UseFormSetValue<MovieFormData>
  errors: FieldErrors<MovieFormData>
  
  // Estados específicos
  isPartialDate: boolean
  setIsPartialDate: (value: boolean) => void
  partialReleaseDate: PartialReleaseDate
  setPartialReleaseDate: (value: PartialReleaseDate) => void
  tipoDuracionDisabled: boolean
  
  // Estados para fechas de rodaje
  isPartialFilmingStartDate: boolean
  setIsPartialFilmingStartDate: (value: boolean) => void
  partialFilmingStartDate: PartialFilmingDate
  setPartialFilmingStartDate: (value: PartialFilmingDate) => void
  
  isPartialFilmingEndDate: boolean
  setIsPartialFilmingEndDate: (value: boolean) => void
  partialFilmingEndDate: PartialFilmingDate
  setPartialFilmingEndDate: (value: PartialFilmingDate) => void
  
  // Datos y callbacks
  movieFormInitialData: any
  movieLinks: any[]
  handleGenresChange: (genres: number[]) => void
  handleCountriesChange: (countries: number[]) => void
  handleLanguagesChange: (languages: number[]) => void
  handleThemesChange: (themes: number[]) => void
  handleLinksChange: (links: any[]) => void
  
  editingMovieId?: number
}

export default function BasicInfoTab({
  register,
  watch,
  setValue,
  errors,
  isPartialDate,
  setIsPartialDate,
  partialReleaseDate,
  setPartialReleaseDate,
  tipoDuracionDisabled,
  isPartialFilmingStartDate,
  setIsPartialFilmingStartDate,
  partialFilmingStartDate,
  setPartialFilmingStartDate,
  isPartialFilmingEndDate,
  setIsPartialFilmingEndDate,
  partialFilmingEndDate,
  setPartialFilmingEndDate,
  movieFormInitialData,
  movieLinks,
  handleGenresChange,
  handleCountriesChange,
  handleLanguagesChange,
  handleThemesChange,
  handleLinksChange,
  editingMovieId
}: BasicInfoTabProps) {
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
                <input
                  type="date"
                  {...register('releaseDate')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
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

          {/* Fechas de rodaje */}
          <div className="space-y-4">
            {/* Fecha Inicio de Rodaje */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Inicio de Rodaje
              </label>

              <div className="mb-2">
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={isPartialFilmingStartDate}
                    onChange={(e) => setIsPartialFilmingStartDate(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-600">
                    Fecha incompleta
                  </span>
                </label>
              </div>

              {!isPartialFilmingStartDate ? (
                <input
                  type="date"
                  {...register('filmingStartDate')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />
              ) : (
                <div className="flex gap-2">
                  <div className="flex-1">
                    <input
                      type="number"
                      placeholder="Año"
                      min="1800"
                      max="2100"
                      value={partialFilmingStartDate.year || ''}
                      onChange={(e) => setPartialFilmingStartDate({
                        ...partialFilmingStartDate,
                        year: e.target.value ? parseInt(e.target.value) : null
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    />
                  </div>
                  <div className="flex-1">
                    <select
                      value={partialFilmingStartDate.month || ''}
                      onChange={(e) => setPartialFilmingStartDate({
                        ...partialFilmingStartDate,
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

            {/* Fecha Fin de Rodaje */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Fin de Rodaje
              </label>

              <div className="mb-2">
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={isPartialFilmingEndDate}
                    onChange={(e) => setIsPartialFilmingEndDate(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-600">
                    Fecha incompleta
                  </span>
                </label>
              </div>

              {!isPartialFilmingEndDate ? (
                <input
                  type="date"
                  {...register('filmingEndDate')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />
              ) : (
                <div className="flex gap-2">
                  <div className="flex-1">
                    <input
                      type="number"
                      placeholder="Año"
                      min="1800"
                      max="2100"
                      value={partialFilmingEndDate.year || ''}
                      onChange={(e) => setPartialFilmingEndDate({
                        ...partialFilmingEndDate,
                        year: e.target.value ? parseInt(e.target.value) : null
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    />
                  </div>
                  <div className="flex-1">
                    <select
                      value={partialFilmingEndDate.month || ''}
                      onChange={(e) => setPartialFilmingEndDate({
                        ...partialFilmingEndDate,
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
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 ${
                tipoDuracionDisabled ? 'bg-gray-100' : ''
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

        </div>

        {/* Columna derecha */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Información Adicional
          </h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sinopsis
            </label>
            <textarea
              {...register('synopsis')}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
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

      {/* Links Oficiales */}
      <div className="mt-6">
        <MovieLinksManager
          key={`links-${editingMovieId || 'new'}-${movieLinks.length}`}
          initialLinks={movieLinks}
          onLinksChange={handleLinksChange}
        />
      </div>

      {/* Géneros, Países e Idiomas */}
      <MovieFormEnhanced
        key={editingMovieId || 'new'}
        onGenresChange={handleGenresChange}
        onCastChange={() => {}}
        onCrewChange={() => {}}
        onCountriesChange={handleCountriesChange}
        onLanguagesChange={handleLanguagesChange}
        onProductionCompaniesChange={() => {}}
        onDistributionCompaniesChange={() => {}}
        onThemesChange={handleThemesChange}
        initialData={movieFormInitialData}
        showOnlyBasicInfo={true}
      />
    </div>
  )
}