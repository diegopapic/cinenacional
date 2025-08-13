// src/components/admin/movies/MovieModal/tabs/CastTab.tsx
import MovieFormEnhanced from '@/components/admin/MovieFormEnhanced'

interface CastTabProps {
  handleCastChange: (cast: any[]) => void
  movieFormInitialData: any
  editingMovieId?: number
}

export default function CastTab({ 
  handleCastChange, 
  movieFormInitialData,
  editingMovieId 
}: CastTabProps) {
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
      initialData={movieFormInitialData}
      showOnlyCast={true}
    />
  )
}