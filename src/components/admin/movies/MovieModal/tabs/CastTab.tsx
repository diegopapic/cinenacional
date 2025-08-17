// src/components/admin/movies/MovieModal/tabs/CastTab.tsx
import { useMovieModalContext } from '@/contexts/MovieModalContext'
import MovieFormEnhanced from '@/components/admin/MovieFormEnhanced'

export default function CastTab() {
  // Obtener datos necesarios del context
  const {
    handleCastChange,
    movieFormInitialData,
    editingMovie
  } = useMovieModalContext()

  const editingMovieId = editingMovie?.id

  return (
    <MovieFormEnhanced
      key={editingMovieId || 'new'}
      onGenresChange={() => {}}
      onCastChange={handleCastChange}
      onCrewChange={() => {}}
      onCountriesChange={() => {}}
      onProductionCompaniesChange={() => {}}
      onDistributionCompaniesChange={() => {}}
      onThemesChange={() => {}}
      onScreeningVenuesChange={() => { }}
      initialData={movieFormInitialData}
      showOnlyCast={true}
    />
  )
}