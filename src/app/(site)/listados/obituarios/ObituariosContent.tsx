// src/app/listados/obituarios/ObituariosContent.tsx
'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown } from 'lucide-react';
import ObituariosGrid from '@/app/(site)/listados/obituarios/ObituariosGrid';
import { PersonWithDeath } from '@/lib/obituarios/obituariosTypes';
import { getCurrentYear, filtersToApiParams } from '@/lib/obituarios/obituariosUtils';
import Pagination from '@/components/shared/Pagination';

export default function ObituariosContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize year from URL params
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    const yearParam = searchParams.get('year');
    if (yearParam) {
      const year = parseInt(yearParam);
      if (!isNaN(year)) return year;
    }
    return getCurrentYear();
  });
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch available years
  const { data: availableYears = [] } = useQuery<number[]>({
    queryKey: ['obituarios-years'],
    queryFn: async () => {
      const response = await fetch('/api/people/death-years');
      if (!response.ok) throw new Error('Error al cargar años');
      const data = await response.json();
      return data.years || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch people for selected year
  const { data: peopleData, isLoading } = useQuery({
    queryKey: ['obituarios', selectedYear, currentPage],
    queryFn: async () => {
      const apiParams = filtersToApiParams(selectedYear, currentPage, 90);
      const params = new URLSearchParams(apiParams);
      const response = await fetch(`/api/people?${params}`);
      if (!response.ok) throw new Error('Error al cargar obituarios');
      const data = await response.json();
      return {
        people: (data.data || []) as PersonWithDeath[],
        pagination: {
          page: data.page || 1,
          totalPages: data.totalPages || 1,
          total: data.totalCount || 0,
        },
      };
    },
  });

  const people = peopleData?.people || [];
  const pagination = peopleData?.pagination || { page: 1, totalPages: 1, total: 0 };

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    setCurrentPage(1);

    const params = new URLSearchParams();
    params.set('year', year.toString());
    router.replace(`/listados/obituarios?${params}`, { scroll: false });
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8 md:py-12 lg:px-12">
      {/* Título */}
      <h1 className="font-serif text-2xl tracking-tight md:text-3xl lg:text-4xl">
        Obituarios de {selectedYear}
      </h1>

      {/* Contador */}
      {pagination.total > 0 && (
        <p className="mt-1 text-[12px] text-muted-foreground/40 md:text-[13px]">
          {pagination.total.toLocaleString('es-AR')} persona{pagination.total !== 1 ? 's' : ''} fallecida{pagination.total !== 1 ? 's' : ''}
        </p>
      )}

      {/* Toolbar */}
      <div className="mt-6 flex flex-wrap items-center gap-3 border-b border-border/20 pb-4">
        {/* Select de año */}
        {availableYears.length > 0 && (
          <div className="relative">
            <select
              value={selectedYear}
              onChange={(e) => handleYearChange(parseInt(e.target.value))}
              className="h-8 appearance-none border border-border/30 bg-transparent px-2 pr-7 text-[12px] text-muted-foreground/60 outline-none transition-colors focus:border-accent/40 [&>option]:bg-[#0c0d0f] [&>option]:text-[#9a9da2]"
            >
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground/40" />
          </div>
        )}
      </div>

      {/* Grid de personas */}
      <ObituariosGrid
        people={people}
        isLoading={isLoading}
      />

      {/* Paginación */}
      {!isLoading && (
        <Pagination
          currentPage={currentPage}
          totalPages={pagination.totalPages}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}
