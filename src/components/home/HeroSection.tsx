// src/components/home/HeroSection.tsx
'use client';

import { useEffect, useState } from 'react';
import { HeroMovie } from '@/types/home.types';

interface HeroSectionProps {
  peliculas: HeroMovie[];
}

export default function HeroSection({ peliculas }: HeroSectionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

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
          displayWidth = containerWidth;
          displayHeight = containerWidth / imgAspectRatio;
        } else {
          displayHeight = containerHeight;
          displayWidth = containerHeight * imgAspectRatio;
        }

        gradientsContainer.style.width = `${displayWidth}px`;
        gradientsContainer.style.height = `${displayHeight}px`;
        gradientsContainer.style.left = `${(containerWidth - displayWidth) / 2}px`;
        gradientsContainer.style.top = `${(containerHeight - displayHeight) / 2}px`;
      }
    };

    const img = document.querySelector('.hero-image') as HTMLImageElement;
    if (img) {
      img.addEventListener('load', adjustGradients);
      window.addEventListener('resize', adjustGradients);
      if (img.complete) adjustGradients();
    }

    return () => {
      if (img) img.removeEventListener('load', adjustGradients);
      window.removeEventListener('resize', adjustGradients);
    };
  }, [currentIndex]);

  useEffect(() => {
    if (peliculas.length > 0) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % peliculas.length);
      }, 8000);
      return () => clearInterval(interval);
    }
  }, [peliculas.length]);

  const peliculaActual = peliculas[currentIndex];

  if (!peliculaActual) return null;

  return (
    <div className="relative hero-background-container -mt-16 pt-16">
      <div className="hero-image-wrapper">
        <img
          src={peliculaActual.imagen}
          alt="Imagen destacada del cine argentino"
          className="hero-image"
        />
        <div className="hero-gradients-container">
          <div className="hero-gradient-left"></div>
          <div className="hero-gradient-right"></div>
          <div className="hero-gradient-top"></div>
          <div className="hero-gradient-bottom-inner"></div>
          
          <div className="absolute bottom-4 right-4 z-20">
            <p className="text-xs text-gray-400 drop-shadow-lg">
              {peliculaActual.titulo} ({peliculaActual.año})
            </p>
          </div>
        </div>
      </div>
      <div className="hero-gradient-bottom"></div>
      <div className="hero-vignette"></div>
    </div>
  );
}