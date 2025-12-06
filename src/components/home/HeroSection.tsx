// src/components/home/HeroSection.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface HeroImage {
  id: number;
  cloudinaryPublicId: string;
  type: string;
  movie: {
    id: number;
    title: string;
    releaseYear: number | null;
    slug: string;
  } | null;
  people: Array<{
    position: number;
    person: {
      id: number;
      firstName: string | null;
      lastName: string | null;
    };
  }>;
}

interface HeroSectionProps {
  images: HeroImage[];
}

// Generar URL de Cloudinary optimizada para hero (sin crop forzado)
function getHeroImageUrl(publicId: string): string {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  return `https://res.cloudinary.com/${cloudName}/image/upload/w_1280,q_auto,f_auto/${publicId}`;
}

// Generar caption para la imagen
function generateCaption(image: HeroImage): string {
  const parts: string[] = [];

  if (image.people && image.people.length > 0) {
    const sortedPeople = [...image.people].sort((a, b) => a.position - b.position);
    const names = sortedPeople
      .map(ip => {
        const { firstName, lastName } = ip.person;
        return [firstName, lastName].filter(Boolean).join(' ');
      })
      .filter(Boolean);

    if (names.length === 1) {
      parts.push(names[0]);
    } else if (names.length === 2) {
      parts.push(`${names[0]} y ${names[1]}`);
    } else if (names.length > 2) {
      const lastPerson = names.pop();
      parts.push(`${names.join(', ')} y ${lastPerson}`);
    }
  }

  if (image.movie) {
    const movieRef = image.movie.releaseYear 
      ? `${image.movie.title} (${image.movie.releaseYear})`
      : image.movie.title;
    
    if (parts.length > 0) {
      parts.push(`en ${movieRef}`);
    } else {
      parts.push(movieRef);
    }
  }

  return parts.join(' ') || '';
}

export default function HeroSection({ images }: HeroSectionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (images.length <= 1) return;

    const interval = setInterval(() => {
      setIsTransitioning(true);
      
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % images.length);
        setIsTransitioning(false);
      }, 500);
    }, 15000);

    return () => clearInterval(interval);
  }, [images.length]);

  if (!images || images.length === 0) return null;

  const currentImage = images[currentIndex];
  const nextIndex = (currentIndex + 1) % images.length;
  const nextImage = images[nextIndex];

  return (
    <div className="relative bg-cine-dark -mt-16 pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative">
          {/* Contenedor de imagen */}
          <div className="relative flex items-center justify-center max-h-[500px] overflow-hidden rounded-lg">
            {/* Imagen actual */}
            <img
              key={`current-${currentIndex}`}
              src={getHeroImageUrl(currentImage.cloudinaryPublicId)}
              alt={generateCaption(currentImage)}
              className={`max-w-full max-h-[500px] object-contain transition-opacity duration-500 ${
                isTransitioning ? 'opacity-0' : 'opacity-100'
              }`}
            />
            
            {/* Imagen siguiente */}
            {images.length > 1 && (
              <img
                key={`next-${nextIndex}`}
                src={getHeroImageUrl(nextImage.cloudinaryPublicId)}
                alt={generateCaption(nextImage)}
                className={`absolute max-w-full max-h-[500px] object-contain transition-opacity duration-500 ${
                  isTransitioning ? 'opacity-100' : 'opacity-0'
                }`}
              />
            )}

            {/* Gradientes en los 4 bordes */}
            {/* Izquierda */}
            <div 
              className="absolute left-0 top-0 bottom-0 w-1/4 pointer-events-none"
              style={{
                background: 'linear-gradient(90deg, #0f1419 0%, rgba(15,20,25,0.8) 30%, rgba(15,20,25,0.4) 60%, transparent 100%)'
              }}
            />
            
            {/* Derecha */}
            <div 
              className="absolute right-0 top-0 bottom-0 w-1/4 pointer-events-none"
              style={{
                background: 'linear-gradient(270deg, #0f1419 0%, rgba(15,20,25,0.8) 30%, rgba(15,20,25,0.4) 60%, transparent 100%)'
              }}
            />
            
            {/* Arriba */}
            <div 
              className="absolute top-0 left-0 right-0 h-1/4 pointer-events-none"
              style={{
                background: 'linear-gradient(180deg, #0f1419 0%, rgba(15,20,25,0.7) 40%, transparent 100%)'
              }}
            />
            
            {/* Abajo */}
            <div 
              className="absolute bottom-0 left-0 right-0 h-1/3 pointer-events-none"
              style={{
                background: 'linear-gradient(0deg, #0f1419 0%, rgba(15,20,25,0.8) 40%, rgba(15,20,25,0.4) 70%, transparent 100%)'
              }}
            />

            {/* Viñeta sutil */}
            <div 
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse at center, transparent 50%, rgba(15,20,25,0.3) 100%)'
              }}
            />
          </div>

          {/* Caption y controles */}
          <div className="flex items-center justify-between mt-2">
            {/* Indicadores de posición */}
            {images.length > 1 && (
              <div className="flex gap-2">
                {images.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      if (idx !== currentIndex) {
                        setIsTransitioning(true);
                        setTimeout(() => {
                          setCurrentIndex(idx);
                          setIsTransitioning(false);
                        }, 300);
                      }
                    }}
                    className={`h-1.5 rounded-full transition-all ${
                      idx === currentIndex 
                        ? 'bg-white w-6' 
                        : 'bg-white/40 hover:bg-white/60 w-1.5'
                    }`}
                    aria-label={`Ir a imagen ${idx + 1}`}
                  />
                ))}
              </div>
            )}

            {/* Caption */}
            <div className="text-right">
              {currentImage.movie ? (
                <Link 
                  href={`/pelicula/${currentImage.movie.slug}`}
                  className="text-xs text-gray-400 hover:text-white transition-colors"
                >
                  {generateCaption(currentImage)}
                </Link>
              ) : (
                <p className="text-xs text-gray-400">
                  {generateCaption(currentImage)}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}