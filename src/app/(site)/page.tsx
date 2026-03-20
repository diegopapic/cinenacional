// src/app/page.tsx
'use client';

import { useHomeData } from '@/hooks/useHomeData';
import { useQuery } from '@tanstack/react-query';
import HeroSection from '@/components/home/HeroSection';
import MoviesGrid from '@/components/home/MoviesGrid';
import RecentMoviesSection from '@/components/home/RecentMoviesSection';
import RecentPeopleSection from '@/components/home/RecentPeopleSection';
import ObituariosSection from '@/components/home/ObituariosSection';
import EfemeridesSection from '@/components/home/EfemeridesSection';
import ErrorMessage from '@/components/home/ErrorMessage';
import { Efemeride } from '@/types/home.types';
import Image from 'next/image';
import Link from 'next/link';

function calcularFechaEfectivaPersona(person: any, type: 'birth' | 'death') {
  const prefix = type === 'birth' ? 'birth' : 'death';
  const year = person[`${prefix}Year`];
  const month = person[`${prefix}Month`] || 12;
  const day = person[`${prefix}Day`] || new Date(year, month, 0).getDate();
  return new Date(year, month - 1, day);
}

function pickRandomEfemerides(efemerides: Efemeride[], count: number): Efemeride[] {
  if (efemerides.length <= count) return efemerides;
  const shuffled = [...efemerides];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

export default function HomePage() {
  const {
    ultimosEstrenos,
    proximosEstrenos,
    ultimasPeliculas,
    ultimasPersonas,
    loadingEstrenos,
    loadingProximos,
    loadingRecientes,
    error,
    retry
  } = useHomeData();

  // Hero images
  const { data: heroImages = [], isLoading: loadingHero } = useQuery({
    queryKey: ['hero-images'],
    queryFn: async () => {
      const response = await fetch('/api/images/hero');
      if (!response.ok) throw new Error('Error al cargar imágenes del hero');
      const data = await response.json();
      return data.images || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Obituarios
  const { data: obituarios = [], isLoading: loadingObituarios } = useQuery({
    queryKey: ['home-obituarios'],
    queryFn: async () => {
      const params = { limit: '50', hasDeathDate: 'true', sortBy: 'deathDate', sortOrder: 'desc' };
      const response = await fetch(`/api/people?${new URLSearchParams(params)}`);
      if (!response.ok) throw new Error('Error al cargar obituarios');
      const data = await response.json();
      const conFecha = (data.data || []).filter((p: any) => p.deathYear);
      const ordenadas = conFecha.sort((a: any, b: any) => {
        return calcularFechaEfectivaPersona(b, 'death').getTime() - calcularFechaEfectivaPersona(a, 'death').getTime();
      });
      return ordenadas.slice(0, 3);
    },
    staleTime: 5 * 60 * 1000,
  });

  // Efemérides
  const { data: efemerides = [] } = useQuery({
    queryKey: ['home-efemerides'],
    queryFn: async () => {
      const response = await fetch('/api/efemerides');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      return pickRandomEfemerides(data.efemerides || [], 3);
    },
    staleTime: 5 * 60 * 1000,
  });

  // Formateador para fechas de estrenos (sin año, solo para la home)
  const formatearFechaEstreno = (movie: any): string => {
    if (!movie.releaseYear) return 'Fecha por confirmar';

    if (!movie.releaseMonth) {
      return movie.releaseYear.toString();
    }

    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    if (!movie.releaseDay) {
      return meses[movie.releaseMonth - 1];
    }

    return `${movie.releaseDay} de ${meses[movie.releaseMonth - 1].toLowerCase()}`;
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      {!loadingHero && heroImages.length > 0 && (
        <HeroSection images={heroImages} />
      )}

      {/* Contenido principal */}
      <div className="mx-auto w-full max-w-7xl px-4 lg:px-6">
        <div className="flex flex-col gap-12 py-12">

          {error && <ErrorMessage message={error} onRetry={retry} />}

          {/* Últimos Estrenos */}
          <MoviesGrid
            title="Últimos estrenos"
            movies={ultimosEstrenos}
            loading={loadingEstrenos}
            emptyMessage="No hay estrenos disponibles en este momento"
            showDate={true}
            dateType="past"
            dateFormatter={formatearFechaEstreno}
            ctaText="Ver más estrenos"
            ctaHref="/listados/estrenos"
          />

          {/* Próximos Estrenos */}
          <MoviesGrid
            title="Próximos estrenos"
            movies={proximosEstrenos}
            loading={loadingProximos}
            emptyMessage="No hay próximos estrenos confirmados"
            showDate={true}
            dateType="future"
            dateFormatter={formatearFechaEstreno}
            showFutureBadge={false}
            ctaText="Ver más próximos estrenos"
            ctaHref="/listados/estrenos?period=upcoming"
          />

          {/* Grid de Obituarios y Efemérides */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <ObituariosSection
              obituarios={obituarios}
              loading={loadingObituarios}
            />
            <EfemeridesSection efemerides={efemerides} />
          </div>

          {/* <HomeMiddleBanner /> */}

          {/* Banner UCINE */}
          <div className="flex justify-center">
            <Link
              href="https://www.ucine.edu.ar"
              target="_blank"
              rel="noopener noreferrer"
              className="block max-w-[601px] w-full"
            >
              <Image
                src="/fuc.png"
                alt="Programas de formación UCINE"
                width={601}
                height={101}
                className="w-full h-auto"
                priority
              />
            </Link>
          </div>

          {/* Últimas Películas Ingresadas */}
          <RecentMoviesSection
            movies={ultimasPeliculas}
            loading={loadingRecientes}
          />

          {/* <HomeBottomBanner /> */}

          {/* Últimas Personas Ingresadas */}
          <RecentPeopleSection
            people={ultimasPersonas}
            loading={loadingRecientes}
          />
        </div>
      </div>
    </div>
  );
}
