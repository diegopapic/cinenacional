// src/app/peliculas/[slug]/MoviePageClient.tsx

'use client';

import { useState, useEffect } from 'react';
import { TrailerSection } from "@/components/movies/TrailerSection";
import { MovieHero } from "@/components/movies/MovieHero";
import { CastSection } from "@/components/movies/CastSection";
import { CrewSection } from "@/components/movies/CrewSection";
import { MoviePoster } from "@/components/movies/MoviePoster";
import { MovieInfo } from "@/components/movies/MovieInfo";
import { MovieSidebar } from "@/components/movies/MovieSidebar";
import { ImageGallery } from "@/components/movies/ImageGallery";
import { SimilarMovies } from "@/components/movies/SimilarMovies";

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

interface MoviePageClientProps {
    movie: any;
    displayYear: number | null;
    totalDuration: number;
    durationSeconds?: number | null;
    genres: Array<{ id: number; name: string }>;
    themes: Array<{ id: number; name: string }>;
    countries: Array<{ id: number; name: string }>;
    rating?: { id: number; name: string; description?: string } | null;
    colorType?: { id: number; name: string } | null;
    soundType?: string | null;
    mainCast: CastMember[];
    fullCast: CastMember[];
    basicCrew: CrewDepartment;  // NUEVO
    fullCrew: CrewDepartment;   // NUEVO
}

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
    basicCrew,  // NUEVO
    fullCrew    // NUEVO
}: MoviePageClientProps) {
    const [movieGallery, setMovieGallery] = useState<string[]>([]);

    // Función para cargar imágenes desde la API
    const loadMovieImages = async (movieId: string) => {
        try {
            const response = await fetch(`/api/images/${movieId}`);
            console.log(`📡 Respuesta de la API:`, response.status);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log(`📦 Datos recibidos:`, data);

            if (data.images && data.images.length > 0) {
                // Optimizar URLs para resolución máxima de 1024px
                const images = data.images.map((img: any) => {
                    let url = img.url;
                    // Si es de Unsplash, limitar a 1024px de ancho máximo
                    if (url.includes('unsplash.com')) {
                        url = url.replace(/w=\d+/, 'w=1024').replace(/h=\d+/, '');
                        if (!url.includes('w=')) {
                            url += url.includes('?') ? '&w=1024&fit=crop&auto=format' : '?w=1024&fit=crop&auto=format';
                        }
                    }
                    return url;
                });

                setMovieGallery(images);
                console.log(`✅ Cargadas ${data.count} imágenes optimizadas a 1024px:`, images);
            } else {
                console.log('⚠️ No se encontraron imágenes, usando fallback');
                setMovieGallery(getFallbackImages());
            }
        } catch (error) {
            console.error('❌ Error cargando imágenes:', error);
            setMovieGallery(getFallbackImages());
        }
    };

    // Función para obtener imágenes de fallback optimizadas
    const getFallbackImages = () => [
        'https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=1024&fit=crop&auto=format'
    ];

    // Cargar imágenes al montar el componente
    useEffect(() => {
        loadMovieImages(movie.slug);
    }, [movie.slug]);

    return (
        <div className="bg-cine-dark text-white min-h-screen">
            {/* Movie Hero Background - ACTUALIZADO CON DATOS REALES */}
            <MovieHero
                title={movie.title}
                year={displayYear}
                duration={totalDuration}
                genres={genres.map(g => g.name)}
                gallery={movieGallery}
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
                    </div>
                </div>
            </div>

            {/* Image Gallery 
            
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-gray-800">
                <h2 className="serif-heading text-2xl text-white mb-6">Galería de Imágenes</h2>
                <ImageGallery
                    images={movieGallery}
                    movieTitle={movie.title}
                />
            </div>
            */ }
            {/* Trailer 
            {movie.trailerUrl ? (
                <TrailerSection
                    trailerUrl={movie.trailerUrl}
                    movieTitle={movie.title}
                />
            ) : (
                <TrailerSection
                    trailerUrl="https://youtu.be/3BxE9osMt5U?si=mLEH7dp-ll7ZJsXG"
                    movieTitle={movie.title}
                />
            )}
            */}
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