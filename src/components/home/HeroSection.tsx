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
    year: number | null;
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
  return `https://res.cloudinary.com/${cloudName}/image/upload/w_1920,q_auto,f_auto/${publicId}`;
}

function getDisplayYear(movie: HeroImage['movie']): number | null {
  if (!movie) return null;
  if (movie.year && movie.year > 0) return movie.year;
  if (movie.releaseYear && movie.releaseYear > 0) return movie.releaseYear;
  return null;
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
    const displayYear = getDisplayYear(image.movie);
    const movieRef = displayYear
      ? `${image.movie.title} (${displayYear})`
      : image.movie.title;

    if (parts.length > 0) {
      parts.push(`en ${movieRef}`);
    } else {
      parts.push(movieRef);
    }
  }

  return parts.join(' ') || '';
}

/**
 * Estilo de máscara CSS que funde los 4 bordes de la imagen con el fondo.
 * Usa mask-image con dos gradientes (horizontal + vertical) intersectados.
 * Así la máscara siempre se aplica al bounding box real de la imagen,
 * sin importar su tamaño o proporción.
 */
const fadeMaskStyle: React.CSSProperties = {
  maskImage: [
    'linear-gradient(to right, transparent, black 18%, black 82%, transparent)',
    'linear-gradient(to bottom, transparent, black 12%, black 88%, transparent)',
  ].join(', '),
  WebkitMaskImage: [
    'linear-gradient(to right, transparent, black 18%, black 82%, transparent)',
    'linear-gradient(to bottom, transparent, black 12%, black 88%, transparent)',
  ].join(', '),
  maskComposite: 'intersect' as const,
  WebkitMaskComposite: 'source-in' as const,
};

export default function HeroSection({ images }: HeroSectionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 6000);

    return () => clearInterval(interval);
  }, [images.length]);

  if (!images || images.length === 0) return null;

  const currentImage = images[currentIndex];

  return (
    <section className="relative h-[50vh] md:h-[60vh] lg:h-[70vh] w-full overflow-hidden bg-background">
      {/* Slides */}
      {images.map((image, idx) => (
        <div
          key={image.id}
          className="absolute inset-0 flex items-center justify-center transition-opacity duration-1000"
          style={{ opacity: idx === currentIndex ? 1 : 0 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getHeroImageUrl(image.cloudinaryPublicId)}
            alt={generateCaption(image)}
            className="max-w-full max-h-full w-auto h-auto object-contain"
            style={fadeMaskStyle}
            {...(idx === 0 ? { fetchPriority: 'high' as const } : {})}
          />
        </div>
      ))}

      {/* Gradiente inferior global para el caption */}
      <div className="absolute inset-0 z-[2] bg-gradient-to-t from-background via-background/40 to-transparent pointer-events-none" />

      {/* Caption + dots */}
      <div className="absolute inset-x-0 bottom-0 z-10">
        <div className="mx-auto w-full max-w-7xl px-4 lg:px-6 pb-6 md:pb-8">
          <div className="flex items-end justify-between gap-4">
            {/* Caption */}
            <div>
              {currentImage.movie ? (
                <Link
                  href={`/pelicula/${currentImage.movie.slug}`}
                  className="text-[13px] md:text-sm leading-snug text-muted-foreground/50 transition-colors hover:text-accent"
                >
                  {generateCaption(currentImage)}
                </Link>
              ) : (
                <p className="text-[13px] md:text-sm leading-snug text-muted-foreground/50">
                  {generateCaption(currentImage)}
                </p>
              )}
            </div>

            {/* Dots */}
            {images.length > 1 && (
              <div className="flex gap-2">
                {images.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    className={`transition-all ${
                      idx === currentIndex
                        ? 'h-1.5 w-5 rounded-full bg-accent/70'
                        : 'h-1.5 w-1.5 rounded-full bg-foreground/20 hover:bg-foreground/40'
                    }`}
                    aria-label={`Ir a imagen ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
