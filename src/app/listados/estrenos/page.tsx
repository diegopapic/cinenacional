// src/app/listados/estrenos/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import EstrenosDecadeSelector from '@/components/listados/estrenos/EstrenosDecadeSelector';
import EstrenosYearBar from '@/components/listados/estrenos/EstrenosYearBar';
import EstrenosGrid from '@/components/listados/estrenos/EstrenosGrid';
import { DecadePeriod } from '@/lib/estrenos/estrenosTypes';
import {
    getCurrentYear,
    getCurrentDecade,
    formatPeriodLabel,
    periodToApiFilters
} from '@/lib/estrenos/estrenosUtils';
import { MovieWithRelease } from '@/types/home.types';

export const dynamic = 'force-dynamic';

export default function EstrenosPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Estado
    const [period, setPeriod] = useState<DecadePeriod>('all');
    const [selectedYear, setSelectedYear] = useState<number | null>(null);
    const [movies, setMovies] = useState<MovieWithRelease[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isInitialized, setIsInitialized] = useState(false);
    const [pagination, setPagination] = useState({
        page: 1,
        totalPages: 1,
        total: 0
    });
    const [currentPage, setCurrentPage] = useState(1);

    // Inicializar desde URL params - SOLO UNA VEZ
    useEffect(() => {
        const periodParam = searchParams.get('period');
        const yearParam = searchParams.get('year');

        if (periodParam) {
            setPeriod(periodParam as DecadePeriod);
            if (yearParam) {
                setSelectedYear(parseInt(yearParam));
            }
        } else {
            const currentYear = getCurrentYear();
            const currentDecade = getCurrentDecade();
            setPeriod(currentDecade.id);
            setSelectedYear(currentYear);
        }

        setIsInitialized(true);
    }, []);

    // Resetear a página 1 cuando cambian los filtros
    useEffect(() => {
        if (!isInitialized) return;
        setCurrentPage(1);
    }, [period, selectedYear]);

    // Cargar películas cuando cambian filtros o página
    useEffect(() => {
        if (!isInitialized) return;
        loadMovies();
    }, [period, selectedYear, currentPage, isInitialized]);

    // Actualizar URL cuando cambian los filtros
    useEffect(() => {
        if (!isInitialized) return;

        const params = new URLSearchParams();

        if (period !== 'all' && period !== 'upcoming') {
            params.set('period', period);
        }

        if (selectedYear !== null) {
            params.set('year', selectedYear.toString());
        }

        const queryString = params.toString();
        const newUrl = queryString ? `/listados/estrenos?${queryString}` : '/listados/estrenos';

        router.replace(newUrl, { scroll: false });
    }, [period, selectedYear, router, isInitialized]);

    const loadMovies = async () => {
        setIsLoading(true);

        try {
            // Construir filtros para la API
            const apiFilters = periodToApiFilters(period, selectedYear);

            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: period === 'upcoming' ? '1000' : '90',
                sortBy: 'releaseYear',
                sortOrder: 'asc',
                ...apiFilters
            });

            const response = await fetch(`/api/movies?${params}`);

            if (!response.ok) {
                throw new Error('Error al cargar estrenos');
            }

            const data = await response.json();

            // Filtrar películas que tengan al menos releaseYear
            const filteredMovies = (data.movies || []).filter((m: any) => m.releaseYear);

            // Si es "upcoming", filtrar solo futuras
            let finalMovies = filteredMovies;
            if (period === 'upcoming') {
                const currentYear = getCurrentYear();
                finalMovies = filteredMovies.filter((m: any) => {
                    if (!m.releaseYear) return false;

                    // Si tiene fecha completa, verificar que sea futura
                    if (m.releaseMonth && m.releaseDay) {
                        const releaseDate = new Date(m.releaseYear, m.releaseMonth - 1, m.releaseDay);
                        return releaseDate > new Date();
                    }

                    // Si solo tiene año o año-mes, considerar futura si el año es mayor
                    return m.releaseYear >= currentYear;
                });
            }

            setMovies(finalMovies);
            // Para "upcoming", usar el total filtrado en el frontend
            const actualTotal = period === 'upcoming'
                ? finalMovies.length
                : (data.pagination?.total || data.pagination?.totalItems || 0);

            setPagination({
                page: period === 'upcoming' ? 1 : (data.pagination?.page || 1),
                totalPages: period === 'upcoming' ? 1 : Math.ceil(actualTotal / 90),
                total: actualTotal
            });

        } catch (error) {
            console.error('Error loading movies:', error);
            setMovies([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePeriodChange = (newPeriod: DecadePeriod) => {
        setPeriod(newPeriod);

        // Siempre resetear el año a null para mostrar toda la década/período
        setSelectedYear(null);
    };

    const handleYearChange = (year: number | null) => {
        setSelectedYear(year);
    };

    // Funciones de navegación de página
    const handlePreviousPage = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleNextPage = () => {
        if (currentPage < pagination.totalPages) {
            setCurrentPage(currentPage + 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Header */}
            <div className="bg-gray-900/50 backdrop-blur-sm border-b border-gray-800 relative z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold mb-2">
                                {formatPeriodLabel(period, selectedYear)}
                            </h1>
                            {pagination.total > 0 && (
                                <p className="text-gray-400 text-sm">
                                    {pagination.total} película{pagination.total !== 1 ? 's' : ''}
                                </p>
                            )}
                        </div>

                        <EstrenosDecadeSelector
                            value={period}
                            onChange={handlePeriodChange}
                        />
                    </div>
                </div>
            </div>

            {/* Year Bar */}
            <EstrenosYearBar
                period={period}
                selectedYear={selectedYear}
                onYearChange={handleYearChange}
                onPeriodChange={handlePeriodChange}
            />

            {/* Grid de películas */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <EstrenosGrid
                    movies={movies}
                    isLoading={isLoading}
                    dateType={period === 'upcoming' ? 'future' : 'past'}
                />

                {/* Paginación */}
                {!isLoading && pagination.totalPages > 1 && (
                    <div className="flex items-center justify-center gap-4 mt-8">
                        <button
                            onClick={handlePreviousPage}
                            disabled={currentPage === 1}
                            className={`
          px-4 py-2 rounded-lg font-medium transition-all
          ${currentPage === 1
                                    ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                                    : 'bg-gray-800 text-white hover:bg-gray-700'
                                }
        `}
                        >
                            ← Anterior
                        </button>

                        <span className="text-gray-400">
                            Página {currentPage} de {pagination.totalPages}
                        </span>

                        <button
                            onClick={handleNextPage}
                            disabled={currentPage === pagination.totalPages}
                            className={`
          px-4 py-2 rounded-lg font-medium transition-all
          ${currentPage === pagination.totalPages
                                    ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                                    : 'bg-gray-800 text-white hover:bg-gray-700'
                                }
        `}
                        >
                            Siguiente →
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}