// src/app/listados/obituarios/ObituariosContent.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ObituariosYearSelector from '@/components/listados/obituarios/ObituariosYearSelector';
import ObituariosGrid from '@/app/(site)/listados/obituarios/ObituariosGrid';
import { PersonWithDeath, ObituariosPagination } from '@/lib/obituarios/obituariosTypes';
import { getCurrentYear, filtersToApiParams } from '@/lib/obituarios/obituariosUtils';

export default function ObituariosContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Estado
  const [selectedYear, setSelectedYear] = useState<number>(getCurrentYear());
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [people, setPeople] = useState<PersonWithDeath[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [pagination, setPagination] = useState<ObituariosPagination>({
    page: 1,
    totalPages: 1,
    total: 0
  });
  const [currentPage, setCurrentPage] = useState(1);

  // Cargar años disponibles al montar
  useEffect(() => {
    loadAvailableYears();
  }, []);

  // Inicializar desde URL params - SOLO UNA VEZ
  useEffect(() => {
    const yearParam = searchParams.get('year');

    if (yearParam) {
      const year = parseInt(yearParam);
      if (!isNaN(year)) {
        setSelectedYear(year);
      }
    }

    // Marcar como inicializado
    setIsInitialized(true);
  }, []);

  // Resetear a página 1 cuando cambia el año
  useEffect(() => {
    if (!isInitialized) return;
    setCurrentPage(1);
  }, [selectedYear]);

  // Cargar personas cuando cambian filtros o página
  useEffect(() => {
    if (!isInitialized) return;
    loadPeople();
  }, [selectedYear, currentPage, isInitialized]);

  // Actualizar URL cuando cambia el año
  useEffect(() => {
    if (!isInitialized) return;

    const params = new URLSearchParams();
    params.set('year', selectedYear.toString());

    const queryString = params.toString();
    const newUrl = `/listados/obituarios?${queryString}`;

    router.replace(newUrl, { scroll: false });
  }, [selectedYear, router, isInitialized]);

  const loadAvailableYears = async () => {
    try {
      const response = await fetch('/api/people/death-years');
      
      if (!response.ok) {
        throw new Error('Error al cargar años');
      }

      const data = await response.json();
      setAvailableYears(data.years || []);
    } catch (error) {
      console.error('Error loading death years:', error);
      setAvailableYears([]);
    }
  };

  const loadPeople = async () => {
    setIsLoading(true);

    try {
      const apiParams = filtersToApiParams(selectedYear, currentPage, 90);
      const params = new URLSearchParams(apiParams);

      const response = await fetch(`/api/people?${params}`);

      if (!response.ok) {
        throw new Error('Error al cargar obituarios');
      }

      const data = await response.json();

      setPeople(data.data || []);
      
      setPagination({
        page: data.page || 1,
        totalPages: data.totalPages || 1,
        total: data.totalCount || 0
      });

    } catch (error) {
      console.error('Error loading people:', error);
      setPeople([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
  };

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
      <div className="bg-gray-900/50 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                Obituarios de {selectedYear}
              </h1>
              {pagination.total > 0 && (
                <p className="text-gray-400 text-sm">
                  {pagination.total} persona{pagination.total !== 1 ? 's' : ''} fallecida{pagination.total !== 1 ? 's' : ''}
                </p>
              )}
            </div>

            {availableYears.length > 0 && (
              <ObituariosYearSelector
                availableYears={availableYears}
                selectedYear={selectedYear}
                onChange={handleYearChange}
              />
            )}
          </div>
        </div>
      </div>

      {/* Grid de personas */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ObituariosGrid
          people={people}
          isLoading={isLoading}
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