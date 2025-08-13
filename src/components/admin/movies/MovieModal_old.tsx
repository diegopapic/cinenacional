// src/components/admin/movies/MovieModal.tsx
import { X, Save, Loader2, Info, Users, Briefcase, Settings, Image } from 'lucide-react'
import * as Tabs from '@radix-ui/react-tabs'
import { UseFormRegister, UseFormHandleSubmit, UseFormWatch, UseFormSetValue, UseFormReset, FieldErrors } from 'react-hook-form'
import { MovieFormData, Movie, PartialReleaseDate } from '@/lib/movies/movieTypes'
import { MOVIE_STAGES, TIPOS_DURACION, MONTHS, SOUND_TYPES, DATA_COMPLETENESS_LEVELS, MOVIE_STATUS } from '@/lib/movies/movieConstants'
import { getErrorMessage } from '@/lib/movies/movieUtils'
import { CloudinaryUploadWidget } from '@/components/admin/CloudinaryUploadWidget'
import MovieFormEnhanced from '@/components/admin/MovieFormEnhanced'
import AlternativeTitlesManager from '@/components/admin/AlternativeTitlesManager'
import MovieLinksManager from '@/components/admin/MovieLinksManager'

interface MovieModalProps {
    isOpen: boolean
    onClose: () => void
    editingMovie: Movie | null
    onSubmit: (data: MovieFormData) => Promise<void>
    isSubmitting: boolean

    // Props del formulario
    register: UseFormRegister<MovieFormData>
    handleSubmit: UseFormHandleSubmit<MovieFormData>
    watch: UseFormWatch<MovieFormData>
    setValue: UseFormSetValue<MovieFormData>
    reset: UseFormReset<MovieFormData>
    errors: FieldErrors<MovieFormData>

    // Estados que necesitamos pasar
    activeTab: string
    setActiveTab: (tab: string) => void
    isPartialDate: boolean
    setIsPartialDate: (value: boolean) => void
    partialReleaseDate: PartialReleaseDate
    setPartialReleaseDate: (value: PartialReleaseDate) => void
    tipoDuracionDisabled: boolean

    // Metadata
    availableRatings: any[]
    availableColorTypes: any[]

    // Relaciones
    movieFormInitialData: any
    alternativeTitles: any[]
    setAlternativeTitles: (titles: any[]) => void
    movieLinks: any[]

    // Callbacks
    handleGenresChange: (genres: number[]) => void
    handleCastChange: (cast: any[]) => void
    handleCrewChange: (crew: any[]) => void
    handleCountriesChange: (countries: number[]) => void
    handleLanguagesChange: (languages: number[]) => void
    handleProductionCompaniesChange: (companies: number[]) => void
    handleDistributionCompaniesChange: (companies: number[]) => void
    handleThemesChange: (themes: number[]) => void
    handleLinksChange: (links: any[]) => void
}

