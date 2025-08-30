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
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

// export const dynamic = 'force-dynamic'
// export const revalidate = 0

// Datos estáticos (mover a constants/homeData.ts)
const PELICULAS_HERO: HeroMovie[] = [
  { id: 1, titulo: "El Secreto de Sus Ojos", año: "2009", genero: "Drama, Thriller", director: "Juan José Campanella", imagen: "https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=1024&fit=crop&auto=format" },
  { id: 2, titulo: "Relatos Salvajes", año: "2014", genero: "Comedia negra", director: "Damián Szifron", imagen: "https://images.unsplash.com/photo-1507003211169-0a1dd7506d40?w=1024&fit=crop&auto=format" },
  { id: 3, titulo: "Argentina, 1985", año: "2022", genero: "Drama histórico", director: "Santiago Mitre", imagen: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1024&fit=crop&auto=format" },
  { id: 4, titulo: "La Ciénaga", año: "2001", genero: "Drama", director: "Lucrecia Martel", imagen: "https://images.unsplash.com/photo-1489599328131-cdd7553e2ad1?w=1024&fit=crop&auto=format" },
  { id: 5, titulo: "Nueve Reinas", año: "2000", genero: "Thriller", director: "Fabián Bielinsky", imagen: "https://images.unsplash.com/photo-1556388158-158ea5ccacbd?w=1024&fit=crop&auto=format" },
];

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

  // Función para calcular fecha efectiva de personas
  const calcularFechaEfectivaPersona = (person: any, type: 'birth' | 'death') => {
    const prefix = type === 'birth' ? 'birth' : 'death';
    const year = person[`${prefix}Year`];
    const month = person[`${prefix}Month`] || 12;
    const day = person[`${prefix}Day`] || new Date(year, month, 0).getDate(); // Último día del mes

    return new Date(year, month - 1, day);
  };

  // Fetch obituarios
  useEffect(() => {
    const fetchObituarios = async () => {
      try {
        setLoadingObituarios(true);

        // Obtener personas con fecha de muerte más reciente
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

        // Filtrar personas con fecha de muerte y ordenar por fecha más reciente
        const personasConFecha = data.data.filter((person: any) => person.deathYear);

        // Ordenar por fecha de muerte más reciente considerando fechas parciales
        const personasOrdenadas = personasConFecha.sort((a: any, b: any) => {
          const dateA = calcularFechaEfectivaPersona(a, 'death');
          const dateB = calcularFechaEfectivaPersona(b, 'death');
          return dateB.getTime() - dateA.getTime();
        });

        // Tomar solo las 2 más recientes
        setObituarios(personasOrdenadas.slice(0, 2));
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
 // Reemplazar el useEffect de efemérides completo
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
      
      // Seleccionar 2 efemérides al azar del día
      if (data.efemerides && data.efemerides.length > 0) {
        // Si hay 2 o menos, mostrar todas
        if (data.efemerides.length <= 2) {
          setEfemerides(data.efemerides);
        } else {
          // Algoritmo Fisher-Yates para mezclar aleatoriamente
          const shuffled = [...data.efemerides];
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
          }
          
          // Tomar las primeras 2 del array mezclado
          const dosAleatorias = shuffled.slice(0, 2);
          setEfemerides(dosAleatorias);
        }
        
        console.log(`📅 Total efemérides del día: ${data.efemerides.length}, mostrando: ${efemerides.length}`);
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

  // Formateador para fechas pasadas (últimos estrenos)
  const formatearFechaEstreno = (movie: any): string => {
    if (!movie.releaseYear) return 'Sin fecha';

    const partialDate = {
      year: movie.releaseYear,
      month: movie.releaseMonth,
      day: movie.releaseDay
    };

    return formatPartialDate(partialDate, {
      monthFormat: 'short',
      includeDay: true,
      fallback: movie.releaseYear.toString()
    });
  };

  // Formateador para fechas futuras (próximos estrenos)
  const formatearFechaProxima = (movie: any): string => {
    if (!movie.releaseYear) return 'Fecha por confirmar';

    // Si solo tiene año
    if (!movie.releaseMonth) {
      return movie.releaseYear.toString();
    }

    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    // Si tiene mes pero no día
    if (!movie.releaseDay) {
      return `${meses[movie.releaseMonth - 1]} ${movie.releaseYear}`;
    }

    // Si tiene fecha completa
    return `${movie.releaseDay} de ${meses[movie.releaseMonth - 1].toLowerCase()} de ${movie.releaseYear}`;
  };

  return (
    <div className="bg-cine-dark text-white min-h-screen">
      {/* Comentada la parte de imágenes de la home */}
      {/*<HeroSection peliculas={PELICULAS_HERO} />*/}
      <div className="bg-cine-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

          {error && <ErrorMessage message={error} onRetry={retry} />}

          {/* Sección de Últimos Estrenos - con badge negro para fechas pasadas */}
          <MoviesGrid
            title="Últimos Estrenos"
            movies={ultimosEstrenos}
            loading={loadingEstrenos}
            emptyMessage="No hay estrenos disponibles en este momento"
            showDate={true}
            dateType="past"
            dateFormatter={formatearFechaEstreno}
            ctaText="Ver más estrenos"
            ctaHref="/listados/peliculas"
          />

          {/* Sección de Próximos Estrenos - con badge azul para fechas futuras */}
          <MoviesGrid
            title="Próximos Estrenos"
            movies={proximosEstrenos}
            loading={loadingProximos}
            emptyMessage="No hay próximos estrenos confirmados"
            showDate={true}
            dateType="future"
            dateFormatter={formatearFechaProxima}
            ctaText="Ver más próximos estrenos"
            ctaHref="/proximos-estrenos"
          />

          {/* Grid de Obituarios y Efemérides */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            <ObituariosSection
              obituarios={obituarios}
              loading={loadingObituarios}
            />
            <EfemeridesSection efemerides={efemerides} />
          </div>
          <div className="w-full flex justify-center py-4 bg-cine-dark">
            <Link
              href="https://www.ucine.edu.ar"
              target="_blank"
              rel="noopener noreferrer"
              className="block max-w-[601px] w-full px-4"
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