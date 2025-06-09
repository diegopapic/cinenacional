'use client';

import { useState, useEffect } from 'react';
import Head from 'next/head';

interface FilmographyItem {
  id: string;
  title: string;
  year: number;
  role?: string;
  genre?: string;
  award?: {
    type: 'oscar' | 'goya' | 'other';
    text: string;
  };
}

interface PersonData {
  id: string;
  name: string;
  birthDate: string;
  birthPlace: string;
  bio: string;
  photoUrl?: string;
  stats: {
    totalMovies: number;
    asDirector: number;
    awards: number;
  };
  filmography: {
    director: FilmographyItem[];
    writer: FilmographyItem[];
    assistantDirector: FilmographyItem[];
    production: FilmographyItem[];
    other: FilmographyItem[];
  };
  awards: Array<{
    name: string;
    description: string;
    type: 'gold' | 'blue' | 'green';
  }>;
}

export default function PersonPage() {
  const [activeTab, setActiveTab] = useState<keyof PersonData['filmography']>('director');
  const [showAllFilmography, setShowAllFilmography] = useState(false);
  
  // Datos de ejemplo para Adolfo Aristarain
  const personData: PersonData = {
    id: 'adolfo-aristarain',
    name: 'Adolfo Aristarain',
    birthDate: '19 de octubre de 1943',
    birthPlace: 'Buenos Aires, Argentina',
    bio: 'Director, guionista y productor argentino reconocido como uno de los cineastas más importantes del cine latinoamericano. Sus películas se caracterizan por su profundidad narrativa y su compromiso con temáticas sociales.',
    photoUrl: '/images/persons/adolfo-aristarain.jpg',
    stats: {
      totalMovies: 47,
      asDirector: 15,
      awards: 23
    },
    filmography: {
      director: [
        { id: '1', title: 'La suerte está echada', year: 2013, genre: 'Drama' },
        { id: '2', title: 'Adiós, querida Luna', year: 2011, genre: 'Drama' },
        { id: '3', title: 'Valentín', year: 2008, genre: 'Drama' },
        { id: '4', title: 'Roma', year: 2004, genre: 'Drama' },
        { id: '5', title: 'Lugares comunes', year: 2002, genre: 'Drama', award: { type: 'goya', text: 'Premio Goya' } },
        { id: '6', title: 'Martín (Hache)', year: 1997, genre: 'Drama', award: { type: 'goya', text: 'Premio Goya' } },
        { id: '7', title: 'Un lugar en el mundo', year: 1992, genre: 'Drama', award: { type: 'oscar', text: 'Nominada al Oscar' } },
        { id: '8', title: 'Últimos días de la víctima', year: 1987, genre: 'Thriller' },
        { id: '9', title: 'Tiempo de revancha', year: 1985, genre: 'Thriller' },
        { id: '10', title: 'La playa del amor', year: 1980, genre: 'Drama' },
      ],
      writer: [
        { id: '11', title: 'La suerte está echada', year: 2013 },
        { id: '12', title: 'Roma', year: 2004 },
        { id: '13', title: 'Lugares comunes', year: 2002 },
        { id: '14', title: 'Martín (Hache)', year: 1997 },
        { id: '15', title: 'Un lugar en el mundo', year: 1992 },
        { id: '16', title: 'Tiempo de revancha', year: 1985 },
      ],
      assistantDirector: [
        { id: '17', title: 'La tregua', year: 1974 },
        { id: '18', title: 'Los golpes bajos', year: 1974 },
        { id: '19', title: 'La Patagonia rebelde', year: 1974 },
        { id: '20', title: 'Quebracho', year: 1974 },
      ],
      production: [
        { id: '21', title: 'Roma', year: 2004 },
        { id: '22', title: 'Lugares comunes', year: 2002 },
      ],
      other: [
        { id: '23', title: 'El amor es una mujer gorda', year: 1987, role: 'Montaje' },
        { id: '24', title: 'Crecer de golpe', year: 1977, role: 'Ayudante de dirección' },
      ]
    },
    awards: [
      {
        name: 'Premio Goya',
        description: 'Mejor Película Iberoamericana por "Martín (Hache)" (1998)',
        type: 'gold'
      },
      {
        name: 'Nominación al Oscar',
        description: 'Mejor Película Extranjera por "Un lugar en el mundo" (1993)',
        type: 'blue'
      },
      {
        name: 'Festival de San Sebastián',
        description: 'Concha de Plata al Mejor Director (2002)',
        type: 'green'
      }
    ]
  };

  const tabLabels = {
    director: 'Dirección',
    writer: 'Guión',
    assistantDirector: 'Asistente de Dirección',
    production: 'Producción',
    other: 'Otros Roles'
  };

  const getFilmographyToShow = () => {
    const items = personData.filmography[activeTab];
    return showAllFilmography ? items : items.slice(0, 10);
  };

  return (
    <>
      <Head>
        <title>{personData.name} - CineNacional</title>
        <meta name="description" content={personData.bio} />
      </Head>

      <div className="bg-cine-dark text-white min-h-screen">

        {/* Person Header Section */}
        <section className="relative bg-gradient-to-b from-cine-gray to-cine-dark py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row gap-8 items-start">
              {/* Portrait */}
              <div className="flex-shrink-0">
                <div className="relative">
                  <div className="w-48 h-64 md:w-64 md:h-80 rounded-lg overflow-hidden poster-shadow">
                    {personData.photoUrl ? (
                      <img 
                        src={personData.photoUrl} 
                        alt={personData.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="person-placeholder w-full h-full">
                        <svg className="w-16 h-16 text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                        </svg>
                        <p className="text-sm text-gray-400">Foto no disponible</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Person Info */}
              <div className="flex-grow">
                <h1 className="serif-heading text-5xl md:text-6xl mb-4 text-white">{personData.name}</h1>
                
                <div className="space-y-3 text-gray-300">
                  <div className="flex flex-wrap gap-6 text-sm">
                    <div>
                      <span className="text-gray-500">Nació el </span>
                      <span className="ml-2">{personData.birthDate}</span>
                      <span className="text-gray-500"> en </span>
                      <span className="ml-2">{personData.birthPlace}</span>
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <p className="text-gray-300 leading-relaxed max-w-3xl serif-body">
                      {personData.bio}
                    </p>
                  </div>

                  {/* Quick Stats */}
                  <div className="flex gap-8 mt-8">
                    <div className="text-center">
                      <div className="text-3xl font-light text-cine-accent">{personData.stats.totalMovies}</div>
                      <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">Películas</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-light text-cine-accent">{personData.stats.asDirector}</div>
                      <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">Como Director</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-light text-cine-accent">{personData.stats.awards}</div>
                      <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">Premios</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Filmography Section */}
        <section className="py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Navigation Tabs */}
            <div className="border-b border-gray-700 mb-8">
              <nav className="flex space-x-8 overflow-x-auto">
                {Object.entries(tabLabels).map(([key, label]) => {
                  const count = personData.filmography[key as keyof PersonData['filmography']].length;
                  return (
                    <button
                      key={key}
                      onClick={() => setActiveTab(key as keyof PersonData['filmography'])}
                      className={`pb-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                        activeTab === key
                          ? 'border-cine-accent text-white'
                          : 'border-transparent text-gray-400 hover:text-white'
                      }`}
                    >
                      {label} ({count})
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Filmography Grid */}
            <div className="space-y-1">
              <h2 className="text-2xl font-light mb-6 text-white">
                Filmografía como {tabLabels[activeTab]}
              </h2>
              
              {/* Film Items */}
              <div className="divide-y divide-gray-800/50">
                {getFilmographyToShow().map((film) => (
                  <div key={film.id} className="py-4 hover:bg-cine-gray/30 transition-colors group">
                    <div className="flex items-center gap-4">
                      <span className="text-gray-500 text-sm w-12 text-left">{film.year}</span>
                      <div className="flex-grow">
                        <a href={`/pelicula/${film.id}`} className="hover-line text-lg text-white">
                          {film.title}
                        </a>
                        {film.award && (
                          <span className={`ml-2 text-xs px-2 py-0.5 rounded ${
                            film.award.type === 'oscar' 
                              ? 'bg-blue-900/30 text-cine-gold' 
                              : film.award.type === 'goya'
                              ? 'bg-yellow-900/30 text-yellow-400'
                              : 'bg-green-900/30 text-green-400'
                          }`}>
                            {film.award.text}
                          </span>
                        )}
                        {film.role && (
                          <span className="ml-2 text-xs text-gray-500">({film.role})</span>
                        )}
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-xs text-gray-500">{film.genre || 'Drama'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Show More Button */}
            {personData.filmography[activeTab].length > 10 && (
              <div className="mt-8 text-center">
                <button 
                  onClick={() => setShowAllFilmography(!showAllFilmography)}
                  className="text-cine-accent hover:text-cine-gold text-sm font-medium transition-colors flex items-center space-x-2 mx-auto"
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

        {/* Awards Section */}
        <section className="py-12 bg-cine-gray/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-light mb-8 text-white">Premios y Reconocimientos</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {personData.awards.map((award, index) => (
                <div key={index} className="bg-cine-gray/50 rounded-lg p-6 hover:bg-cine-gray/70 transition-colors">
                  <div className={`mb-3 ${
                    award.type === 'gold' ? 'text-yellow-400' : 
                    award.type === 'blue' ? 'text-cine-accent' : 
                    'text-green-400'
                  }`}>
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                    </svg>
                  </div>
                  <h3 className="font-medium text-white mb-1">{award.name}</h3>
                  <p className="text-sm text-gray-400">{award.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Related People Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-gray-800">
          <h2 className="serif-heading text-2xl text-white mb-6">Personas Relacionadas</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[
              { name: 'Ricardo Darín', role: 'Actor' },
              { name: 'Damián Szifrón', role: 'Director' },
              { name: 'Juan José Campanella', role: 'Director' },
              { name: 'Cecilia Roth', role: 'Actriz' }
            ].map((person, index) => (
              <div key={index} className="group cursor-pointer text-center">
                <div className="w-20 h-20 rounded-full person-placeholder mx-auto mb-2 transform group-hover:scale-105 transition-transform">
                  <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                  </svg>
                </div>
                <p className="text-sm font-medium text-white group-hover:text-cine-accent transition-colors">{person.name}</p>
                <p className="text-xs text-gray-400">{person.role}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        .hover-line {
          position: relative;
          display: inline-block;
        }
        .hover-line::after {
          content: '';
          position: absolute;
          width: 0;
          height: 1px;
          bottom: -2px;
          left: 0;
          background-color: #60a5fa;
          transition: width 0.3s ease;
        }
        .hover-line:hover::after {
          width: 100%;
        }
        .gradient-text {
          background: linear-gradient(135deg, #3b82f6, #60a5fa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .person-placeholder {
          background: linear-gradient(135deg, #1a2332, #0f1419);
          border: 1px solid #374151;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        .poster-shadow {
          box-shadow: 0 20px 40px rgba(0,0,0,0.4);
        }
        .glass-effect {
          backdrop-filter: blur(10px);
          background: rgba(42, 42, 42, 0.8);
        }
      `}</style>
    </>
  );
}