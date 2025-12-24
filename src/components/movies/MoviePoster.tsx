'use client';

import { useState } from 'react';
import { POSTER_PLACEHOLDER } from '@/lib/movies/movieConstants';

interface MoviePosterProps {
  imageUrl?: string;
  title: string;
}

export function MoviePoster({ imageUrl, title }: MoviePosterProps) {
  const [imageError, setImageError] = useState(false);
  const showPlaceholder = !imageUrl || imageError;
  
  return (
    <div className="flex justify-center">
      <div className="relative inline-block">
        <img 
          src={imageUrl || POSTER_PLACEHOLDER.cloudinaryUrl} 
          alt={`Poster de ${title}`}
          className="h-[500px] w-auto rounded-lg poster-shadow"
          style={{
            filter: showPlaceholder ? 'brightness(0.4)' : 'none'
          }}
          onError={() => setImageError(true)}
        />
        
        {/* Texto elegante sobre el placeholder */}
        {showPlaceholder && (
          <div className="absolute bottom-4 right-4">
            <p className="text-gray-400/60 text-xs font-light tracking-wide">
              Afiche no disponible
            </p>
          </div>
        )}
      </div>
    </div>
  );
}