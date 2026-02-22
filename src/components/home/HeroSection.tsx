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
      slug: string;
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

function generateCaptionText(image: HeroImage): string {
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

const personLinkClass = "transition-colors hover:text-accent";
const movieLinkClass = "text-foreground/80 transition-colors hover:text-accent";

function CaptionContent({ image }: { image: HeroImage }) {
  const sortedPeople = image.people && image.people.length > 0
    ? [...image.people].sort((a, b) => a.position - b.position)
        .map(ip => ({
          slug: ip.person.slug,
          name: [ip.person.firstName, ip.person.lastName].filter(Boolean).join(' '),
        }))
        .filter(p => p.name)
    : [];

  const peopleElements: React.ReactNode[] = [];

  if (sortedPeople.length === 1) {
    peopleElements.push(
      <Link key={sortedPeople[0].slug} href={`/persona/${sortedPeople[0].slug}`} className={personLinkClass}>
        {sortedPeople[0].name}
      </Link>
    );
  } else if (sortedPeople.length === 2) {
    peopleElements.push(
      <Link key={sortedPeople[0].slug} href={`/persona/${sortedPeople[0].slug}`} className={personLinkClass}>
        {sortedPeople[0].name}
      </Link>,
      ' y ',
      <Link key={sortedPeople[1].slug} href={`/persona/${sortedPeople[1].slug}`} className={personLinkClass}>
        {sortedPeople[1].name}
      </Link>
    );
  } else if (sortedPeople.length > 2) {
    sortedPeople.forEach((p, i) => {
      if (i > 0 && i < sortedPeople.length - 1) {
        peopleElements.push(', ');
      } else if (i === sortedPeople.length - 1) {
        peopleElements.push(' y ');
      }
      peopleElements.push(
        <Link key={p.slug} href={`/persona/${p.slug}`} className={personLinkClass}>
          {p.name}
        </Link>
      );
    });
  }

  const movieElement = image.movie ? (() => {
    const displayYear = getDisplayYear(image.movie);
    return (
      <>
        <Link href={`/pelicula/${image.movie!.slug}`} className={movieLinkClass}>
          {image.movie!.title}
        </Link>
        {displayYear && ` (${displayYear})`}
      </>
    );
  })() : null;

  if (peopleElements.length === 0 && !movieElement) return null;

  return (
    <>
      {peopleElements.length > 0 && peopleElements}
      {peopleElements.length > 0 && movieElement && ' en '}
      {movieElement}
    </>
  );
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
      {images.map((image, idx) => {
        const imgElement = (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getHeroImageUrl(image.cloudinaryPublicId)}
              alt={generateCaptionText(image)}
              className="max-w-full max-h-full w-auto h-auto object-contain"
              style={fadeMaskStyle}
              {...(idx === 0 ? { fetchPriority: 'high' as const } : {})}
            />
          </>
        );

        return (
          <div
            key={image.id}
            className={`absolute inset-0 flex items-center justify-center transition-opacity duration-1000 ${
              idx === currentIndex ? 'pointer-events-auto' : 'pointer-events-none'
            }`}
            style={{ opacity: idx === currentIndex ? 1 : 0 }}
          >
            {image.movie ? (
              <Link href={`/pelicula/${image.movie.slug}`} className="contents">
                {imgElement}
              </Link>
            ) : (
              imgElement
            )}
          </div>
        );
      })}

      {/* Gradiente inferior global para el caption */}
      <div className="absolute inset-0 z-[2] bg-gradient-to-t from-background via-background/40 to-transparent pointer-events-none" />

      {/* Caption + dots */}
      <div className="absolute inset-x-0 bottom-0 z-10">
        <div className="mx-auto w-full max-w-7xl px-4 lg:px-6 pb-6 md:pb-8">
          <div className="flex items-end justify-between gap-4">
            {/* Caption */}
            <p className="text-[13px] md:text-sm leading-snug text-muted-foreground/50">
              <CaptionContent image={currentImage} />
            </p>

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
