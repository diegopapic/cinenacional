'use client';

import React, { useState, useEffect } from 'react';

export default function PeopleListPage() {
  const [viewMode, setViewMode] = useState('compact');
  const [currentPage, setCurrentPage] = useState(1);
  const [filterRole, setFilterRole] = useState('all');
  const itemsPerPage = 12;
  const totalPeople = 1243;
  const totalPages = Math.ceil(totalPeople / itemsPerPage);

  // Sample people data
  const people = [
    { 
      id: 1, 
      name: 'Ricardo Darín', 
      primaryRole: 'Actor',
      birthYear: 1957,
      birthPlace: 'Buenos Aires, Argentina',
      filmCount: 87,
      awards: 42,
      notableFilms: ['El Secreto de sus Ojos', 'Nueve Reinas', 'Un Cuento Chino', 'Relatos Salvajes'],
      bio: 'Uno de los actores más reconocidos del cine argentino, con una carrera que abarca más de cuatro décadas. Ganador de múltiples premios internacionales.',
      roles: ['Actor', 'Productor']
    },
    { 
      id: 2, 
      name: 'Juan José Campanella', 
      primaryRole: 'Director',
      birthYear: 1959,
      birthPlace: 'Buenos Aires, Argentina',
      filmCount: 15,
      awards: 28,
      notableFilms: ['El Secreto de sus Ojos', 'El Hijo de la Novia', 'Luna de Avellaneda', 'El Mismo Amor'],
      bio: 'Director y guionista argentino ganador del Oscar. Reconocido por su trabajo tanto en cine como en televisión internacional.',
      roles: ['Director', 'Guionista', 'Productor']
    },
    { 
      id: 3, 
      name: 'Norma Aleandro', 
      primaryRole: 'Actriz',
      birthYear: 1936,
      birthPlace: 'Buenos Aires, Argentina',
      filmCount: 62,
      awards: 35,
      notableFilms: ['La Historia Oficial', 'El Hijo de la Novia', 'Gaby: A True Story', 'Cama Adentro'],
      bio: 'Primera actriz argentina, ícono del cine y teatro nacional. Ganadora de múltiples premios internacionales incluyendo el premio a mejor actriz en Cannes.',
      roles: ['Actriz', 'Directora teatral']
    },
    { 
      id: 4, 
      name: 'Damián Szifron', 
      primaryRole: 'Director',
      birthYear: 1975,
      birthPlace: 'Ramos Mejía, Argentina',
      filmCount: 8,
      awards: 22,
      notableFilms: ['Relatos Salvajes', 'El Fondo del Mar', 'Tiempo de Valientes'],
      bio: 'Director, guionista y productor argentino. Creador de series exitosas y director del film más taquillero del cine argentino.',
      roles: ['Director', 'Guionista', 'Productor']
    },
    { 
      id: 5, 
      name: 'Érica Rivas', 
      primaryRole: 'Actriz',
      birthYear: 1974,
      birthPlace: 'Buenos Aires, Argentina',
      filmCount: 34,
      awards: 18,
      notableFilms: ['Relatos Salvajes', 'La Señal', 'Elena Sabe', 'Los Marziano'],
      bio: 'Actriz argentina de cine, teatro y televisión. Reconocida por su versatilidad y compromiso con cada personaje.',
      roles: ['Actriz', 'Cantante']
    },
    { 
      id: 6, 
      name: 'Fabián Bielinsky', 
      primaryRole: 'Director',
      birthYear: 1959,
      birthPlace: 'Buenos Aires, Argentina',
      deathYear: 2006,
      filmCount: 3,
      awards: 15,
      notableFilms: ['Nueve Reinas', 'El Aura'],
      bio: 'Director y guionista argentino cuya breve pero brillante carrera dejó una marca indeleble en el cine nacional.',
      roles: ['Director', 'Guionista']
    },
    { 
      id: 7, 
      name: 'Cecilia Roth', 
      primaryRole: 'Actriz',
      birthYear: 1956,
      birthPlace: 'Buenos Aires, Argentina',
      filmCount: 73,
      awards: 31,
      notableFilms: ['Todo sobre mi madre', 'Martín (Hache)', 'El Lado Oscuro del Corazón', 'Kamchatka'],
      bio: 'Actriz argentina-española con una destacada carrera internacional. Musa de Pedro Almodóvar y figura clave del cine argentino.',
      roles: ['Actriz']
    },
    { 
      id: 8, 
      name: 'Gustavo Santaolalla', 
      primaryRole: 'Compositor',
      birthYear: 1951,
      birthPlace: 'El Palomar, Argentina',
      filmCount: 45,
      awards: 38,
      notableFilms: ['Relatos Salvajes', 'Diarios de Motocicleta', 'Brokeback Mountain', 'Babel'],
      bio: 'Músico, compositor y productor argentino. Doble ganador del Oscar por mejor banda sonora original.',
      roles: ['Compositor', 'Músico', 'Productor']
    },
    { 
      id: 9, 
      name: 'Mercedes Morán', 
      primaryRole: 'Actriz',
      birthYear: 1955,
      birthPlace: 'Concarán, San Luis, Argentina',
      filmCount: 48,
      awards: 25,
      notableFilms: ['La Ciénaga', 'Diarios de Motocicleta', 'Neruda', 'El Reino'],
      bio: 'Actriz argentina reconocida por su trabajo con directores como Lucrecia Martel y Pablo Trapero. Una de las actrices más respetadas del cine latinoamericano.',
      roles: ['Actriz', 'Productora']
    },
    { 
      id: 10, 
      name: 'Leonardo Sbaraglia', 
      primaryRole: 'Actor',
      birthYear: 1970,
      birthPlace: 'Buenos Aires, Argentina',
      filmCount: 56,
      awards: 29,
      notableFilms: ['Relatos Salvajes', 'Plata Quemada', 'Intacto', 'El Secreto de sus Ojos'],
      bio: 'Actor argentino con una sólida carrera internacional. Reconocido por su carisma y versatilidad en géneros diversos.',
      roles: ['Actor']
    },
    { 
      id: 11, 
      name: 'Lucrecia Martel', 
      primaryRole: 'Directora',
      birthYear: 1966,
      birthPlace: 'Salta, Argentina',
      filmCount: 6,
      awards: 42,
      notableFilms: ['La Ciénaga', 'La Niña Santa', 'La Mujer sin Cabeza', 'Zama'],
      bio: 'Directora y guionista argentina, una de las voces más importantes del nuevo cine argentino. Su obra es estudiada en universidades de todo el mundo.',
      roles: ['Directora', 'Guionista']
    },
    { 
      id: 12, 
      name: 'Diego Peretti', 
      primaryRole: 'Actor',
      birthYear: 1963,
      birthPlace: 'Buenos Aires, Argentina',
      filmCount: 41,
      awards: 19,
      notableFilms: ['Tiempo de Valientes', 'No Sos Vos, Soy Yo', 'Los Simuladores', 'El Robo del Siglo'],
      bio: 'Actor y psiquiatra argentino. Conocido por su trabajo en comedia y su capacidad para crear personajes memorables.',
      roles: ['Actor', 'Guionista']
    }
  ];

  const getDisplayedPeople = () => {
    let filteredPeople = people;
    
    if (filterRole !== 'all') {
      filteredPeople = people.filter(person => 
        person.roles.some(role => role.toLowerCase() === filterRole.toLowerCase())
      );
    }
    
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredPeople.slice(start, end);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };

  const renderPagination = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, '...', totalPages - 1, totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, 2, '...', totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    
    return pages;
  };

  // Add styles
  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Crimson+Text:ital,wght@0,400;0,600;1,400&family=Inter:wght@300;400;500;600&display=swap');
    
    body {
      font-family: 'Inter', system-ui, sans-serif;
      font-weight: 300;
      letter-spacing: -0.01em;
      background-color: #0f1419;
      color: white;
    }
    
    .serif-heading {
      font-family: 'Crimson Text', Georgia, serif;
      font-weight: 600;
      letter-spacing: -0.02em;
    }
    
    .serif-body {
      font-family: 'Crimson Text', Georgia, serif;
      font-weight: 400;
      line-height: 1.7;
    }
    
    .poster-shadow {
      box-shadow: 0 20px 40px rgba(0,0,0,0.4);
    }
    
    .glass-effect {
      backdrop-filter: blur(10px);
      background: rgba(42, 42, 42, 0.8);
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
    
    .person-placeholder::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(45deg, transparent 30%, rgba(59, 130, 246, 0.1) 50%, transparent 70%);
      animation: shimmer 2s infinite;
    }
    
    .animate-fade-in {
      animation: fadeIn 0.5s ease-in-out;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
    
    .bg-cine-dark { background-color: #0f1419; }
    .bg-cine-gray { background-color: #1a2332; }
    .text-cine-accent { color: #3b82f6; }
    .bg-cine-accent { background-color: #3b82f6; }
    .border-cine-accent { border-color: #3b82f6; }
    .hover\\:bg-cine-accent:hover { background-color: #3b82f6; }
    .hover\\:text-cine-accent:hover { color: #3b82f6; }
    .hover\\:border-cine-accent:hover { border-color: #3b82f6; }
    
    .role-badge {
      display: inline-flex;
      align-items: center;
      padding: 0.125rem 0.5rem;
      font-size: 0.75rem;
      font-weight: 500;
      border-radius: 9999px;
      background-color: rgba(59, 130, 246, 0.1);
      color: #60a5fa;
      border: 1px solid rgba(59, 130, 246, 0.2);
    }
  `;

  return (
    <>
      <style>{styles}</style>
      <div className="bg-cine-dark text-white min-h-screen">
        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Page Header */}
          <div className="mb-8">
            <h2 className="serif-heading text-4xl text-white mb-2">Personas del Cine Argentino</h2>
            <p className="text-gray-400">Directores, actores, guionistas y técnicos que construyen nuestra industria</p>
          </div>

          {/* Filters and View Toggle */}
          <div className="glass-effect rounded-lg p-6 mb-8">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              {/* Filters */}
              <div className="flex flex-wrap gap-3">
                <select 
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="bg-cine-dark border border-gray-600 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-cine-accent transition-colors text-white"
                >
                  <option value="all">Todos los roles</option>
                  <option value="actor">Actores</option>
                  <option value="actriz">Actrices</option>
                  <option value="director">Directores</option>
                  <option value="guionista">Guionistas</option>
                  <option value="productor">Productores</option>
                  <option value="compositor">Compositores</option>
                </select>
                <select className="bg-cine-dark border border-gray-600 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-cine-accent transition-colors text-white">
                  <option>Ordenar por: Nombre (A-Z)</option>
                  <option>Nombre (Z-A)</option>
                  <option>Más películas</option>
                  <option>Más premios</option>
                  <option>Más reciente</option>
                </select>
                <select className="bg-cine-dark border border-gray-600 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-cine-accent transition-colors text-white">
                  <option>Todas las décadas</option>
                  <option>Activos en 2020s</option>
                  <option>Activos en 2010s</option>
                  <option>Activos en 2000s</option>
                  <option>Activos en 1990s</option>
                </select>
              </div>

              {/* View Toggle */}
              <div className="flex items-center bg-cine-dark rounded-lg p-1 border border-gray-600">
                <button 
                  onClick={() => setViewMode('compact')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                    viewMode === 'compact' 
                      ? 'bg-cine-accent text-white' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Vista Compacta
                </button>
                <button 
                  onClick={() => setViewMode('detail')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                    viewMode === 'detail' 
                      ? 'bg-cine-accent text-white' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Vista Detallada
                </button>
              </div>
            </div>
          </div>

          {/* People Display */}
          {viewMode === 'compact' ? (
            // Compact Grid View
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 mb-12">
              {getDisplayedPeople().map((person, index) => (
                <div 
                  key={person.id} 
                  className="group cursor-pointer animate-fade-in text-center"
                  style={{animationDelay: `${index * 0.05}s`}}
                >
                  <div className="relative mb-3">
                    <div className="w-32 h-32 mx-auto rounded-full overflow-hidden transform group-hover:scale-105 transition-transform duration-300">
                      <div className="person-placeholder w-full h-full">
                        <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                        </svg>
                      </div>
                    </div>
                    {person.deathYear && (
                      <div className="absolute top-0 right-0 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
                        {person.birthYear}-{person.deathYear}
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium text-white line-clamp-1 group-hover:text-cine-accent transition-colors">{person.name}</h3>
                    <p className="text-sm text-gray-400">{person.primaryRole}</p>
                    <div className="flex items-center justify-center gap-2 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 16h4m10 0h4"></path>
                        </svg>
                        {person.filmCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path>
                        </svg>
                        {person.awards}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Detail List View
            <div className="space-y-4 mb-12">
              {getDisplayedPeople().map((person, index) => (
                <div 
                  key={person.id} 
                  className="glass-effect rounded-lg p-6 hover:border-cine-accent border border-transparent transition-all duration-300 cursor-pointer animate-fade-in"
                  style={{animationDelay: `${index * 0.05}s`}}
                >
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="w-full md:w-32 flex-shrink-0">
                      <div className="w-32 h-32 mx-auto md:mx-0 rounded-full overflow-hidden">
                        <div className="person-placeholder w-full h-full">
                          <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                          </svg>
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 space-y-3">
                      <div>
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="text-xl font-medium text-white hover:text-cine-accent transition-colors inline-block">{person.name}</h3>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {person.roles.map((role, idx) => (
                                <span key={idx} className="role-badge">{role}</span>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-400">
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 16h4m10 0h4"></path>
                              </svg>
                              {person.filmCount} películas
                            </span>
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path>
                              </svg>
                              {person.awards} premios
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                            </svg>
                            {person.birthYear}{person.deathYear && ` - ${person.deathYear}`}
                          </span>
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                            </svg>
                            {person.birthPlace}
                          </span>
                        </div>
                      </div>
                      <p className="text-gray-300 serif-body">{person.bio}</p>
                      <div>
                        <h4 className="text-sm font-medium text-cine-accent mb-2">Películas destacadas:</h4>
                        <div className="flex flex-wrap gap-2">
                          {person.notableFilms.slice(0, 4).map((film, idx) => (
                            <span key={idx} className="text-sm bg-cine-dark px-3 py-1 rounded-full text-gray-300 hover:text-white hover:bg-cine-gray transition-colors cursor-pointer">
                              {film}
                            </span>
                          ))}
                          {person.notableFilms.length > 4 && (
                            <span className="text-sm text-gray-500">
                              +{person.notableFilms.length - 4} más
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
            <p className="text-sm text-gray-400">
              Mostrando <span className="font-medium text-white">{(currentPage - 1) * itemsPerPage + 1}</span> a{' '}
              <span className="font-medium text-white">
                {Math.min(currentPage * itemsPerPage, totalPeople)}
              </span>{' '}
              de <span className="font-medium text-white">{totalPeople}</span> personas
            </p>
            <nav className="flex items-center space-x-2">
              <button 
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm font-medium text-gray-400 bg-cine-gray border border-gray-700 rounded-lg hover:bg-cine-dark hover:border-cine-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                </svg>
              </button>
              
              {renderPagination().map((page, index) => (
                <React.Fragment key={index}>
                  {page === '...' ? (
                    <span className="px-2 text-gray-500">...</span>
                  ) : (
                    <button
                      onClick={() => handlePageChange(page)}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                        currentPage === page
                          ? 'text-white bg-cine-accent'
                          : 'text-gray-300 bg-cine-gray border border-gray-700 hover:bg-cine-dark hover:border-cine-accent'
                      }`}
                    >
                      {page}
                    </button>
                  )}
                </React.Fragment>
              ))}
              
              <button 
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm font-medium text-gray-400 bg-cine-gray border border-gray-700 rounded-lg hover:bg-cine-dark hover:border-cine-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                </svg>
              </button>
            </nav>
          </div>
        </main>
      </div>
    </>
  );
}