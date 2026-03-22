// src/contexts/MovieModalContext.tsx
import React, { createContext, useContext, ReactNode } from 'react';
import { useMovieForm } from '@/hooks/useMovieForm';
import type {
  CastMemberEntry,
  CrewMemberEntry,
  AlternativeTitleEntry,
  TriviaEntry,
  MovieLinkEntry
} from '@/hooks/useMovieForm';
import { useValueChange } from '@/hooks/useValueChange';
import type { Movie, MovieFormData, PartialReleaseDate, PartialFilmingDate } from '@/lib/movies/movieTypes';
import type { UseFormReturn } from 'react-hook-form';
import { createLogger } from '@/lib/logger'

const log = createLogger('context:movieModal')

/** Rating option from the API */
interface RatingOption {
  id: number
  name: string
  abbreviation?: string | null
}

/** Color type option from the API */
interface ColorTypeOption {
  id: number
  name: string
}

/** Movie relations state */
interface MovieRelationsState {
  genres: number[]
  cast: CastMemberEntry[]
  crew: CrewMemberEntry[]
  countries: number[]
  productionCompanies: number[]
  distributionCompanies: number[]
  themes: number[]
  screeningVenues: number[]
}

interface MovieModalContextValue {
  // Form methods
  register: UseFormReturn<MovieFormData>['register'];
  handleSubmit: UseFormReturn<MovieFormData>['handleSubmit'];
  watch: UseFormReturn<MovieFormData>['watch'];
  setValue: UseFormReturn<MovieFormData>['setValue'];
  reset: UseFormReturn<MovieFormData>['reset'];
  control: UseFormReturn<MovieFormData>['control'];
  formState: UseFormReturn<MovieFormData>['formState'];

  // State
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isSubmitting: boolean;
  editingMovie: Movie | null;

  // Submit handler
  onSubmit: (data: MovieFormData) => Promise<void>;
  setShouldClose: (value: boolean) => void;

  // Date handling
  isPartialDate: boolean;
  setIsPartialDate: (value: boolean) => void;
  partialReleaseDate: PartialReleaseDate;
  setPartialReleaseDate: (value: PartialReleaseDate) => void;

  // Filming dates
  isPartialFilmingStartDate: boolean;
  setIsPartialFilmingStartDate: (value: boolean) => void;
  partialFilmingStartDate: PartialFilmingDate;
  setPartialFilmingStartDate: (value: PartialFilmingDate) => void;
  isPartialFilmingEndDate: boolean;
  setIsPartialFilmingEndDate: (value: boolean) => void;
  partialFilmingEndDate: PartialFilmingDate;
  setPartialFilmingEndDate: (value: PartialFilmingDate) => void;

  // UI states
  tipoDuracionDisabled: boolean;
  movieFormInitialData: Record<string, unknown> | null;
  alternativeTitles: AlternativeTitleEntry[];
  setAlternativeTitles: (titles: AlternativeTitleEntry[]) => void;
  trivia: TriviaEntry[];
  setTrivia: (trivia: TriviaEntry[]) => void;
  movieLinks: MovieLinkEntry[];

  // Metadata
  availableRatings: RatingOption[];
  availableColorTypes: ColorTypeOption[];

  // Relation handlers
  handleGenresChange: (genres: number[]) => void;
  handleLinksChange: (links: MovieLinkEntry[]) => void;
  handleCastChange: (cast: CastMemberEntry[]) => void;
  handleCrewChange: (crew: CrewMemberEntry[]) => void;
  handleCountriesChange: (countries: number[]) => void;
  handleProductionCompaniesChange: (companies: number[]) => void;
  handleDistributionCompaniesChange: (companies: number[]) => void;
  handleThemesChange: (themes: number[]) => void;
  handleScreeningVenuesChange: (venues: number[]) => void;

  // Estado de relaciones (fuente única de verdad para cast/crew)
  movieRelations: MovieRelationsState;

  // Mutaciones granulares para cast
  addCastMember: (overrides?: Partial<CastMemberEntry>) => void;
  removeCastMember: (index: number) => void;
  updateCastMember: (index: number, updates: Partial<CastMemberEntry>) => void;
  reorderCast: (oldIndex: number, newIndex: number) => void;

  // Mutaciones granulares para crew
  addCrewMember: (overrides?: Partial<CrewMemberEntry>) => void;
  removeCrewMember: (index: number) => void;
  updateCrewMember: (index: number, updates: Partial<CrewMemberEntry>) => void;
  reorderCrew: (oldIndex: number, newIndex: number) => void;

  // Functions
  loadMovieData: (movie: Movie) => Promise<void>;
  resetForNewMovie: () => void;
}

const MovieModalContext = createContext<MovieModalContextValue | null>(null);

interface MovieModalProviderProps {
  children: ReactNode;
  editingMovie: Movie | null;
  onSuccess?: (movie: Movie) => void;
  onError?: (error: Error) => void;
}

export function MovieModalProvider({
  children,
  editingMovie,
  onSuccess,
  onError
}: MovieModalProviderProps) {
  const movieFormData = useMovieForm({
    editingMovie,
    onSuccess,
    onError
  });

  // Cargar datos cuando cambia editingMovie
  useValueChange(editingMovie, (movie, prevMovie) => {
    if (movie) {
      log.debug('Loading movie data for editing', { id: movie.id })

      movieFormData.loadMovieData(movie).then(() => {
        log.debug('Movie data loaded successfully', { id: movie.id })
      }).catch(error => {
        log.error('Failed to load movie data', error)
        if (onError) {
          onError(error instanceof Error ? error : new Error('Error loading movie data'))
        }
      })
    } else if (prevMovie !== null) {
      log.debug('Resetting form, no editing movie')
      movieFormData.resetForNewMovie()
    }
  });

  return (
    <MovieModalContext.Provider value={{
      ...movieFormData,
      editingMovie
    }}>
      {children}
    </MovieModalContext.Provider>
  );
}

export function useMovieModalContext() {
  const context = useContext(MovieModalContext);
  if (!context) {
    throw new Error('useMovieModalContext must be used within MovieModalProvider');
  }
  return context;
}

// Uso simplificado:
// <MovieModalProvider editingMovie={movie} onSuccess={handleSuccess}>
//   <MovieModal />  {/* ¡Sin props! */}
// </MovieModalProvider>
