'use client';

import { useEffect } from 'react';

interface MovieHeroProps {
  title: string;
  year: number;
  duration: number;
  genres: string[];
  gallery: string[];
}

export function MovieHero({ title, year, duration, genres, rating, gallery }: MovieHeroProps) {
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
  }, [gallery]);

  // Cambiar fondo cada 8 segundos
  useEffect(() => {
    if (gallery.length > 0) {
      const interval = setInterval(() => {
        const randomIndex = Math.floor(Math.random() * gallery.length);
        const heroElement = document.querySelector('.hero-image');
        if (heroElement) {
          (heroElement as HTMLImageElement).src = gallery[randomIndex];
        }
      }, 8000);
      return () => clearInterval(interval);
    }
  }, [gallery]);

  // Función para formatear géneros
  const formatGenres = (genres: string[]) => {
    return genres.join(', ');
  };

  return (
    <div className="relative hero-background-container -mt-16 pt-16">
      {/* Wrapper de imagen con gradientes */}
      <div className="hero-image-wrapper">
        {gallery.length > 0 && (
          <>
            <img 
              src={gallery[0]}
              alt={title}
              className="hero-image"
            />
            {/* Contenedor de gradientes que se ajusta a la imagen */}
            <div className="hero-gradients-container">
              <div className="hero-gradient-left"></div>
              <div className="hero-gradient-right"></div>
              <div className="hero-gradient-top"></div>
              <div className="hero-gradient-bottom-inner"></div>
            </div>
          </>
        )}
      </div>
      
      {/* Gradientes globales del contenedor */}
      <div className="hero-gradient-bottom"></div>
      <div className="hero-vignette"></div>
      
      {/* Contenido */}
      <div className="hero-content">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 w-full">
          <h1 className="serif-heading text-5xl md:text-6xl lg:text-7xl text-white leading-tight drop-shadow-2xl">
            {title}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-gray-200 mt-4">
            <span className="bg-cine-accent/90 px-3 py-1 rounded-full text-sm font-medium text-white backdrop-blur-sm">
              {year}
            </span>
            <span className="drop-shadow-lg">{duration} min</span>
            <span className="drop-shadow-lg">{formatGenres(genres)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}