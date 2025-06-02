'use client';

import { useState, useEffect } from 'react';
import { TrailerSection } from "./components/TrailerSection";
import Head from 'next/head';

export default function MoviePage() {
  const [movieGallery, setMovieGallery] = useState<string[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showFullCast, setShowFullCast] = useState(false);
  const [showFullCrew, setShowFullCrew] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<{src: string, alt: string} | null>(null);
  const currentMovieId = 'relatos-salvajes';

  // Función para cargar imágenes desde la API
  const loadMovieImages = async (movieId: string) => {
    console.log(`🔍 Intentando cargar imágenes para: ${movieId}`);
    
    try {
      const response = await fetch(`/api/images/${movieId}`);
      console.log(`📡 Respuesta de la API:`, response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`📦 Datos recibidos:`, data);
      
      if (data.images && data.images.length > 0) {
        // Optimizar URLs para resolución máxima de 1024px
        const images = data.images.map((img: any) => {
          let url = img.url;
          // Si es de Unsplash, limitar a 1024px de ancho máximo
          if (url.includes('unsplash.com')) {
            url = url.replace(/w=\d+/, 'w=1024').replace(/h=\d+/, '');
            if (!url.includes('w=')) {
              url += url.includes('?') ? '&w=1024&fit=crop&auto=format' : '?w=1024&fit=crop&auto=format';
            }
          }
          return url;
        });
        
        setMovieGallery(images);
        console.log(`✅ Cargadas ${data.count} imágenes optimizadas a 1024px:`, images);
      } else {
        console.log('⚠️ No se encontraron imágenes, usando fallback');
        setMovieGallery(getFallbackImages());
      }
    } catch (error) {
      console.error('❌ Error cargando imágenes:', error);
      setMovieGallery(getFallbackImages());
    }
  };

  // Función para obtener imágenes de fallback optimizadas
  const getFallbackImages = () => [
    'https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=1024&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7506d40?w=1024&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1024&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1489599328131-cdd7553e2ad1?w=1024&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1556388158-158ea5ccacbd?w=1024&fit=crop&auto=format'
  ];

  // Cargar imágenes al montar el componente
  useEffect(() => {
    loadMovieImages(currentMovieId);
  }, []);

  // Cambiar fondo cada 8 segundos
  useEffect(() => {
    if (movieGallery.length > 0) {
      const interval = setInterval(() => {
        const randomIndex = Math.floor(Math.random() * movieGallery.length);
        const heroElement = document.getElementById('hero-background');
        if (heroElement) {
          heroElement.style.backgroundImage = `url(${movieGallery[randomIndex]})`;
        }
      }, 8000);
      return () => clearInterval(interval);
    }
  }, [movieGallery]);

  // Slider functions
  const nextSlide = () => {
    const totalSlides = movieGallery.length;
    const visibleSlides = 3;
    setCurrentSlide(prev => {
      const next = prev + 1;
      return next > Math.max(0, totalSlides - visibleSlides) ? 0 : next;
    });
  };

  const prevSlide = () => {
    const totalSlides = movieGallery.length;
    const visibleSlides = 3;
    setCurrentSlide(prev => {
      const next = prev - 1;
      return next < 0 ? Math.max(0, totalSlides - visibleSlides) : next;
    });
  };

  const openLightbox = (src: string, alt: string) => {
    setLightboxImage({ src, alt });
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    setLightboxImage(null);
    document.body.style.overflow = 'auto';
  };

  // Cerrar lightbox con Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && lightboxImage) {
        closeLightbox();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [lightboxImage]);

  return (
    <>
      <Head>
        <title>Relatos Salvajes - cinenacional.com</title>
        <meta name="description" content="Seis relatos que alternan entre la comedia y el drama, que exploran los temas de la venganza, el amor y la vulnerabilidad del ser humano en situaciones extraordinarias." />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <div className="bg-cine-dark text-white min-h-screen">
        {/* Header/Navigation */}
        <nav className="bg-cine-gray/90 backdrop-blur-lg border-b border-gray-700 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-8">
                <h1 className="text-2xl serif-heading gradient-text">cinenacional.com</h1>
                <div className="hidden md:flex space-x-6">
                  <a href="#" className="hover:text-cine-accent transition-colors">Películas</a>
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

        {/* Movie Hero Background */}
        <div className="relative hero-background-container -mt-16 pt-16">
          {/* Imagen real en lugar de background */}
          {movieGallery.length > 0 && (
            <img 
              src={movieGallery[0]}
              alt="Relatos Salvajes"
              className="hero-image"
            />
          )}
          
          {/* Fade inferior */}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-cine-dark to-transparent z-10"></div>
          {/* Título sobre la imagen */}
          <div className="absolute inset-0 flex items-end justify-start z-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 w-full">
              <h1 className="serif-heading text-5xl md:text-6xl lg:text-7xl text-white leading-tight drop-shadow-2xl">
                Relatos Salvajes
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-gray-200 mt-4">
                <span className="bg-cine-accent/90 px-3 py-1 rounded-full text-sm font-medium text-white backdrop-blur-sm">2014</span>
                <span className="drop-shadow-lg">122 min</span>
                <span className="drop-shadow-lg">Comedia Negra, Drama</span>
                <div className="flex items-center space-x-1">
                  <svg className="w-5 h-5 text-yellow-400 fill-current drop-shadow-lg" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                  </svg>
                  <span className="text-yellow-400 font-bold drop-shadow-lg">8.1</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Movie Content */}
        <div className="bg-cine-dark">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Poster */}
              <div className="lg:col-span-1">
                <div className="aspect-[2/3] rounded-lg overflow-hidden poster-shadow">
                  <div className="movie-placeholder w-full h-full">
                    <svg className="w-16 h-16 text-cine-accent mb-4 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"/>
                    </svg>
                    <p className="text-sm text-gray-400">Afiche no disponible</p>
                  </div>
                </div>
              </div>
              
              {/* Movie Info */}
              <div className="lg:col-span-2 space-y-6">
                <div>
                  <p className="serif-body text-lg text-gray-300 leading-relaxed">
                    Seis relatos que alternan entre la comedia y el drama, que exploran los temas de la venganza, el amor y la vulnerabilidad del ser humano en situaciones extraordinarias. 
                    Una película que retrata la condición humana cuando es llevada al límite.
                  </p>
                </div>

                {/* Director */}
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <h3 className="text-lg font-medium mb-3 text-cine-accent">Dirección</h3>
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-full person-placeholder">
                        <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-white">Damián Szifron</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-4">
                  <button className="bg-cine-accent hover:bg-blue-600 px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2 text-white">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M19 10a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span>Ver Trailer</span>
                  </button>
                  <button className="border border-gray-600 hover:border-cine-accent px-6 py-3 rounded-lg font-medium transition-colors text-white">
                    Compartir
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Technical Info */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cast & Crew */}
            <div className="lg:col-span-2">
              <h2 className="serif-heading text-2xl mb-6 text-white">Reparto y Equipo</h2>
              
              {/* Cast */}
              <div className="mb-8">
                <h3 className="text-lg font-medium mb-4 text-cine-accent">Reparto Principal</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { name: 'Ricardo Darín', character: 'Diego' },
                    { name: 'Érica Rivas', character: 'Romina' },
                    { name: 'Leonardo Sbaraglia', character: 'Cuenca' }
                  ].map((actor, index) => (
                    <div key={index} className="text-center">
                      <div className="w-20 h-20 rounded-full person-placeholder mx-auto mb-2">
                        <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                        </svg>
                      </div>
                      <p className="font-medium text-white">{actor.name}</p>
                      <p className="text-sm text-gray-400">{actor.character}</p>
                    </div>
                  ))}
                </div>
                
                {/* Reparto completo */}
                {showFullCast && (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-4 animate-fade-in">
                    {[
                      { name: 'Oscar Martínez', character: 'Mauricio' },
                      { name: 'Julieta Zylberberg', character: 'Isabel' },
                      { name: 'Rita Cortese', character: 'Cocinera' },
                      { name: 'Darío Grandinetti', character: 'Ariel' },
                      { name: 'María Marull', character: 'Victoria' },
                      { name: 'Mónica Villa', character: 'Novia' },
                      { name: 'Diego Starosta', character: 'Novio' },
                      { name: 'Nancy Dupláa', character: 'Mujer en ruta' },
                      { name: 'Cesar Bordón', character: 'Hombre en ruta' },
                      { name: 'Walter Donado', character: 'Piloto' }
                    ].map((actor, index) => (
                      <div key={index} className="text-center">
                        <div className="w-16 h-16 rounded-full person-placeholder mx-auto mb-2">
                          <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                          </svg>
                        </div>
                        <p className="font-medium text-white text-sm">{actor.name}</p>
                        <p className="text-xs text-gray-400">{actor.character}</p>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="mt-6">
                  <button 
                    onClick={() => setShowFullCast(!showFullCast)}
                    className="text-cine-accent hover:text-blue-300 font-medium transition-colors flex items-center space-x-2"
                  >
                    <span>{showFullCast ? 'Ocultar reparto completo' : 'Ver reparto completo'}</span>
                    <svg 
                      className={`w-4 h-4 transition-transform duration-200 ${showFullCast ? 'rotate-180' : ''}`} 
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                  </button>
                </div>
              </div>

              {/* Crew */}
              <div>
                <h3 className="text-lg font-medium mb-4 text-cine-accent">Equipo Técnico</h3>
                
                {!showFullCrew ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-gray-400 font-medium mb-2">Dirección</h4>
                        <div className="ml-4 space-y-1">
                          <p className="text-white">Damián Szifron</p>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-gray-400 font-medium mb-2">Guión</h4>
                        <div className="ml-4 space-y-1">
                          <p className="text-white">Damián Szifron</p>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-gray-400 font-medium mb-2">Fotografía</h4>
                        <div className="ml-4 space-y-1">
                          <p className="text-white">Javier Juliá</p>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-gray-400 font-medium mb-2">Música</h4>
                        <div className="ml-4 space-y-1">
                          <p className="text-white">Gustavo Santaolalla</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-gray-400 font-medium mb-2">Montaje</h4>
                        <div className="ml-4 space-y-1">
                          <p className="text-white">Pablo Barbieri</p>
                          <p className="text-white">Damián Szifrón</p>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-gray-400 font-medium mb-2">Dirección de Arte</h4>
                        <div className="ml-4 space-y-1">
                          <p className="text-white">Clara Notari</p>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-gray-400 font-medium mb-2">Producción</h4>
                        <div className="ml-4 space-y-1">
                          <p className="text-white">Hugo Sigman</p>
                          <p className="text-white">Matías Mosteirín</p>
                          <p className="text-white">Esther García</p>
                          <p className="text-white">Pedro Almodóvar</p>
                          <p className="text-white">Agustín Almodóvar</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm animate-fade-in">
                    {/* Columna izquierda */}
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-gray-400 font-medium mb-2">Dirección</h4>
                        <div className="ml-4 space-y-1">
                          <div className="flex justify-between">
                            <span className="text-white">Damián Szifrón</span>
                            <span className="text-gray-400 text-xs">Director</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white">Cristian Trebotic</span>
                            <span className="text-gray-400 text-xs">Asistente de Dirección</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white">Natalia Urruty</span>
                            <span className="text-gray-400 text-xs">Asistente de Dirección</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white">Javier Braier</span>
                            <span className="text-gray-400 text-xs">Dirección de casting</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white">Lorena Lisotti</span>
                            <span className="text-gray-400 text-xs">Continuista</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white">Marcello Pozzo</span>
                            <span className="text-gray-400 text-xs">Ayudante de dirección</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white">Agustín Arévalo</span>
                            <span className="text-gray-400 text-xs">2do ayudante de dirección</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white">Lucila Frank</span>
                            <span className="text-gray-400 text-xs">Refuerzo de dirección</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white">Iair Said</span>
                            <span className="text-gray-400 text-xs">Asistente de casting</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white">Katia Szechtman</span>
                            <span className="text-gray-400 text-xs">Asistente de casting</span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-gray-400 font-medium mb-2">Guión</h4>
                        <div className="ml-4 space-y-1">
                          <div className="flex justify-between">
                            <span className="text-white">Damián Szifron</span>
                            <span className="text-gray-400 text-xs">Guionista</span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-gray-400 font-medium mb-2">Fotografía</h4>
                        <div className="ml-4 space-y-1">
                          <div className="flex justify-between">
                            <span className="text-white">Javier Juliá</span>
                            <span className="text-gray-400 text-xs">Director de fotografía</span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-gray-400 font-medium mb-2">Música</h4>
                        <div className="ml-4 space-y-1">
                          <div className="flex justify-between">
                            <span className="text-white">Gustavo Santaolalla</span>
                            <span className="text-gray-400 text-xs">Compositor</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Columna derecha */}
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-gray-400 font-medium mb-2">Producción</h4>
                        <div className="ml-4 space-y-1">
                          <div className="flex justify-between">
                            <span className="text-white">Matías Mosteirín</span>
                            <span className="text-gray-400 text-xs">Producción</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white">Esther García</span>
                            <span className="text-gray-400 text-xs">Producción</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white">Hugo Sigman</span>
                            <span className="text-gray-400 text-xs">Producción</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white">Pedro Almodóvar</span>
                            <span className="text-gray-400 text-xs">Producción</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white">Agustín Almodóvar</span>
                            <span className="text-gray-400 text-xs">Producción</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white">Claudio F. Belocopitt</span>
                            <span className="text-gray-400 text-xs">Productor asociado</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white">Gerardo Rozín</span>
                            <span className="text-gray-400 text-xs">Productor asociado</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white">Leticia Cristi</span>
                            <span className="text-gray-400 text-xs">Producción ejecutiva</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white">Pola Zito</span>
                            <span className="text-gray-400 text-xs">Producción ejecutiva</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white">Analía Castro</span>
                            <span className="text-gray-400 text-xs">Jefe de Producción</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white">Axel Kuschevatzky</span>
                            <span className="text-gray-400 text-xs">Coproducción</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white">Carolina Agunin</span>
                            <span className="text-gray-400 text-xs">Coordinación de producción</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white">Covadonga R. Gamboa</span>
                            <span className="text-gray-400 text-xs">Jefe de Producción</span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-gray-400 font-medium mb-2">Montaje</h4>
                        <div className="ml-4 space-y-1">
                          <div className="flex justify-between">
                            <span className="text-white">Pablo Barbieri</span>
                            <span className="text-gray-400 text-xs">Editor</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white">Damián Szifrón</span>
                            <span className="text-gray-400 text-xs">Editor</span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-gray-400 font-medium mb-2">Dirección de Arte</h4>
                        <div className="ml-4 space-y-1">
                          <div className="flex justify-between">
                            <span className="text-white">Clara Notari</span>
                            <span className="text-gray-400 text-xs">Dirección de arte</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white">Ruth Fischerman</span>
                            <span className="text-gray-400 text-xs">Vestuario</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white">Marisa Amenta</span>
                            <span className="text-gray-400 text-xs">Maquillaje</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="mt-6">
                  <button 
                    onClick={() => setShowFullCrew(!showFullCrew)}
                    className="text-cine-accent hover:text-blue-300 font-medium transition-colors flex items-center space-x-2"
                  >
                    <span>{showFullCrew ? 'Ocultar equipo técnico completo' : 'Ver equipo técnico completo'}</span>
                    <svg 
                      className={`w-4 h-4 transition-transform duration-200 ${showFullCrew ? 'rotate-180' : ''}`} 
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Sidebar Info */}
            <div className="lg:col-span-1">
              <div className="glass-effect rounded-lg p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4 text-cine-accent">Información</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start">
                      <span className="text-gray-400 w-32 flex-shrink-0">Año:</span>
                      <span className="ml-2 text-white">2014</span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-gray-400 w-32 flex-shrink-0">Duración:</span>
                      <span className="ml-2 text-white">122 min</span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-gray-400 w-32 flex-shrink-0">País coproductor:</span>
                      <span className="ml-2 text-white">Argentina</span>
                    </div>
                    <div className="flex items-start">
                      <span className="text-gray-400 w-32 flex-shrink-0">Calificación:</span>
                      <span className="ml-2 text-white">Solo apta para mayor de 16 años</span>
                    </div>
                    <div className="flex justify-end">
                      <span className="text-white">Color | Sonora</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-4 text-cine-accent">Géneros</h3>
                  <div className="flex flex-wrap gap-2">
                    <span className="bg-cine-gray px-3 py-1 rounded-full text-sm text-white">Comedia Negra</span>
                    <span className="bg-cine-gray px-3 py-1 rounded-full text-sm text-white">Drama</span>
                    <span className="bg-cine-gray px-3 py-1 rounded-full text-sm text-white">Thriller</span>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-4 text-cine-accent">Temas</h3>
                  <div className="flex flex-wrap gap-2">
                    <span className="bg-cine-gray px-3 py-1 rounded-full text-sm text-white">Accidente automovilístico</span>
                    <span className="bg-cine-gray px-3 py-1 rounded-full text-sm text-white">Aviones</span>
                    <span className="bg-cine-gray px-3 py-1 rounded-full text-sm text-white">Casamiento</span>
                    <span className="bg-cine-gray px-3 py-1 rounded-full text-sm text-white">Cocinero</span>
                    <span className="bg-cine-gray px-3 py-1 rounded-full text-sm text-white">Ruta</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Image Gallery */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-gray-800">
          <h2 className="serif-heading text-2xl text-white mb-6">Galería de Imágenes</h2>
          <div className="relative">
            <div className="overflow-hidden">
              <div 
                className="flex transition-transform duration-500 ease-in-out"
                style={{transform: `translateX(-${currentSlide * (100 / 3)}%)`}}
              >
                {movieGallery.length > 0 ? (
                  movieGallery.map((imageSrc, index) => (
                    <div key={index} className="flex-shrink-0 w-1/3 px-2">
                      <div 
                        className="group cursor-pointer relative overflow-hidden rounded-lg aspect-video bg-cine-gray"
                        onClick={() => openLightbox(imageSrc, `Imagen ${index + 1} - Relatos Salvajes`)}
                      >
                        <img 
                          src={imageSrc}
                          alt={`Imagen ${index + 1} - Relatos Salvajes`}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=800&fit=crop&auto=format';
                          }}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300"></div>
                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <p className="text-white text-sm font-medium">Imagen {index + 1}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex-shrink-0 w-1/3 px-2">
                    <div className="group cursor-pointer relative overflow-hidden rounded-lg aspect-video bg-cine-gray">
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="text-center">
                          <svg className="w-8 h-8 text-cine-accent mx-auto mb-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                          </svg>
                          <p className="text-sm text-gray-400">Cargando imágenes...</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Navigation arrows */}
            <button 
              onClick={prevSlide}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 bg-cine-gray/90 hover:bg-cine-accent text-white p-3 rounded-full transition-colors duration-300 backdrop-blur-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
              </svg>
            </button>
            <button 
              onClick={nextSlide}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 bg-cine-gray/90 hover:bg-cine-accent text-white p-3 rounded-full transition-colors duration-300 backdrop-blur-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </button>
          </div>
        </div>
        {/* Trailer */}
        <TrailerSection 
          trailerUrl="https://www.youtube.com/watch?v=Wm7DU4FBBVs" 
          movieTitle="Relatos Salvajes"
        />

        {/* Similar Movies */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-gray-800">
          <h2 className="serif-heading text-2xl text-white mb-6">Películas Similares</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[
              { title: 'El Secreto de sus Ojos', year: '2009' },
              { title: 'Nueve Reinas', year: '2000' },
              { title: 'El Hijo de la Novia', year: '2001' },
              { title: 'La Historia Oficial', year: '1985' }
            ].map((movie, index) => (
              <div key={index} className="group cursor-pointer">
                <div className="aspect-[2/3] rounded-lg overflow-hidden mb-2 transform group-hover:scale-105 transition-transform">
                  <div className="placeholder-small w-full h-full">
                    <svg className="w-8 h-8 text-gray-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"/>
                    </svg>
                    <p className="text-xs text-gray-400 text-center">Sin imagen</p>
                  </div>
                </div>
                <p className="text-sm font-medium text-white">{movie.title}</p>
                <p className="text-xs text-gray-400">{movie.year}</p>
              </div>
            ))}
          </div>
        </div>

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
                  {/* X (Twitter) */}
                  <a href="#" className="text-gray-400 hover:text-cine-accent transition-colors">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                  </a>
                  {/* Instagram */}
                  <a href="#" className="text-gray-400 hover:text-cine-accent transition-colors">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12.017 0C8.396 0 7.989.013 6.756.072 5.524.13 4.723.209 4.02.396c-.719.195-1.33.481-1.944.903-.614.422-1.141.824-1.564 1.438-.391.615-.677 1.226-.872 1.945C.187 5.478.108 6.279.05 7.511.013 8.744 0 9.151 0 12.017c0 2.867.013 3.273.072 4.506.058 1.232.137 2.033.324 2.736.195.719.48 1.33.903 1.944.421.614.823 1.141 1.437 1.564.615.391 1.226.677 1.945.872.703.187 1.504.266 2.736.324C8.744 23.987 9.151 24 12.017 24c2.867 0 3.273-.013 4.506-.072 1.232-.058 2.033-.137 2.736-.324.719-.195 1.33-.48 1.944-.903.614-.421 1.141-.823 1.564-1.437.391-.615.677-1.226.872-1.945.187-.703.266-1.504.324-2.736C23.987 15.256 24 14.849 24 11.983c0-2.867-.013-3.273-.072-4.506-.058-1.232-.137-2.033-.324-2.736-.195-.719-.48-1.33-.903-1.944-.421-.614-.823-1.141-1.437-1.564-.615-.391-1.226-.677-1.945-.872-.703-.187-1.504-.266-2.736-.324C15.256.013 14.849 0 11.983 0h.034zm-.717 2.169c.67-.003 1.257-.003 2.234-.003 2.822 0 3.156.011 4.27.067 1.03.047 1.589.218 1.96.362.493.192.845.422 1.215.792.37.37.6.722.792 1.215.144.371.315.93.362 1.96.056 1.114.067 1.448.067 4.27 0 2.822-.011 3.156-.067 4.27-.047 1.03-.218 1.589-.362 1.96-.192.493-.422.845-.792 1.215-.37.37-.722.6-1.215.792-.371.144-.93.315-1.96.362-1.114.056-1.448.067-4.27.067-2.822 0-3.156-.011-4.27-.067-1.03-.047-1.589-.218-1.96-.362-.493-.192-.845-.422-1.215-.792-.37-.37-.6-.722-.792-1.215-.144-.371-.315-.93-.362-1.96-.056-1.114-.067-1.448-.067-4.27 0-2.822.011-3.156.067-4.27.047-1.03.218-1.589.362-1.96.192-.493.422-.845.792-1.215.37-.37.722-.6 1.215-.792.371-.144.93-.315 1.96-.362 1.114-.056 1.448-.067 4.27-.067zm0 3.623c-2.986 0-5.406 2.42-5.406 5.406 0 2.986 2.42 5.406 5.406 5.406 2.986 0 5.406-2.42 5.406-5.406 0-2.986-2.42-5.406-5.406-5.406zm0 8.913c-1.937 0-3.507-1.57-3.507-3.507 0-1.937 1.57-3.507 3.507-3.507 1.937 0 3.507 1.57 3.507 3.507 0 1.937-1.57 3.507-3.507 3.507zM18.448 4.155c0 .698-.566 1.264-1.264 1.264-.698 0-1.264-.566-1.264-1.264 0-.698.566-1.264 1.264-1.264.698 0 1.264.566 1.264 1.264z"/>
                    </svg>
                  </a>
                  {/* Facebook */}
                  <a href="#" className="text-gray-400 hover:text-cine-accent transition-colors">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </a>
                  {/* YouTube */}
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

        {/* Lightbox Modal */}
        {lightboxImage && (
          <div 
            className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 opacity-0 invisible transition-all duration-300 animate-fade-in"
            style={{opacity: 1, visibility: 'visible'}}
            onClick={(e) => e.target === e.currentTarget && closeLightbox()}
          >
            <div className="relative max-w-4xl max-h-[90vh] transform scale-80 transition-transform duration-300"
                 style={{transform: 'scale(1)'}}>
              <button 
                onClick={closeLightbox}
                className="absolute -top-10 right-0 bg-black/50 hover:bg-cine-accent text-white text-2xl w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-300"
              >
                ×
              </button>
              <img 
                src={lightboxImage.src} 
                alt={lightboxImage.alt}
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              />
              <div className="absolute -bottom-12 left-0 right-0 text-center">
                <p className="text-white text-base font-medium">{lightboxImage.alt}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}