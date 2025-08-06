// src/components/admin/movies/MovieModal/index.tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { z } from 'zod'
import { X, Save, Loader2, Info, Users, Briefcase, Settings, Image } from 'lucide-react'
import * as Tabs from '@radix-ui/react-tabs'
import CloudinaryUploadWidget from '@/components/admin/CloudinaryUploadWidget'
import MovieFormEnhanced from '@/components/admin/MovieFormEnhanced'
import AlternativeTitlesManager from '@/components/admin/AlternativeTitlesManager'
import MovieLinksManager from '@/components/admin/MovieLinksManager'
import FlexibleDateField from '@/components/admin/FlexibleDateField'

// Schema de validación
const movieFormSchema = z.object({
    title: z.string().min(1, 'El título es requerido'),
    originalTitle: z.any().optional(),
    synopsis: z.any().optional(),
    tagline: z.any().optional(),
    imdbId: z.any().optional(),
    aspectRatio: z.any().optional(),
    colorType: z.any().optional(),
    soundType: z.any().optional(),
    filmFormat: z.any().optional(),
    certificateNumber: z.any().optional(),
    tipoDuracion: z.any().optional(),
    metaDescription: z.any().optional(),
    metaKeywords: z.any().optional(),
    year: z.any().optional(),
    duration: z.any().optional(),
    durationSeconds: z.any().optional(),
    rating: z.any().optional(),
    colorTypeId: z.any().optional(),
    ratingId: z.any().optional(),
    releaseDate: z.any().optional(),
    filmingStartDate: z.any().optional(),
    filmingEndDate: z.any().optional(),
    posterUrl: z.any().optional(),
    posterPublicId: z.any().optional(),
    backdropUrl: z.any().optional(),
    backdropPublicId: z.any().optional(),
    trailerUrl: z.any().optional(),
    status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
    dataCompleteness: z.enum([
        'BASIC_PRESS_KIT',
        'FULL_PRESS_KIT',
        'MAIN_CAST',
        'MAIN_CREW',
        'FULL_CAST',
        'FULL_CREW'
    ]).optional(),
    stage: z.enum([
        'COMPLETA',
        'EN_DESARROLLO',
        'EN_POSTPRODUCCION',
        'EN_PREPRODUCCION',
        'EN_RODAJE',
        'INCONCLUSA',
        'INEDITA'
    ]).optional(),
})

type MovieFormData = z.infer<typeof movieFormSchema>

const MOVIE_STAGES = [
    { value: 'COMPLETA', label: 'Completa', description: 'Película terminada y estrenada' },
    { value: 'EN_DESARROLLO', label: 'En desarrollo', description: 'En etapa de desarrollo del proyecto' },
    { value: 'EN_POSTPRODUCCION', label: 'En postproducción', description: 'En proceso de edición y postproducción' },
    { value: 'EN_PREPRODUCCION', label: 'En preproducción', description: 'En preparación para el rodaje' },
    { value: 'EN_RODAJE', label: 'En rodaje', description: 'Actualmente filmando' },
    { value: 'INCONCLUSA', label: 'Inconclusa', description: 'Proyecto abandonado o sin terminar' },
    { value: 'INEDITA', label: 'Inédita', description: 'Completa pero sin estrenar' }
]

interface MovieModalProps {
    isOpen: boolean
    onClose: () => void
    editingMovie: any | null
    onSubmit: (data: any) => Promise<void>
    availableRatings: any[]
    availableColorTypes: any[]
    movieRelations: {
        genres: number[]
        cast: any[]
        crew: any[]
        countries: number[]
        languages: number[]
        productionCompanies: number[]
        distributionCompanies: number[]
        themes: number[]
    }
    onGenresChange: (genres: number[]) => void
    onCastChange: (cast: any[]) => void
    onCrewChange: (crew: any[]) => void
    onCountriesChange: (countries: number[]) => void
    onLanguagesChange: (languages: number[]) => void
    onProductionCompaniesChange: (companies: number[]) => void
    onDistributionCompaniesChange: (companies: number[]) => void
    onThemesChange: (themes: number[]) => void
    alternativeTitles: any[]
    onAlternativeTitlesChange: (titles: any[]) => void
    movieLinks: any[]
    onLinksChange: (links: any[]) => void
    movieFormInitialData: any
    releaseDay: number | null
    releaseMonth: number | null
    releaseYear: number | null
    onReleaseDateChange: (day: number | null, month: number | null, year: number | null) => void
    filmingStartDay: number | null
    filmingStartMonth: number | null
    filmingStartYear: number | null
    filmingEndDay: number | null
    filmingEndMonth: number | null
    filmingEndYear: number | null
    onFilmingDatesChange: (
        startDay: number | null,
        startMonth: number | null,
        startYear: number | null,
        endDay: number | null,
        endMonth: number | null,
        endYear: number | null
    ) => void
}

