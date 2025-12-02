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
    editingMovie?: Movie | null
    onSuccess?: (movie: Movie) => void
    onError?: (error: Error) => void
}

interface UseMovieFormReturn {
    onSubmit: (data: MovieFormData) => Promise<void>

    // Estados de UI
    activeTab: string
    setActiveTab: (tab: string) => void
    isSubmitting: boolean

    // Estados de fechas parciales
    isPartialDate: boolean
    setIsPartialDate: (value: boolean) => void
    partialReleaseDate: PartialReleaseDate
    setPartialReleaseDate: (value: PartialReleaseDate) => void

    // Estados de fechas de rodaje
    isPartialFilmingStartDate: boolean
    setIsPartialFilmingStartDate: (value: boolean) => void
    partialFilmingStartDate: PartialFilmingDate
    setPartialFilmingStartDate: (value: PartialFilmingDate) => void
    isPartialFilmingEndDate: boolean
    setIsPartialFilmingEndDate: (value: boolean) => void
    partialFilmingEndDate: PartialFilmingDate
    setPartialFilmingEndDate: (value: PartialFilmingDate) => void

    // Estados específicos de UI
    tipoDuracionDisabled: boolean
    movieFormInitialData: any
    alternativeTitles: any[]
    setAlternativeTitles: (titles: any[]) => void
    movieLinks: any[]

    // Metadata
    availableRatings: any[]
    availableColorTypes: any[]

    // Callbacks para relaciones
    handleGenresChange: (genres: number[]) => void
    handleLinksChange: (links: any[]) => void
    handleCastChange: (cast: any[]) => void
    handleCrewChange: (crew: any[]) => void
    handleCountriesChange: (countries: number[]) => void
    handleProductionCompaniesChange: (companies: number[]) => void
    handleDistributionCompaniesChange: (companies: number[]) => void
    handleThemesChange: (themes: number[]) => void
    handleScreeningVenuesChange: (venues: number[]) => void

    // Funciones principales
    loadMovieData: (movie: Movie) => Promise<void>
    resetForNewMovie: () => void

    // Form methods (todos como any para evitar problemas de tipos)
    register: any
    handleSubmit: any
    watch: any
    setValue: any
    reset: any
    formState: any
    control: any
    getValues: any
    trigger: any
    clearErrors: any
    setError: any
    setFocus: any
    getFieldState: any
    resetField: any
    unregister: any
}

