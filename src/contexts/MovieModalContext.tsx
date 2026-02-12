// src/contexts/MovieModalContext.tsx
import React, { createContext, useContext, useEffect, useRef, ReactNode } from 'react';
import { useMovieForm } from '@/hooks/useMovieForm';
import type { Movie } from '@/lib/movies/movieTypes';

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

  // Ref para trackear la última película cargada y evitar recargas innecesarias
  const lastLoadedMovieRef = useRef<number | null>(null);
  const loadCounterRef = useRef(0);

  // Cargar datos automáticamente cuando cambia editingMovie
  useEffect(() => {
    if (editingMovie) {
      // Incrementar counter para forzar recarga incluso si es la misma película
      loadCounterRef.current += 1;
      const currentLoad = loadCounterRef.current;

      console.log(`🔄 [Load #${currentLoad}] Loading movie data for editing:`, editingMovie.title, '(id:', editingMovie.id, ')')
      lastLoadedMovieRef.current = editingMovie.id;

      movieFormData.loadMovieData(editingMovie).then(() => {
        console.log(`✅ [Load #${currentLoad}] Movie data loaded successfully for:`, editingMovie.title)
      }).catch(error => {
        console.error(`❌ [Load #${currentLoad}] Error loading movie data:`, error)
        if (onError) {
          onError(error instanceof Error ? error : new Error('Error loading movie data'))
        }
      })
    } else {
      // Si no hay película editándose, resetear para nueva película
      if (lastLoadedMovieRef.current !== null) {
        console.log('🧹 Resetting form (editingMovie set to null)')
        lastLoadedMovieRef.current = null;
        movieFormData.resetForNewMovie()
      }
    }
  }, [editingMovie])

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