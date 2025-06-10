'use client';

import React, { useState, useEffect } from 'react';

export default function MovieListPage() {
  const [viewMode, setViewMode] = useState('compact');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalMovies = 847;
  const totalPages = Math.ceil(totalMovies / itemsPerPage);

  // Sample movie data
  const movies = [
    { id: 1, title: 'Relatos Salvajes', director: 'Damián Szifron', year: 2014, genre: 'Comedia Negra, Drama', duration: 122, synopsis: 'Seis relatos que alternan la comedia negra y la tragedia. Sus personajes se verán empujados hacia el abismo y hacia el innegable placer de perder el control al cruzar la delgada línea que separa la civilización de la barbarie.', rating: 8.1 },
    { id: 2, title: 'El Secreto de sus Ojos', director: 'Juan José Campanella', year: 2009, genre: 'Drama, Thriller', duration: 129, synopsis: 'Benjamín Espósito es oficial de un Juzgado de Instrucción de Buenos Aires recién retirado. Obsesionado por un brutal asesinato ocurrido veinticinco años antes, decide escribir una novela sobre el caso, del cual fue testigo y protagonista.', rating: 8.2 },
    { id: 3, title: 'Nueve Reinas', director: 'Fabián Bielinsky', year: 2000, genre: 'Thriller, Drama', duration: 114, synopsis: 'Dos estafadores, uno joven y otro veterano, se unen para realizar un negocio millonario. La venta de unos sellos falsos conocidos como las "nueve reinas" se convierte en una carrera contra el tiempo donde nada es lo que parece.', rating: 7.9 },
    { id: 4, title: 'La Historia Oficial', director: 'Luis Puenzo', year: 1985, genre: 'Drama', duration: 112, synopsis: 'Buenos Aires, década del 80. Alicia es una profesora de historia casada con Roberto, un empresario. La pareja tiene una hija adoptiva, Gaby. La vida de Alicia cambiará cuando comience a sospechar sobre el verdadero origen de su hija.', rating: 7.8 },
    { id: 5, title: 'El Hijo de la Novia', director: 'Juan José Campanella', year: 2001, genre: 'Drama, Comedia', duration: 123, synopsis: 'Rafael Belvedere está en crisis: a los 42 años, sigue soltero, no tiene amigos y está agobiado por las responsabilidades. Su padre quiere casarse por la iglesia con su madre, que padece Alzheimer, para complacerla.', rating: 7.8 },
    { id: 6, title: 'Medianeras', director: 'Gustavo Taretto', year: 2011, genre: 'Drama, Romance', duration: 95, synopsis: 'Buenos Aires es una ciudad de departamentos. Martín y Mariana viven a metros de distancia, pero nunca se cruzaron. Mientras tanto, ambos buscan en Internet lo que no pueden encontrar afuera.', rating: 7.5 },
    { id: 7, title: 'Un Cuento Chino', director: 'Sebastián Borensztein', year: 2011, genre: 'Comedia, Drama', duration: 93, synopsis: 'Roberto es un ferretero solitario que colecciona noticias insólitas. Un día conoce a Jun, un chino que no habla español. A pesar de la barrera del idioma, Roberto lo ayudará en su búsqueda.', rating: 7.7 },
    { id: 8, title: 'Pizza, Birra, Faso', director: 'Bruno Stagnaro, Adrián Caetano', year: 1998, genre: 'Drama, Crimen', duration: 92, synopsis: 'Cordobés y sus amigos sobreviven robando en las calles de Buenos Aires. Cuando su novia queda embarazada, Cordobés intenta conseguir dinero para un futuro mejor, pero la vida en la calle no perdona.', rating: 7.1 },
    { id: 9, title: 'Esperando la Carroza', director: 'Alejandro Doria', year: 1985, genre: 'Comedia', duration: 87, synopsis: 'Mamá Cora tiene tres hijos que no quieren hacerse cargo de ella. Durante un almuerzo familiar, la anciana desaparece y todos creen que se suicidó tirándose al río, desatando un caos familiar lleno de hipocresía.', rating: 8.1 },
    { id: 10, title: 'Comodines', director: 'Jorge Nisco', year: 1997, genre: 'Acción, Comedia', duration: 90, synopsis: 'Dos policías muy diferentes deben trabajar juntos para resolver un caso de corrupción policial. Entre persecuciones y tiroteos, desarrollarán una amistad mientras intentan sobrevivir a la investigación.', rating: 6.5 }
  ];

  const getDisplayedMovies = () => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return movies.slice(start, end);
  };

  const handlePageChange = (page: number) => {
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
    
    .movie-placeholder {
      background: linear-gradient(135deg, #1a2332, #0f1419);
      border: 1px solid #3b82f6;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      padding: 2rem;
      position: relative;
      overflow: hidden;
    }
    
    .movie-placeholder::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(45deg, transparent 30%, rgba(59, 130, 246, 0.1) 50%, transparent 70%);
      animation: shimmer 2s infinite;
    }
    
    .placeholder-small {
      background: linear-gradient(135deg, #1a2332, #0f1419);
      border: 1px solid #374151;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      padding: 1rem;
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
  `;

  return (
    <>
      <style>{styles}</style>
      <div className="bg-cine-dark text-white min-h-screen">
        {/* Header/Navigation */}
        <nav className="bg-cine-gray/90 backdrop-blur-lg border-b border-gray-700 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-8">
                <h1 className="text-2xl serif-heading gradient-text">cinenacional.com</h1>
                <div className="hidden md:flex space-x-6">
                  <a href="#" className="text-white font-medium">Películas</a>
                  <a href="#" className="hover:text-cine-accent transition-colors">Personas</a>
                  <a href="#" className="hover:text-cine-accent transition-colors">Géneros</a>
                  <a href="#" className="hover:text-cine-accent transition-colors">Años</a>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Buscar películas, personas..." 
                    className="bg-cine-dark border border-gray-600 rounded-full px-4 py-2 w-64 focus:outline-none focus:border-cine-accent transition-colors text-white placeholder-gray-400"
                  />
                  <svg className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Page Header */}
          <div className="mb-8">
            <h2 className="serif-heading text-4xl text-white mb-2">Películas Argentinas</h2>
            <p className="text-gray-400">Explorá el catálogo completo del cine nacional</p>
          </div>

          {/* Filters and View Toggle */}
          <div className="glass-effect rounded-lg p-6 mb-8">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              {/* Filters */}
              <div className="flex flex-wrap gap-3">
                <select className="bg-cine-dark border border-gray-600 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-cine-accent transition-colors text-white">
                  <option>Todos los géneros</option>
                  <option>Drama</option>
                  <option>Comedia</option>
                  <option>Thriller</option>
                  <option>Documental</option>
                  <option>Romance</option>
                  <option>Acción</option>
                </select>
                <select className="bg-cine-dark border border-gray-600 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-cine-accent transition-colors text-white">
                  <option>Todas las décadas</option>
                  <option>2020s</option>
                  <option>2010s</option>
                  <option>2000s</option>
                  <option>1990s</option>
                  <option>1980s</option>
                </select>
                <select className="bg-cine-dark border border-gray-600 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-cine-accent transition-colors text-white">
                  <option>Ordenar por: Más recientes</option>
                  <option>Título (A-Z)</option>
                  <option>Título (Z-A)</option>
                  <option>Año (Ascendente)</option>
                  <option>Año (Descendente)</option>
                  <option>Calificación</option>
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

          {/* Movies Display */}
          {viewMode === 'compact' ? (
            // Compact Grid View
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 mb-12">
              {getDisplayedMovies().map((movie, index) => (
                <div 
                  key={movie.id} 
                  className="group cursor-pointer animate-fade-in"
                  style={{animationDelay: `${index * 0.05}s`}}
                >
                  <div className="relative aspect-[2/3] rounded-lg overflow-hidden poster-shadow transform group-hover:scale-105 transition-transform duration-300">
                    <div className="movie-placeholder w-full h-full">
                      <svg className="w-16 h-16 text-cine-accent mb-4 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"/>
                      </svg>
                      <p className="text-sm text-gray-400">Afiche</p>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    {movie.rating && (
                      <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-md flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <svg className="w-3 h-3 text-yellow-400 fill-current" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                        </svg>
                        <span className="text-xs font-medium text-white">{movie.rating}</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-3">
                    <h3 className="font-medium text-white line-clamp-1 group-hover:text-cine-accent transition-colors">{movie.title}</h3>
                    <p className="text-sm text-gray-400">{movie.director}</p>
                    <p className="text-sm text-gray-500">{movie.year}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Detail List View
            <div className="space-y-4 mb-12">
              {getDisplayedMovies().map((movie, index) => (
                <div 
                  key={movie.id} 
                  className="glass-effect rounded-lg p-6 hover:border-cine-accent border border-transparent transition-all duration-300 cursor-pointer animate-fade-in"
                  style={{animationDelay: `${index * 0.05}s`}}
                >
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="w-full md:w-32 flex-shrink-0">
                      <div className="aspect-[2/3] md:aspect-auto md:h-48 rounded-lg overflow-hidden">
                        <div className="placeholder-small w-full h-full">
                          <svg className="w-8 h-8 text-gray-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"/>
                          </svg>
                          <p className="text-xs text-gray-400 text-center">Sin imagen</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 space-y-3">
                      <div>
                        <div className="flex items-start justify-between">
                          <h3 className="text-xl font-medium text-white hover:text-cine-accent transition-colors">{movie.title}</h3>
                          {movie.rating && (
                            <div className="flex items-center space-x-1 bg-cine-dark px-2 py-1 rounded-md">
                              <svg className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                              </svg>
                              <span className="text-sm font-medium text-yellow-400">{movie.rating}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-400">
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                            </svg>
                            {movie.director}
                          </span>
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                            </svg>
                            {movie.year}
                          </span>
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 16h4m10 0h4"></path>
                            </svg>
                            {movie.genre}
                          </span>
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            {movie.duration} min
                          </span>
                        </div>
                      </div>
                      <p className="text-gray-300 serif-body line-clamp-3">{movie.synopsis}</p>
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
                {Math.min(currentPage * itemsPerPage, totalMovies)}
              </span>{' '}
              de <span className="font-medium text-white">{totalMovies}</span> películas
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
                      onClick={() => handlePageChange(page as number)}
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

        {/* Footer */}
        <footer className="bg-cine-gray/50 border-t border-gray-700 mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="md:col-span-2">
                <h3 className="serif-heading text-xl gradient-text mb-4">cinenacional.com</h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-4">
                  La base de datos más completa sobre cine argentino.
                </p>
                <div className="flex space-x-4">
                  <a href="#" className="text-gray-400 hover:text-cine-accent transition-colors">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                  </a>
                  <a href="#" className="text-gray-400 hover:text-cine-accent transition-colors">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12.017 0C8.396 0 7.989.013 6.756.072 5.524.13 4.723.209 4.02.396c-.719.195-1.33.481-1.944.903-.614.422-1.141.824-1.564 1.438-.391.615-.677 1.226-.872 1.945C.187 5.478.108 6.279.05 7.511.013 8.744 0 9.151 0 12.017c0 2.867.013 3.273.072 4.506.058 1.232.137 2.033.324 2.736.195.719.48 1.33.903 1.944.421.614.823 1.141 1.437 1.564.615.391 1.226.677 1.945.872.703.187 1.504.266 2.736.324C8.744 23.987 9.151 24 12.017 24c2.867 0 3.273-.013 4.506-.072 1.232-.058 2.033-.137 2.736-.324.719-.195 1.33-.48 1.944-.903.614-.421 1.141-.823 1.564-1.437.391-.615.677-1.226.872-1.945.187-.703.266-1.504.324-2.736C23.987 15.256 24 14.849 24 11.983c0-2.867-.013-3.273-.072-4.506-.058-1.232-.137-2.033-.324-2.736-.195-.719-.48-1.33-.903-1.944-.421-.614-.823-1.141-1.437-1.564-.615-.391-1.226-.677-1.945-.872-.703-.187-1.504-.266-2.736-.324C15.256.013 14.849 0 11.983 0h.034zm-.717 2.169c.67-.003 1.257-.003 2.234-.003 2.822 0 3.156.011 4.27.067 1.03.047 1.589.218 1.96.362.493.192.845.422 1.215.792.37.37.6.722.792 1.215.144.371.315.93.362 1.96.056 1.114.067 1.448.067 4.27 0 2.822-.011 3.156-.067 4.27-.047 1.03-.218 1.589-.362 1.96-.192.493-.422.845-.792 1.215-.37.37-.722.6-1.215.792-.371.144-.93.315-1.96.362-1.114.056-1.448.067-4.27.067-2.822 0-3.156-.011-4.27-.067-1.03-.047-1.589-.218-1.96-.362-.493-.192-.845-.422-1.215-.792-.37-.37-.6-.722-.792-1.215-.144-.371-.315-.93-.362-1.96-.056-1.114-.067-1.448-.067-4.27 0-2.822.011-3.156.067-4.27.047-1.03.218-1.589.362-1.96.192-.493.422-.845.792-1.215.37-.37.722-.6 1.215-.792.371-.144.93-.315 1.96-.362 1.114-.056 1.448-.067 4.27-.067zm0 3.623c-2.986 0-5.406 2.42-5.406 5.406 0 2.986 2.42 5.406 5.406 5.406 2.986 0 5.406-2.42 5.406-5.406 0-2.986-2.42-5.406-5.406-5.406zm0 8.913c-1.937 0-3.507-1.57-3.507-3.507 0-1.937 1.57-3.507 3.507-3.507 1.937 0 3.507 1.57 3.507 3.507 0 1.937-1.57 3.507-3.507 3.507zM18.448 4.155c0 .698-.566 1.264-1.264 1.264-.698 0-1.264-.566-1.264-1.264 0-.698.566-1.264 1.264-1.264.698 0 1.264.566 1.264 1.264z"/>
                    </svg>
                  </a>
                  <a href="#" className="text-gray-400 hover:text-cine-accent transition-colors">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </a>
                  <a href="#" className="text-gray-400 hover:text-cine-accent transition-colors">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                  </a>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-white mb-4">Explorar</h4>
                <ul className="space-y-2 text-sm">
                  <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Películas</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Directores</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Actores</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Géneros</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Décadas</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-white mb-4">Información</h4>
                <ul className="space-y-2 text-sm">
                  <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Acerca de</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Contacto</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Términos de uso</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Política de privacidad</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white transition-colors">API</a></li>
                </ul>
              </div>
            </div>
            
            <div className="border-t border-gray-700 mt-8 pt-8">
              <div className="flex flex-col md:flex-row justify-between items-center">
                <p className="text-gray-400 text-sm">
                  © 2025 cinenacional.com. Todos los derechos reservados.
                </p>
                <div className="flex items-center space-x-4 mt-4 md:mt-0">
                  <span className="text-gray-500 text-xs">Desarrollado con</span>
                  <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd"/>
                  </svg>
                  <span className="text-gray-500 text-xs">en Buenos Aires</span>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}