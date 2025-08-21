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
    soundType
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
        'https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=1024&fit=crop&auto=format',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7506d40?w=1024&fit=crop&auto=format',
        'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1024&fit=crop&auto=format',
        'https://images.unsplash.com/photo-1489599328131-cdd7553e2ad1?w=1024&fit=crop&auto=format',
        'https://images.unsplash.com/photo-1556388158-158ea5ccacbd?w=1024&fit=crop&auto=format'
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
                                title="Relatos Salvajes"
                            // imageUrl={movie.posterUrl} // Cuando tengas la URL del poster
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

                        {/* Cast */}
                        <CastSection
                            mainCast={[
                                { name: 'Ricardo Darín', character: 'Diego' },
                                { name: 'Érica Rivas', character: 'Romina' },
                                { name: 'Leonardo Sbaraglia', character: 'Cuenca' }
                            ]}
                            fullCast={[
                                { name: 'Oscar Martínez', character: 'Mauricio' },
                                { name: 'Julieta Zylberberg', character: 'Isabel' },
                                { name: 'Rita Cortese', character: 'Cocinera' },
                                { name: 'Darío Grandinetti', character: 'Ariel' },
                                { name: 'María Marull', character: 'Victoria' },
                                { name: 'Mónica Villa', character: 'Novia' },
                                { name: 'Diego Starosta', character: 'Novio' },
                                { name: 'Nancy Duplá', character: 'Mujer en ruta' },
                                { name: 'Cesar Bordón', character: 'Hombre en ruta' },
                                { name: 'Walter Donado', character: 'Piloto' }
                            ]}
                        />

                        {/* Crew */}
                        <CrewSection
                            basicCrew={{
                                "Dirección": [
                                    { name: "Damián Szifron", role: "Director" }
                                ],
                                "Guión": [
                                    { name: "Damián Szifron", role: "Guionista" }
                                ],
                                "Fotografía": [
                                    { name: "Javier Juliá", role: "Director de fotografía" }
                                ],
                                "Música": [
                                    { name: "Gustavo Santaolalla", role: "Compositor" }
                                ],
                                "Montaje": [
                                    { name: "Pablo Barbieri", role: "Editor" },
                                    { name: "Damián Szifrón", role: "Editor" }
                                ],
                                "Dirección de Arte": [
                                    { name: "Clara Notari", role: "Dirección de arte" }
                                ],
                                "Producción": [
                                    { name: "Hugo Sigman", role: "Producción" },
                                    { name: "Matías Mosteirín", role: "Producción" },
                                    { name: "Esther García", role: "Producción" },
                                    { name: "Pedro Almodóvar", role: "Producción" },
                                    { name: "Agustín Almodóvar", role: "Producción" }
                                ]
                            }}
                            fullCrew={{
                                "Dirección": [
                                    { name: "Damián Szifrón", role: "Director" },
                                    { name: "Cristian Trebotic", role: "Asistente de Dirección" },
                                    { name: "Natalia Urruty", role: "Asistente de Dirección" },
                                    { name: "Javier Braier", role: "Dirección de casting" },
                                    { name: "Lorena Lisotti", role: "Continuista" },
                                    { name: "Marcello Pozzo", role: "Ayudante de dirección" },
                                    { name: "Agustín Arévalo", role: "2do ayudante de dirección" },
                                    { name: "Lucila Frank", role: "Refuerzo de dirección" },
                                    { name: "Iair Said", role: "Asistente de casting" },
                                    { name: "Katia Szechtman", role: "Asistente de casting" }
                                ],
                                "Guión": [
                                    { name: "Damián Szifron", role: "Guionista" }
                                ],
                                "Fotografía": [
                                    { name: "Javier Juliá", role: "Director de fotografía" }
                                ],
                                "Música": [
                                    { name: "Gustavo Santaolalla", role: "Compositor" }
                                ],
                                "Producción": [
                                    { name: "Matías Mosteirín", role: "Producción" },
                                    { name: "Esther García", role: "Producción" },
                                    { name: "Hugo Sigman", role: "Producción" },
                                    { name: "Pedro Almodóvar", role: "Producción" },
                                    { name: "Agustín Almodóvar", role: "Producción" },
                                    { name: "Claudio F. Belocopitt", role: "Productor asociado" },
                                    { name: "Gerardo Rozín", role: "Productor asociado" },
                                    { name: "Leticia Cristi", role: "Producción ejecutiva" },
                                    { name: "Pola Zito", role: "Producción ejecutiva" },
                                    { name: "Analía Castro", role: "Jefe de Producción" },
                                    { name: "Axel Kuschevatzky", role: "Coproducción" },
                                    { name: "Carolina Agunin", role: "Coordinación de producción" },
                                    { name: "Covadonga R. Gamboa", role: "Jefe de Producción" }
                                ],
                                "Montaje": [
                                    { name: "Pablo Barbieri", role: "Editor" },
                                    { name: "Damián Szifrón", role: "Editor" }
                                ],
                                "Dirección de Arte": [
                                    { name: "Clara Notari", role: "Dirección de arte" },
                                    { name: "Ruth Fischerman", role: "Vestuario" },
                                    { name: "Marisa Amenta", role: "Maquillaje" }
                                ]
                            }}
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

            {/* Image Gallery */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-gray-800">
                <h2 className="serif-heading text-2xl text-white mb-6">Galería de Imágenes</h2>
                <ImageGallery
                    images={movieGallery}
                    movieTitle={movie.title}
                />
            </div>

            {/* Trailer */}
            <TrailerSection
                trailerUrl="https://youtu.be/3BxE9osMt5U?si=mLEH7dp-ll7ZJsXG"
                movieTitle={movie.title}
            />

            {/* Similar Movies */}
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
        </div>
    );
}