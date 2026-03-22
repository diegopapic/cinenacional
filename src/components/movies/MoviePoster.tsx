'use client';

import { useState } from 'react';
import Image from 'next/image';
import cloudinaryLoader from '@/lib/images/cloudinaryLoader';
import { PosterPlaceholder } from '@/components/film/PosterPlaceholder';

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
        {showPlaceholder ? (
          <PosterPlaceholder className="h-[500px] w-auto aspect-2/3 rounded-lg poster-shadow" />
        ) : (
          <Image
            loader={cloudinaryLoader}
            src={imageUrl}
            alt={`Poster de ${title}`}
            width={333}
            height={500}
            className="h-[500px] w-auto rounded-lg poster-shadow"
            priority
            onError={() => setImageError(true)}
          />
        )}

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
