// src/components/home/HeroSection.tsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';

interface HeroImage {
  id: number;
  cloudinaryPublicId: string;
  type: string;
  movie: {
    id: number;
    title: string;
    year: number | null;        // Año de producción (prioridad)
    releaseYear: number | null; // Año de estreno (fallback)
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

interface ImageBounds {
  top: number;
  left: number;
  width: number;
  height: number;
}

function getHeroImageUrl(publicId: string): string {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  return `https://res.cloudinary.com/${cloudName}/image/upload/w_1920,q_auto,f_auto/${publicId}`;
}

/**
 * Obtiene el año a mostrar para una película.
 * Prioridad: año de producción (year) > año de estreno (releaseYear)
 * Retorna null si ambos están vacíos o son 0
 */
function getDisplayYear(movie: HeroImage['movie']): number | null {
  if (!movie) return null;

  // Prioridad 1: año de producción
  if (movie.year && movie.year > 0) {
    return movie.year;
  }

  // Prioridad 2: año de estreno
  if (movie.releaseYear && movie.releaseYear > 0) {
    return movie.releaseYear;
  }

  // Ninguno disponible
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
 * Calcula el rect real de una imagen con object-fit: contain
 * dentro de su contenedor.
 */
function getContainedImageBounds(
  containerWidth: number,
  containerHeight: number,
  naturalWidth: number,
  naturalHeight: number
): ImageBounds {
  const containerRatio = containerWidth / containerHeight;
  const imageRatio = naturalWidth / naturalHeight;

  let renderWidth: number;
  let renderHeight: number;

  if (imageRatio > containerRatio) {
    // Imagen más ancha proporcionalmente → limitada por ancho
    renderWidth = containerWidth;
    renderHeight = containerWidth / imageRatio;
  } else {
    // Imagen más alta proporcionalmente → limitada por alto
    renderHeight = containerHeight;
    renderWidth = containerHeight * imageRatio;
  }

  // No agrandar más allá del tamaño natural
  if (renderWidth > naturalWidth) {
    renderWidth = naturalWidth;
    renderHeight = naturalWidth / imageRatio;
  }

  const left = (containerWidth - renderWidth) / 2;
  const top = (containerHeight - renderHeight) / 2;

  return { top, left, width: renderWidth, height: renderHeight };
}

const GRADIENT_LEFT = 'linear-gradient(to right, #0a0f14 0%, rgba(10,15,20,0.95) 10%, rgba(10,15,20,0.82) 25%, rgba(10,15,20,0.6) 45%, rgba(10,15,20,0.35) 65%, rgba(10,15,20,0.12) 82%, transparent 100%)';
const GRADIENT_RIGHT = 'linear-gradient(to left, #0a0f14 0%, rgba(10,15,20,0.95) 10%, rgba(10,15,20,0.82) 25%, rgba(10,15,20,0.6) 45%, rgba(10,15,20,0.35) 65%, rgba(10,15,20,0.12) 82%, transparent 100%)';
const GRADIENT_TOP = 'linear-gradient(to bottom, #0a0f14 0%, rgba(10,15,20,0.85) 20%, rgba(10,15,20,0.5) 50%, rgba(10,15,20,0.15) 75%, transparent 100%)';
const GRADIENT_BOTTOM = 'linear-gradient(to top, #0a0f14 0%, rgba(10,15,20,0.95) 15%, rgba(10,15,20,0.75) 35%, rgba(10,15,20,0.45) 55%, rgba(10,15,20,0.15) 75%, transparent 100%)';

export default function HeroSection({ images }: HeroSectionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [bounds, setBounds] = useState<ImageBounds | null>(null);
  const containerRef = useRef<HTMLElement>(null);
  const imgRefs = useRef<Map<number, HTMLImageElement>>(new Map());

  const recalcBounds = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const img = imgRefs.current.get(currentIndex);
    if (!img || !img.naturalWidth) return;

    const newBounds = getContainedImageBounds(
      container.clientWidth,
      container.clientHeight,
      img.naturalWidth,
      img.naturalHeight
    );
    setBounds(newBounds);
  }, [currentIndex]);

  // Recalcular cuando cambia la imagen activa
  useEffect(() => {
    recalcBounds();
  }, [recalcBounds]);

  // Recalcular en resize
  useEffect(() => {
    const onResize = () => recalcBounds();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [recalcBounds]);

  // Auto-rotate
  useEffect(() => {
    if (images.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 6000);

    return () => clearInterval(interval);
  }, [images.length]);

  if (!images || images.length === 0) return null;

  const currentImage = images[currentIndex];

  // Ancho del gradiente lateral: 25% del ancho de la imagen, mínimo 80px
  const gradientW = bounds ? Math.max(bounds.width * 0.25, 80) : 0;
  const gradientH = bounds ? Math.max(bounds.height * 0.35, 60) : 0;

  return (
    <section
      ref={containerRef}
      className="relative h-[50vh] md:h-[60vh] lg:h-[70vh] w-full overflow-hidden bg-background"
    >
      {/* Slides */}
      {images.map((image, idx) => (
        <div
          key={image.id}
          className="absolute inset-0 flex items-center justify-center transition-opacity duration-1000"
          style={{ opacity: idx === currentIndex ? 1 : 0 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={(el) => {
              if (el) imgRefs.current.set(idx, el);
            }}
            src={getHeroImageUrl(image.cloudinaryPublicId)}
            alt={generateCaption(image)}
            onLoad={() => {
              if (idx === currentIndex) recalcBounds();
            }}
            className="max-w-full max-h-full w-auto h-auto object-contain"
            {...(idx === 0 ? { fetchPriority: 'high' } : {})}
          />
        </div>
      ))}

      {/* Gradientes pegados a los bordes reales de la imagen */}
      {bounds && (
        <div
          className="absolute z-[2] pointer-events-none"
          style={{
            top: bounds.top,
            left: bounds.left,
            width: bounds.width,
            height: bounds.height,
          }}
        >
          {/* Izquierda */}
          <div
            className="absolute top-0 left-0 h-full"
            style={{ width: gradientW, background: GRADIENT_LEFT }}
          />
          {/* Derecha */}
          <div
            className="absolute top-0 right-0 h-full"
            style={{ width: gradientW, background: GRADIENT_RIGHT }}
          />
          {/* Arriba */}
          <div
            className="absolute top-0 left-0 w-full"
            style={{ height: gradientH, background: GRADIENT_TOP }}
          />
          {/* Abajo */}
          <div
            className="absolute bottom-0 left-0 w-full"
            style={{ height: gradientH, background: GRADIENT_BOTTOM }}
          />
        </div>
      )}

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
