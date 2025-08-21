'use client';

import { useState, useEffect } from 'react';

interface MovieHeroProps {
  title: string;
  year: number | null;
  duration: number;
  genres: string[];
  gallery: string[];
}

export function MovieHero({ title, year, duration, genres, gallery }: MovieHeroProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (gallery.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % gallery.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [gallery.length]);

  const currentImage = gallery.length > 0 ? gallery[currentImageIndex] : null;

  return (
    <div className="relative h-[50vh] overflow-hidden">
      {/* Background Image */}
      {currentImage && (
        <div 
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000"
          style={{ backgroundImage: `url(${currentImage})` }}
        />
      )}
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-cine-dark" />
      
      {/* Content */}
      <div className="relative h-full flex items-end">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 w-full">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
            {title}
          </h1>
          
          <div className="flex flex-wrap items-center gap-4 text-gray-300">
            {year && <span>{year}</span>}
            {duration > 0 && (
              <>
                <span>•</span>
                <span>{duration} min</span>
              </>
            )}
            {genres.length > 0 && (
              <>
                <span>•</span>
                <span>{genres.join(', ')}</span>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Image Indicators */}
      {gallery.length > 1 && (
        <div className="absolute bottom-4 right-4 flex gap-2">
          {gallery.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentImageIndex(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentImageIndex 
                  ? 'bg-white w-8' 
                  : 'bg-white/50 hover:bg-white/75'
              }`}
              aria-label={`Ir a imagen ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}