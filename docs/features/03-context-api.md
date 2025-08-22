# Context API y State Management

y State Management

### MovieModalContext

**Ubicación**: `/src/contexts/MovieModalContext.tsx`

Context centralizado que **elimina completamente el props drilling** en MovieModal.

#### Arquitectura del Context

```typescript
interface MovieModalContextValue {
  // Form methods from React Hook Form
  register: any;
  handleSubmit: any;
  watch: any;
  setValue: any;
  reset: any;
  control: any;
  formState: any;
  getValues: any;
  trigger: any;
  clearErrors: any;
  setError: any;
  setFocus: any;
  getFieldState: any;
  resetField: any;
  unregister: any;
  
  // UI State
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isSubmitting: boolean;
  editingMovie: Movie | null;
  
  // Submit handler
  onSubmit: (data: any) => Promise<void>;
  
  // Fechas parciales (3 sistemas)
  isPartialDate: boolean;
  setIsPartialDate: (value: boolean) => void;
  partialReleaseDate: any;
  setPartialReleaseDate: (value: any) => void;
  isPartialFilmingStartDate: boolean;
  setIsPartialFilmingStartDate: (value: boolean) => void;
  partialFilmingStartDate: any;
  setPartialFilmingStartDate: (value: any) => void;
  isPartialFilmingEndDate: boolean;
  setIsPartialFilmingEndDate: (value: boolean) => void;
  partialFilmingEndDate: any;
  setPartialFilmingEndDate: (value: any) => void;
  
  // Duration
  tipoDuracionDisabled: boolean;
  
  // Metadata
  availableRatings: any[];
  availableColorTypes: any[];
  movieFormInitialData: any;
  
  // Relation handlers (9 handlers)
  handleGenresChange: (genres: number[]) => void;
  handleCastChange: (cast: any[]) => void;
  handleCrewChange: (crew: any[]) => void;
  handleCountriesChange: (countries: number[]) => void;
  handleProductionCompaniesChange: (companies: number[]) => void;
  handleDistributionCompaniesChange: (companies: number[]) => void;
  handleThemesChange: (themes: number[]) => void;
  handleScreeningVenuesChange: (venues: number[]) => void;
  handleLinksChange: (links: any[]) => void;
  
  // Data management
  alternativeTitles: any[];
  setAlternativeTitles: (titles: any[]) => void;
  movieLinks: any[];
  
  // Core functions
  loadMovieData: (movie: Movie) => Promise<void>;
  resetForNewMovie: () => void;
}
```

#### Funcionalidades del Context

**1. Carga Automática de Datos:**
```typescript
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
    movieFormData.resetForNewMovie()
  }
}, [editingMovie?.id])
```

**2. Provider Simplificado:**
```typescript
<MovieModalProvider 
  editingMovie={editingMovie}
  onSuccess={handleMovieSuccess}
  onError={handleMovieError}
>
  <MovieModal 
    isOpen={showModal}
    onClose={handleCloseModal}
  />
</MovieModalProvider>
```

#### Beneficios Conseguidos

✅ **Eliminación Total del Props Drilling**: De 46 props a 2 props  
✅ **Componentes Desacoplados**: Cada tab accede directamente al Context  
✅ **Mantenibilidad Mejorada**: Cambios centralizados  
✅ **Testing Simplificado**: Cada componente es independiente  
✅ **Performance Optimizada**: No re-renders por props drilling  

### Uso del Context en Componentes

**Antes (Props Drilling):**
```typescript
// ❌ 20+ props por componente
<BasicInfoTab 
  register={register}
  watch={watch}
  setValue={setValue}
  errors={errors}
  isPartialDate={isPartialDate}
  setIsPartialDate={setIsPartialDate}
  partialReleaseDate={partialReleaseDate}
  setPartialReleaseDate={setPartialReleaseDate}
  availableRatings={availableRatings}
  availableColorTypes={availableColorTypes}
  handleGenresChange={handleGenresChange}
  handleCountriesChange={handleCountriesChange}
  handleThemesChange={handleThemesChange}
  // ... 15+ props más
/>
```

**Después (Context API):**
```typescript
// ✅ Sin props, datos del Context
<BasicInfoTab />

// Dentro del componente:
export default function BasicInfoTab() {
  const {
    register,
    watch,
    setValue,
    formState,
    isPartialDate,
    setIsPartialDate,
    partialReleaseDate,
    setPartialReleaseDate,
    availableRatings,
    availableColorTypes,
    handleGenresChange,
    handleCountriesChange,
    handleThemesChange,
    // ... todos los datos necesarios
  } = useMovieModalContext()
  
  const errors = formState?.errors || {}
  // ... resto del componente
}
```

---