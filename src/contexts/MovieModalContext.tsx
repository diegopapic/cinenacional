// src/contexts/MovieModalContext.tsx
import React, { createContext, useContext, useEffect, ReactNode } from 'react';
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

  // Cargar datos automáticamente cuando cambia editingMovie
  useEffect(() => {
    if (editingMovie) {
      console.log('🔄 Loading movie data for editing:', editingMovie.title)
      movieFormData.loadMovieData(editingMovie).catch(error => {
        console.error('❌ Error loading movie data:', error)
        if (onError) {
          onError(error instanceof Error ? error : new Error('Error loading movie data'))
        }
      })
    } else {
      // Si no hay película editándose, resetear para nueva película
      movieFormData.resetForNewMovie()
    }
  }, [editingMovie?.id])

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