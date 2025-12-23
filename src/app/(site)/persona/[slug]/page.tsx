// src/app/persona/[slug]/page.tsx - VERSIÓN CORREGIDA COMPLETA
'use client';

import { useState, useEffect, useCallback } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { formatPartialDate, MONTHS } from '@/lib/shared/dateUtils';
import DOMPurify from 'isomorphic-dompurify';
import { trackPageView } from '@/hooks/usePageView';

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Función helper para formatear ubicación recursivamente (cualquier profundidad)
function formatLocationPath(location: any): string {
  if (!location) return '';

  const parts: string[] = [];
  let current = location;

  while (current) {
    parts.push(current.name);
    current = current.parent;
  }

  return parts.join(', ');
}

interface PersonPageProps {
  params: {
    slug: string;
  };
}


interface Movie {
  id: number;
  slug: string;
  title: string;
  year?: number;
  releaseYear?: number;
  releaseMonth?: number;
  releaseDay?: number;
  tipoDuracion?: 'largometraje' | 'mediometraje' | 'cortometraje';
  stage?: string; // ✅ Agregado para manejar stages
}
interface Role {
  id: number;
  name: string;
  slug: string;
  department?: string;
}

interface CastRole {
  movie: Movie;
  characterName?: string;
  billingOrder?: number;
  isPrincipal?: boolean;
}

interface CrewRole {
  movie: Movie;
  role: Role;
  roleId: number;
  department?: string;
  billingOrder?: number;
}

interface GroupedCrewRole {
  movie: Movie;
  roles: string[];
}

interface TabItem extends GroupedCrewRole {
  characterName?: string;
}