export default function MovieModal({
    isOpen,
    onClose,
    editingMovie,
    onSubmit,
    isSubmitting,
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    errors,
    activeTab,
    setActiveTab,
    isPartialDate,
    setIsPartialDate,
    partialReleaseDate,
    setPartialReleaseDate,
    tipoDuracionDisabled,
    availableRatings,
    availableColorTypes,
    movieFormInitialData,
    alternativeTitles,
    setAlternativeTitles,
    movieLinks,
    handleGenresChange,
    handleCastChange,
    handleCrewChange,
    handleCountriesChange,
    handleLanguagesChange,
    handleProductionCompaniesChange,
    handleDistributionCompaniesChange,
    handleThemesChange,
    handleLinksChange
}: MovieModalProps) {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-gray-900">
                            {editingMovie ? 'Editar Película' : 'Nueva Película'}
                        </h2>
                        <button
                            onClick={onClose}
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

                        {/* Por ahora solo agregamos la estructura básica */}
                        <div className="p-6">
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

                                                {/* Checkbox para fecha parcial */}
                                                <div className="mb-2">
                                                    <label className="inline-flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={isPartialDate}
                                                            onChange={(e) => setIsPartialDate(e.target.checked)}
                                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                        />
                                                        <span className="ml-2 text-sm text-gray-600">
                                                            Fecha incompleta (solo año o año/mes)
                                                        </span>
                                                    </label>
                                                </div>

                                                {/* Mostrar campos según el tipo de fecha */}
                                                {!isPartialDate ? (
                                                    // Fecha completa - date picker normal
                                                    <input
                                                        type="date"
                                                        {...register('releaseDate')}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                                                    />
                                                ) : (
                                                    // Fecha parcial - campos separados
                                                    <div className="flex gap-2">
                                                        <div className="flex-1">
                                                            <input
                                                                type="number"
                                                                placeholder="Año"
                                                                min="1800"
                                                                max="2100"
                                                                value={partialReleaseDate.year || ''}
                                                                onChange={(e) => setPartialReleaseDate({
                                                                    ...partialReleaseDate,
                                                                    year: e.target.value ? parseInt(e.target.value) : null
                                                                })}
                                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                                                            />
                                                        </div>
                                                        <div className="flex-1">
                                                            <select
                                                                value={partialReleaseDate.month || ''}
                                                                onChange={(e) => setPartialReleaseDate({
                                                                    ...partialReleaseDate,
                                                                    month: e.target.value ? parseInt(e.target.value) : null
                                                                })}
                                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                                                            >
                                                                <option value="">Mes (opcional)</option>
                                                                {MONTHS.map(month => (
                                                                    <option key={month.value} value={month.value}>
                                                                        {month.label}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            {/* Agregar DESPUÉS del div de fecha de estreno, pero DENTRO del primer <div className="space-y-4"> */}

                                            {/* NUEVOS CAMPOS: Fechas de rodaje */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Fecha Inicio de Rodaje
                                                    </label>
                                                    <input
                                                        type="date"
                                                        {...register('filmingStartDate')}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Fecha Fin de Rodaje
                                                    </label>
                                                    <input
                                                        type="date"
                                                        {...register('filmingEndDate')}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                                                    />
                                                </div>
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
                                                    Duración (segundos)
                                                </label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="59"
                                                    {...register('durationSeconds', { valueAsNumber: true })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                                                    placeholder="0-59"
                                                />
                                                {errors.durationSeconds && (
                                                    <p className="mt-1 text-sm text-red-600">{getErrorMessage(errors.durationSeconds)}</p>
                                                )}
                                            </div>

                                            {/* NUEVO CAMPO TIPO DE DURACIÓN */}
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
                                                    {TIPOS_DURACION.map((tipo) => (
                                                        <option key={tipo.value} value={tipo.value}>
                                                            {tipo.label}
                                                        </option>
                                                    ))}
                                                </select>
                                                <div className="mt-1 text-xs text-gray-500">
                                                    {tipoDuracionDisabled ? (
                                                        <div className="flex items-center space-x-1">
                                                            <svg className="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                            </svg>
                                                            <span>
                                                                <strong>{TIPOS_DURACION.find(t => t.value === watch('tipoDuracion'))?.label || ''}</strong>
                                                                {(() => {
                                                                    const minutos = watch('duration') || 0
                                                                    const segundos = watch('durationSeconds') || 0
                                                                    if (minutos > 0 || segundos > 0) {
                                                                        if (minutos > 0 && segundos > 0) {
                                                                            return ` (${minutos}min ${segundos}s)`
                                                                        } else if (minutos > 0) {
                                                                            return ` (${minutos}min)`
                                                                        } else {
                                                                            return ` (${segundos}s)`
                                                                        }
                                                                    }
                                                                    return ''
                                                                })()}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <div>
                                                            <p>Ingrese la duración para calcular automáticamente, o seleccione manualmente.</p>
                                                            <div className="mt-1 space-y-1">
                                                                <div className="flex justify-between">
                                                                    <span>Largometraje:</span>
                                                                    <span className="font-mono text-gray-400">60+ min</span>
                                                                </div>
                                                                <div className="flex justify-between">
                                                                    <span>Mediometraje:</span>
                                                                    <span className="font-mono text-gray-400">30-59 min</span>
                                                                </div>
                                                                <div className="flex justify-between">
                                                                    <span>Cortometraje:</span>
                                                                    <span className="font-mono text-gray-400">&lt; 30 min</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Estado
                                                </label>
                                                <select
                                                    {...register('status')}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                                                >
                                                    {MOVIE_STATUS.map(status => (
                                                        <option key={status.value} value={status.value}>
                                                            {status.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Links Oficiales */}
                                    <div className="mt-6">
                                        <MovieLinksManager
                                            key={`links-${editingMovie?.id || 'new'}-${movieLinks.length}`}
                                            initialLinks={movieLinks}
                                            onLinksChange={handleLinksChange}
                                        />
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

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Nivel de información cargada *
                                            </label>
                                            <select
                                                {...register('dataCompleteness')}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                                            >
                                                {DATA_COMPLETENESS_LEVELS.map(level => (
                                                    <option key={level.value} value={level.value}>
                                                        {level.icon} {level.label}
                                                    </option>
                                                ))}
                                            </select>
                                            <p className="mt-1 text-xs text-gray-500">
                                                Indica hasta qué nivel de detalle has cargado la información de esta película
                                            </p>
                                        </div>
                                    </div>

                                    {/* Géneros, Países e Idiomas */}
                                    <MovieFormEnhanced
                                        key={editingMovie?.id || 'new'}
                                        onGenresChange={handleGenresChange}
                                        onCastChange={handleCastChange}
                                        onCrewChange={handleCrewChange}
                                        onCountriesChange={handleCountriesChange}
                                        onLanguagesChange={handleLanguagesChange}
                                        onProductionCompaniesChange={handleProductionCompaniesChange}
                                        onDistributionCompaniesChange={handleDistributionCompaniesChange}
                                        onThemesChange={handleThemesChange}
                                        initialData={movieFormInitialData}
                                        showOnlyBasicInfo={true}
                                    />
                                </div>
                            </Tabs.Content>
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
                            Paso 8: Contenido de las pestañas "Reparto" y "Equipo Técnico"
                            Ahora reemplaza las pestañas de cast y crew:
                            typescript{/* Pestaña de Reparto */}
                            <Tabs.Content value="cast">
                                <MovieFormEnhanced
                                    key={editingMovie?.id || 'new'}
                                    onGenresChange={handleGenresChange}
                                    onCastChange={handleCastChange}
                                    onCrewChange={handleCrewChange}
                                    onCountriesChange={handleCountriesChange}
                                    onLanguagesChange={handleLanguagesChange}
                                    onProductionCompaniesChange={handleProductionCompaniesChange}
                                    onDistributionCompaniesChange={handleDistributionCompaniesChange}
                                    onThemesChange={handleThemesChange}
                                    initialData={movieFormInitialData}
                                    showOnlyCast={true}
                                />
                            </Tabs.Content>

                            {/* Pestaña de Equipo Técnico */}
                            <Tabs.Content value="crew">
                                <MovieFormEnhanced
                                    key={editingMovie?.id || 'new'}
                                    onGenresChange={handleGenresChange}
                                    onCastChange={handleCastChange}
                                    onCrewChange={handleCrewChange}
                                    onCountriesChange={handleCountriesChange}
                                    onLanguagesChange={handleLanguagesChange}
                                    onProductionCompaniesChange={handleProductionCompaniesChange}
                                    onDistributionCompaniesChange={handleDistributionCompaniesChange}
                                    onThemesChange={handleThemesChange}
                                    initialData={movieFormInitialData}
                                    showOnlyCrew={true}
                                />
                            </Tabs.Content>
                            <Tabs.Content value="cast">
                                <p>Reparto aquí</p>
                            </Tabs.Content>
                            <Tabs.Content value="crew">
                                <p>Equipo técnico aquí</p>
                            </Tabs.Content>
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
                                                {SOUND_TYPES.map(sound => (
                                                    <option key={sound.value} value={sound.value}>
                                                        {sound.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
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
                                    {(() => {
                                        const selectedRating = availableRatings.find(r => r.id === watch('ratingId'))
                                        return selectedRating?.description && (
                                            <p className="mt-1 text-sm text-gray-500">
                                                {selectedRating.description}
                                            </p>
                                        )
                                    })()}
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

                                {/* Títulos Alternativos */}
                                <div className="mt-6">
                                    <AlternativeTitlesManager
                                        onChange={setAlternativeTitles}
                                        initialTitles={editingMovie ? alternativeTitles : []}
                                    />
                                </div>

                                {/* Productoras y Distribuidoras */}
                                <MovieFormEnhanced
                                    key={editingMovie?.id || 'new'}
                                    onGenresChange={handleGenresChange}
                                    onCastChange={handleCastChange}
                                    onCrewChange={handleCrewChange}
                                    onCountriesChange={handleCountriesChange}
                                    onLanguagesChange={handleLanguagesChange}
                                    onProductionCompaniesChange={handleProductionCompaniesChange}
                                    onDistributionCompaniesChange={handleDistributionCompaniesChange}
                                    onThemesChange={handleThemesChange}
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
                            onClick={onClose}
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
    )
}