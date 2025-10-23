// src/components/admin/movies/MovieModal/tabs/AdvancedTab.tsx
import { useMovieModalContext } from '@/contexts/MovieModalContext'
import { MONTHS } from '@/lib/shared/dateUtils'
import AlternativeTitlesManager from '@/components/admin/AlternativeTitlesManager'
import MovieLinksManager from '@/components/admin/MovieLinksManager'
import MovieFormEnhanced from '@/components/admin/MovieFormEnhanced'

export default function AdvancedTab() {
  // Obtener todos los datos necesarios del context
  const {
    register,
    watch,
    setValue,

    // Filming date states
    isPartialFilmingStartDate,
    setIsPartialFilmingStartDate,
    partialFilmingStartDate,
    setPartialFilmingStartDate,
    isPartialFilmingEndDate,
    setIsPartialFilmingEndDate,
    partialFilmingEndDate,
    setPartialFilmingEndDate,

    // Data
    alternativeTitles,
    setAlternativeTitles,
    movieFormInitialData,
    movieLinks,
    editingMovie,

    // Handlers
    handleProductionCompaniesChange,
    handleDistributionCompaniesChange,
    handleThemesChange,
    handleLinksChange
  } = useMovieModalContext()

  const editingMovieId = editingMovie?.id

  return (
    <div className="space-y-6">
      {/* Fechas de Rodaje */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Fechas de Rodaje
        </h3>

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
              type="text"
              placeholder="DD/MM/YYYY"
              maxLength={10}
              {...register('filmingStartDate')}
              onChange={(e) => {
                let value = e.target.value.replace(/\D/g, '');
                if (value.length >= 2) value = value.slice(0, 2) + '/' + value.slice(2);
                if (value.length >= 5) value = value.slice(0, 5) + '/' + value.slice(5, 9);
                e.target.value = value;
                
                if (value.length === 10) {
                  const [day, month, year] = value.split('/');
                  if (day && month && year && year.length === 4) {
                    setValue('filmingStartDate', `${year}-${month}-${day}`);
                  }
                }
              }}
              onBlur={(e) => {
                const value = e.target.value;
                if (value.length === 10) {
                  const [day, month, year] = value.split('/');
                  if (day && month && year) {
                    setValue('filmingStartDate', `${year}-${month}-${day}`);
                  }
                }
              }}
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
              type="text"
              placeholder="DD/MM/YYYY"
              maxLength={10}
              {...register('filmingEndDate')}
              onChange={(e) => {
                let value = e.target.value.replace(/\D/g, '');
                if (value.length >= 2) value = value.slice(0, 2) + '/' + value.slice(2);
                if (value.length >= 5) value = value.slice(0, 5) + '/' + value.slice(5, 9);
                e.target.value = value;
                
                if (value.length === 10) {
                  const [day, month, year] = value.split('/');
                  if (day && month && year && year.length === 4) {
                    setValue('filmingEndDate', `${year}-${month}-${day}`);
                  }
                }
              }}
              onBlur={(e) => {
                const value = e.target.value;
                if (value.length === 10) {
                  const [day, month, year] = value.split('/');
                  if (day && month && year) {
                    setValue('filmingEndDate', `${year}-${month}-${day}`);
                  }
                }
              }}
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

      {/* Estado de Producción */}
      <div className="mt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Estado de Producción
        </h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Estado de la película
          </label>
          <select
            {...register('stage')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            defaultValue="COMPLETA"
          >
            <option value="COMPLETA">Completa</option>
            <option value="EN_DESARROLLO">En desarrollo</option>
            <option value="EN_POSTPRODUCCION">En postproducción</option>
            <option value="EN_PREPRODUCCION">En preproducción</option>
            <option value="EN_RODAJE">En rodaje</option>
            <option value="INCONCLUSA">Inconclusa</option>
            <option value="INEDITA">Inédita</option>
          </select>
          <p className="mt-1 text-sm text-gray-500">
            Indica el estado actual de producción de la película
          </p>
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

      {/* Títulos Alternativos */}
      <div className="mt-6">
        <AlternativeTitlesManager
          onChange={setAlternativeTitles}
          initialTitles={editingMovieId ? alternativeTitles : []}
        />
      </div>

      {/* Productoras y Distribuidoras */}
      <div className="mt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Producción y Distribución
        </h3>
        <MovieFormEnhanced
          key={`companies-${editingMovieId || 'new'}`}
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
      </div>

      {/* Notas Internas */}
      <div className="mt-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notas Internas
        </label>
        <textarea
          {...register('notes')}
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