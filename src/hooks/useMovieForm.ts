// src/hooks/useMovieForm.ts
import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'react-hot-toast'
import { 
  movieFormSchema, 
  MovieFormData, 
  Movie, 
  PartialReleaseDate 
} from '@/lib/movies/movieTypes'
import { 
  calcularTipoDuracion, 
  prepareMovieData 
} from '@/lib/movies/movieUtils'
import { moviesService } from '@/services'

interface UseMovieFormProps {
  editingMovie: Movie | null
  onSuccess: () => void
}

export function useMovieForm({ editingMovie, onSuccess }: UseMovieFormProps) {
  // Estados del formulario
  const [activeTab, setActiveTab] = useState('basic')
  const [isPartialDate, setIsPartialDate] = useState(false)
  const [partialReleaseDate, setPartialReleaseDate] = useState<PartialReleaseDate>({
    year: null,
    month: null
  })
  const [tipoDuracionDisabled, setTipoDuracionDisabled] = useState(false)
  const [movieFormInitialData, setMovieFormInitialData] = useState<any>(null)
  
  // Estados de metadata
  const [availableRatings, setAvailableRatings] = useState<any[]>([])
  const [availableColorTypes, setAvailableColorTypes] = useState<any[]>([])
  
  // Estados de relaciones
  const [movieRelations, setMovieRelations] = useState<{
    genres: number[];
    cast: any[];
    crew: any[];
    countries: number[];
    languages: number[];
    productionCompanies: number[];
    distributionCompanies: number[];
    themes: number[];
  }>({
    genres: [],
    cast: [],
    crew: [],
    countries: [],
    languages: [],
    productionCompanies: [],
    distributionCompanies: [],
    themes: []
  })
  
  // Estados adicionales
  const [alternativeTitles, setAlternativeTitles] = useState<any[]>([])
  const [movieLinks, setMovieLinks] = useState<any[]>([])
  
  // React Hook Form
  const form = useForm<MovieFormData>({
    resolver: zodResolver(movieFormSchema),
    defaultValues: {
      stage: 'COMPLETA'
    }
  })
  
  const { watch, setValue, reset } = form
  
  // Cargar metadata (ratings y color types)
  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const [ratingsRes, colorTypesRes] = await Promise.all([
          fetch('/api/calificaciones'),
          fetch('/api/color-types')
        ])
        
        if (ratingsRes.ok) {
          const ratings = await ratingsRes.json()
          setAvailableRatings(ratings)
        }
        
        if (colorTypesRes.ok) {
          const colorTypes = await colorTypesRes.json()
          setAvailableColorTypes(colorTypes)
        }
      } catch (error) {
        console.error('Error loading metadata:', error)
      }
    }
    
    loadMetadata()
  }, [])
  
  // Efecto para observar cambios en duración
  useEffect(() => {
    const subscription = watch((value, { name, type }) => {
      if ((name === 'duration' || name === 'durationSeconds') && type === 'change') {
        const minutos = value.duration
        const segundos = value.durationSeconds
        const hayDuracion = (minutos && minutos > 0) || (segundos && segundos > 0)

        if (hayDuracion) {
          const tipoCalculado = calcularTipoDuracion(minutos, segundos)
          const tipoActual = value.tipoDuracion

          if (tipoCalculado !== tipoActual) {
            setValue('tipoDuracion', tipoCalculado, { shouldValidate: false })
          }
          setTipoDuracionDisabled(true)
        } else {
          setTipoDuracionDisabled(false)
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [watch, setValue])
  
  // Callbacks para actualizar relaciones
  const handleGenresChange = useCallback((genres: number[]) => {
    setMovieRelations(prev => ({ ...prev, genres }))
  }, [])

  const handleLinksChange = useCallback((links: any[]) => {
    setMovieLinks(links)
  }, [])

  const handleCastChange = useCallback((cast: any[]) => {
    setMovieRelations(prev => ({ ...prev, cast }))
  }, [])

  const handleCrewChange = useCallback((crew: any[]) => {
    setMovieRelations(prev => ({ ...prev, crew }))
  }, [])

  const handleCountriesChange = useCallback((countries: number[]) => {
    setMovieRelations(prev => ({ ...prev, countries }))
  }, [])

  const handleLanguagesChange = useCallback((languages: number[]) => {
    setMovieRelations(prev => ({ ...prev, languages }))
  }, [])

  const handleProductionCompaniesChange = useCallback((companies: number[]) => {
    setMovieRelations(prev => ({ ...prev, productionCompanies: companies }))
  }, [])

  const handleThemesChange = useCallback((themes: number[]) => {
    setMovieRelations(prev => ({ ...prev, themes }))
  }, [])

  const handleDistributionCompaniesChange = useCallback((companies: number[]) => {
    setMovieRelations(prev => ({ ...prev, distributionCompanies: companies }))
  }, [])
  
  // Función para cargar datos de película existente
  const loadMovieData = useCallback(async (movie: Movie) => {
    try {
      console.log('Intentando cargar película con ID:', movie.id)
      const fullMovie = await moviesService.getById(movie.id)
      console.log('Película cargada:', fullMovie)
      
      // Configurar tipo de duración
      const minutos = fullMovie.duration
      const segundos = fullMovie.durationSeconds
      const hayDuracion = (minutos && minutos > 0) || (segundos && segundos > 0)

      if (hayDuracion) {
        const tipoCalculado = calcularTipoDuracion(minutos, segundos)
        setValue('tipoDuracion', tipoCalculado)
        setTipoDuracionDisabled(true)
      } else {
        setValue('tipoDuracion', fullMovie.tipoDuracion || '')
        setTipoDuracionDisabled(false)
      }
      
      // Configurar títulos alternativos
      if (fullMovie.alternativeTitles) {
        setAlternativeTitles(fullMovie.alternativeTitles)
      }
      
      // Llenar el formulario
      Object.keys(fullMovie).forEach((key) => {
        if (key === 'metaKeywords' && Array.isArray(fullMovie[key])) {
          setValue(key as any, fullMovie[key].join(', '))
        } else if (key === 'releaseDate' && fullMovie[key]) {
          setValue(key as any, new Date(fullMovie[key]).toISOString().split('T')[0])
          setIsPartialDate(false)
        } else if (key === 'filmingStartDate' && fullMovie[key]) {
          setValue(key as any, new Date(fullMovie[key]).toISOString().split('T')[0])
        } else if (key === 'filmingEndDate' && fullMovie[key]) {
          setValue(key as any, new Date(fullMovie[key]).toISOString().split('T')[0])
        } else if (key === 'durationSeconds') {
          setValue(key as any, fullMovie[key] || 0)
        } else if (key === 'colorType' && fullMovie[key]) {
          setValue('colorTypeId' as any, fullMovie[key].id)
        } else {
          setValue(key as any, fullMovie[key])
        }
      })
      
      // Manejar fecha parcial
      if (fullMovie.releaseYear && !fullMovie.releaseDate) {
        setIsPartialDate(true)
        setPartialReleaseDate({
          year: fullMovie.releaseYear,
          month: fullMovie.releaseMonth || null
        })
        
        if (fullMovie.releaseDay) {
          setIsPartialDate(false)
          const dateStr = `${fullMovie.releaseYear}-${String(fullMovie.releaseMonth || 1).padStart(2, '0')}-${String(fullMovie.releaseDay || 1).padStart(2, '0')}`
          setValue('releaseDate', dateStr)
        }
      } else if (!fullMovie.releaseYear && !fullMovie.releaseDate) {
        setIsPartialDate(false)
        setPartialReleaseDate({ year: null, month: null })
      }
      
      // Configurar valores por defecto
      if (!fullMovie.stage) {
        setValue('stage', 'COMPLETA')
      }
      setValue('dataCompleteness', fullMovie.dataCompleteness || 'BASIC_PRESS_KIT')
      
      if (fullMovie.ratingId) {
        setValue('ratingId', fullMovie.ratingId)
      }
      
      // Configurar datos iniciales y relaciones
      setMovieFormInitialData({
        genres: fullMovie.genres || [],
        cast: fullMovie.cast || [],
        crew: fullMovie.crew || [],
        countries: fullMovie.movieCountries || [],
        languages: fullMovie.languages || [],
        productionCompanies: fullMovie.productionCompanies || [],
        distributionCompanies: fullMovie.distributionCompanies || [],
        themes: fullMovie.themes || []
      })
      
      if (fullMovie.links) {
        setMovieLinks(fullMovie.links)
      }
      
      // Configurar relaciones
      setMovieRelations({
        genres: fullMovie.genres?.map((g: any) => g.genreId) || [],
        cast: fullMovie.cast?.map((c: any) => ({
          personId: c.personId,
          characterName: c.characterName,
          billingOrder: c.billingOrder,
          isPrincipal: c.isPrincipal
        })) || [],
        crew: fullMovie.crew?.map((c: any) => ({
          personId: c.personId,
          role: c.role,
          department: c.department,
          billingOrder: c.billingOrder
        })) || [],
        countries: fullMovie.movieCountries?.map((c: any) => c.countryId) || [],
        languages: fullMovie.languages?.map((l: any) => l.languageId) || [],
        productionCompanies: fullMovie.productionCompanies?.map((c: any) => c.companyId) || [],
        distributionCompanies: fullMovie.distributionCompanies?.map((c: any) => c.companyId) || [],
        themes: fullMovie.themes?.map((t: any) => t.themeId) || []
      })
      
    } catch (error) {
      console.error('Error completo en loadMovieData:', error)
      console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack')
      toast.error('Error al cargar los datos de la película')
      throw error
    }
  }, [setValue])
  
  // Función submit
  const onSubmit = async (data: MovieFormData) => {
    try {
      // Preparar los datos correctamente
      const preparedData = prepareMovieData(data)
      
      // Procesar fecha de estreno según el tipo
      let releaseDateData = {}
      if (isPartialDate) {
        // Fecha parcial - enviar campos separados
        releaseDateData = {
          releaseYear: partialReleaseDate.year,
          releaseMonth: partialReleaseDate.month,
          releaseDay: null
        }
      } else if (data.releaseDate) {
        // Fecha completa - convertir a campos separados
        const [year, month, day] = data.releaseDate.split('-').map(Number)
        releaseDateData = {
          releaseYear: year,
          releaseMonth: month,
          releaseDay: day
        }
      } else {
        // Sin fecha
        releaseDateData = {
          releaseYear: null,
          releaseMonth: null,
          releaseDay: null
        }
      }
      
      // IMPORTANTE: Eliminar releaseDate del objeto preparado
      delete preparedData.releaseDate;
      
      const movieData = {
        ...preparedData,
        ...releaseDateData,
        stage: data.stage || 'COMPLETA',
        metaKeywords: preparedData.metaKeywords ? preparedData.metaKeywords.split(',').map((k: string) => k.trim()) : [],
        ...movieRelations,
        alternativeTitles,
        links: movieLinks
      }
      
      // Asegurarse de nuevo de que no se envíe releaseDate
      delete movieData.releaseDate;
      
      console.log('=== DATOS ENVIADOS AL BACKEND ===');
      console.log('movieData completo:', JSON.stringify(movieData, null, 2));
      console.log('=== DATOS DE FECHA ENVIADOS ===');
      console.log('releaseYear:', movieData.releaseYear);
      console.log('releaseMonth:', movieData.releaseMonth);
      console.log('releaseDay:', movieData.releaseDay);
      console.log('================================');
      
      // Usar el servicio para crear o actualizar
      if (editingMovie) {
        await moviesService.update(editingMovie.id, movieData)
        toast.success('Película actualizada')
      } else {
        await moviesService.create(movieData)
        toast.success('Película creada')
      }
      
      // Limpiar y ejecutar callback de éxito
      reset()
      onSuccess()
      
    } catch (error) {
      console.error('❌ Error in onSubmit:', error)
      toast.error(error instanceof Error ? error.message : 'Error al guardar')
    }
  }
  
  // Reset para nueva película
  const resetForNewMovie = useCallback(() => {
    reset({ 
      stage: 'COMPLETA',
      dataCompleteness: 'BASIC_PRESS_KIT',
      status: 'PUBLISHED'
    })
    setIsPartialDate(false)
    setPartialReleaseDate({ year: null, month: null })
    setMovieRelations({
      genres: [],
      cast: [],
      crew: [],
      countries: [],
      languages: [],
      productionCompanies: [],
      distributionCompanies: [],
      themes: []
    })
    setMovieLinks([])
    setAlternativeTitles([])
    setTipoDuracionDisabled(false)
    setActiveTab('basic')
    setMovieFormInitialData(null)
  }, [reset])
  
  return {
    // Form methods
    ...form,
    onSubmit,
    
    // Estados
    activeTab,
    setActiveTab,
    isPartialDate,
    setIsPartialDate,
    partialReleaseDate,
    setPartialReleaseDate,
    tipoDuracionDisabled,
    movieFormInitialData,
    alternativeTitles,
    setAlternativeTitles,
    movieLinks,
    
    // Metadata
    availableRatings,
    availableColorTypes,
    
    // Callbacks
    handleGenresChange,
    handleLinksChange,
    handleCastChange,
    handleCrewChange,
    handleCountriesChange,
    handleLanguagesChange,
    handleProductionCompaniesChange,
    handleDistributionCompaniesChange,
    handleThemesChange,
    
    // Funciones
    loadMovieData,
    resetForNewMovie
  }
}