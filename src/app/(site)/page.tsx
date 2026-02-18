// src/app/page.tsx
'use client';

import { useHomeData } from '@/hooks/useHomeData';
import HeroSection from '@/components/home/HeroSection';
import MoviesGrid from '@/components/home/MoviesGrid';
import RecentMoviesSection from '@/components/home/RecentMoviesSection';
import RecentPeopleSection from '@/components/home/RecentPeopleSection';
import ObituariosSection from '@/components/home/ObituariosSection';
import EfemeridesSection from '@/components/home/EfemeridesSection';
import ErrorMessage from '@/components/home/ErrorMessage';
import { HeroMovie, Efemeride } from '@/types/home.types';
import { formatPartialDate } from '@/lib/shared/dateUtils';
import HomeMiddleBanner from '@/components/ads/HomeMiddleBanner'
import HomeBottomBanner from '@/components/ads/HomeBottomBanner'
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

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

  const [obituarios, setObituarios] = useState<any[]>([]);
  const [loadingObituarios, setLoadingObituarios] = useState(true);
  const [efemerides, setEfemerides] = useState<Efemeride[]>([]);
  const [loadingEfemerides, setLoadingEfemerides] = useState(true);

  // Estado para imágenes del hero
  const [heroImages, setHeroImages] = useState<any[]>([]);
  const [loadingHero, setLoadingHero] = useState(true);

  // Función para calcular fecha efectiva de personas
  const calcularFechaEfectivaPersona = (person: any, type: 'birth' | 'death') => {
    const prefix = type === 'birth' ? 'birth' : 'death';
    const year = person[`${prefix}Year`];
    const month = person[`${prefix}Month`] || 12;
    const day = person[`${prefix}Day`] || new Date(year, month, 0).getDate();

    return new Date(year, month - 1, day);
  };

  // Fetch imágenes del hero
  useEffect(() => {
    const fetchHeroImages = async () => {
      try {
        setLoadingHero(true);
        const response = await fetch('/api/images/hero');

        if (!response.ok) {
          throw new Error('Error al cargar imágenes del hero');
        }

        const data = await response.json();
        setHeroImages(data.images || []);
      } catch (error) {
        console.error('Error fetching hero images:', error);
        setHeroImages([]);
      } finally {
        setLoadingHero(false);
      }
    };

    fetchHeroImages();
  }, []);

  // Fetch obituarios
  useEffect(() => {
    const fetchObituarios = async () => {
      try {
        setLoadingObituarios(true);

        const params = {
          limit: '50',
          hasDeathDate: 'true',
          sortBy: 'deathDate',
          sortOrder: 'desc'
        };

        const response = await fetch(`/api/people?${new URLSearchParams(params)}`);

        if (!response.ok) {
          throw new Error('Error al cargar obituarios');
        }

        const data = await response.json();

        const personasConFecha = data.data.filter((person: any) => person.deathYear);

        const personasOrdenadas = personasConFecha.sort((a: any, b: any) => {
          const dateA = calcularFechaEfectivaPersona(a, 'death');
          const dateB = calcularFechaEfectivaPersona(b, 'death');
          return dateB.getTime() - dateA.getTime();
        });

        setObituarios(personasOrdenadas.slice(0, 3));
      } catch (error) {
        console.error('Error fetching obituarios:', error);
        setObituarios([]);
      } finally {
        setLoadingObituarios(false);
      }
    };

    fetchObituarios();
  }, []);

  // Fetch efemérides
  useEffect(() => {
    const fetchEfemerides = async () => {
      try {
        setLoadingEfemerides(true);

        const response = await fetch('/api/efemerides');

        if (!response.ok) {
          const errorData = await response.text();
          console.error('Error response:', errorData);
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.efemerides && data.efemerides.length > 0) {
          if (data.efemerides.length <= 3) {
            setEfemerides(data.efemerides);
          } else {
            const shuffled = [...data.efemerides];
            for (let i = shuffled.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }

            const tresAleatorias = shuffled.slice(0, 3);
            setEfemerides(tresAleatorias);
          }
        } else {
          setEfemerides([]);
        }
      } catch (error) {
        console.error('Error fetching efemérides:', error);
        setEfemerides([]);
      } finally {
        setLoadingEfemerides(false);
      }
    };

    fetchEfemerides();
  }, []);


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
