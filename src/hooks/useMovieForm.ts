// src/hooks/useMovieForm.ts
import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'react-hot-toast'
import { 
 movieFormSchema, 
 MovieFormData, 
 Movie, 
 PartialReleaseDate,
 PartialFilmingDate 
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
 
 // Estados para fechas de rodaje
 const [isPartialFilmingStartDate, setIsPartialFilmingStartDate] = useState(false)
 const [partialFilmingStartDate, setPartialFilmingStartDate] = useState<PartialFilmingDate>({
   year: null,
   month: null
 })
 
 const [isPartialFilmingEndDate, setIsPartialFilmingEndDate] = useState(false)
 const [partialFilmingEndDate, setPartialFilmingEndDate] = useState<PartialFilmingDate>({
   year: null,
   month: null
 })
 
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
       } else if (key === 'durationSeconds') {
         setValue(key as any, fullMovie[key] || 0)
       } else if (key === 'colorType' && fullMovie[key]) {
         setValue('colorTypeId' as any, fullMovie[key].id)
       } else {
         setValue(key as any, fullMovie[key])
       }
     })
     
     // Manejar fecha parcial de estreno
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
     
     // Manejar fecha parcial de inicio de rodaje (IGUAL que releaseDate)
     if (fullMovie.filmingStartYear) {
       setIsPartialFilmingStartDate(true)
       setPartialFilmingStartDate({
         year: fullMovie.filmingStartYear,
         month: fullMovie.filmingStartMonth || null
       })
       
       if (fullMovie.filmingStartDay) {
         setIsPartialFilmingStartDate(false)
         const dateStr = `${fullMovie.filmingStartYear}-${String(fullMovie.filmingStartMonth || 1).padStart(2, '0')}-${String(fullMovie.filmingStartDay || 1).padStart(2, '0')}`
         setValue('filmingStartDate', dateStr)
       }
     } else {
       setIsPartialFilmingStartDate(false)
       setPartialFilmingStartDate({ year: null, month: null })
     }
     
     // Manejar fecha parcial de fin de rodaje (IGUAL que releaseDate)
     if (fullMovie.filmingEndYear) {
       setIsPartialFilmingEndDate(true)
       setPartialFilmingEndDate({
         year: fullMovie.filmingEndYear,
         month: fullMovie.filmingEndMonth || null
       })
       
       if (fullMovie.filmingEndDay) {
         setIsPartialFilmingEndDate(false)
         const dateStr = `${fullMovie.filmingEndYear}-${String(fullMovie.filmingEndMonth || 1).padStart(2, '0')}-${String(fullMovie.filmingEndDay || 1).padStart(2, '0')}`
         setValue('filmingEndDate', dateStr)
       }
     } else {
       setIsPartialFilmingEndDate(false)
       setPartialFilmingEndDate({ year: null, month: null })
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
     
     // Procesar fechas de rodaje
     let filmingStartDateData = {}
     if (isPartialFilmingStartDate && partialFilmingStartDate.year) {
       // Fecha parcial de inicio
       filmingStartDateData = {
         filmingStartYear: partialFilmingStartDate.year,
         filmingStartMonth: partialFilmingStartDate.month,
         filmingStartDay: null
       }
     } else if (data.filmingStartDate) {
       // Fecha completa de inicio
       const [year, month, day] = data.filmingStartDate.split('-').map(Number)
       filmingStartDateData = {
         filmingStartYear: year,
         filmingStartMonth: month,
         filmingStartDay: day
       }
     } else {
       // Sin fecha de inicio
       filmingStartDateData = {
         filmingStartYear: null,
         filmingStartMonth: null,
         filmingStartDay: null
       }
     }
     
     let filmingEndDateData = {}
     if (isPartialFilmingEndDate && partialFilmingEndDate.year) {
       // Fecha parcial de fin
       filmingEndDateData = {
         filmingEndYear: partialFilmingEndDate.year,
         filmingEndMonth: partialFilmingEndDate.month,
         filmingEndDay: null
       }
     } else if (data.filmingEndDate) {
       // Fecha completa de fin
       const [year, month, day] = data.filmingEndDate.split('-').map(Number)
       filmingEndDateData = {
         filmingEndYear: year,
         filmingEndMonth: month,
         filmingEndDay: day
       }
     } else {
       // Sin fecha de fin
       filmingEndDateData = {
         filmingEndYear: null,
         filmingEndMonth: null,
         filmingEndDay: null
       }
     }
     
     // IMPORTANTE: Eliminar campos de fecha del objeto preparado
     delete preparedData.releaseDate;
     delete preparedData.filmingStartDate;
     delete preparedData.filmingEndDate;
     
     const movieData = {
       ...preparedData,
       ...releaseDateData,
       ...filmingStartDateData,
       ...filmingEndDateData,
       stage: data.stage || 'COMPLETA',
       metaKeywords: preparedData.metaKeywords ? preparedData.metaKeywords.split(',').map((k: string) => k.trim()) : [],
       ...movieRelations,
       alternativeTitles,
       links: movieLinks
     }
     
     // Asegurarse de nuevo de que no se envíen campos de fecha incorrectos
     delete movieData.releaseDate;
     delete movieData.filmingStartDate;
     delete movieData.filmingEndDate;
     
     console.log('=== DATOS ENVIADOS AL BACKEND ===');
     console.log('movieData completo:', JSON.stringify(movieData, null, 2));
     console.log('=== DATOS DE FECHA ENVIADOS ===');
     console.log('releaseYear:', movieData.releaseYear);
     console.log('releaseMonth:', movieData.releaseMonth);
     console.log('releaseDay:', movieData.releaseDay);
     console.log('filmingStartYear:', movieData.filmingStartYear);
     console.log('filmingStartMonth:', movieData.filmingStartMonth);
     console.log('filmingStartDay:', movieData.filmingStartDay);
     console.log('filmingEndYear:', movieData.filmingEndYear);
     console.log('filmingEndMonth:', movieData.filmingEndMonth);
     console.log('filmingEndDay:', movieData.filmingEndDay);
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
   setIsPartialFilmingStartDate(false)
   setPartialFilmingStartDate({ year: null, month: null })
   setIsPartialFilmingEndDate(false)
   setPartialFilmingEndDate({ year: null, month: null })
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
   
   // Estados de fechas de rodaje
   isPartialFilmingStartDate,
   setIsPartialFilmingStartDate,
   partialFilmingStartDate,
   setPartialFilmingStartDate,
   isPartialFilmingEndDate,
   setIsPartialFilmingEndDate,
   partialFilmingEndDate,
   setPartialFilmingEndDate,
   
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