export function useMovieForm({
    editingMovie = null,
    onSuccess,
    onError
}: UseMovieFormProps = {}): UseMovieFormReturn {

    // Estados del formulario y UI
    const [activeTab, setActiveTab] = useState('basic')
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Estados de fechas parciales
    const [isPartialDate, setIsPartialDate] = useState(false)
    const [partialReleaseDate, setPartialReleaseDate] = useState<PartialReleaseDate>({
        year: null,
        month: null,
        day: null
    })

    // Estados para fechas de rodaje
    const [isPartialFilmingStartDate, setIsPartialFilmingStartDate] = useState(false)
    const [partialFilmingStartDate, setPartialFilmingStartDate] = useState<PartialFilmingDate>({
        year: null,
        month: null,
        day: null
    })

    const [isPartialFilmingEndDate, setIsPartialFilmingEndDate] = useState(false)
    const [partialFilmingEndDate, setPartialFilmingEndDate] = useState<PartialFilmingDate>({
        year: null,
        month: null,
        day: null
    })

    // Estados específicos de UI
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
        productionCompanies: number[];
        distributionCompanies: number[];
        themes: number[];
        screeningVenues: number[];
    }>({
        genres: [],
        cast: [],
        crew: [],
        countries: [],
        productionCompanies: [],
        distributionCompanies: [],
        themes: [],
        screeningVenues: []
    })

    // Estados adicionales
    const [alternativeTitles, setAlternativeTitles] = useState<any[]>([])
    const [movieLinks, setMovieLinks] = useState<any[]>([])

    // React Hook Form
    const form = useForm<MovieFormData>({
        resolver: zodResolver(movieFormSchema),
        defaultValues: {
            stage: 'COMPLETA',
            dataCompleteness: 'BASIC_PRESS_KIT',
            metaDescription: '',
            metaKeywords: []
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
        // Filtrar valores inválidos antes de guardar
        const validGenres = (genres || []).filter(g => g != null && g !== 0 && !isNaN(g))
        setMovieRelations(prev => ({ ...prev, genres: validGenres }))
    }, [])

    const handleLinksChange = useCallback((links: any[]) => {
        setMovieLinks(links)
    }, [])

    const handleScreeningVenuesChange = useCallback((venueIds: number[]) => {
        setMovieRelations(prev => ({ ...prev, screeningVenues: venueIds }))
    }, [])

    const handleCastChange = useCallback((cast: any[]) => {
        console.log('👥 handleCastChange recibió:', cast)
        setMovieRelations(prev => ({ ...prev, cast }))
    }, [])

    const handleCrewChange = useCallback((crew: any[]) => {
        console.log('👥 handleCrewChange recibió:', crew)
        crew?.forEach((member, index) => {
            console.log(`👥 Crew[${index}]:`, {
                personId: member.personId,
                person: member.person,
                roleId: member.roleId
            })
        })
        setMovieRelations(prev => ({ ...prev, crew }))
    }, [])

    const handleCountriesChange = useCallback((countries: number[]) => {
        setMovieRelations(prev => ({ ...prev, countries }))
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
            const fullMovie = await moviesService.getById(movie.id)

            // LIMPIAR VALORES NULL DE CAMPOS STRING
            const cleanedMovie = {
                ...fullMovie,
                tagline: fullMovie.tagline || '',
                imdbId: fullMovie.imdbId || '',
                posterUrl: fullMovie.posterUrl || '',
                trailerUrl: fullMovie.trailerUrl || '',
                originalTitle: fullMovie.originalTitle || '',
                synopsis: fullMovie.synopsis || '',
                notes: fullMovie.notes || '',
                aspectRatio: fullMovie.aspectRatio || '',
                soundType: fullMovie.soundType || '',
                filmFormat: fullMovie.filmFormat || '',
                certificateNumber: fullMovie.certificateNumber || '',
                metaDescription: fullMovie.metaDescription || '',
                metaKeywords: fullMovie.metaKeywords || [],
                tipoDuracion: fullMovie.tipoDuracion || ''
            }

            // Configurar tipo de duración
            const minutos = cleanedMovie.duration
            const segundos = cleanedMovie.durationSeconds
            const hayDuracion = (minutos && minutos > 0) || (segundos && segundos > 0)

            if (hayDuracion) {
                const tipoCalculado = calcularTipoDuracion(minutos, segundos)
                setValue('tipoDuracion', tipoCalculado)
                setTipoDuracionDisabled(true)
            } else {
                setValue('tipoDuracion', cleanedMovie.tipoDuracion || '')
                setTipoDuracionDisabled(false)
            }

            // Configurar títulos alternativos
            if (cleanedMovie.alternativeTitles) {
                setAlternativeTitles(cleanedMovie.alternativeTitles)
            }

            // Llenar el formulario con los datos limpios
            Object.keys(cleanedMovie).forEach((key) => {
                if (key === 'metaKeywords' && Array.isArray(cleanedMovie[key])) {
                    setValue(key as any, cleanedMovie[key].join(', '))
                } else if (key === 'releaseDate' && cleanedMovie[key]) {
                    setValue(key as any, new Date(cleanedMovie[key]).toISOString().split('T')[0])
                    setIsPartialDate(false)
                } else if (key === 'durationSeconds') {
                    setValue(key as any, cleanedMovie[key] || 0)
                } else if (key === 'colorType' && cleanedMovie[key]) {
                    setValue('colorTypeId' as any, cleanedMovie[key].id)
                } else {
                    setValue(key as any, cleanedMovie[key])
                }
            })

            // Manejar fecha parcial de estreno
            if (cleanedMovie.releaseYear && !cleanedMovie.releaseDate) {
                setIsPartialDate(true)
                setPartialReleaseDate({
                    year: cleanedMovie.releaseYear,
                    month: cleanedMovie.releaseMonth || null,
                    day: null
                })

                if (cleanedMovie.releaseDay) {
                    setIsPartialDate(false)
                    const dateStr = `${cleanedMovie.releaseYear}-${String(cleanedMovie.releaseMonth || 1).padStart(2, '0')}-${String(cleanedMovie.releaseDay || 1).padStart(2, '0')}`
                    setValue('releaseDate', dateStr)
                }
            } else if (!cleanedMovie.releaseYear && !cleanedMovie.releaseDate) {
                setIsPartialDate(false)
                setPartialReleaseDate({ year: null, month: null, day: null })
            }

            // Manejar fecha parcial de inicio de rodaje
            if (cleanedMovie.filmingStartYear) {
                setIsPartialFilmingStartDate(true)
                setPartialFilmingStartDate({
                    year: cleanedMovie.filmingStartYear,
                    month: cleanedMovie.filmingStartMonth || null,
                    day: null
                })

                if (cleanedMovie.filmingStartDay) {
                    setIsPartialFilmingStartDate(false)
                    const dateStr = `${cleanedMovie.filmingStartYear}-${String(cleanedMovie.filmingStartMonth || 1).padStart(2, '0')}-${String(cleanedMovie.filmingStartDay || 1).padStart(2, '0')}`
                    setValue('filmingStartDate', dateStr)
                }
            } else {
                setIsPartialFilmingStartDate(false)
                setPartialFilmingStartDate({ year: null, month: null, day: null })
            }

            // Manejar fecha parcial de fin de rodaje
            if (cleanedMovie.filmingEndYear) {
                setIsPartialFilmingEndDate(true)
                setPartialFilmingEndDate({
                    year: cleanedMovie.filmingEndYear,
                    month: cleanedMovie.filmingEndMonth || null,
                    day: null
                })

                if (cleanedMovie.filmingEndDay) {
                    setIsPartialFilmingEndDate(false)
                    const dateStr = `${cleanedMovie.filmingEndYear}-${String(cleanedMovie.filmingEndMonth || 1).padStart(2, '0')}-${String(cleanedMovie.filmingEndDay || 1).padStart(2, '0')}`
                    setValue('filmingEndDate', dateStr)
                }
            } else {
                setIsPartialFilmingEndDate(false)
                setPartialFilmingEndDate({ year: null, month: null, day: null })
            }

            // Configurar valores por defecto
            if (!cleanedMovie.stage) {
                setValue('stage', 'COMPLETA')
            }
            setValue('dataCompleteness', cleanedMovie.dataCompleteness || 'BASIC_PRESS_KIT')

            if (cleanedMovie.ratingId) {
                setValue('ratingId', cleanedMovie.ratingId)
            }

            // Configurar datos iniciales y relaciones
            setMovieFormInitialData({
                genres: cleanedMovie.genres || [],
                cast: cleanedMovie.cast || [],
                crew: cleanedMovie.crew || [],
                countries: cleanedMovie.movieCountries || [],
                productionCompanies: cleanedMovie.productionCompanies || [],
                distributionCompanies: cleanedMovie.distributionCompanies || [],
                themes: cleanedMovie.themes || [],
                screeningVenues: cleanedMovie.screenings?.map((s: any) => s.venueId) || []
            })

            if (cleanedMovie.links) {
                setMovieLinks(cleanedMovie.links)
            }

            // Configurar relaciones
            setMovieRelations({
                genres: (cleanedMovie.genres?.map((g: any) => g.genre?.id || g.id) || [])
                    .filter((g: number) => g != null && g !== 0 && !isNaN(g)),

                // PROCESAMIENTO MEJORADO DEL CAST
                cast: cleanedMovie.cast?.map((c: any) => {
                    console.log('🎬 Procesando cast item desde DB:', c)
                    const mapped = {
                        personId: c.personId || c.person?.id,
                        person: c.person, // Mantener el objeto person completo
                        characterName: c.characterName,
                        billingOrder: c.billingOrder,
                        isPrincipal: c.isPrincipal,
                        notes: c.notes
                    }
                    console.log('🎬 Cast item mapeado:', mapped)
                    return mapped
                }) || [],

                // PROCESAMIENTO DEL CREW
                crew: (() => {
                    const crewData = cleanedMovie.crew?.map((c: any) => {
                        console.log('📌 Crew item desde DB:', c)
                        const mapped = {
                            personId: c.personId || c.person?.id,
                            roleId: c.roleId,
                            billingOrder: c.billingOrder,
                            person: c.person,
                            role: c.role
                        }
                        console.log('📌 Crew item mapeado:', mapped)
                        return mapped
                    }) || []
                    console.log('📌 Crew final cargado:', crewData)
                    return crewData
                })(),

                countries: cleanedMovie.movieCountries?.map((c: any) => c.countryId) || [],
                productionCompanies: cleanedMovie.productionCompanies?.map((c: any) => c.companyId) || [],
                distributionCompanies: cleanedMovie.distributionCompanies?.map((c: any) => c.companyId) || [],
                themes: cleanedMovie.themes?.map((t: any) => t.themeId) || [],
                screeningVenues: cleanedMovie.screenings?.map((s: any) => s.venueId) || []
            })

        } catch (error) {
            console.error('Error completo en loadMovieData:', error)
            console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack')
            toast.error('Error al cargar los datos de la película')

            // Notificar error al context parent
            if (onError) {
                onError(error instanceof Error ? error : new Error('Error desconocido en loadMovieData'))
            }

            throw error
        }
    }, [setValue, onError])

    // Función submit modificada para usar callbacks
    const onSubmit = async (data: MovieFormData) => {
        if (isSubmitting) return; // Prevenir double submit

        setIsSubmitting(true)

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

            // DEBUG - Log del cast y crew antes de procesar
            console.log('🎭 DEBUG - movieRelations.cast antes de procesar:', movieRelations.cast)
            movieRelations.cast.forEach((member, index) => {
                console.log(`🎭 Cast member ${index}:`, {
                    personId: member.personId,
                    personIdType: typeof member.personId,
                    hasPersonObject: !!member.person,
                    personFromObject: member.person?.id,
                    characterName: member.characterName
                })
            })

            console.log('🎬 DEBUG - movieRelations.crew antes de procesar:', movieRelations.crew)
            movieRelations.crew.forEach((member, index) => {
                console.log(`🎬 Crew member ${index}:`, {
                    personId: member.personId,
                    personIdType: typeof member.personId,
                    roleId: member.roleId,
                    roleIdType: typeof member.roleId,
                    roleFromObject: member.role?.id,
                    fullMember: member
                })
            })

            // Construir el objeto completo de datos
            const movieData: any = {
                ...preparedData,
                ...releaseDateData,
                ...filmingStartDateData,
                ...filmingEndDateData,
                // AGREGAR: Convertir 0 a null para duración
                duration: preparedData.duration === 0 ? null : preparedData.duration,
                durationSeconds: preparedData.durationSeconds === 0 ? null : preparedData.durationSeconds,
                stage: data.stage || 'COMPLETA',
                ratingId: preparedData.ratingId === '' || preparedData.ratingId === undefined ? null : preparedData.ratingId,
                metaKeywords: preparedData.metaKeywords
                    ? Array.isArray(preparedData.metaKeywords)
                        ? preparedData.metaKeywords
                        : preparedData.metaKeywords.split(',').map((k: string) => k.trim()).filter((k: string) => k)
                    : [],

                // IMPORTANTE: Usar las relaciones del estado, no del data del formulario
                genres: movieRelations.genres.filter(g => g != null && g !== 0 && !isNaN(g)),

                // PROCESAMIENTO MEJORADO DEL CAST
                cast: movieRelations.cast
                    .map(member => {
                        // Intentar obtener personId de diferentes fuentes
                        let personId = member.personId

                        // Si no hay personId directo, intentar obtenerlo del objeto person
                        if (!personId && member.person) {
                            personId = member.person.id || member.person.personId
                        }

                        console.log(`📍 Procesando cast member:`, {
                            original: member,
                            extractedPersonId: personId,
                            willInclude: personId && personId > 0
                        })

                        // Solo incluir si hay un personId válido
                        if (!personId || personId <= 0) {
                            return null
                        }

                        return {
                            personId: personId,
                            characterName: member.characterName || '',
                            billingOrder: member.billingOrder ?? 0,
                            isPrincipal: member.isPrincipal ?? false
                        }
                    })
                    .filter(member => member !== null), // Filtrar los nulls

                // PROCESAMIENTO MEJORADO DEL CREW
                crew: movieRelations.crew
                    .map(member => {
                        let personId = member.personId
                        if (!personId && member.person) {
                            personId = member.person.id || member.person.personId
                        }

                        let roleId = member.roleId
                        if (!roleId && member.role && typeof member.role === 'object') {
                            roleId = member.role.id
                        }

                        console.log(`📍 Procesando crew member:`, {
                            original: member,
                            extractedPersonId: personId,
                            extractedRoleId: roleId,
                            willInclude: personId && personId > 0 && roleId && roleId > 0
                        })

                        if (!personId || personId <= 0 || !roleId || roleId <= 0) {
                            return null
                        }

                        return {
                            personId: personId,
                            roleId: roleId,
                            billingOrder: member.billingOrder ?? 0
                        }
                    })
                    .filter(member => member !== null),

                countries: movieRelations.countries,
                productionCompanies: movieRelations.productionCompanies,
                distributionCompanies: movieRelations.distributionCompanies,
                themes: movieRelations.themes,

                // Screening venues con procesamiento especial
                screeningVenues: movieRelations.screeningVenues.map((venueId, index) => ({
                    venueId,
                    screeningDate: data.releaseDate || new Date().toISOString().split('T')[0],
                    isPremiere: true,
                    isExclusive: movieRelations.screeningVenues.length === 1
                })),

                // Otros campos manejados por estado
                alternativeTitles,
                links: movieLinks
            }

            // Log final antes de enviar
            console.log('📤 FINAL movieData to send:', {
                cast: movieData.cast,
                crew: movieData.crew
            })

            // Asegurarse de nuevo de que no se envíen campos de fecha incorrectos
            delete movieData.releaseDate;
            delete movieData.filmingStartDate;
            delete movieData.filmingEndDate;

            // 🔥 ASEGURAR QUE NO HAY ID PARA CREACIÓN
            if (!editingMovie) {
                delete movieData.id;
            }

            // Usar el servicio para crear o actualizar
            let result: Movie;
            if (editingMovie) {
                result = await moviesService.update(editingMovie.id, movieData)
            } else {
                result = await moviesService.create(movieData)
            }

            // Limpiar formulario
            reset()

            // Ejecutar callback de éxito con la película creada/actualizada
            if (onSuccess) {
                onSuccess(result)
            }

        } catch (error) {
            console.error('❌ Error in onSubmit:', error)
            const errorMessage = error instanceof Error ? error.message : 'Error al guardar la película'
            toast.error(errorMessage)

            // Ejecutar callback de error
            if (onError) {
                onError(error instanceof Error ? error : new Error(errorMessage))
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    // Reset para nueva película
    const resetForNewMovie = useCallback(() => {
        reset({
            stage: 'COMPLETA',
            dataCompleteness: 'BASIC_PRESS_KIT',
            metaDescription: '',
            metaKeywords: []
        })
        setIsPartialDate(false)
        setPartialReleaseDate({ year: null, month: null, day: null })
        setIsPartialFilmingStartDate(false)
        setPartialFilmingStartDate({ year: null, month: null, day: null })
        setIsPartialFilmingEndDate(false)
        setPartialFilmingEndDate({ year: null, month: null, day: null })
        setMovieRelations({
            genres: [],
            cast: [],
            crew: [],
            countries: [],
            productionCompanies: [],
            distributionCompanies: [],
            themes: [],
            screeningVenues: []
        })
        setMovieLinks([])
        setAlternativeTitles([])
        setTipoDuracionDisabled(false)
        setActiveTab('basic')
        setMovieFormInitialData(null)
        setIsSubmitting(false)
    }, [reset])

    return {
        onSubmit,

        // Estados de UI
        activeTab,
        setActiveTab,
        isSubmitting,

        // Estados de fechas parciales
        isPartialDate,
        setIsPartialDate,
        partialReleaseDate,
        setPartialReleaseDate,

        // Estados de fechas de rodaje
        isPartialFilmingStartDate,
        setIsPartialFilmingStartDate,
        partialFilmingStartDate,
        setPartialFilmingStartDate,
        isPartialFilmingEndDate,
        setIsPartialFilmingEndDate,
        partialFilmingEndDate,
        setPartialFilmingEndDate,

        // Estados específicos de UI
        tipoDuracionDisabled,
        movieFormInitialData,
        alternativeTitles,
        setAlternativeTitles,
        movieLinks,

        // Metadata
        availableRatings,
        availableColorTypes,

        // Callbacks para relaciones
        handleGenresChange,
        handleLinksChange,
        handleCastChange,
        handleCrewChange,
        handleCountriesChange,
        handleProductionCompaniesChange,
        handleDistributionCompaniesChange,
        handleThemesChange,
        handleScreeningVenuesChange,

        // Funciones principales
        loadMovieData,
        resetForNewMovie,

        // Form methods explícitos (todos como any para evitar problemas de tipos)
        register: form.register,
        handleSubmit: form.handleSubmit,
        watch: form.watch,
        setValue: form.setValue,
        reset: form.reset,
        formState: form.formState,
        control: form.control,
        getValues: form.getValues,
        trigger: form.trigger,
        clearErrors: form.clearErrors,
        setError: form.setError,
        setFocus: form.setFocus,
        getFieldState: form.getFieldState,
        resetField: form.resetField,
        unregister: form.unregister
    } as const
}