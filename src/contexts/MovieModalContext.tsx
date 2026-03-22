// src/contexts/MovieModalContext.tsx
import React, { createContext, useContext, ReactNode } from 'react';
import { useMovieForm } from '@/hooks/useMovieForm';
import { useValueChange } from '@/hooks/useValueChange';
import type { Movie } from '@/lib/movies/movieTypes';
import { createLogger } from '@/lib/logger'

const log = createLogger('context:movieModal')

interface MovieModalContextValue {
  // Form methods
  register: any;
  handleSubmit: any;
  watch: any;
  setValue: any;
  reset: any;
  control: any;
  formState: any;
  
  // State
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isSubmitting: boolean;
  editingMovie: Movie | null;
  
  // Submit handler
  onSubmit: (data: any) => Promise<void>;
  setShouldClose: (value: boolean) => void;
  
  // Date handling
  isPartialDate: boolean;
  setIsPartialDate: (value: boolean) => void;
  partialReleaseDate: any;
  setPartialReleaseDate: (value: any) => void;
  
  // Filming dates
  isPartialFilmingStartDate: boolean;
  setIsPartialFilmingStartDate: (value: boolean) => void;
  partialFilmingStartDate: any;
  setPartialFilmingStartDate: (value: any) => void;
  isPartialFilmingEndDate: boolean;
  setIsPartialFilmingEndDate: (value: boolean) => void;
  partialFilmingEndDate: any;
  setPartialFilmingEndDate: (value: any) => void;
  
  // UI states
  tipoDuracionDisabled: boolean;
  movieFormInitialData: any;
  alternativeTitles: any[];
  setAlternativeTitles: (titles: any[]) => void;
  trivia: any[];
  setTrivia: (trivia: any[]) => void;
  movieLinks: any[];
  
  // Metadata
  availableRatings: any[];
  availableColorTypes: any[];
  
  // Relation handlers
  handleGenresChange: (genres: number[]) => void;
  handleLinksChange: (links: any[]) => void;
  handleCastChange: (cast: any[]) => void;
  handleCrewChange: (crew: any[]) => void;
  handleCountriesChange: (countries: number[]) => void;
  handleProductionCompaniesChange: (companies: number[]) => void;
  handleDistributionCompaniesChange: (companies: number[]) => void;
  handleThemesChange: (themes: number[]) => void;
  handleScreeningVenuesChange: (venues: number[]) => void;

  // Estado de relaciones (fuente única de verdad para cast/crew)
  movieRelations: {
    genres: number[];
    cast: any[];
    crew: any[];
    countries: number[];
    productionCompanies: number[];
    distributionCompanies: number[];
    themes: number[];
    screeningVenues: number[];
  };

  // Mutaciones granulares para cast
  addCastMember: (overrides?: Partial<any>) => void;
  removeCastMember: (index: number) => void;
  updateCastMember: (index: number, updates: Partial<any>) => void;
  reorderCast: (oldIndex: number, newIndex: number) => void;

  // Mutaciones granulares para crew
  addCrewMember: (overrides?: Partial<any>) => void;
  removeCrewMember: (index: number) => void;
  updateCrewMember: (index: number, updates: Partial<any>) => void;
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