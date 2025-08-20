// src/app/page.tsx - Versión corregida
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatPartialDate } from '@/lib/shared/dateUtils';

interface MovieWithRelease {
  id: number;
  slug: string;
  title: string;
  releaseYear: number | null;
  releaseMonth: number | null;
  releaseDay: number | null;
  posterUrl: string | null;
  genres: Array<{
    genre?: { id: number; name: string };
    id?: number;
    name?: string;
  }>;
  crew?: Array<{
    person: {
      id: number;
      firstName?: string;
      lastName?: string;
    };
    roleId?: number;
    role?: string;
    department?: string;
  }>;
}

export default function HomePage() {
  // Estado para últimos estrenos
  const [ultimosEstrenos, setUltimosEstrenos] = useState<MovieWithRelease[]>([]);
  const [loadingEstrenos, setLoadingEstrenos] = useState(true);

  // Estado para próximos estrenos
  const [proximosEstrenos, setProximosEstrenos] = useState<MovieWithRelease[]>([]);
  const [loadingProximos, setLoadingProximos] = useState(true);

  // Estado de error
  const [error, setError] = useState<string | null>(null);

  // Películas para el hero rotativo (mantener estático por ahora)
  const peliculasHero = [
    { id: 1, titulo: "El Secreto de Sus Ojos", año: "2009", genero: "Drama, Thriller", director: "Juan José Campanella", imagen: "https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=1024&fit=crop&auto=format" },
    { id: 2, titulo: "Relatos Salvajes", año: "2014", genero: "Comedia negra", director: "Damián Szifron", imagen: "https://images.unsplash.com/photo-1507003211169-0a1dd7506d40?w=1024&fit=crop&auto=format" },
    { id: 3, titulo: "Argentina, 1985", año: "2022", genero: "Drama histórico", director: "Santiago Mitre", imagen: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1024&fit=crop&auto=format" },
    { id: 4, titulo: "La Ciénaga", año: "2001", genero: "Drama", director: "Lucrecia Martel", imagen: "https://images.unsplash.com/photo-1489599328131-cdd7553e2ad1?w=1024&fit=crop&auto=format" },
    { id: 5, titulo: "Nueve Reinas", año: "2000", genero: "Thriller", director: "Fabián Bielinsky", imagen: "https://images.unsplash.com/photo-1556388158-158ea5ccacbd?w=1024&fit=crop&auto=format" },
  ];

  const [peliculaHeroIndex, setPeliculaHeroIndex] = useState(0);

  // Cargar datos de la home con una sola llamada optimizada
  useEffect(() => {
    let mounted = true;
    let retryTimeout: NodeJS.Timeout;

    const fetchHomeData = async (attempt = 1) => {
      try {
        console.log(`🔄 Intento ${attempt} de cargar datos...`);
        setError(null);

        // Timeout de 20 segundos
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          console.log('⏱️ Timeout alcanzado, abortando...');
          controller.abort();
        }, 20000);

        // Obtener las películas más recientes por fecha de creación
        // Esto garantiza que obtenemos las últimas agregadas a la base de datos
        const params = new URLSearchParams({
          limit: '100', // Aumentamos a 100 para tener más películas disponibles
          sortBy: 'createdAt',
          sortOrder: 'desc'
        });

        const response = await fetch('/api/movies/home-feed', {
          signal: controller.signal,
          cache: 'no-store'
        });

        clearTimeout(timeoutId);

        if (!mounted) return;

        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('✅ Datos recibidos del home-feed:', {
          ultimosEstrenos: data.ultimosEstrenos?.length || 0,
          proximosEstrenos: data.proximosEstrenos?.length || 0
        });

        // Debug: ver si hay crew en las películas
        if (data.ultimosEstrenos && data.ultimosEstrenos.length > 0) {
          console.log('Primera película con crew:', {
            title: data.ultimosEstrenos[0].title,
            crew: data.ultimosEstrenos[0].crew
          });
        }

        // Verificar la estructura de los datos
        if (data.movies && data.movies.length > 0) {
          console.log('Primera película:', data.movies[0]);
        }

        setUltimosEstrenos(data.ultimosEstrenos || []);
    setProximosEstrenos(data.proximosEstrenos || []);
        setError(null);

      } catch (error: any) {
        console.error(`❌ Error en intento ${attempt}:`, error);

        if (!mounted) return;

        if (error.name === 'AbortError') {
          setError('La carga tardó demasiado. Intentando de nuevo...');
        } else {
          setError(`Error al cargar datos: ${error.message}`);
        }

        // Reintentar hasta 3 veces
        if (attempt < 3) {
          const delay = attempt * 2000; // 2, 4, 6 segundos
          console.log(`⏳ Reintentando en ${delay / 1000} segundos...`);
          retryTimeout = setTimeout(() => {
            if (mounted) fetchHomeData(attempt + 1);
          }, delay);
        } else {
          setError('No se pudieron cargar los datos después de varios intentos.');
          // Datos de fallback vacíos
          setUltimosEstrenos([]);
          setProximosEstrenos([]);
        }
      } finally {
        if (mounted) {
          setLoadingEstrenos(false);
          setLoadingProximos(false);
        }
      }
    };

    fetchHomeData();

    return () => {
      mounted = false;
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, []);

  // Función helper para formatear la fecha de estreno
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

  // Función helper para formatear fecha futura (más amigable para próximos estrenos)
  const formatearFechaProxima = (movie: any): string => {
    if (!movie.releaseYear) return 'Fecha por confirmar';

    // Si solo tiene año
    if (!movie.releaseMonth) {
      return movie.releaseYear.toString();
    }

    // Array de nombres de meses
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    // Si tiene mes pero no día
    if (!movie.releaseDay) {
      return `${meses[movie.releaseMonth - 1]} ${movie.releaseYear}`;
    }

    // Si tiene fecha completa
    return `${movie.releaseDay} de ${meses[movie.releaseMonth - 1].toLowerCase()}`;
  };

  // Función helper para obtener el director (buscar en crew por roleId = 2)
  const obtenerDirector = (movie: any): string => {
    if (movie.crew && movie.crew.length > 0) {
      // Buscar específicamente el roleId = 2 (Director)
      const director = movie.crew.find((c: any) => c.roleId === 2);

      if (director && director.person) {
        // Construir el nombre completo desde firstName y lastName
        const firstName = director.person.firstName || '';
        const lastName = director.person.lastName || '';
        const fullName = `${firstName} ${lastName}`.trim();

        if (fullName) {
          return fullName;
        }
      }
    }

    return 'Director no especificado';
  };

  // Función helper para obtener géneros
  const obtenerGeneros = (movie: any): string => {
    if (movie.genres && movie.genres.length > 0) {
      // Los géneros pueden venir de dos formas:
      // 1. Como array simple: [{id: 1, name: "Drama"}]
      // 2. Como relación: [{genre: {id: 1, name: "Drama"}}]

      const genreNames = movie.genres.map((g: any) => {
        if (g.genre && g.genre.name) {
          return g.genre.name;
        } else if (g.name) {
          return g.name;
        }
        return null;
      }).filter(Boolean);

      if (genreNames.length > 0) {
        return genreNames.slice(0, 2).join(', '); // Limitar a 2 géneros
      }
    }

    return '';
  };

  const obituarios = [
    { id: 1, nombre: "Luis Brandoni", rol: "Actor", edad: "85 años", fecha: "5 de junio", imagen: "/images/persons/luis-brandoni.jpg" },
    { id: 2, nombre: "María Vaner", rol: "Actriz", edad: "90 años", fecha: "28 de mayo", imagen: "/images/persons/maria-vaner.jpg" },
  ];

  const efemerides = [
    { hace: "Hace 40 años", evento: 'se estrenaba "Camila" de María Luisa Bemberg', tipo: "pelicula", imagen: "/images/movies/camila.jpg" },
    { hace: "Hace 50 años", evento: "nacía el director Juan José Campanella", tipo: "persona", imagen: "/images/persons/juan-jose-campanella.jpg" },
  ];

  const ultimasPeliculas = [
    { id: 1, titulo: "La Ciénaga" },
    { id: 2, titulo: "El Aura" },
    { id: 3, titulo: "XXY" },
    { id: 4, titulo: "Historias Mínimas" },
    { id: 5, titulo: "Pizza, Birra, Faso" },
    { id: 6, titulo: "Mundo Grúa" },
    { id: 7, titulo: "Bolivia" },
    { id: 8, titulo: "Los Rubios" },
  ];

  const ultimasPersonas = [
    { id: 1, nombre: "Ricardo Darín", rol: "Actor" },
    { id: 2, nombre: "Lucrecia Martel", rol: "Directora" },
    { id: 3, nombre: "Guillermo Francella", rol: "Actor" },
    { id: 4, nombre: "Cecilia Roth", rol: "Actriz" },
    { id: 5, nombre: "Pablo Trapero", rol: "Director" },
    { id: 6, nombre: "Érica Rivas", rol: "Actriz" },
  ];

  // Ajustar gradientes al tamaño real de la imagen
  useEffect(() => {
    const adjustGradients = () => {
      const img = document.querySelector('.hero-image') as HTMLImageElement;
      const container = document.querySelector('.hero-image-wrapper') as HTMLElement;
      const gradientsContainer = document.querySelector('.hero-gradients-container') as HTMLElement;

      if (img && container && gradientsContainer && img.complete) {
        const containerWidth = container.offsetWidth;
        const containerHeight = container.offsetHeight;
        const imgAspectRatio = img.naturalWidth / img.naturalHeight;
        const containerAspectRatio = containerWidth / containerHeight;

        let displayWidth, displayHeight;

        if (imgAspectRatio > containerAspectRatio) {
          // Imagen más ancha - se ajusta por ancho
          displayWidth = containerWidth;
          displayHeight = containerWidth / imgAspectRatio;
        } else {
          // Imagen más alta - se ajusta por altura
          displayHeight = containerHeight;
          displayWidth = containerHeight * imgAspectRatio;
        }

        // Centrar y ajustar el contenedor de gradientes
        gradientsContainer.style.width = `${displayWidth}px`;
        gradientsContainer.style.height = `${displayHeight}px`;
        gradientsContainer.style.left = `${(containerWidth - displayWidth) / 2}px`;
        gradientsContainer.style.top = `${(containerHeight - displayHeight) / 2}px`;
      }
    };

    // Ajustar cuando la imagen cambie
    const img = document.querySelector('.hero-image') as HTMLImageElement;
    if (img) {
      img.addEventListener('load', adjustGradients);
      // También ajustar al cambiar el tamaño de la ventana
      window.addEventListener('resize', adjustGradients);

      // Ajustar inmediatamente si la imagen ya está cargada
      if (img.complete) {
        adjustGradients();
      }
    }

    return () => {
      if (img) {
        img.removeEventListener('load', adjustGradients);
      }
      window.removeEventListener('resize', adjustGradients);
    };
  }, []);

  // Cambiar imagen cada 8 segundos
  useEffect(() => {
    const imageUrls = peliculasHero.map(p => p.imagen);
    if (imageUrls.length > 0) {
      const interval = setInterval(() => {
        const randomIndex = Math.floor(Math.random() * imageUrls.length);
        const heroElement = document.querySelector('.hero-image');
        if (heroElement) {
          (heroElement as HTMLImageElement).src = imageUrls[randomIndex];
        }
      }, 8000);
      return () => clearInterval(interval);
    }
  }, [peliculasHero]);

  const peliculaHeroActual = peliculasHero[peliculaHeroIndex];

  return (
    <div className="bg-cine-dark text-white min-h-screen">
      {/* Movie Hero Background - idéntico al componente MovieHero pero sin contenido */}
      <div className="relative hero-background-container -mt-16 pt-16">
        {/* Wrapper de imagen con gradientes */}
        <div className="hero-image-wrapper">
          {peliculaHeroActual && (
            <>
              <img
                src={peliculaHeroActual.imagen}
                alt="Imagen destacada del cine argentino"
                className="hero-image"
              />
              {/* Contenedor de gradientes que se ajusta a la imagen */}
              <div className="hero-gradients-container">
                <div className="hero-gradient-left"></div>
                <div className="hero-gradient-right"></div>
                <div className="hero-gradient-top"></div>
                <div className="hero-gradient-bottom-inner"></div>

                {/* Epígrafe con título y año - dentro del contenedor de gradientes */}
                <div className="absolute bottom-4 right-4 z-20">
                  <p className="text-xs text-gray-400 drop-shadow-lg">
                    {peliculaHeroActual.titulo} ({peliculaHeroActual.año})
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Gradientes globales del contenedor */}
        <div className="hero-gradient-bottom"></div>
        <div className="hero-vignette"></div>
      </div>

      {/* Main Content */}
      <div className="bg-cine-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

          {/* Mostrar error si existe */}
          {error && (
            <div className="mb-8 p-4 bg-red-900/20 border border-red-500 rounded-lg">
              <p className="text-red-300">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 text-sm underline hover:no-underline text-red-300"
              >
                Recargar página
              </button>
            </div>
          )}

          {/* Últimos Estrenos */}
          <section className="mb-12">
            <h2 className="serif-heading text-3xl mb-6 text-white">Últimos Estrenos</h2>

            {loadingEstrenos ? (
              // Skeleton loader mientras carga
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {[...Array(6)].map((_, index) => (
                  <div key={index} className="animate-pulse">
                    <div className="aspect-[2/3] rounded-lg bg-gray-800 mb-2"></div>
                    <div className="h-4 bg-gray-800 rounded mb-1"></div>
                    <div className="h-3 bg-gray-800 rounded w-3/4"></div>
                  </div>
                ))}
              </div>
            ) : ultimosEstrenos.length === 0 ? (
              // Mensaje si no hay películas
              <div className="text-center py-8">
                <p className="text-gray-400">No hay estrenos disponibles en este momento</p>
              </div>
            ) : (
              // Grid de películas
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {ultimosEstrenos.map((pelicula: any) => (
                  <Link
                    key={pelicula.id}
                    href={`/peliculas/${pelicula.slug}`}
                    className="group cursor-pointer"
                  >
                    <div className="aspect-[2/3] rounded-lg overflow-hidden mb-2 transform group-hover:scale-105 transition-transform poster-shadow relative">
                      {pelicula.posterUrl ? (
                        <img
                          src={pelicula.posterUrl}
                          alt={pelicula.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            // Si la imagen falla, mostrar placeholder
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`movie-placeholder w-full h-full ${pelicula.posterUrl ? 'hidden' : ''}`}>
                        <svg className="w-12 h-12 text-cine-accent mb-2 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                        <p className="text-xs text-gray-400">Afiche</p>
                      </div>
                      {/* Badge de fecha sobre el afiche */}
                      <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-sm px-2 py-1 rounded text-xs text-white">
                        {formatearFechaEstreno(pelicula)}
                      </div>
                    </div>
                    <h3 className="font-medium text-sm text-white line-clamp-2">{pelicula.title}</h3>
                    <p className="text-gray-400 text-xs">{obtenerGeneros(pelicula)}</p>
                    <p className="text-gray-400 text-xs">Dir: {obtenerDirector(pelicula)}</p>
                  </Link>
                ))}
              </div>
            )}

            {/* Botón Ver Más - resto del componente continúa igual... */}
            <div className="mt-6 text-center">
              <Link
                href="/listados/peliculas"
                className="inline-block border border-cine-accent text-cine-accent hover:bg-cine-accent hover:text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Ver más estrenos
              </Link>
            </div>
          </section>

          {/* El resto del componente continúa igual... */}
          {/* Próximos Estrenos */}
          <section className="mb-12">
            <h2 className="serif-heading text-3xl mb-6 text-white">Próximos Estrenos</h2>

            {loadingProximos ? (
              // Skeleton loader mientras carga
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {[...Array(6)].map((_, index) => (
                  <div key={index} className="animate-pulse">
                    <div className="aspect-[2/3] rounded-lg bg-gray-800 mb-2"></div>
                    <div className="h-4 bg-gray-800 rounded mb-1"></div>
                    <div className="h-3 bg-gray-800 rounded w-3/4"></div>
                  </div>
                ))}
              </div>
            ) : proximosEstrenos.length === 0 ? (
              // Mensaje si no hay películas futuras
              <div className="text-center py-8">
                <p className="text-gray-400">No hay próximos estrenos confirmados</p>
              </div>
            ) : (
              // Grid de películas
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {proximosEstrenos.map((pelicula: any) => (
                  <Link
                    key={pelicula.id}
                    href={`/peliculas/${pelicula.slug}`}
                    className="group cursor-pointer"
                  >
                    <div className="aspect-[2/3] rounded-lg overflow-hidden mb-2 transform group-hover:scale-105 transition-transform poster-shadow relative">
                      {pelicula.posterUrl ? (
                        <img
                          src={pelicula.posterUrl}
                          alt={pelicula.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            // Si la imagen falla, mostrar placeholder
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`movie-placeholder w-full h-full ${pelicula.posterUrl ? 'hidden' : ''}`}>
                        <svg className="w-12 h-12 text-cine-accent mb-2 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                        <p className="text-xs text-gray-400">Afiche</p>
                      </div>
                      {/* Badge de fecha sobre el afiche */}
                      <div className="absolute top-2 right-2 bg-blue-600/80 backdrop-blur-sm px-2 py-1 rounded text-xs text-white">
                        {formatearFechaProxima(pelicula)}
                      </div>
                    </div>
                    <h3 className="font-medium text-sm text-white line-clamp-2">{pelicula.title}</h3>
                    <p className="text-gray-400 text-xs">{obtenerGeneros(pelicula)}</p>
                    <p className="text-gray-400 text-xs">Dir: {obtenerDirector(pelicula)}</p>
                  </Link>
                ))}
              </div>
            )}

            {/* Botón Ver Más */}
            <div className="mt-6 text-center">
              <Link
                href="/proximos-estrenos"
                className="inline-block border border-cine-accent text-cine-accent hover:bg-cine-accent hover:text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Ver más próximos estrenos
              </Link>
            </div>
          </section>

          {/* Resto del componente igual... */}
          {/* Grid Layout para Obituarios y Efemérides */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            {/* Obituarios */}
            <section>
              <h2 className="serif-heading text-3xl mb-6 text-white">Obituarios</h2>
              <div className="glass-effect rounded-lg p-6">
                <div className="space-y-4">
                  {obituarios.map((persona) => (
                    <div key={persona.id} className="flex items-center space-x-4 pb-4 border-b border-gray-700 last:border-0 last:pb-0">
                      <div className="w-24 h-24 rounded-full flex-shrink-0 person-placeholder">
                        <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-white text-lg">{persona.nombre}</h3>
                        <p className="text-sm text-gray-400">{persona.rol} • {persona.edad}</p>
                        <p className="text-sm text-gray-500">{persona.fecha}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Botón Ver Más */}
              <div className="mt-6 text-center">
                <Link
                  href="/obituarios"
                  className="inline-block border border-cine-accent text-cine-accent hover:bg-cine-accent hover:text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Ver más obituarios
                </Link>
              </div>
            </section>

            {/* Efemérides */}
            <section>
              <h2 className="serif-heading text-3xl mb-6 text-white">Efemérides del Día</h2>
              <div className="glass-effect rounded-lg p-6">
                <div className="space-y-4">
                  {efemerides.map((item, index) => (
                    <div key={index} className="flex items-center space-x-4 pb-4 border-b border-gray-700 last:border-0 last:pb-0">
                      {/* Contenedor de imagen con ancho fijo para alineación */}
                      <div className="w-24 h-24 flex items-center justify-center flex-shrink-0">
                        {item.tipo === "pelicula" ? (
                          <div className="w-16 h-24 rounded movie-placeholder">
                            <svg className="w-8 h-8 text-cine-accent opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                            </svg>
                          </div>
                        ) : (
                          <div className="w-24 h-24 rounded-full person-placeholder">
                            <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-cine-accent text-lg">{item.hace}</h3>
                        <p className="text-sm mt-1 text-gray-300">... {item.evento}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Botón Ver Más */}
              <div className="mt-6 text-center">
                <Link
                  href="/efemerides"
                  className="inline-block border border-cine-accent text-cine-accent hover:bg-cine-accent hover:text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Ver más efemérides
                </Link>
              </div>
            </section>
          </div>

          {/* Últimas Películas Ingresadas */}
          <section className="mb-12">
            <h2 className="serif-heading text-3xl mb-6 text-white">Últimas Películas Ingresadas</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
              {ultimasPeliculas.map((pelicula) => (
                <Link
                  key={pelicula.id}
                  href={`/pelicula/${pelicula.id}`}
                  className="group cursor-pointer"
                >
                  <div className="aspect-[2/3] rounded overflow-hidden mb-1 transform group-hover:scale-105 transition-transform">
                    <div className="placeholder-small w-full h-full">
                      <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-xs font-medium text-white truncate">{pelicula.titulo}</h3>
                </Link>
              ))}
            </div>
          </section>

          {/* Últimas Personas Ingresadas */}
          <section className="mb-12">
            <h2 className="serif-heading text-3xl mb-6 text-white">Últimas Personas Ingresadas</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {ultimasPersonas.map((persona) => (
                <Link
                  key={persona.id}
                  href={`/persona/${persona.id}`}
                  className="text-center cursor-pointer group"
                >
                  <div className="w-24 h-24 mx-auto rounded-full overflow-hidden mb-2 person-placeholder">
                    <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-medium text-white group-hover:text-cine-accent transition-colors">{persona.nombre}</h3>
                  <p className="text-xs text-gray-400">{persona.rol}</p>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}