// src/components/admin/movies/MovieModal/tabs/CrewTab.tsx
import { useMovieModalContext } from '@/contexts/MovieModalContext'
import MovieFormEnhanced from '@/components/admin/MovieFormEnhanced'

export default function CrewTab() {
  // Obtener datos necesarios del context
  const {
    handleCrewChange,
    movieFormInitialData,
    editingMovie
  } = useMovieModalContext()

  const editingMovieId = editingMovie?.id

  return (
    <MovieFormEnhanced
      key={editingMovieId || 'new'}
      onGenresChange={() => {}}
      onCastChange={() => {}}
      onCrewChange={handleCrewChange}
      onCountriesChange={() => {}}
      onProductionCompaniesChange={() => {}}
      onDistributionCompaniesChange={() => {}}
      onThemesChange={() => {}}
      onScreeningVenuesChange={() => { }}
      initialData={movieFormInitialData}
      showOnlyCrew={true}
    />
  )
}