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
import { HeroMovie, Obituario, Efemeride } from '@/types/home.types';
import { formatPartialDate } from '@/lib/shared/dateUtils';

// Datos estáticos (mover a constants/homeData.ts)
const PELICULAS_HERO: HeroMovie[] = [
  { id: 1, titulo: "El Secreto de Sus Ojos", año: "2009", genero: "Drama, Thriller", director: "Juan José Campanella", imagen: "https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=1024&fit=crop&auto=format" },
  { id: 2, titulo: "Relatos Salvajes", año: "2014", genero: "Comedia negra", director: "Damián Szifron", imagen: "https://images.unsplash.com/photo-1507003211169-0a1dd7506d40?w=1024&fit=crop&auto=format" },
  { id: 3, titulo: "Argentina, 1985", año: "2022", genero: "Drama histórico", director: "Santiago Mitre", imagen: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1024&fit=crop&auto=format" },
  { id: 4, titulo: "La Ciénaga", año: "2001", genero: "Drama", director: "Lucrecia Martel", imagen: "https://images.unsplash.com/photo-1489599328131-cdd7553e2ad1?w=1024&fit=crop&auto=format" },
  { id: 5, titulo: "Nueve Reinas", año: "2000", genero: "Thriller", director: "Fabián Bielinsky", imagen: "https://images.unsplash.com/photo-1556388158-158ea5ccacbd?w=1024&fit=crop&auto=format" },
];

const OBITUARIOS: Obituario[] = [
  { id: 1, nombre: "Luis Brandoni", rol: "Actor", edad: "85 años", fecha: "5 de junio", imagen: "/images/persons/luis-brandoni.jpg" },
  { id: 2, nombre: "María Vaner", rol: "Actriz", edad: "90 años", fecha: "28 de mayo", imagen: "/images/persons/maria-vaner.jpg" },
];

const EFEMERIDES: Efemeride[] = [
  { hace: "Hace 40 años", evento: 'se estrenaba "Camila" de María Luisa Bemberg', tipo: "pelicula", imagen: "/images/movies/camila.jpg" },
  { hace: "Hace 50 años", evento: "nacía el director Juan José Campanella", tipo: "persona", imagen: "/images/persons/juan-jose-campanella.jpg" },
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
      <HeroSection peliculas={PELICULAS_HERO} />

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
            <ObituariosSection obituarios={OBITUARIOS} />
            <EfemeridesSection efemerides={EFEMERIDES} />
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