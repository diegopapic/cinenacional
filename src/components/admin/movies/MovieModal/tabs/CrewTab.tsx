// src/components/admin/movies/MovieModal/tabs/CrewTab.tsx
import MovieFormEnhanced from '@/components/admin/MovieFormEnhanced'

interface CrewTabProps {
  handleCrewChange: (crew: any[]) => void
  movieFormInitialData: any
  editingMovieId?: number
}

export default function CrewTab({ 
  handleCrewChange, 
  movieFormInitialData,
  editingMovieId 
}: CrewTabProps) {
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
      initialData={movieFormInitialData}
      showOnlyCrew={true}
    />
  )
}