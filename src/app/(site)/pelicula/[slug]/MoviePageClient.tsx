// src/app/pelicula/[slug]/MoviePageClient.tsx

'use client';

import { TrailerSection } from "@/components/movies/TrailerSection";
import { MovieHero } from "@/components/movies/MovieHero";
import { CastSection } from "@/components/movies/CastSection";
import { CrewSection } from "@/components/movies/CrewSection";
import { MoviePoster } from "@/components/movies/MoviePoster";
import { MovieInfo } from "@/components/movies/MovieInfo";
import { MovieSidebar } from "@/components/movies/MovieSidebar";
import { ImageGallery } from "@/components/movies/ImageGallery";
import { SimilarMovies } from "@/components/movies/SimilarMovies";
import { usePageView } from '@/hooks/usePageView';

// Componente de anuncios
import AdBanner from "@/components/ads/AdBanner";

interface CastMember {
    name: string;
    character: string;
    image?: string;
    isPrincipal?: boolean;
    billingOrder?: number;
    personId?: number;
    personSlug?: string;
}

interface CrewMember {
    name: string;
    role: string;
    personSlug?: string;
}

interface CrewDepartment {
    [department: string]: CrewMember[];
}

// Tipo para las imágenes de galería con datos para caption
interface GalleryImage {
    id: number;
    url: string;
    cloudinaryPublicId: string;
    type: string;
    eventName?: string | null;
    people: Array<{
        personId: number;
        position: number;
        person: {
            id: number;
            firstName?: string | null;
            lastName?: string | null;
        }
    }>;
    movie?: {
        id: number;
        title: string;
        releaseYear?: number | null;
    } | null;
}

interface MoviePageClientProps {
    movie: any;
    displayYear: number | null;
    totalDuration: number;
    durationSeconds?: number | null;
    genres: Array<{ id: number; name: string }>;
    themes: Array<{ id: number; name: string }>;
    countries: Array<{ id: number; name: string }>;
    rating?: { id: number; name: string; description?: string; abbreviation?: string | null } | null;
    colorType?: { id: number; name: string } | null;
    soundType?: string | null;
    mainCast: CastMember[];
    fullCast: CastMember[];
    basicCrew: CrewDepartment;
    fullCrew: CrewDepartment;
    premiereVenues: string;
    releaseDate?: {
        day: number | null;
        month: number | null;
        year: number | null;
    } | null;
    heroBackgroundImage?: string | null;
    galleryImages?: GalleryImage[];
}

// Slots de AdSense - Reemplazar con tus IDs reales
const AD_SLOTS = {
    // HERO: '1634150481',         // Ya está en el header global
    POST_INFO: '8509488902',    // Después de MovieInfo (in-article)
    SIDEBAR: '8621169545',      // Sidebar sticky
    CAST_CREW: '7432210959',    // Entre Cast y Crew (in-article)
    PRE_TRAILER: '7308087870',  // Antes del trailer (in-article)
    MULTIPLEX: '6191938018',    // Final de página (multiplex)
};

