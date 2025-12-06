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

function getHeroImageUrl(publicId: string): string {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  return `https://res.cloudinary.com/${cloudName}/image/upload/w_1280,q_auto,f_auto/${publicId}`;
}

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

function HeroImageWithGradients({ 
  image, 
  isVisible 
}: { 
  image: HeroImage; 
  isVisible: boolean;
}) {
  return (
    <div 
      className={`absolute inset-0 flex items-center justify-center transition-opacity duration-500 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Wrapper relativo a la imagen */}
      <div className="relative inline-block max-h-[500px]">
        <img
          src={getHeroImageUrl(image.cloudinaryPublicId)}
          alt={generateCaption(image)}
          className="max-w-full max-h-[500px] block"
        />
        
        {/* Gradientes relativos a la imagen */}
        <div 
          className="absolute left-0 top-0 bottom-0 w-1/4 pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, #0f1419 0%, rgba(15,20,25,0.7) 40%, transparent 100%)'
          }}
        />
        
        <div 
          className="absolute right-0 top-0 bottom-0 w-1/4 pointer-events-none"
          style={{
            background: 'linear-gradient(270deg, #0f1419 0%, rgba(15,20,25,0.7) 40%, transparent 100%)'
          }}
        />
        
        <div 
          className="absolute top-0 left-0 right-0 h-1/4 pointer-events-none"
          style={{
            background: 'linear-gradient(180deg, #0f1419 0%, rgba(15,20,25,0.6) 50%, transparent 100%)'
          }}
        />
        
        <div 
          className="absolute bottom-0 left-0 right-0 h-1/3 pointer-events-none"
          style={{
            background: 'linear-gradient(0deg, #0f1419 0%, rgba(15,20,25,0.7) 50%, transparent 100%)'
          }}
        />

        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 40%, rgba(15,20,25,0.3) 100%)'
          }}
        />
      </div>
    </div>
  );
}

export default function HeroSection({ images }: HeroSectionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 15000);

    return () => clearInterval(interval);
  }, [images.length]);

  if (!images || images.length === 0) return null;

  const currentImage = images[currentIndex];

  return (
    <div className="relative bg-cine-dark -mt-16 pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative">
          {/* Contenedor con fondo negro */}
          <div className="relative h-[500px] overflow-hidden rounded-lg bg-[#0f1419]">
            {images.map((image, idx) => (
              <HeroImageWithGradients
                key={image.id}
                image={image}
                isVisible={idx === currentIndex}
              />
            ))}
          </div>

          {/* Caption y controles */}
          <div className="flex items-center justify-between mt-2">
            {images.length > 1 && (
              <div className="flex gap-2">
                {images.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
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