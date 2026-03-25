// src/hooks/useMovieForm.ts
import { useState, useEffect, useCallback, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'react-hot-toast'
import {
    movieFormSchema,
    MovieFormData,
    Movie,
    MovieDetail,
    MovieCompleteData,
    PartialReleaseDate,
    PartialFilmingDate,
    RawCastEntry,
    RawCrewEntry,
} from '@/lib/movies/movieTypes'
import {
    calcularTipoDuracion,
    prepareMovieData
} from '@/lib/movies/movieUtils'
import { moviesService } from '@/services'
import { arrayMove } from '@dnd-kit/sortable'
import { createLogger } from '@/lib/logger'
import type { UseFormReturn } from 'react-hook-form'

/** Cast member in the movie form state */
export interface CastMemberEntry {
  personId: number
  personName: string
  alternativeNameId: number | null
  alternativeName: string | null
  characterName: string
  billingOrder: number
  isPrincipal: boolean
  isActor: boolean
  person: { id: number; firstName?: string | null; lastName?: string | null; slug?: string; photoUrl?: string | null; alternativeNames?: Array<{ id: number; fullName: string }> } | null
}

/** Crew member in the movie form state */
/** Counter for generating stable unique IDs for crew/cast entries */
let entryUidCounter = 0

/** Generate a unique ID for a crew/cast entry */
export function generateEntryUid(): string {
  return `entry-${++entryUidCounter}-${Date.now()}`
}

export interface CrewMemberEntry {
  _uid: string
  personId: number
  personName: string
  alternativeNameId: number | null
  alternativeName: string | null
  roleId: number | null
  role: string | { id: number; name: string; department?: string } | null
  department: string
  billingOrder: number
  notes: string
  person: { id: number; firstName?: string | null; lastName?: string | null; slug?: string; alternativeNames?: Array<{ id: number; fullName: string }> } | null
}

/** Alternative title entry */
export interface AlternativeTitleEntry {
  id?: number
  title: string
  description?: string | null
}

/** Trivia entry */
export interface TriviaEntry {
  id?: number
  content: string
  sortOrder?: number
}

/** Movie link entry */
export interface MovieLinkEntry {
  id?: number
  type: string
  url: string
  isActive?: boolean
}

/** Rating option from the API */
interface RatingOption {
  id: number
  name: string
  abbreviation?: string | null
  description?: string | null
}

/** Color type option from the API */
interface ColorTypeOption {
  id: number
  name: string
}

/** Initial form data for movie relations */
export interface MovieFormInitialData {
  genres: unknown[]
  countries: unknown[]
  productionCompanies: unknown[]
  distributionCompanies: unknown[]
  themes: unknown[]
  screeningVenues: number[]
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


const log = createLogger('hook:movieForm')



interface UseMovieFormProps {
    editingMovie?: Movie | null
    onSuccess?: (movie: Movie) => void
    onError?: (error: Error) => void
}

interface UseMovieFormReturn {
    onSubmit: (data: MovieFormData) => Promise<void>
    setShouldClose: (value: boolean) => void

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
    movieFormInitialData: MovieFormInitialData | null
    alternativeTitles: AlternativeTitleEntry[]
    setAlternativeTitles: (titles: AlternativeTitleEntry[]) => void
    trivia: TriviaEntry[]
    setTrivia: (trivia: TriviaEntry[]) => void
    movieLinks: MovieLinkEntry[]

    // Metadata
    availableRatings: RatingOption[]
    availableColorTypes: ColorTypeOption[]

    // Callbacks para relaciones
    handleGenresChange: (genres: number[]) => void
    handleLinksChange: (links: MovieLinkEntry[]) => void
    handleCastChange: (cast: CastMemberEntry[]) => void
    handleCrewChange: (crew: CrewMemberEntry[]) => void
    handleCountriesChange: (countries: number[]) => void
    handleProductionCompaniesChange: (companies: number[]) => void
    handleDistributionCompaniesChange: (companies: number[]) => void
    handleThemesChange: (themes: number[]) => void
    handleScreeningVenuesChange: (venues: number[]) => void

    // Estado de relaciones (fuente única de verdad para cast/crew)
    movieRelations: MovieRelationsState

    // Mutaciones granulares para cast
    addCastMember: (overrides?: Partial<CastMemberEntry>) => void
    removeCastMember: (index: number) => void
    updateCastMember: (index: number, updates: Partial<CastMemberEntry>) => void
    reorderCast: (oldIndex: number, newIndex: number) => void

    // Mutaciones granulares para crew
    addCrewMember: (overrides?: Partial<CrewMemberEntry>) => void
    removeCrewMember: (index: number) => void
    updateCrewMember: (index: number, updates: Partial<CrewMemberEntry>) => void
    reorderCrew: (oldIndex: number, newIndex: number) => void

    // Funciones principales
    loadMovieData: (movie: Movie | MovieDetail) => Promise<void>
    resetForNewMovie: () => void

    // Form methods
    register: UseFormReturn<MovieFormData>['register']
    handleSubmit: UseFormReturn<MovieFormData>['handleSubmit']
    watch: UseFormReturn<MovieFormData>['watch']
    setValue: UseFormReturn<MovieFormData>['setValue']
    reset: UseFormReturn<MovieFormData>['reset']
    formState: UseFormReturn<MovieFormData>['formState']
    control: UseFormReturn<MovieFormData>['control']
    getValues: UseFormReturn<MovieFormData>['getValues']
    trigger: UseFormReturn<MovieFormData>['trigger']
    clearErrors: UseFormReturn<MovieFormData>['clearErrors']
    setError: UseFormReturn<MovieFormData>['setError']
    setFocus: UseFormReturn<MovieFormData>['setFocus']
    getFieldState: UseFormReturn<MovieFormData>['getFieldState']
    resetField: UseFormReturn<MovieFormData>['resetField']
    unregister: UseFormReturn<MovieFormData>['unregister']
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
    const [movieFormInitialData, setMovieFormInitialData] = useState<MovieFormInitialData | null>(null)

    // Metadata via React Query (reemplaza useEffect de metadata)
    const [availableRatings, setAvailableRatings] = useState<RatingOption[]>([])
    const [availableColorTypes, setAvailableColorTypes] = useState<ColorTypeOption[]>([])
    const metadataInitRef = useRef(false)

    // Estados de relaciones
    const [movieRelations, setMovieRelations] = useState<MovieRelationsState>({
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
    const [alternativeTitles, setAlternativeTitles] = useState<AlternativeTitleEntry[]>([])
    const [trivia, setTrivia] = useState<TriviaEntry[]>([])
    const [movieLinks, setMovieLinks] = useState<MovieLinkEntry[]>([])

    // React Hook Form
    const form = useForm<MovieFormData>({
        resolver: zodResolver(movieFormSchema),
        defaultValues: {
            stage: 'COMPLETA',
            dataCompleteness: 'BASIC_PRESS_KIT',
            soundType: 'Sonora',
            metaDescription: '',
            metaKeywords: []
        }
    })

    const { watch, setValue, reset } = form

    // Cargar metadata (ratings y color types) via React Query
    const { data: metadataResult } = useQuery({
        queryKey: ['movie-metadata'],
        queryFn: async () => {
            const [ratingsRes, colorTypesRes] = await Promise.all([
                fetch('/api/calificaciones'),
                fetch('/api/color-types')
            ])
            const ratings = ratingsRes.ok ? await ratingsRes.json() : []
            const colorTypes = colorTypesRes.ok ? await colorTypesRes.json() : []
            return { ratings, colorTypes }
        },
        staleTime: 5 * 60 * 1000,
    })

    // Sincronizar metadata al estado local (adjust during render)
    if (metadataResult && !metadataInitRef.current) {
        metadataInitRef.current = true
        setAvailableRatings(metadataResult.ratings)
        setAvailableColorTypes(metadataResult.colorTypes)
        if (!editingMovie) {
            const colorDefault = metadataResult.colorTypes.find((ct: ColorTypeOption) => ct.name === 'Color')
            if (colorDefault) {
                setValue('colorTypeId', colorDefault.id)
            }
        }
    }

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

    const handleLinksChange = useCallback((links: MovieLinkEntry[]) => {
        setMovieLinks(links)
    }, [])

    const handleScreeningVenuesChange = useCallback((venueIds: number[]) => {
        setMovieRelations(prev => ({ ...prev, screeningVenues: venueIds }))
    }, [])

    const handleCastChange = useCallback((cast: CastMemberEntry[]) => {
        setMovieRelations(prev => ({ ...prev, cast }))
    }, [])

    const handleCrewChange = useCallback((crew: CrewMemberEntry[]) => {
        // Asegurar que cada entry tenga _uid
        const crewWithUids = crew.map(member => ({
            ...member,
            _uid: member._uid || generateEntryUid()
        }))
        setMovieRelations(prev => ({ ...prev, crew: crewWithUids }))
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

    // ========== MUTACIONES GRANULARES PARA CAST ==========
    const addCastMember = useCallback((overrides?: Partial<CastMemberEntry>) => {
        setMovieRelations(prev => ({
            ...prev,
            cast: [...prev.cast, {
                personId: 0,
                personName: '',
                alternativeNameId: null,
                alternativeName: null,
                characterName: '',
                billingOrder: prev.cast.length + 1,
                isPrincipal: prev.cast.length < 5,
                isActor: true,
                person: null,
                ...overrides
            }]
        }))
    }, [])

    const removeCastMember = useCallback((index: number) => {
        setMovieRelations(prev => ({
            ...prev,
            cast: prev.cast
                .filter((_: CastMemberEntry, i: number) => i !== index)
                .map((member: CastMemberEntry, i: number) => ({ ...member, billingOrder: i + 1 }))
        }))
    }, [])

    const updateCastMember = useCallback((index: number, updates: Partial<CastMemberEntry>) => {
        setMovieRelations(prev => ({
            ...prev,
            cast: prev.cast.map((member: CastMemberEntry, i: number) =>
                i === index
                    ? { ...member, ...updates, personId: updates.personId || member.personId || 0 }
                    : member
            )
        }))
    }, [])

    const reorderCast = useCallback((oldIndex: number, newIndex: number) => {
        setMovieRelations(prev => {
            const reordered = arrayMove(prev.cast, oldIndex, newIndex)
            return {
                ...prev,
                cast: reordered.map((member: CastMemberEntry, i: number) => ({ ...member, billingOrder: i + 1 }))
            }
        })
    }, [])

    // ========== MUTACIONES GRANULARES PARA CREW ==========
    const addCrewMember = useCallback((overrides?: Partial<CrewMemberEntry>) => {
        setMovieRelations(prev => ({
            ...prev,
            crew: [...prev.crew, {
                _uid: generateEntryUid(),
                personId: 0,
                personName: '',
                alternativeNameId: null,
                alternativeName: null,
                roleId: null,
                role: '',
                department: '',
                billingOrder: prev.crew.length,
                notes: '',
                person: null,
                ...overrides
            }]
        }))
    }, [])

    const removeCrewMember = useCallback((index: number) => {
        setMovieRelations(prev => ({
            ...prev,
            crew: prev.crew
                .filter((_: CrewMemberEntry, i: number) => i !== index)
                .map((member: CrewMemberEntry, i: number) => ({ ...member, billingOrder: i }))
        }))
    }, [])

    const updateCrewMember = useCallback((index: number, updates: Partial<CrewMemberEntry>) => {
        setMovieRelations(prev => ({
            ...prev,
            crew: prev.crew.map((member: CrewMemberEntry, i: number) =>
                i === index
                    ? { ...member, ...updates, _uid: member._uid, personId: updates.personId || member.personId || 0 }
                    : member
            )
        }))
    }, [])

    const reorderCrew = useCallback((oldIndex: number, newIndex: number) => {
        setMovieRelations(prev => {
            const reordered = arrayMove(prev.crew, oldIndex, newIndex)
            return {
                ...prev,
                crew: reordered.map((member: CrewMemberEntry, i: number) => ({ ...member, billingOrder: i }))
            }
        })
    }, [])

    // Función para cargar datos de película existente
    const loadMovieData = useCallback(async (movie: Movie | MovieDetail) => {
        try {
            const fullMovie = await moviesService.getById(movie.id, true)

            // LIMPIAR VALORES NULL DE CAMPOS STRING
            const cleanedMovie = {
                ...fullMovie,
                tagline: fullMovie.tagline || '',
                imdbId: fullMovie.imdbId || '',
                posterUrl: fullMovie.posterUrl || '',
                posterPublicId: fullMovie.posterPublicId || '',
                trailerUrl: fullMovie.trailerUrl || '',
                originalTitle: fullMovie.originalTitle || '',
                synopsis: fullMovie.synopsis || '',
                synopsisLocked: fullMovie.synopsisLocked ?? false, 
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

            // Configurar trivia
            if (cleanedMovie.trivia) {
                setTrivia(cleanedMovie.trivia)
            }

            // Llenar el formulario con los datos limpios
            Object.keys(cleanedMovie).forEach((key) => {
                const formKey = key as keyof MovieFormData
                const movieKey = key as keyof typeof cleanedMovie
                if (key === 'metaKeywords' && Array.isArray(cleanedMovie[movieKey])) {
                    setValue(formKey, (cleanedMovie[movieKey] as string[]).join(', '))
                } else if (key === 'releaseDate' && cleanedMovie[movieKey]) {
                    setValue(formKey, new Date(cleanedMovie[movieKey] as string).toISOString().split('T')[0])
                    setIsPartialDate(false)
                } else if (key === 'durationSeconds') {
                    setValue(formKey, (cleanedMovie[movieKey] as number) || 0)
                } else if (key === 'colorType' && cleanedMovie[movieKey]) {
                    setValue('colorTypeId' as keyof MovieFormData, (cleanedMovie[movieKey] as { id: number }).id)
                } else {
                    setValue(formKey, cleanedMovie[movieKey] as MovieFormData[keyof MovieFormData])
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
            setValue('dataCompleteness', (cleanedMovie.dataCompleteness || 'BASIC_PRESS_KIT') as MovieFormData['dataCompleteness'])

            if (cleanedMovie.ratingId) {
                setValue('ratingId', cleanedMovie.ratingId)
            }

            // Configurar datos iniciales (sin cast/crew, que se manejan solo en movieRelations)
            setMovieFormInitialData({
                genres: cleanedMovie.genres || [],
                countries: cleanedMovie.movieCountries || [],
                productionCompanies: cleanedMovie.productionCompanies || [],
                distributionCompanies: cleanedMovie.distributionCompanies || [],
                themes: cleanedMovie.themes || [],
                screeningVenues: cleanedMovie.screenings?.map((s: { venueId: number }) => s.venueId) || []
            })

            if (cleanedMovie.links) {
                setMovieLinks(cleanedMovie.links)
            }

            // Configurar relaciones
            setMovieRelations({
                genres: (cleanedMovie.genres?.map((g: { genre?: { id: number }; id?: number }) => g.genre?.id || g.id) || [])
                    .filter((g: number | undefined): g is number => g != null && g !== 0 && !isNaN(g)),

                // CAST - Enriquecido con campos de display
                cast: (cleanedMovie.cast?.map((c: RawCastEntry) => {
                    let personName = ''
                    if (c.person) {
                        personName = c.person.name || `${c.person.firstName || ''} ${c.person.lastName || ''}`.trim()
                    }
                    let alternativeName: string | null = null
                    if (c.alternativeNameId && c.alternativeName) {
                        alternativeName = typeof c.alternativeName === 'string' ? c.alternativeName : c.alternativeName.fullName
                    } else if (c.alternativeNameId && c.person?.alternativeNames) {
                        const altName = c.person.alternativeNames.find((an: { id: number; fullName: string }) => an.id === c.alternativeNameId)
                        if (altName) alternativeName = altName.fullName
                    }
                    return {
                        personId: c.personId || c.person?.id || 0,
                        personName,
                        alternativeNameId: c.alternativeNameId || null,
                        alternativeName,
                        characterName: c.characterName || '',
                        billingOrder: c.billingOrder || 0,
                        isPrincipal: c.isPrincipal || false,
                        isActor: c.isActor !== undefined ? c.isActor : true,
                        person: c.person || null
                    }
                }) || []).sort((a: CastMemberEntry, b: CastMemberEntry) => (a.billingOrder || 0) - (b.billingOrder || 0)),

                // CREW - Enriquecido con campos de display
                crew: (cleanedMovie.crew?.map((c: RawCrewEntry) => {
                    let personName = ''
                    if (c.person) {
                        personName = `${c.person.firstName || ''} ${c.person.lastName || ''}`.trim()
                    }
                    let roleId = c.roleId
                    if (!roleId && c.role && typeof c.role === 'object') roleId = c.role.id
                    let roleName = ''
                    if (typeof c.role === 'string') roleName = c.role
                    else if (c.role && typeof c.role === 'object') roleName = c.role.name || ''
                    let alternativeName: string | null = null
                    if (c.alternativeNameId && c.alternativeName) {
                        alternativeName = typeof c.alternativeName === 'string' ? c.alternativeName : c.alternativeName.fullName
                    } else if (c.alternativeNameId && c.person?.alternativeNames) {
                        const altName = c.person.alternativeNames.find((an: { id: number; fullName: string }) => an.id === c.alternativeNameId)
                        if (altName) alternativeName = altName.fullName
                    }
                    return {
                        _uid: generateEntryUid(),
                        personId: c.personId || c.person?.id || 0,
                        personName,
                        alternativeNameId: c.alternativeNameId || null,
                        alternativeName,
                        roleId: roleId || null,
                        role: roleName,
                        department: c.department || (typeof c.role === 'object' ? c.role?.department : '') || '',
                        billingOrder: c.billingOrder || 0,
                        notes: c.notes || '',
                        person: c.person || null
                    }
                }) || []).sort((a: CrewMemberEntry, b: CrewMemberEntry) => (a.billingOrder || 0) - (b.billingOrder || 0)),

                countries: cleanedMovie.movieCountries?.map((c: { countryId: number }) => c.countryId) || [],
                productionCompanies: cleanedMovie.productionCompanies?.map((c) => c.company.id) || [],
                distributionCompanies: cleanedMovie.distributionCompanies?.map((c) => c.company.id) || [],
                themes: cleanedMovie.themes?.map((t) => t.theme.id) || [],
                screeningVenues: cleanedMovie.screenings?.map((s: { venueId: number }) => s.venueId) || []
            })

        } catch (error) {
            log.error('Failed to load movie data', error)
            toast.error('Error al cargar los datos de la película')

            // Notificar error al context parent
            if (onError) {
                onError(error instanceof Error ? error : new Error('Error desconocido en loadMovieData'))
            }

            throw error
        }
    }, [setValue, onError])

    // Ref para controlar si cerrar después de guardar
    const shouldCloseRef = useRef(true)

    const setShouldClose = useCallback((value: boolean) => {
        shouldCloseRef.current = value
    }, [])

    // Función submit modificada para usar callbacks
    const onSubmit = async (data: MovieFormData) => {
        if (isSubmitting) return; // Prevenir double submit

        const shouldClose = shouldCloseRef.current
        // Resetear para la próxima vez
        shouldCloseRef.current = true

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

            // Construir el objeto completo de datos
            // Type-narrow preparedData for property access
            const pd = preparedData as Record<string, number | string | boolean | null | undefined | unknown[]>

            const movieData: Record<string, unknown> = {
                ...preparedData,
                ...releaseDateData,
                ...filmingStartDateData,
                ...filmingEndDateData,
                // Convertir 0/NaN a null para campos numéricos opcionales
                year: (!pd.year || pd.year === 0 || isNaN(pd.year as number)) ? null : pd.year,
                duration: pd.duration === 0 ? null : pd.duration,
                durationSeconds: pd.durationSeconds === 0 ? null : pd.durationSeconds,
                colorTypeId: (!pd.colorTypeId || pd.colorTypeId === 0 || isNaN(pd.colorTypeId as number)) ? null : pd.colorTypeId,
                soundType: pd.soundType || null,
                stage: data.stage || 'COMPLETA',
                ratingId: pd.ratingId === '' || pd.ratingId === undefined ? null : pd.ratingId,
                metaKeywords: pd.metaKeywords
                    ? Array.isArray(pd.metaKeywords)
                        ? pd.metaKeywords
                        : (pd.metaKeywords as string).split(',').map((k: string) => k.trim()).filter((k: string) => k)
                    : [],

                // IMPORTANTE: Usar las relaciones del estado, no del data del formulario
                genres: movieRelations.genres.filter(g => g != null && g !== 0 && !isNaN(g)),

                // ✅ PROCESAMIENTO MEJORADO DEL CAST - CON alternativeNameId
                cast: movieRelations.cast
                    .map(member => {
                        // Intentar obtener personId de diferentes fuentes
                        let personId = member.personId

                        // Si no hay personId directo, intentar obtenerlo del objeto person
                        if (!personId && member.person) {
                            personId = member.person.id || (member.person as Record<string, unknown>).personId as number
                        }

                        // Solo incluir si hay un personId válido
                        if (!personId || personId <= 0) {
                            return null
                        }

                        return {
                            personId: personId,
                            characterName: member.characterName || '',
                            billingOrder: member.billingOrder ?? 0,
                            isPrincipal: member.isPrincipal ?? false,
                            isActor: member.isActor ?? true,
                            alternativeNameId: member.alternativeNameId || null  // ✅ AGREGADO
                        }
                    })
                    .filter(member => member !== null), // Filtrar los nulls

                // ✅ PROCESAMIENTO MEJORADO DEL CREW - CON alternativeNameId y notes
                crew: movieRelations.crew
                    .map(member => {
                        let personId = member.personId
                        if (!personId && member.person) {
                            personId = member.person.id || (member.person as Record<string, unknown>).personId as number
                        }

                        let roleId = member.roleId
                        if (!roleId && member.role && typeof member.role === 'object') {
                            roleId = member.role.id
                        }

                        if (!personId || personId <= 0 || !roleId || roleId <= 0) {
                            return null
                        }

                        return {
                            personId: personId,
                            roleId: roleId,
                            billingOrder: member.billingOrder ?? 0,
                            notes: member.notes || null,                    // ✅ AGREGADO
                            alternativeNameId: member.alternativeNameId || null  // ✅ AGREGADO
                        }
                    })
                    .filter(member => member !== null),

                countries: movieRelations.countries,
                productionCompanies: movieRelations.productionCompanies,
                distributionCompanies: movieRelations.distributionCompanies,
                themes: movieRelations.themes,

                // Screening venues con procesamiento especial
                screeningVenues: movieRelations.screeningVenues.map((venueId) => ({
                    venueId,
                    screeningDate: data.releaseDate || new Date().toISOString().split('T')[0],
                    isPremiere: true,
                    isExclusive: movieRelations.screeningVenues.length === 1
                })),

                // Otros campos manejados por estado
                alternativeTitles,
                trivia,
                links: movieLinks
            }

            // Asegurarse de nuevo de que no se envíen campos de fecha incorrectos
            delete movieData.releaseDate;
            delete movieData.filmingStartDate;
            delete movieData.filmingEndDate;

            // 🔥 ASEGURAR QUE NO HAY ID PARA CREACIÓN
            if (!editingMovie) {
                delete movieData.id;
            }

            // Validar duplicados en cast (misma persona)
            const seenCastKeys = new Set<string>()
            const castDuplicates: string[] = []
            for (let ci = 0; ci < movieRelations.cast.length; ci++) {
                const cm = movieRelations.cast[ci]
                const pid = cm.personId || cm.person?.id
                if (!pid || pid <= 0) continue
                const castKey = String(pid)
                if (seenCastKeys.has(castKey)) {
                    const pName = cm.alternativeName || cm.personName || ('Persona ID ' + pid)
                    castDuplicates.push(pName)
                }
                seenCastKeys.add(castKey)
            }
            if (castDuplicates.length > 0) {
                alert('No se puede grabar: cast duplicado.\n\n' + castDuplicates.join('\n'))
                setIsSubmitting(false)
                return
            }

            // Validar duplicados en crew (misma persona + mismo rol)
            const seenCrewKeys = new Set<string>()
            const crewDuplicates: string[] = []
            for (let ci = 0; ci < movieRelations.crew.length; ci++) {
                const cm = movieRelations.crew[ci]
                const pid = cm.personId || cm.person?.id
                const rid = cm.roleId || (cm.role && typeof cm.role === 'object' ? cm.role.id : null)
                if (!pid || pid <= 0 || !rid || rid <= 0) continue
                const crewKey = pid + '-' + rid
                if (seenCrewKeys.has(crewKey)) {
                    const pName = cm.alternativeName || cm.personName || ('Persona ID ' + pid)
                    const rName = typeof cm.role === 'string' ? cm.role : (cm.role?.name || ('Rol ID ' + rid))
                    crewDuplicates.push(pName + ' con rol "' + rName + '"')
                }
                seenCrewKeys.add(crewKey)
            }
            if (crewDuplicates.length > 0) {
                alert('No se puede grabar: crew duplicado.\n\n' + crewDuplicates.join('\n'))
                setIsSubmitting(false)
                return
            }

            // Usar el servicio para crear o actualizar
            let result: Movie;
            if (editingMovie) {
                result = await moviesService.update(editingMovie.id, movieData as MovieCompleteData)
            } else {
                result = await moviesService.create(movieData as MovieCompleteData)
            }

            if (shouldClose) {
                // Limpiar formulario y cerrar
                reset()

                // Ejecutar callback de éxito con la película creada/actualizada
                if (onSuccess) {
                    onSuccess(result)
                }
            } else {
                // Guardar sin cerrar: recargar datos de la película actualizada
                toast.success('Película actualizada correctamente')
                await loadMovieData(result)
            }

        } catch (error) {
            log.error('Failed to submit movie form', error)
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
        // Encontrar el ID de "Color" para setear como default
        const colorDefault = availableColorTypes.find((ct: ColorTypeOption) => ct.name === 'Color')
        reset({
            stage: 'COMPLETA',
            dataCompleteness: 'BASIC_PRESS_KIT',
            soundType: 'Sonora',
            ...(colorDefault ? { colorTypeId: colorDefault.id } : {}),
            synopsisLocked: false,
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
        setTrivia([])
        setTipoDuracionDisabled(false)
        setActiveTab('basic')
        setMovieFormInitialData(null)
        setIsSubmitting(false)
    }, [reset, availableColorTypes])

    return {
        onSubmit,
        setShouldClose,

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
        trivia,
        setTrivia,
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

        // Estado de relaciones (fuente única de verdad para cast/crew)
        movieRelations,

        // Mutaciones granulares para cast
        addCastMember,
        removeCastMember,
        updateCastMember,
        reorderCast,

        // Mutaciones granulares para crew
        addCrewMember,
        removeCrewMember,
        updateCrewMember,
        reorderCrew,

        // Funciones principales
        loadMovieData,
        resetForNewMovie,

        // Form methods explícitos
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