export function MoviePageClient({
    movie,
    displayYear,
    totalDuration,
    durationSeconds,
    genres,
    themes,
    countries,
    rating,
    colorType,
    soundType,
    mainCast,
    fullCast,
    basicCrew,
    fullCrew,
    premiereVenues,
    releaseDate,
    heroBackgroundImage,
    galleryImages = []
}: MoviePageClientProps) {
    usePageView({ pageType: 'MOVIE', movieId: movie.id });

    // Mostrar anuncio entre cast y crew solo si hay contenido suficiente
    const showCastCrewAd = mainCast.length > 3 || fullCast.length > 5;

    return (
        <div className="bg-cine-dark text-white min-h-screen">
            {/* Movie Hero Background - ACTUALIZADO CON DATOS REALES */}
            <MovieHero
                title={movie.title}
                year={displayYear}
                duration={totalDuration}
                genres={genres.map(g => g.name)}
                posterUrl={movie.posterUrl}
                releaseDate={releaseDate}
                premiereVenues={premiereVenues}
                rating={rating}
                heroBackgroundImage={heroBackgroundImage}
            />

            {/* Movie Content */}
            <div className="bg-cine-dark">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Poster */}
                        <div className="lg:col-span-1">
                            <MoviePoster
                                title={movie.title}
                                imageUrl={movie.posterUrl}
                            />
                        </div>

                        {/* Movie Info */}
                        <div className="lg:col-span-2">
                            <MovieInfo
                                movie={movie}
                                onTrailerClick={() => {
                                    const trailerSection = document.querySelector('#trailer-section');
                                    trailerSection?.scrollIntoView({ behavior: 'smooth' });
                                }}
                                onShareClick={() => {
                                    if (navigator.share) {
                                        navigator.share({
                                            title: movie.title,
                                            text: `Mira ${movie.title} - Película argentina`,
                                            url: window.location.href
                                        });
                                    }
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* 📢 AD #2: Después de MovieInfo - Transición natural */}
            <AdBanner slot={AD_SLOTS.POST_INFO} format="in-article" />

            {/* Technical Info */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Cast & Crew */}
                    <div className="lg:col-span-2">
                        <h2 className="serif-heading text-2xl mb-6 text-white">Reparto y Equipo</h2>

                        {/* Cast - AHORA CON DATOS REALES DE LA BD */}
                        <CastSection
                            mainCast={mainCast}
                            fullCast={fullCast}
                        />

                        {/* 📢 AD #3: Entre Cast y Crew (condicional) */}
                        {/*showCastCrewAd && (
                            <AdBanner slot={AD_SLOTS.CAST_CREW} format="in-article" />
                        )*/}

                        {/* Crew - AHORA CON DATOS REALES DE LA BD */}
                        <CrewSection
                            basicCrew={basicCrew}
                            fullCrew={fullCrew}
                        />
                    </div>

                    {/* Sidebar Info */}
                    <div className="lg:col-span-1">
                        <MovieSidebar
                            year={movie.year}
                            releaseYear={movie.releaseYear}
                            duration={totalDuration}
                            durationSeconds={durationSeconds}
                            countries={countries}
                            rating={rating}
                            colorType={colorType}
                            soundType={soundType}
                            genres={genres}
                            themes={themes}
                        />

                        {/* 📢 AD #4: Sidebar sticky - solo desktop */}
                      {/*  <div className="mt-8 hidden lg:block">
                            <AdBanner slot={AD_SLOTS.SIDEBAR} format="sidebar" />
                        </div>*/}
                    </div>
                </div>
            </div>

            {/* Image Gallery - Solo se muestra si hay imágenes */}
            {galleryImages.length > 0 && (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-gray-800">
                    <h2 className="serif-heading text-2xl text-white mb-6">Galería de Imágenes</h2>
                    <ImageGallery
                        images={galleryImages}
                        movieTitle={movie.title}
                    />
                </div>
            )}

            {/* Trailer - Solo se muestra si hay URL */}
            {movie.trailerUrl && (
                <>
                    {/* 📢 AD #5: Antes del trailer - Alto engagement */}
                    <AdBanner slot={AD_SLOTS.PRE_TRAILER} format="in-article" />

                    <TrailerSection
                        trailerUrl={movie.trailerUrl}
                        movieTitle={movie.title}
                    />
                </>
            )}

            {/* 📢 AD #6: Multiplex al final - Recomendaciones */}
            <div className="border-t border-gray-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <p className="text-sm text-gray-500 mb-4">También te puede interesar</p>
                    <AdBanner slot={AD_SLOTS.MULTIPLEX} format="multiplex" />
                </div>
            </div>

            {/* Similar Movies - TODO: Implementar con datos reales
            <SimilarMovies
                movies={[
                    {
                        title: 'El Secreto de sus Ojos',
                        year: '2009',
                        slug: 'el-secreto-de-sus-ojos'
                    },
                    {
                        title: 'Nueve Reinas',
                        year: '2000',
                        slug: 'nueve-reinas'
                    },
                    {
                        title: 'El Hijo de la Novia',
                        year: '2001',
                        slug: 'el-hijo-de-la-novia'
                    },
                    {
                        title: 'La Historia Oficial',
                        year: '1985',
                        slug: 'la-historia-oficial'
                    }
                ]}
            />
            */}
        </div>
    );
}