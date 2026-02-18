// src/app/listados/estrenos/EstrenosContent.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { FilmReleasesByYear, ReleaseEntry } from '@/components/FilmReleasesByYear';
import { MovieWithRelease } from '@/types/home.types';
import { POSTER_PLACEHOLDER } from '@/lib/movies/movieConstants';

export default function EstrenosContent() {
    const [movies, setMovies] = useState<MovieWithRelease[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Cargar TODAS las películas con fecha de estreno
    useEffect(() => {
        loadAllMovies();
    }, []);

    const loadAllMovies = async () => {
        setIsLoading(true);
        try {
            // Traer un lote grande para tener todas las películas con estreno
            const params = new URLSearchParams({
                page: '1',
                limit: '10000',
                sortBy: 'releaseYear',
                sortOrder: 'asc',
            });

            const response = await fetch(`/api/movies?${params}`);
            if (!response.ok) throw new Error('Error al cargar estrenos');

            const data = await response.json();
            const filteredMovies = (data.movies || []).filter(
                (m: MovieWithRelease) => m.releaseYear,
            );
            setMovies(filteredMovies);
        } catch (error) {
            console.error('Error loading movies:', error);
            setMovies([]);
        } finally {
            setIsLoading(false);
        }
    };

    // Convertir MovieWithRelease[] → ReleaseEntry[]
    const entries: ReleaseEntry[] = useMemo(() => {
        return movies.map((m) => {
            // Obtener directores
            let director = '';
            if (m.crew && m.crew.length > 0) {
                const directores = m.crew.filter((c) => c.roleId === 2);
                const nombres = directores
                    .map((d) => {
                        if (d?.person) {
                            const first = d.person.firstName || '';
                            const last = d.person.lastName || '';
                            return `${first} ${last}`.trim();
                        }
                        return null;
                    })
                    .filter(Boolean);
                if (nombres.length > 2) {
                    director = `${nombres.slice(0, 2).join(', ')} y otros`;
                } else if (nombres.length > 0) {
                    director = nombres.join(' y ');
                }
            }

            // ISO para ordenamiento: YYYY-MM-DD
            let releaseDateISO: string | undefined;
            if (m.releaseYear) {
                const y = m.releaseYear.toString().padStart(4, '0');
                const mo = (m.releaseMonth ?? 0).toString().padStart(2, '0');
                const d = (m.releaseDay ?? 0).toString().padStart(2, '0');
                releaseDateISO = `${y}-${mo}-${d}`;
            }

            return {
                title: m.title,
                href: `/pelicula/${m.slug}`,
                posterSrc: m.posterUrl || POSTER_PLACEHOLDER.cloudinaryUrl,
                year: m.releaseYear,
                director: director || undefined,
                releaseMonth: m.releaseMonth,
                releaseDay: m.releaseDay,
                releaseDateISO,
            };
        });
    }, [movies]);

    if (isLoading) {
        return (
            <div className="mx-auto flex min-h-[60vh] w-full max-w-7xl items-center justify-center px-4">
                <div className="text-center">
                    <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-accent" />
                    <p className="text-[13px] text-muted-foreground/40">
                        Cargando estrenos…
                    </p>
                </div>
            </div>
        );
    }

    return <FilmReleasesByYear entries={entries} />;
}
