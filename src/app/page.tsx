'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function HomePage() {
  // Películas para el hero rotativo
  const peliculasHero = [
    { id: 1, titulo: "El Secreto de Sus Ojos", año: "2009", genero: "Drama, Thriller", director: "Juan José Campanella", imagen: "https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=1024&fit=crop&auto=format" },
    { id: 2, titulo: "Relatos Salvajes", año: "2014", genero: "Comedia negra", director: "Damián Szifron", imagen: "https://images.unsplash.com/photo-1507003211169-0a1dd7506d40?w=1024&fit=crop&auto=format" },
    { id: 3, titulo: "Argentina, 1985", año: "2022", genero: "Drama histórico", director: "Santiago Mitre", imagen: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1024&fit=crop&auto=format" },
    { id: 4, titulo: "La Ciénaga", año: "2001", genero: "Drama", director: "Lucrecia Martel", imagen: "https://images.unsplash.com/photo-1489599328131-cdd7553e2ad1?w=1024&fit=crop&auto=format" },
    { id: 5, titulo: "Nueve Reinas", año: "2000", genero: "Thriller", director: "Fabián Bielinsky", imagen: "https://images.unsplash.com/photo-1556388158-158ea5ccacbd?w=1024&fit=crop&auto=format" },
  ];

  const [peliculaHeroIndex, setPeliculaHeroIndex] = useState(0);

  // Datos de ejemplo - en producción vendrían de tu API/DB
  const ultimosEstrenos = [
    { id: 1, titulo: "Argentina, 1985", año: "2022" },
    { id: 2, titulo: "El Empleado y el Patrón", año: "2021" },
    { id: 3, titulo: "La Odisea de los Giles", año: "2019" },
    { id: 4, titulo: "El Ángel", año: "2018" },
    { id: 5, titulo: "Relatos Salvajes", año: "2014" },
    { id: 6, titulo: "Elsa y Fred", año: "2005" },
  ];

  const proximosEstrenos = [
    { id: 1, titulo: "Título de la Película", fecha: "15 de Julio, 2025", director: "Director Nombre", genero: "Drama" },
    { id: 2, titulo: "Otra Película", fecha: "22 de Julio, 2025", director: "Otro Director", genero: "Comedia" },
    { id: 3, titulo: "Película Esperada", fecha: "5 de Agosto, 2025", director: "Director Conocido", genero: "Thriller" },
  ];

  const obituarios = [
    { id: 1, nombre: "Luis Brandoni", rol: "Actor", años: "1940-2025", fecha: "5 de junio, 2025" },
    { id: 2, nombre: "María Vaner", rol: "Actriz", años: "1935-2025", fecha: "28 de mayo, 2025" },
  ];

  const efemerides = [
    { fecha: "10 de junio de 1985", evento: 'Estreno de "Camila" de María Luisa Bemberg', años: 40 },
    { fecha: "10 de junio de 1975", evento: "Nace el director Juan José Campanella", años: 50 },
    { fecha: "10 de junio de 2000", evento: 'Estreno de "Nueve Reinas" de Fabián Bielinsky', años: 25 },
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

  // Rotar película del hero cada 8 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      setPeliculaHeroIndex((prev) => (prev + 1) % peliculasHero.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [peliculasHero.length]);

  const peliculaHeroActual = peliculasHero[peliculaHeroIndex];

  return (
    <div className="bg-cine-dark text-white min-h-screen">
      {/* Hero Section con imagen rotativa */}
      <div className="relative hero-background-container -mt-16 pt-16">
        {/* Imagen hero */}
        <img 
          src={peliculaHeroActual.imagen}
          alt={peliculaHeroActual.titulo}
          className="hero-image animate-fade-in"
          key={peliculaHeroIndex}
        />
        
        {/* Fade inferior */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-cine-dark to-transparent z-10"></div>
        
        {/* Información de la película */}
        <div className="absolute inset-0 flex items-end justify-start z-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 w-full">
            <h1 className="serif-heading text-5xl md:text-6xl lg:text-7xl text-white leading-tight drop-shadow-2xl">
              {peliculaHeroActual.titulo}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-gray-200 mt-4">
              <span className="bg-cine-accent/90 px-3 py-1 rounded-full text-sm font-medium text-white backdrop-blur-sm">
                {peliculaHeroActual.año}
              </span>
              <span className="drop-shadow-lg">{peliculaHeroActual.genero}</span>
              <span className="drop-shadow-lg">Dir: {peliculaHeroActual.director}</span>
            </div>
            <Link
              href={`/pelicula/${peliculaHeroActual.id}`}
              className="inline-block bg-cine-accent hover:bg-blue-600 px-6 py-3 rounded-lg font-medium transition-colors mt-4"
            >
              Ver ficha completa
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-cine-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          
          {/* Últimos Estrenos */}
          <section className="mb-12">
            <h2 className="serif-heading text-3xl mb-6 text-white">Últimos Estrenos</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {ultimosEstrenos.map((pelicula) => (
                <Link
                  key={pelicula.id}
                  href={`/pelicula/${pelicula.id}`}
                  className="group cursor-pointer"
                >
                  <div className="aspect-[2/3] rounded-lg overflow-hidden mb-2 transform group-hover:scale-105 transition-transform poster-shadow">
                    <div className="movie-placeholder w-full h-full">
                      <svg className="w-12 h-12 text-cine-accent mb-2 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"/>
                      </svg>
                      <p className="text-xs text-gray-400">Afiche</p>
                    </div>
                  </div>
                  <h3 className="font-medium text-sm text-white line-clamp-2">{pelicula.titulo}</h3>
                  <p className="text-gray-400 text-xs">{pelicula.año}</p>
                </Link>
              ))}
            </div>
          </section>

          {/* Próximos Estrenos */}
          <section className="mb-12">
            <h2 className="serif-heading text-3xl mb-6 text-white">Próximos Estrenos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {proximosEstrenos.map((pelicula) => (
                <div key={pelicula.id} className="glass-effect rounded-lg p-4 flex space-x-4 hover:bg-cine-gray/90 transition-colors">
                  <div className="w-20 h-28 rounded flex-shrink-0">
                    <div className="placeholder-small w-full h-full">
                      <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"/>
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium mb-1 text-white">{pelicula.titulo}</h3>
                    <p className="text-sm text-gray-400 mb-2 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                      </svg>
                      {pelicula.fecha}
                    </p>
                    <p className="text-sm text-gray-300">{pelicula.genero} • Dir: {pelicula.director}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Grid Layout para Obituarios y Efemérides */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            {/* Obituarios */}
            <section>
              <h2 className="serif-heading text-3xl mb-6 text-white">Obituarios</h2>
              <div className="glass-effect rounded-lg p-6">
                <div className="space-y-4">
                  {obituarios.map((persona) => (
                    <div key={persona.id} className="flex items-center space-x-4 pb-4 border-b border-gray-700 last:border-0 last:pb-0">
                      <div className="w-16 h-16 rounded-full person-placeholder">
                        <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-white">{persona.nombre}</h3>
                        <p className="text-sm text-gray-400">{persona.rol} • {persona.años}</p>
                        <p className="text-sm text-gray-500">{persona.fecha}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Efemérides */}
            <section>
              <h2 className="serif-heading text-3xl mb-6 text-white">Efemérides del Día</h2>
              <div className="glass-effect rounded-lg p-6">
                <div className="space-y-4">
                  {efemerides.map((item, index) => (
                    <div key={index} className="pb-4 border-b border-gray-700 last:border-0 last:pb-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium text-cine-accent">{item.fecha}</h3>
                          <p className="text-sm mt-1 text-gray-300">{item.evento}</p>
                        </div>
                        <span className="text-sm text-gray-500">{item.años} años</span>
                      </div>
                    </div>
                  ))}
                </div>
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
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"/>
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
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