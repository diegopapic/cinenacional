'use client';

import { useState, useEffect } from 'react';

interface ImageGalleryProps {
  images: string[];
  movieTitle: string;
}

export function ImageGallery({ images, movieTitle }: ImageGalleryProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [lightboxImage, setLightboxImage] = useState<{ src: string, alt: string, index: number } | null>(null);

  // Slider functions
  const nextSlide = () => {
    const totalSlides = images.length;
    const visibleSlides = 3;
    setCurrentSlide(prev => {
      const next = prev + 1;
      return next > Math.max(0, totalSlides - visibleSlides) ? 0 : next;
    });
  };

  const prevSlide = () => {
    const totalSlides = images.length;
    const visibleSlides = 3;
    setCurrentSlide(prev => {
      const next = prev - 1;
      return next < 0 ? Math.max(0, totalSlides - visibleSlides) : next;
    });
  };

  const openLightbox = (src: string, alt: string, index: number) => {
    setLightboxImage({ src, alt, index });
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    setLightboxImage(null);
    document.body.style.overflow = 'auto';
  };

  // Navegación en el lightbox
  const navigateLightbox = (direction: 'prev' | 'next') => {
    if (!lightboxImage || images.length === 0) return;

    let newIndex: number;
    if (direction === 'next') {
      newIndex = (lightboxImage.index + 1) % images.length;
    } else {
      newIndex = lightboxImage.index === 0 ? images.length - 1 : lightboxImage.index - 1;
    }

    setLightboxImage({
      src: images[newIndex],
      alt: `Imagen ${newIndex + 1} - ${movieTitle}`,
      index: newIndex
    });
  };

  // Cerrar lightbox con Escape y navegar con flechas
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!lightboxImage) return;

      switch (e.key) {
        case 'Escape':
          closeLightbox();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          navigateLightbox('prev');
          break;
        case 'ArrowRight':
          e.preventDefault();
          navigateLightbox('next');
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [lightboxImage, images]);

  return (
    <>
      <div className="relative">
        <div className="overflow-hidden">
          <div
            className="flex transition-transform duration-500 ease-in-out"
            style={{ transform: `translateX(-${currentSlide * (100 / 3)}%)` }}
          >
            {images.length > 0 ? (
              images.map((imageSrc, index) => (
                <div key={index} className="flex-shrink-0 w-1/3 px-2">
                  <div
                    className="group cursor-pointer relative overflow-hidden rounded-lg aspect-video bg-cine-gray"
                    onClick={() => openLightbox(imageSrc, `Imagen ${index + 1} - ${movieTitle}`, index)}
                  >
                    <img
                      src={imageSrc}
                      alt={`Imagen ${index + 1} - ${movieTitle}`}
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
        {images.length > 3 && (
          <>
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
          </>
        )}
      </div>

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 opacity-0 invisible transition-all duration-300 animate-fade-in"
          style={{ opacity: 1, visibility: 'visible' }}
          onClick={(e) => e.target === e.currentTarget && closeLightbox()}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full px-4 flex items-center justify-center">
            {/* Flecha izquierda */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigateLightbox('prev');
              }}
              className="absolute left-4 md:left-8 bg-black/50 hover:bg-cine-accent text-white p-3 rounded-full transition-all duration-300 z-10 hover:scale-110"
              aria-label="Imagen anterior"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
              </svg>
            </button>

            {/* Contenedor de imagen */}
            <div className="relative max-w-full max-h-[90vh] transform scale-80 transition-transform duration-300"
              style={{ transform: 'scale(1)' }}>
              <button
                onClick={closeLightbox}
                className="absolute -top-10 right-0 bg-black/50 hover:bg-cine-accent text-white text-2xl w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-300"
              >
                ×
              </button>
              <img
                src={lightboxImage.src}
                alt={lightboxImage.alt}
                className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
              />
              <div className="absolute -bottom-12 left-0 right-0 text-center">
                <p className="text-white text-base font-medium">{lightboxImage.alt}</p>
                <p className="text-gray-400 text-sm mt-1">{lightboxImage.index + 1} de {images.length}</p>
              </div>
            </div>

            {/* Flecha derecha */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigateLightbox('next');
              }}
              className="absolute right-4 md:right-8 bg-black/50 hover:bg-cine-accent text-white p-3 rounded-full transition-all duration-300 z-10 hover:scale-110"
              aria-label="Imagen siguiente"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}