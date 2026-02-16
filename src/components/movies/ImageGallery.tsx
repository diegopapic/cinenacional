// src/components/movies/ImageGallery.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { generateImageCaption } from '@/lib/images/imageUtils';

interface GalleryImage {
  id: number;
  url: string;
  cloudinaryPublicId: string;
  type: string;
  eventName?: string | null;
  people: Array<{
    personId: number;
    position: number;
    person: {
      id: number;
      firstName?: string | null;
      lastName?: string | null;
    }
  }>;
  movie?: {
    id: number;
    title: string;
    releaseYear?: number | null;
  } | null;
}

interface ImageGalleryProps {
  images: GalleryImage[];
  movieTitle: string;
}

export function ImageGallery({ images, movieTitle }: ImageGalleryProps) {
  const [lightbox, setLightbox] = useState<{ index: number } | null>(null);
  const [mobileIndex, setMobileIndex] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const mobileRef = useRef<HTMLDivElement>(null);
  const desktopRef = useRef<HTMLDivElement>(null);

  // Caption helper
  const getCaption = (image: GalleryImage): string => {
    const imageForCaption = {
      id: image.id,
      cloudinaryPublicId: image.cloudinaryPublicId,
      type: image.type as any,
      eventName: image.eventName,
      people: image.people,
      movie: image.movie,
      createdAt: '',
      updatedAt: ''
    };
    return generateImageCaption(imageForCaption);
  };

  // Mobile: track scroll position for dots
  const handleMobileScroll = useCallback(() => {
    const el = mobileRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    setMobileIndex(idx);
  }, []);

  // Desktop: check overflow for arrows
  const checkDesktopOverflow = useCallback(() => {
    const el = desktopRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 1);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  }, []);

  useEffect(() => {
    const el = desktopRef.current;
    if (!el) return;
    checkDesktopOverflow();
    el.addEventListener('scroll', checkDesktopOverflow, { passive: true });
    window.addEventListener('resize', checkDesktopOverflow);
    return () => {
      el.removeEventListener('scroll', checkDesktopOverflow);
      window.removeEventListener('resize', checkDesktopOverflow);
    };
  }, [checkDesktopOverflow]);

  // Desktop scroll with loop
  const scrollDesktop = (direction: 'left' | 'right') => {
    const el = desktopRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.7;

    if (direction === 'right' && el.scrollLeft >= el.scrollWidth - el.clientWidth - 2) {
      el.scrollTo({ left: 0, behavior: 'smooth' });
    } else if (direction === 'left' && el.scrollLeft <= 2) {
      el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' });
    } else {
      el.scrollBy({ left: direction === 'right' ? amount : -amount, behavior: 'smooth' });
    }
  };

  // Lightbox
  const openLightbox = (index: number) => {
    setLightbox({ index });
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = useCallback(() => {
    setLightbox(null);
    document.body.style.overflow = 'auto';
  }, []);

  const navigateLightbox = useCallback((direction: 'prev' | 'next') => {
    if (!lightbox) return;
    const len = images.length;
    const newIndex = direction === 'next'
      ? (lightbox.index + 1) % len
      : (lightbox.index - 1 + len) % len;
    setLightbox({ index: newIndex });
  }, [lightbox, images.length]);

  // Keyboard
  useEffect(() => {
    if (!lightbox) return;
    const handleKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape': closeLightbox(); break;
        case 'ArrowLeft': e.preventDefault(); navigateLightbox('prev'); break;
        case 'ArrowRight': e.preventDefault(); navigateLightbox('next'); break;
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [lightbox, closeLightbox, navigateLightbox]);

  if (images.length === 0) return null;

  return (
    <>
      <div>
        {/* Section header */}
        <h2 className="font-serif text-xl tracking-tight text-foreground md:text-2xl">Galería de imágenes</h2>

        <div className="mt-5 border-t border-border/30 pt-5 md:mt-6 md:pt-6">

          {/* ===== MOBILE: snap carousel ===== */}
          <div className="md:hidden">
            <div
              ref={mobileRef}
              className="flex snap-x snap-mandatory overflow-x-auto scrollbar-hide"
              onScroll={handleMobileScroll}
            >
              {images.map((image, i) => (
                <div
                  key={image.id}
                  className="relative aspect-video w-full shrink-0 snap-center overflow-hidden rounded-sm border border-foreground/[0.04] cursor-pointer"
                  onClick={() => openLightbox(i)}
                >
                  <img
                    src={image.url}
                    alt={getCaption(image)}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>

            {/* Caption + dots */}
            <div className="mt-3 flex flex-col items-center gap-2">
              <p className="text-[13px] text-muted-foreground/50 line-clamp-2 text-center px-4">
                {getCaption(images[mobileIndex] || images[0])}
              </p>
              {images.length > 1 && (
                <div className="flex items-center gap-1.5">
                  {images.map((_, i) => (
                    <span
                      key={i}
                      className={`h-1 rounded-full transition-all duration-200 ${
                        i === mobileIndex
                          ? 'w-3 bg-accent/60'
                          : 'w-1 bg-muted-foreground/20'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ===== DESKTOP: scroll with arrows ===== */}
          <div className="relative hidden md:block">
            <div
              ref={desktopRef}
              className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide"
            >
              {images.map((image, i) => (
                <figure
                  key={image.id}
                  className="group shrink-0"
                >
                  <div
                    className="relative h-48 lg:h-56 cursor-pointer overflow-hidden rounded-sm border border-foreground/[0.04]"
                    onClick={() => openLightbox(i)}
                  >
                    <img
                      src={image.url}
                      alt={getCaption(image)}
                      className="h-full w-auto object-cover transition-all duration-500 group-hover:scale-105 group-hover:brightness-110"
                      loading="lazy"
                    />
                  </div>
                  <figcaption className="mt-2 max-w-0 min-w-full">
                    <p className="text-[10px] leading-snug text-muted-foreground/50">{getCaption(image)}</p>
                  </figcaption>
                </figure>
              ))}
            </div>

            {/* Left arrow */}
            {(canScrollLeft || images.length > 3) && (
              <button
                onClick={() => scrollDesktop('left')}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 flex h-9 w-9 items-center justify-center rounded-full bg-background/80 shadow-lg ring-1 ring-border/20 backdrop-blur-sm text-foreground/70 transition-colors hover:text-foreground"
                aria-label="Anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}

            {/* Right arrow */}
            {(canScrollRight || images.length > 3) && (
              <button
                onClick={() => scrollDesktop('right')}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 flex h-9 w-9 items-center justify-center rounded-full bg-background/80 shadow-lg ring-1 ring-border/20 backdrop-blur-sm text-foreground/70 transition-colors hover:text-foreground"
                aria-label="Siguiente"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ===== LIGHTBOX ===== */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/95"
          role="dialog"
          aria-modal="true"
          onClick={closeLightbox}
        >
          {/* Close */}
          <button
            onClick={closeLightbox}
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full text-white/40 transition-colors hover:text-white"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Nav left */}
          <button
            onClick={(e) => { e.stopPropagation(); navigateLightbox('prev'); }}
            className="absolute left-4 top-1/2 z-10 -translate-y-1/2 text-white/40 transition-colors hover:text-white"
            aria-label="Imagen anterior"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          {/* Image */}
          <div onClick={(e) => e.stopPropagation()} className="flex flex-col items-center gap-4">
            <img
              src={images[lightbox.index].url}
              alt={getCaption(images[lightbox.index])}
              className="h-[60vh] md:h-[75vh] max-w-[90vw] object-contain"
            />
            <div className="text-center">
              <p className="text-[13px] text-white/50">{getCaption(images[lightbox.index])}</p>
              <p className="text-[11px] text-white/25 mt-1">{lightbox.index + 1} de {images.length}</p>
            </div>
          </div>

          {/* Nav right */}
          <button
            onClick={(e) => { e.stopPropagation(); navigateLightbox('next'); }}
            className="absolute right-4 top-1/2 z-10 -translate-y-1/2 text-white/40 transition-colors hover:text-white"
            aria-label="Imagen siguiente"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>
      )}
    </>
  );
}
