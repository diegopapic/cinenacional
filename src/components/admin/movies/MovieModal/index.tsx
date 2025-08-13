// src/components/admin/movies/MovieModal/index.tsx
import * as Tabs from '@radix-ui/react-tabs'
import { UseFormRegister, UseFormHandleSubmit, UseFormWatch, UseFormSetValue, UseFormReset, FieldErrors } from 'react-hook-form'
import { MovieFormData, Movie, PartialReleaseDate, PartialFilmingDate } from '@/lib/movies/movieTypes'

// Componentes del modal
import MovieModalHeader from './MovieModalHeader'
import MovieModalTabs from './MovieModalTabs'
import MovieModalFooter from './MovieModalFooter'

// Tabs
import BasicInfoTab from './tabs/BasicInfoTab'
import MediaTab from './tabs/MediaTab'
import CastTab from './tabs/CastTab'
import CrewTab from './tabs/CrewTab'
import AdvancedTab from './tabs/AdvancedTab'

interface MovieModalProps {
  isOpen: boolean
  onClose: () => void
  editingMovie: Movie | null
  onSubmit: (data: MovieFormData) => Promise<void>
  isSubmitting: boolean

  // Props del formulario
  register: UseFormRegister<MovieFormData>
  handleSubmit: UseFormHandleSubmit<MovieFormData>
  watch: UseFormWatch<MovieFormData>
  setValue: UseFormSetValue<MovieFormData>
  reset: UseFormReset<MovieFormData>
  errors: FieldErrors<MovieFormData>

  // Estados que necesitamos pasar
  activeTab: string
  setActiveTab: (tab: string) => void
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

  // Metadata
  availableRatings: any[]
  availableColorTypes: any[]

  // Relaciones
  movieFormInitialData: any
  alternativeTitles: any[]
  setAlternativeTitles: (titles: any[]) => void
  movieLinks: any[]

  // Callbacks
  handleGenresChange: (genres: number[]) => void
  handleCastChange: (cast: any[]) => void
  handleCrewChange: (crew: any[]) => void
  handleCountriesChange: (countries: number[]) => void
  handleProductionCompaniesChange: (companies: number[]) => void
  handleDistributionCompaniesChange: (companies: number[]) => void
  handleThemesChange: (themes: number[]) => void
  handleLinksChange: (links: any[]) => void
}

export default function MovieModal({
  isOpen,
  onClose,
  editingMovie,
  onSubmit,
  isSubmitting,
  register,
  handleSubmit,
  watch,
  setValue,
  reset,
  errors,
  activeTab,
  setActiveTab,
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
  availableRatings,
  availableColorTypes,
  movieFormInitialData,
  alternativeTitles,
  setAlternativeTitles,
  movieLinks,
  handleGenresChange,
  handleCastChange,
  handleCrewChange,
  handleCountriesChange,
  handleProductionCompaniesChange,
  handleDistributionCompaniesChange,
  handleThemesChange,
  handleLinksChange
}: MovieModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <MovieModalHeader 
          isEditing={!!editingMovie} 
          onClose={onClose} 
        />

        <form onSubmit={handleSubmit(onSubmit)} className="overflow-y-auto max-h-[calc(90vh-8rem)]">
          <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="w-full">
            <MovieModalTabs 
              activeTab={activeTab} 
              onTabChange={setActiveTab} 
            />

            <div className="p-6">
              <Tabs.Content value="basic">
                <BasicInfoTab
                  register={register}
                  watch={watch}
                  setValue={setValue}
                  errors={errors}
                  isPartialDate={isPartialDate}
                  setIsPartialDate={setIsPartialDate}
                  partialReleaseDate={partialReleaseDate}
                  setPartialReleaseDate={setPartialReleaseDate}
                  tipoDuracionDisabled={tipoDuracionDisabled}
                  isPartialFilmingStartDate={isPartialFilmingStartDate}
                  setIsPartialFilmingStartDate={setIsPartialFilmingStartDate}
                  partialFilmingStartDate={partialFilmingStartDate}
                  setPartialFilmingStartDate={setPartialFilmingStartDate}
                  isPartialFilmingEndDate={isPartialFilmingEndDate}
                  setIsPartialFilmingEndDate={setIsPartialFilmingEndDate}
                  partialFilmingEndDate={partialFilmingEndDate}
                  setPartialFilmingEndDate={setPartialFilmingEndDate}
                  movieFormInitialData={movieFormInitialData}
                  movieLinks={movieLinks}
                  handleGenresChange={handleGenresChange}
                  handleCountriesChange={handleCountriesChange}
                  handleThemesChange={handleThemesChange}
                  handleLinksChange={handleLinksChange}
                  editingMovieId={editingMovie?.id}
                />
              </Tabs.Content>

              <Tabs.Content value="media">
                <MediaTab
                  register={register}
                  watch={watch}
                  setValue={setValue}
                  editingMovieId={editingMovie?.id}
                />
              </Tabs.Content>

              <Tabs.Content value="cast">
                <CastTab
                  handleCastChange={handleCastChange}
                  movieFormInitialData={movieFormInitialData}
                  editingMovieId={editingMovie?.id}
                />
              </Tabs.Content>

              <Tabs.Content value="crew">
                <CrewTab
                  handleCrewChange={handleCrewChange}
                  movieFormInitialData={movieFormInitialData}
                  editingMovieId={editingMovie?.id}
                />
              </Tabs.Content>

              <Tabs.Content value="advanced">
                <AdvancedTab
                  register={register}
                  watch={watch}
                  availableRatings={availableRatings}
                  availableColorTypes={availableColorTypes}
                  alternativeTitles={alternativeTitles}
                  setAlternativeTitles={setAlternativeTitles}
                  movieFormInitialData={movieFormInitialData}
                  handleProductionCompaniesChange={handleProductionCompaniesChange}
                  handleDistributionCompaniesChange={handleDistributionCompaniesChange}
                  editingMovieId={editingMovie?.id}
                />
              </Tabs.Content>
            </div>
          </Tabs.Root>

          <MovieModalFooter
            isSubmitting={isSubmitting}
            isEditing={!!editingMovie}
            onCancel={onClose}
            errors={errors}
          />
        </form>
      </div>
    </div>
  )
}