export default function PersonPage({ params }: PersonPageProps) {
  const [person, setPerson] = useState<any>(null);
  const [filmography, setFilmography] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('');
  const [showAllFilmography, setShowAllFilmography] = useState(false);

  // ✅ Agregar tracking cuando la persona esté cargada
  useEffect(() => {
    if (person?.id) {
      trackPageView({ pageType: 'PERSON', personId: person.id });
    }
  }, [person?.id]);

  // Función helper para generar URL de efemérides (formato: /efemerides/MM-DD)
  const getEfemeridesUrl = (month: number, day: number): string => {
    const monthStr = month.toString().padStart(2, '0');
    const dayStr = day.toString().padStart(2, '0');
    return `/efemerides/${monthStr}-${dayStr}`;
  };

  // Función helper para generar URL de personas por año de nacimiento
  const getBirthYearUrl = (year: number): string => {
    return `/listados/personas?birthYearFrom=${year}&birthYearTo=${year}&sortBy=lastName&sortOrder=asc`;
  };

  // Función helper para generar URL de personas por año de muerte
  const getDeathYearUrl = (year: number): string => {
    return `/listados/personas?deathYearFrom=${year}&deathYearTo=${year}&sortBy=deathDate&sortOrder=asc`;
  };

  // Función helper para generar URL de personas por ubicación de nacimiento
  const getBirthLocationUrl = (locationId: number): string => {
    return `/listados/personas?birthLocationId=${locationId}&sortBy=lastName&sortOrder=asc`;
  };

  // Función helper para generar URL de personas por ubicación de muerte
  const getDeathLocationUrl = (locationId: number): string => {
    return `/listados/personas?deathLocationId=${locationId}&sortBy=lastName&sortOrder=asc`;
  };

  // Función helper para generar URL de personas por nacionalidad
  const getNationalityUrl = (locationId: number): string => {
    return `/listados/personas?nationalityId=${locationId}&sortBy=lastName&sortOrder=asc`;
  };

  // Función para renderizar ubicación con links (para nacimiento o muerte)
  const renderLocationWithLinks = (location: any, type: 'birth' | 'death') => {
    if (!location) return null;

    const parts: { id: number; name: string }[] = [];
    let current = location;

    while (current) {
      parts.push({ id: current.id, name: current.name });
      current = current.parent;
    }

    const getUrl = type === 'birth' ? getBirthLocationUrl : getDeathLocationUrl;

    return (
      <>
        {parts.map((part, index) => (
          <span key={part.id}>
            {index > 0 && ', '}
            <Link
              href={getUrl(part.id)}
              className="text-gray-300 hover:text-blue-400 transition-colors"
            >
              {part.name}
            </Link>
          </span>
        ))}
      </>
    );
  };

  // Función helper para generar URL de obituarios (formato: /obituarios?year=YYYY) - DEPRECADA
  const getObituariosUrl = (year: number): string => {
    const yearStr = year.toString().padStart(4, '0');
    return `/listados/obituarios?year=${yearStr}`;
  };

  // Función helper para obtener el año efectivo para ordenamiento
  const getEffectiveYear = (movie: Movie): number => {
    if (movie.releaseYear) {
      return movie.releaseYear;
    }
    if (movie.year) {
      return movie.year;
    }
    return 0;
  };

  // Función helper para obtener la fecha efectiva completa para ordenamiento más preciso
  const getEffectiveDate = (movie: Movie): Date => {
    if (movie.releaseYear && movie.releaseMonth && movie.releaseDay) {
      return new Date(movie.releaseYear, movie.releaseMonth - 1, movie.releaseDay);
    }
    if (movie.releaseYear && movie.releaseMonth) {
      return new Date(movie.releaseYear, movie.releaseMonth - 1, 1);
    }
    if (movie.releaseYear) {
      return new Date(movie.releaseYear, 0, 1);
    }
    if (movie.year) {
      return new Date(movie.year, 0, 1);
    }
    return new Date(1900, 0, 1);
  };


  // ✅ ACTUALIZADO: Función para ordenar películas cronológicamente con prioridad de stages
  const sortMoviesChronologically = (movies: any[], descending: boolean = true): any[] => {
    // Definir orden de prioridad para stages en desarrollo
    const stageOrder: Record<string, number> = {
      'EN_DESARROLLO': 1,
      'EN_PRODUCCION': 2,
      'EN_PREPRODUCCION': 3,
      'EN_RODAJE': 4,
      'EN_POSTPRODUCCION': 5
    };

    return [...movies].sort((a, b) => {
      const movieA = a.movie || a;
      const movieB = b.movie || b;
      const stageA = movieA.stage;
      const stageB = movieB.stage;

      // Verificar si son stages que van primero (no INÉDITA ni INCONCLUSA ni COMPLETA)
      const isStageAPriority = stageA && stageOrder[stageA] !== undefined;
      const isStageBPriority = stageB && stageOrder[stageB] !== undefined;

      // Si ambas son priority stages, ordenar por el orden definido
      if (isStageAPriority && isStageBPriority) {
        return stageOrder[stageA] - stageOrder[stageB];
      }

      // Si solo A es priority, va primero
      if (isStageAPriority) return -1;

      // Si solo B es priority, va primero
      if (isStageBPriority) return 1;

      // Si ninguna es priority (incluyendo COMPLETA, INÉDITA, INCONCLUSA), ordenar por fecha
      const dateA = getEffectiveDate(movieA);
      const dateB = getEffectiveDate(movieB);

      if (dateA.getTime() === dateB.getTime()) {
        const titleA = movieA.title.toLowerCase();
        const titleB = movieB.title.toLowerCase();
        return titleA.localeCompare(titleB);
      }

      return descending
        ? dateB.getTime() - dateA.getTime()
        : dateA.getTime() - dateB.getTime();
    });
  };
  // Agrupar filmografía por rol, combinando múltiples roles por película
  const groupFilmographyByRole = useCallback((crewRoles: CrewRole[]): { [key: string]: GroupedCrewRole[] } => {
    const movieRolesMap: { [movieId: number]: { movie: Movie; roles: Set<string> } } = {};

    crewRoles.forEach((item) => {
      const movieId = item.movie.id;
      const roleName = item.role?.name || 'Rol desconocido';

      if (!movieRolesMap[movieId]) {
        movieRolesMap[movieId] = {
          movie: item.movie,
          roles: new Set()
        };
      }

      movieRolesMap[movieId].roles.add(roleName);
    });

    const groupedByRole: { [roleName: string]: GroupedCrewRole[] } = {};

    crewRoles.forEach((item) => {
      const roleName = item.role?.name || 'Rol desconocido';

      if (!groupedByRole[roleName]) {
        groupedByRole[roleName] = [];

        const moviesWithThisRole = crewRoles
          .filter(cr => cr.role?.name === roleName)
          .map(cr => cr.movie.id);

        const uniqueMovieIds = [...new Set(moviesWithThisRole)];

        uniqueMovieIds.forEach(movieId => {
          const movieData = movieRolesMap[movieId];
          groupedByRole[roleName].push({
            movie: movieData.movie,
            roles: Array.from(movieData.roles)
          });
        });
      }
    });

    Object.keys(groupedByRole).forEach(roleName => {
      groupedByRole[roleName] = sortMoviesChronologically(groupedByRole[roleName], true);
    });

    return groupedByRole;
  }, []);

  const getFirstAvailableTab = useCallback((filmographyData: any): string => {
    const allTabs: { [key: string]: number } = {};

    if (filmographyData?.castRoles?.length > 0) {
      allTabs['Actuación'] = filmographyData.castRoles.length;
    }

    if (filmographyData?.crewRoles?.length > 0) {
      const grouped = groupFilmographyByRole(filmographyData.crewRoles);
      Object.entries(grouped).forEach(([roleName, items]) => {
        allTabs[roleName] = items.length;
      });
    }

    const sortedTabs = Object.entries(allTabs).sort((a, b) => b[1] - a[1]);
    return sortedTabs.length > 0 ? sortedTabs[0][0] : '';
  }, [groupFilmographyByRole]);

  const fetchPersonData = useCallback(async () => {
    try {
      const personResponse = await fetch(`/api/people/slug/${params.slug}`);
      if (!personResponse.ok) {
        setLoading(false);
        return;
      }
      const personData = await personResponse.json();
      setPerson(personData);

      const filmographyResponse = await fetch(`/api/people/${personData.id}/filmography`);
      if (filmographyResponse.ok) {
        const filmographyData = await filmographyResponse.json();

        if (filmographyData.castRoles) {
          filmographyData.castRoles = sortMoviesChronologically(filmographyData.castRoles, true);
        }

        setFilmography(filmographyData);

        const firstTab = getFirstAvailableTab(filmographyData);
        if (firstTab) {
          setActiveTab(firstTab);
        }
      }
    } catch (error) {
      console.error('Error fetching person data:', error);
    } finally {
      setLoading(false);
    }
  }, [params.slug, getFirstAvailableTab]);

  useEffect(() => {
    fetchPersonData();
  }, [fetchPersonData]);

  if (loading) {
    return (
      <div className="bg-gray-900 text-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto"></div>
          <p className="mt-4 text-gray-400">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!person) {
    notFound();
  }

  const fullName = [person.firstName, person.lastName].filter(Boolean).join(' ');

  const birthDateFormatted = person.birthYear ? formatPartialDate({
    year: person.birthYear,
    month: person.birthMonth,
    day: person.birthDay
  }, { monthFormat: 'long', includeDay: true }) : null;

  const deathDateFormatted = person.deathYear ? formatPartialDate({
    year: person.deathYear,
    month: person.deathMonth,
    day: person.deathDay
  }, { monthFormat: 'long', includeDay: true }) : null;

  const tabs: { [key: string]: TabItem[] } = {};

  if (filmography?.castRoles?.length > 0) {
    tabs['Actuación'] = filmography.castRoles;
  }

  if (filmography?.crewRoles?.length > 0) {
    const groupedCrew = groupFilmographyByRole(filmography.crewRoles);
    Object.entries(groupedCrew).forEach(([roleName, items]) => {
      tabs[roleName] = items;
    });
  }

  const sortedTabEntries = Object.entries(tabs).sort((a, b) => {
    return b[1].length - a[1].length;
  });

  const uniqueMoviesAsActor = new Set(filmography?.castRoles?.map((r: CastRole) => r.movie.id) || []);
  const uniqueMoviesAsCrew = new Set(filmography?.crewRoles?.map((r: CrewRole) => r.movie.id) || []);
  const allUniqueMovies = new Set([...uniqueMoviesAsActor, ...uniqueMoviesAsCrew]);

  const stats = {
    totalMovies: allUniqueMovies.size,
    asActor: uniqueMoviesAsActor.size,
    asCrew: uniqueMoviesAsCrew.size
  };

  const getFilmographyToShow = (): TabItem[] => {
    const items = tabs[activeTab] || [];
    return showAllFilmography ? items : items.slice(0, 10);
  };


  // ✅ ACTUALIZADO: Determinar el badge a mostrar (incluyendo stages en desarrollo)
  const getMovieBadge = (movie: Movie): { text: string; color: string } | null => {
    const isUnreleased = !movie.releaseYear;

    // ✅ NUEVO: Badges para stages en desarrollo (excepto INÉDITA e INCONCLUSA)
    if (movie.stage === 'EN_DESARROLLO') {
      return {
        text: 'En desarrollo',
        color: 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
      };
    }

    if (movie.stage === 'EN_PRODUCCION') {
      return {
        text: 'En producción',
        color: 'bg-green-500/20 text-green-300 border border-green-500/30'
      };
    }

    if (movie.stage === 'EN_PREPRODUCCION') {
      return {
        text: 'En preproducción',
        color: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
      };
    }

    if (movie.stage === 'EN_RODAJE') {
      return {
        text: 'En rodaje',
        color: 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
      };
    }

    if (movie.stage === 'EN_POSTPRODUCCION') {
      return {
        text: 'En postproducción',
        color: 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
      };
    }

    // ✅ NUEVO: Badge para INCONCLUSA (tiene prioridad sobre "no estrenada")
    if (movie.stage === 'INCONCLUSA') {
      return {
        text: 'Inconclusa',
        color: 'bg-red-500/20 text-red-300 border border-red-500/30'
      };
    }

    // Cortometraje
    if (movie.tipoDuracion === 'cortometraje') {
      return {
        text: 'Cortometraje',
        color: 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
      };
    }

    // Mediometraje
    if (movie.tipoDuracion === 'mediometraje') {
      return {
        text: 'Mediometraje',
        color: 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
      };
    }

    // Largometraje no estrenado (solo si NO es INCONCLUSA ni INÉDITA)
    if (movie.tipoDuracion === 'largometraje' && isUnreleased && movie.stage !== 'INCONCLUSA' && movie.stage !== 'INEDITA') {
      return {
        text: 'No estrenada',
        color: 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
      };
    }

    return null;
  };

  return (
    <div className="bg-gray-900 text-white min-h-screen">
      {/* Person Header Section */}
      <section className="relative bg-gradient-to-b from-gray-800 to-gray-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* Portrait */}
            <div className="flex-shrink-0">
              <div className="relative">
                <div className="w-48 h-64 md:w-64 md:h-80 rounded-lg overflow-hidden shadow-2xl">
                  {person.photoUrl ? (
                    <img
                      src={person.photoUrl}
                      alt={fullName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-800 flex flex-col justify-center items-center">
                      <svg className="w-16 h-16 text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <p className="text-sm text-gray-500">Foto no disponible</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Person Info */}
            <div className="flex-grow">
              <h1 className="text-5xl md:text-6xl font-bold mb-4">{fullName}</h1>

              {person.realName && person.realName !== fullName && (
                <p className="text-gray-400 mb-2">
                  <span className="text-gray-500">Nombre real: </span>
                  {person.realName}
                </p>
              )}

              <div className="space-y-3 text-gray-300">
                {birthDateFormatted && (
                  <div className="text-sm">
                    <span className="text-gray-500">
                      {person.birthDay ? 'Nació el ' : 'Nació en '}
                    </span>
                    {person.birthDay && person.birthMonth ? (
                      <>
                        <Link
                          href={getEfemeridesUrl(person.birthMonth, person.birthDay)}
                          className="text-gray-300 hover:text-blue-400 transition-colors decoration-gray-600 hover:decoration-blue-400"
                        >
                          {person.birthDay} de {MONTHS[person.birthMonth - 1].label.toLowerCase()}
                        </Link>
                        <span className="text-gray-500"> de </span>
                        <Link
                          href={getBirthYearUrl(person.birthYear)}
                          className="text-gray-300 hover:text-blue-400 transition-colors"
                        >
                          {person.birthYear}
                        </Link>
                      </>
                    ) : (
                      <span>{birthDateFormatted}</span>
                    )}
                    {person.birthLocation && (
                      <>
                        <span className="text-gray-500"> en </span>
                        {renderLocationWithLinks(person.birthLocation, 'birth')}
                      </>
                    )}
                  </div>
                )}

                {deathDateFormatted && (
                  <div className="text-sm">
                    <span className="text-gray-500">
                      {person.deathDay ? 'Murió el ' : 'Murió en '}
                    </span>
                    {person.deathDay && person.deathMonth ? (
                      <>
                        <Link
                          href={getEfemeridesUrl(person.deathMonth, person.deathDay)}
                          className="text-gray-300 hover:text-blue-400 transition-colors decoration-gray-600 hover:decoration-blue-400"
                        >
                          {person.deathDay} de {MONTHS[person.deathMonth - 1].label.toLowerCase()}
                        </Link>
                        <span className="text-gray-500"> de </span>
                        <Link
                          href={getDeathYearUrl(person.deathYear)}
                          className="text-gray-300 hover:text-blue-400 transition-colors"
                        >
                          {person.deathYear}
                        </Link>
                      </>
                    ) : (
                      <span>{deathDateFormatted}</span>
                    )}
                    {person.deathLocation && (
                      <>
                        <span className="text-gray-500"> en </span>
                        {renderLocationWithLinks(person.deathLocation, 'death')}
                      </>
                    )}
                  </div>
                )}

                {person.nationalities && person.nationalities.length > 0 && (
                  <div className="text-sm mb-4">
                    <span className="text-gray-500">Nacionalidad: </span>
                    {person.nationalities
                      .map((nat: any, index: number) => {
                        const display = nat.location?.gentilicio || nat.location?.name;
                        const locationId = nat.location?.id || nat.locationId;
                        if (!display) return null;

                        return (
                          <span key={locationId || index}>
                            {index > 0 && ', '}
                            <Link
                              href={getNationalityUrl(locationId)}
                              className="text-white hover:text-blue-400 transition-colors"
                            >
                              {display}
                            </Link>
                          </span>
                        );
                      })
                      .filter(Boolean)}
                  </div>
                )}

                {person.biography && (
                  <div
                    className="mt-6 text-gray-300 leading-relaxed max-w-3xl"
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(person.biography, {
                        ALLOWED_TAGS: ['p', 'a', 'strong', 'em', 'br', 'ul', 'ol', 'li', 'b', 'i', 'span'],
                        ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
                        ADD_ATTR: ['target'],
                      })
                    }}
                  />
                )}

                {/* Quick Stats */}
                <div className="flex gap-8 mt-8">
                  <div className="text-center">
                    <div className="text-3xl font-light text-blue-400">{stats.totalMovies}</div>
                    <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">Películas</div>
                  </div>
                  {stats.asActor > 0 && (
                    <div className="text-center">
                      <div className="text-3xl font-light text-blue-400">{stats.asActor}</div>
                      <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">Como Actor</div>
                    </div>
                  )}
                  {stats.asCrew > 0 && (
                    <div className="text-center">
                      <div className="text-3xl font-light text-blue-400">{stats.asCrew}</div>
                      <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">Equipo Técnico</div>
                    </div>
                  )}
                </div>

                {/* Links externos si existen */}
                {person.links && person.links.length > 0 && (
                  <div className="flex gap-4 mt-6">
                    {person.links.map((link: any) => (
                      <a
                        key={link.id}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-white transition-colors"
                        title={link.type}
                      >
                        {link.type === 'IMDB' ? 'IMDb' :
                          link.type === 'WIKIPEDIA' ? 'Wikipedia' :
                            link.type === 'OFFICIAL_WEBSITE' ? 'Sitio Web' :
                              link.type === 'INSTAGRAM' ? 'Instagram' :
                                link.type === 'TWITTER' ? 'Twitter' : link.type}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Filmography Section */}
      {sortedTabEntries.length > 0 && (
        <section className="py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Navigation Tabs */}
            <div className="border-b border-gray-700 mb-8">
              <nav className="flex space-x-8 overflow-x-auto">
                {sortedTabEntries.map(([key, items]) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`pb-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${activeTab === key
                      ? 'border-blue-400 text-white'
                      : 'border-transparent text-gray-400 hover:text-white'
                      }`}
                  >
                    {key} ({items.length})
                  </button>
                ))}
              </nav>
            </div>

            {/* Filmography Grid */}
            <div className="space-y-1">
              <h2 className="text-2xl font-light mb-6 text-white">
                Filmografía - {activeTab}
              </h2>

              {/* Film Items */}
              <div className="divide-y divide-gray-800/50">
                {getFilmographyToShow().map((item: TabItem, index: number) => {
                  const isActing = activeTab === 'Actuación';
                  const movie = item.movie;
                  const year = getEffectiveYear(movie);
                  const displayYear = year > 0 ? year : '—';
                  const badge = getMovieBadge(movie);

                  return (
                    <div key={`${movie.id}-${index}`} className="py-4 hover:bg-gray-800/30 transition-colors group">
                      <div className="flex items-center gap-4">
                        <span className="text-sm w-12 text-left text-gray-500">
                          {displayYear}
                        </span>
                        <div className="flex-grow">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link
                              href={`/pelicula/${movie.slug}`}
                              className="text-lg text-white hover:text-blue-400 transition-colors inline-block"
                            >
                              {movie.title}
                            </Link>

                            {/* ✅ BADGE */}
                            {badge && (
                              <span className={`text-xs px-2 py-0.5 rounded-full ${badge.color}`}>
                                {badge.text}
                              </span>
                            )}

                            {isActing && item.characterName && (
                              <span className="text-sm text-gray-500">
                                como {item.characterName}
                              </span>
                            )}

                            {!isActing && item.roles && item.roles.length > 1 && (
                              <span className="text-sm text-gray-500">
                                (también: {item.roles.filter((r: string) => r !== activeTab).join(', ')})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Show More Button */}
            {tabs[activeTab] && tabs[activeTab].length > 10 && (
              <div className="mt-8 text-center">
                <button
                  onClick={() => setShowAllFilmography(!showAllFilmography)}
                  className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors flex items-center space-x-2 mx-auto"
                >
                  <span>{showAllFilmography ? 'Ver menos' : 'Ver filmografía completa'}</span>
                  <svg
                    className={`w-4 h-4 transition-transform duration-200 ${showAllFilmography ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}