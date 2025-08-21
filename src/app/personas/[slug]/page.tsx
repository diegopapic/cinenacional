// src/app/personas/[slug]/page.tsx - VERSIÓN TIPADA PARA VERCEL
'use client';

import { useState, useEffect, useCallback } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { formatPartialDate } from '@/lib/shared/dateUtils';

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

  // Agrupar filmografía por rol, combinando múltiples roles por película
  const groupFilmographyByRole = useCallback((crewRoles: CrewRole[]): { [key: string]: GroupedCrewRole[] } => {
    // Primero, agrupar todas las películas con sus roles
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

    // Ahora crear las pestañas por rol individual
    const groupedByRole: { [roleName: string]: GroupedCrewRole[] } = {};
    
    crewRoles.forEach((item) => {
      const roleName = item.role?.name || 'Rol desconocido';
      
      if (!groupedByRole[roleName]) {
        groupedByRole[roleName] = [];
        
        // Para este rol, obtener todas las películas donde la persona tiene este rol
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

    // Ordenar cada grupo por año
    Object.keys(groupedByRole).forEach(roleName => {
      groupedByRole[roleName].sort((a, b) => {
        const yearA = a.movie.releaseYear || a.movie.year || 0;
        const yearB = b.movie.releaseYear || b.movie.year || 0;
        return yearB - yearA;
      });
    });

    return groupedByRole;
  }, []);

  const getFirstAvailableTab = useCallback((filmographyData: any): string => {
    if (filmographyData?.castRoles?.length > 0) return 'Actuación';
    const grouped = groupFilmographyByRole(filmographyData?.crewRoles || []);
    const roles = Object.keys(grouped).sort();
    return roles[0] || '';
  }, [groupFilmographyByRole]);

  const fetchPersonData = useCallback(async () => {
    try {
      // Obtener datos de la persona
      const personResponse = await fetch(`/api/people/slug/${params.slug}`);
      if (!personResponse.ok) {
        setLoading(false);
        return;
      }
      const personData = await personResponse.json();
      setPerson(personData);

      // Obtener filmografía
      const filmographyResponse = await fetch(`/api/people/${personData.id}/filmography`);
      if (filmographyResponse.ok) {
        const filmographyData = await filmographyResponse.json();
        setFilmography(filmographyData);
        
        // Establecer la primera pestaña activa
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
  
  // Formatear fechas
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

  // Preparar las pestañas dinámicamente
  const tabs: { [key: string]: TabItem[] } = {};
  
  // Agregar pestaña de actuación si tiene roles como actor/actriz
  if (filmography?.castRoles?.length > 0) {
    tabs['Actuación'] = filmography.castRoles;
  }

  // Agrupar roles de crew por rol específico
  if (filmography?.crewRoles?.length > 0) {
    const groupedCrew = groupFilmographyByRole(filmography.crewRoles);
    Object.entries(groupedCrew).forEach(([roleName, items]) => {
      tabs[roleName] = items;
    });
  }

  // Calcular estadísticas (sin duplicados)
  const uniqueMoviesAsActor = new Set(filmography?.castRoles?.map((r: CastRole) => r.movie.id) || []);
  const uniqueMoviesAsCrew = new Set(filmography?.crewRoles?.map((r: CrewRole) => r.movie.id) || []);
  const allUniqueMovies = new Set([...uniqueMoviesAsActor, ...uniqueMoviesAsCrew]);
  
  const stats = {
    totalMovies: allUniqueMovies.size,
    asActor: uniqueMoviesAsActor.size,
    asCrew: uniqueMoviesAsCrew.size
  };

  // Obtener items a mostrar según la pestaña activa
  const getFilmographyToShow = (): TabItem[] => {
    const items = tabs[activeTab] || [];
    return showAllFilmography ? items : items.slice(0, 10);
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
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
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
                    <span className="text-gray-500">Nació el </span>
                    <span>{birthDateFormatted}</span>
                    {person.birthLocation && (
                      <>
                        <span className="text-gray-500"> en </span>
                        <span>
                          {person.birthLocation.name}
                          {person.birthLocation.parent && `, ${person.birthLocation.parent.name}`}
                        </span>
                      </>
                    )}
                  </div>
                )}
                
                {deathDateFormatted && (
                  <div className="text-sm">
                    <span className="text-gray-500">Falleció el </span>
                    <span>{deathDateFormatted}</span>
                    {person.deathLocation && (
                      <>
                        <span className="text-gray-500"> en </span>
                        <span>
                          {person.deathLocation.name}
                          {person.deathLocation.parent && `, ${person.deathLocation.parent.name}`}
                        </span>
                      </>
                    )}
                  </div>
                )}
                
                {person.biography && (
                  <div className="mt-6">
                    <p className="text-gray-300 leading-relaxed max-w-3xl">
                      {person.biography}
                    </p>
                  </div>
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
      {Object.keys(tabs).length > 0 && (
        <section className="py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Navigation Tabs */}
            <div className="border-b border-gray-700 mb-8">
              <nav className="flex space-x-8 overflow-x-auto">
                {Object.entries(tabs).map(([key, items]) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`pb-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                      activeTab === key
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
                  const year = movie.releaseYear || movie.year;
                  
                  return (
                    <div key={`${movie.id}-${index}`} className="py-4 hover:bg-gray-800/30 transition-colors group">
                      <div className="flex items-center gap-4">
                        <span className="text-gray-500 text-sm w-12 text-left">
                          {year || '—'}
                        </span>
                        <div className="flex-grow">
                          <Link 
                            href={`/peliculas/${movie.slug}`}
                            className="text-lg text-white hover:text-blue-400 transition-colors inline-block"
                          >
                            {movie.title}
                          </Link>
                          {isActing && item.characterName && (
                            <span className="ml-2 text-sm text-gray-500">
                              como {item.characterName}
                            </span>
                          )}
                          {!isActing && item.roles && item.roles.length > 1 && (
                            <span className="ml-2 text-sm text-gray-500">
                              (también: {item.roles.filter((r: string) => r !== activeTab).join(', ')})
                            </span>
                          )}
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