export default function MovieModal({
    isOpen,
    onClose,
    editingMovie,
    onSubmit,
    availableRatings,
    availableColorTypes,
    movieRelations,
    onGenresChange,
    onCastChange,
    onCrewChange,
    onCountriesChange,
    onLanguagesChange,
    onProductionCompaniesChange,
    onDistributionCompaniesChange,
    onThemesChange,
    alternativeTitles,
    onAlternativeTitlesChange,
    movieLinks,
    onLinksChange,
    movieFormInitialData,
    releaseDay,
    releaseMonth,
    releaseYear,
    onReleaseDateChange,
    filmingStartDay,
    filmingStartMonth,
    filmingStartYear,
    filmingEndDay,
    filmingEndMonth,
    filmingEndYear,
    onFilmingDatesChange
}: MovieModalProps) {
    // TODO: Necesitarás pasar estos estados y funciones desde el componente padre
    // Por ahora los definimos aquí para que compile
    const [activeTab, setActiveTab] = useState('basic')
    const [tipoDuracionDisabled, setTipoDuracionDisabled] = useState(false)

    const tiposDuracion = [
        { value: 'largometraje', label: 'Largometraje' },
        { value: 'mediometraje', label: 'Mediometraje' },
        { value: 'cortometraje', label: 'Cortometraje' }
    ]

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors, isSubmitting }
    } = useForm<MovieFormData>({
        resolver: zodResolver(movieFormSchema),
        defaultValues: {
            stage: 'COMPLETA'
        }
    })

    const currentStage = watch('stage')

    const getErrorMessage = (error: any): string => {
        if (!error) return ''
        if (typeof error === 'string') return error
        if (error?.message) return error.message
        return 'Este campo tiene un error'
    }

    // Función para formatear período de rodaje
    const formatFilmingPeriod = (): string => {
        const formatDate = (day: number | null, month: number | null, year: number | null) => {
            if (!year) return 'Sin fecha'

            const monthNames = [
                'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
            ]

            if (day && month) {
                return `${day} de ${monthNames[month - 1]} de ${year}`
            } else if (month) {
                return `${monthNames[month - 1]} de ${year}`
            } else {
                return year.toString()
            }
        }

        const start = formatDate(filmingStartDay, filmingStartMonth, filmingStartYear)
        const end = formatDate(filmingEndDay, filmingEndMonth, filmingEndYear)

        if (start === 'Sin fecha' && end === 'Sin fecha') {
            return 'No especificado'
        } else if (start === 'Sin fecha') {
            return `Hasta ${end}`
        } else if (end === 'Sin fecha') {
            return `Desde ${start}`
        } else {
            return `${start} - ${end}`
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-gray-900">
                            {editingMovie ? 'Editar Película' : 'Nueva Película'}
                        </h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="overflow-y-auto max-h-[calc(90vh-8rem)]">
                    {/* AQUÍ VA TODO EL CONTENIDO DEL MODAL CON LAS TABS */}
                    {/* Por brevedad no lo copio todo, pero aquí iría todo el contenido de las Tabs */}
                    <div className="p-6">
                        <p className="text-gray-500">

                            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
                                <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
                                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                                        <div className="flex items-center justify-between">
                                            <h2 className="text-xl font-semibold text-gray-900">
                                                {editingMovie ? 'Editar Película' : 'Nueva Película'}
                                            </h2>
                                            <button
                                                onClick={() => {
                                                    setShowModal(false)
                                                    reset()
                                                    setEditingMovie(null)
                                                    setMovieFormInitialData(null)
                                                }}
                                                className="text-gray-400 hover:text-gray-500"
                                            >
                                                <X className="w-6 h-6" />
                                            </button>
                                        </div>
                                    </div>

                                    <form onSubmit={handleSubmit(onSubmit)} className="overflow-y-auto max-h-[calc(90vh-8rem)]">
                                        <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="w-full">
                                            {/* Lista de pestañas */}
                                            <Tabs.List className="flex border-b border-gray-200 px-6 pt-4">
                                                <Tabs.Trigger
                                                    value="basic"
                                                    className={`px-4 py-2 -mb-px text-sm font-medium transition-colors ${activeTab === 'basic'
                                                        ? 'text-blue-600 border-b-2 border-blue-600'
                                                        : 'text-gray-500 hover:text-gray-700'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <Info className="w-4 h-4" />
                                                        Información Básica
                                                    </div>
                                                </Tabs.Trigger>
                                                <Tabs.Trigger
                                                    value="media"
                                                    className={`px-4 py-2 -mb-px text-sm font-medium transition-colors ${activeTab === 'media'
                                                        ? 'text-blue-600 border-b-2 border-blue-600'
                                                        : 'text-gray-500 hover:text-gray-700'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <Image className="w-4 h-4" />
                                                        Multimedia
                                                    </div>
                                                </Tabs.Trigger>
                                                <Tabs.Trigger
                                                    value="cast"
                                                    className={`px-4 py-2 -mb-px text-sm font-medium transition-colors ${activeTab === 'cast'
                                                        ? 'text-blue-600 border-b-2 border-blue-600'
                                                        : 'text-gray-500 hover:text-gray-700'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <Users className="w-4 h-4" />
                                                        Reparto
                                                    </div>
                                                </Tabs.Trigger>
                                                <Tabs.Trigger
                                                    value="crew"
                                                    className={`px-4 py-2 -mb-px text-sm font-medium transition-colors ${activeTab === 'crew'
                                                        ? 'text-blue-600 border-b-2 border-blue-600'
                                                        : 'text-gray-500 hover:text-gray-700'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <Briefcase className="w-4 h-4" />
                                                        Equipo Técnico
                                                    </div>
                                                </Tabs.Trigger>
                                                <Tabs.Trigger
                                                    value="advanced"
                                                    className={`px-4 py-2 -mb-px text-sm font-medium transition-colors ${activeTab === 'advanced'
                                                        ? 'text-blue-600 border-b-2 border-blue-600'
                                                        : 'text-gray-500 hover:text-gray-700'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <Settings className="w-4 h-4" />
                                                        Avanzado
                                                    </div>
                                                </Tabs.Trigger>
                                            </Tabs.List>

                                            {/* Contenido de las pestañas */}
                                            <div className="p-6">
                                                {/* Pestaña de Información Básica */}
                                                <Tabs.Content value="basic" className="space-y-6">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                        <div className="space-y-4">
                                                            <h3 className="text-lg font-medium text-gray-900 mb-4">
                                                                Información Principal
                                                            </h3>

                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                    Título *
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    {...register('title')}
                                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                                                                />
                                                                {errors.title && (
                                                                    <p className="mt-1 text-sm text-red-600">{getErrorMessage(errors.title)}</p>
                                                                )}
                                                            </div>

                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div>
                                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                        Año
                                                                    </label>
                                                                    <input
                                                                        type="number"
                                                                        {...register('year', { valueAsNumber: true })}
                                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                                                                    />
                                                                    {errors.year && (
                                                                        <p className="mt-1 text-sm text-red-600">{getErrorMessage(errors.year)}</p>
                                                                    )}
                                                                </div>

                                                                <div>
                                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                        Fecha de Estreno
                                                                    </label>

                                                                    <FlexibleDateField
                                                                        label="Fecha de estreno"
                                                                        day={releaseDay}
                                                                        month={releaseMonth}
                                                                        year={releaseYear}
                                                                        onChange={({ day, month, year }) => {
                                                                            setReleaseDay(day)
                                                                            setReleaseMonth(month)
                                                                            setReleaseYear(year)
                                                                        }}
                                                                        disabled={isSubmitting}
                                                                    />
                                                                </div>
                                                            </div>

                                                            {/* Fechas de rodaje con soporte para fechas incompletas */}
                                                            <div className="mt-6 space-y-4">
                                                                <h4 className="text-md font-medium text-gray-900">Fechas de Rodaje</h4>

                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                    <FlexibleDateField
                                                                        label="Fecha de inicio de rodaje"
                                                                        day={filmingStartDay}
                                                                        month={filmingStartMonth}
                                                                        year={filmingStartYear}
                                                                        onChange={({ day, month, year }) => {
                                                                            setFilmingStartDay(day)
                                                                            setFilmingStartMonth(month)
                                                                            setFilmingStartYear(year)
                                                                        }}
                                                                    />

                                                                    <FlexibleDateField
                                                                        label="Fecha de fin de rodaje"
                                                                        day={filmingEndDay}
                                                                        month={filmingEndMonth}
                                                                        year={filmingEndYear}
                                                                        onChange={({ day, month, year }) => {
                                                                            setFilmingEndDay(day)
                                                                            setFilmingEndMonth(month)
                                                                            setFilmingEndYear(year)
                                                                        }}
                                                                    />
                                                                </div>

                                                                {/* Mostrar período de rodaje si hay datos */}
                                                                {(filmingStartYear || filmingEndYear) && (
                                                                    <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                                                                        <p className="text-sm text-blue-800">
                                                                            <strong>Período de rodaje:</strong> {formatFilmingPeriod()}
                                                                        </p>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                    Duración (minutos)
                                                                </label>
                                                                <input
                                                                    type="number"
                                                                    {...register('duration', { valueAsNumber: true })}
                                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                                                                />
                                                            </div>

                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                    Estado
                                                                </label>
                                                                <select
                                                                    {...register('status')}
                                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                                                                >
                                                                    <option value="DRAFT">Borrador</option>
                                                                    <option value="PUBLISHED">Publicado</option>
                                                                    <option value="ARCHIVED">Archivado</option>
                                                                </select>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-4">
                                                            <h3 className="text-lg font-medium text-gray-900 mb-4">
                                                                Información Adicional
                                                            </h3>

                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                    Sinopsis
                                                                </label>
                                                                <textarea
                                                                    {...register('synopsis')}
                                                                    rows={4}
                                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                                                                />
                                                            </div>

                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                    Tagline
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    {...register('tagline')}
                                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                                                                />
                                                            </div>

                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                    IMDb ID
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    {...register('imdbId')}
                                                                    placeholder="tt0123456"
                                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Géneros, Países e Idiomas */}
                                                    <MovieFormEnhanced
                                                        key={editingMovie?.id || 'new'}
                                                        onGenresChange={onGenresChange}
                                                        onCastChange={onCastChange}
                                                        onCrewChange={onCrewChange}
                                                        onCountriesChange={onCountriesChange}
                                                        onLanguagesChange={onLanguagesChange}
                                                        onProductionCompaniesChange={onProductionCompaniesChange}
                                                        onDistributionCompaniesChange={onDistributionCompaniesChange}
                                                        onThemesChange={onThemesChange}
                                                        initialData={movieFormInitialData}
                                                        showOnlyBasicInfo={true}
                                                    />
                                                </Tabs.Content>

                                                {/* Pestaña de Multimedia */}
                                                <Tabs.Content value="media" className="space-y-6">
                                                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                                                        Imágenes y Videos
                                                    </h3>

                                                    <CloudinaryUploadWidget
                                                        value={watch('posterUrl')}
                                                        onChange={(url, publicId) => {
                                                            setValue('posterUrl', url)
                                                            setValue('posterPublicId', publicId)
                                                        }}
                                                        label="Afiche de la Película"
                                                        type="poster"
                                                        movieId={editingMovie?.id}
                                                    />

                                                    <CloudinaryUploadWidget
                                                        value={watch('backdropUrl')}
                                                        onChange={(url, publicId) => {
                                                            setValue('backdropUrl', url)
                                                            setValue('backdropPublicId', publicId)
                                                        }}
                                                        label="Imagen de Fondo"
                                                        type="backdrop"
                                                        movieId={editingMovie?.id}
                                                    />

                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                            URL del Trailer
                                                        </label>
                                                        <input
                                                            type="url"
                                                            {...register('trailerUrl')}
                                                            placeholder="https://youtube.com/watch?v=..."
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                                                        />
                                                    </div>
                                                </Tabs.Content>

                                                {/* Pestaña de Reparto */}
                                                <Tabs.Content value="cast">
                                                    <MovieFormEnhanced
                                                        key={editingMovie?.id || 'new'}
                                                        onGenresChange={onGenresChange}
                                                        onCastChange={onCastChange}
                                                        onCrewChange={onCrewChange}
                                                        onCountriesChange={onCountriesChange}
                                                        onLanguagesChange={onLanguagesChange}
                                                        onProductionCompaniesChange={onProductionCompaniesChange}
                                                        onDistributionCompaniesChange={onDistributionCompaniesChange}
                                                        onThemesChange={onThemesChange}
                                                        initialData={movieFormInitialData}
                                                        showOnlyCast={true}
                                                    />
                                                </Tabs.Content>

                                                {/* Pestaña de Equipo Técnico */}
                                                <Tabs.Content value="crew">
                                                    <MovieFormEnhanced
                                                        key={editingMovie?.id || 'new'}
                                                        onGenresChange={onGenresChange}
                                                        onCastChange={onCastChange}
                                                        onCrewChange={onCrewChange}
                                                        onCountriesChange={onCountriesChange}
                                                        onLanguagesChange={onLanguagesChange}
                                                        onProductionCompaniesChange={onProductionCompaniesChange}
                                                        onDistributionCompaniesChange={onDistributionCompaniesChange}
                                                        onThemesChange={onThemesChange}
                                                        initialData={movieFormInitialData}
                                                        showOnlyCrew={true}
                                                    />
                                                </Tabs.Content>

                                                {/* Pestaña de Configuración Avanzada */}
                                                <Tabs.Content value="advanced" className="space-y-6">
                                                    {/* Información técnica */}
                                                    <div className="space-y-4">
                                                        <h3 className="text-lg font-medium text-gray-900 mb-4">
                                                            Información Técnica
                                                        </h3>

                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                    Color
                                                                </label>
                                                                <select
                                                                    {...register('colorTypeId', { valueAsNumber: true })}
                                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                                                                >
                                                                    <option value="">Seleccionar...</option>
                                                                    {availableColorTypes.map((colorType) => (
                                                                        <option key={colorType.id} value={colorType.id}>
                                                                            {colorType.name}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            </div>

                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                    Sonido
                                                                </label>
                                                                <select
                                                                    {...register('soundType')}
                                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                                                                >
                                                                    <option value="">Seleccionar...</option>
                                                                    <option value="Sonora">Sonora</option>
                                                                    <option value="Muda">Muda</option>
                                                                    <option value="n/d">No disponible</option>
                                                                </select>
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                Tipo de duración
                                                                {tipoDuracionDisabled && (
                                                                    <span className="ml-2 text-xs text-green-600 font-normal">
                                                                        (Calculado automáticamente)
                                                                    </span>
                                                                )}
                                                            </label>
                                                            <select
                                                                {...register('tipoDuracion')}
                                                                disabled={tipoDuracionDisabled}
                                                                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 transition-colors ${tipoDuracionDisabled
                                                                    ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                                                                    : 'hover:border-gray-400'
                                                                    }`}
                                                            >
                                                                <option value="">Seleccionar tipo de duración...</option>
                                                                {tiposDuracion.map((tipo) => (
                                                                    <option key={tipo.value} value={tipo.value}>
                                                                        {tipo.label}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>

                                                    {/* Clasificación */}
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                            Calificación
                                                        </label>
                                                        <select
                                                            {...register('ratingId', { valueAsNumber: true })}
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                                                        >
                                                            <option value="">Sin calificación</option>
                                                            {availableRatings.map((rating) => (
                                                                <option key={rating.id} value={rating.id}>
                                                                    {rating.name} {rating.abbreviation && `(${rating.abbreviation})`}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    {/* Estado de la película */}
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                            Etapa de la Película
                                                        </label>
                                                        <select
                                                            {...register('stage')}
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                                                        >
                                                            {MOVIE_STAGES.map(stage => (
                                                                <option key={stage.value} value={stage.value}>
                                                                    {stage.label}
                                                                </option>
                                                            ))}
                                                        </select>

                                                        {currentStage && (
                                                            <div className="mt-2 p-2 bg-blue-50 rounded-lg">
                                                                <div className="flex items-start gap-2">
                                                                    <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                                                    <p className="text-xs text-blue-800">
                                                                        {MOVIE_STAGES.find(s => s.value === currentStage)?.description}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Nivel de información */}
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                            Nivel de información cargada
                                                        </label>
                                                        <select
                                                            {...register('dataCompleteness')}
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                                                        >
                                                            <option value="BASIC_PRESS_KIT">📄 Gacetilla básica</option>
                                                            <option value="FULL_PRESS_KIT">📋 Gacetilla completa</option>
                                                            <option value="MAIN_CAST">👥 Intérpretes principales</option>
                                                            <option value="MAIN_CREW">🔧 Técnicos principales</option>
                                                            <option value="FULL_CAST">🎭 Todos los intérpretes</option>
                                                            <option value="FULL_CREW">🎬 Todos los técnicos</option>
                                                        </select>
                                                    </div>

                                                    {/* SEO */}
                                                    <div className="space-y-4">
                                                        <h3 className="text-lg font-medium text-gray-900 mb-4">
                                                            SEO y Palabras Clave
                                                        </h3>

                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                Palabras Clave (separadas por comas)
                                                            </label>
                                                            <input
                                                                type="text"
                                                                {...register('metaKeywords')}
                                                                placeholder="drama, argentina, buenos aires"
                                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Links Oficiales */}
                                                    <MovieLinksManager
                                                        key={`links-${editingMovie?.id || 'new'}-${movieLinks.length}`}
                                                        initialLinks={movieLinks}
                                                        onLinksChange={onLinksChange}
                                                    />

                                                    {/* Títulos Alternativos */}
                                                    <AlternativeTitlesManager
                                                        onChange={onAlternativeTitlesChange}
                                                        initialTitles={editingMovie ? alternativeTitles : []}
                                                    />

                                                    {/* Productoras y Distribuidoras */}
                                                    <MovieFormEnhanced
                                                        key={editingMovie?.id || 'new'}
                                                        onGenresChange={onGenresChange}
                                                        onCastChange={onCastChange}
                                                        onCrewChange={onCrewChange}
                                                        onCountriesChange={onCountriesChange}
                                                        onLanguagesChange={onLanguagesChange}
                                                        onProductionCompaniesChange={onProductionCompaniesChange}
                                                        onDistributionCompaniesChange={onDistributionCompaniesChange}
                                                        onThemesChange={onThemesChange}
                                                        initialData={movieFormInitialData}
                                                        showOnlyCompanies={true}
                                                    />
                                                </Tabs.Content>
                                            </div>
                                        </Tabs.Root>

                                        {/* Botones */}
                                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-4">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShowModal(false)
                                                    reset()
                                                    setEditingMovie(null)
                                                    setMovieFormInitialData(null)
                                                }}
                                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                                            >
                                                Cancelar
                                            </button>
                                            {Object.keys(errors).length > 0 && (
                                                <div className="px-6 py-2 bg-red-50 text-red-800 text-sm">
                                                    Errores: {Object.keys(errors).join(', ')}
                                                </div>
                                            )}
                                            <button
                                                type="submit"
                                                disabled={isSubmitting}
                                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                            >
                                                {isSubmitting ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        Guardando...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Save className="w-4 h-4" />
                                                        {editingMovie ? 'Actualizar' : 'Crear'} Película
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>

                        </p>
                    </div>

                    {/* Botones */}
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Guardando...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    {editingMovie ? 'Actualizar' : 'Crear'} Película
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}