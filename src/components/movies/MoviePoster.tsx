'use client';

interface MoviePosterProps {
  imageUrl?: string;
  title: string;
}

export function MoviePoster({ imageUrl, title }: MoviePosterProps) {
  
  return (
    <div className="aspect-[2/3] rounded-lg overflow-hidden poster-shadow">
      {imageUrl ? (
        <img 
          src={imageUrl} 
          alt={`Poster de ${title}`}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="movie-placeholder w-full h-full">
          <svg className="w-16 h-16 text-cine-accent mb-4 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
          </svg>
          <p className="text-sm text-gray-400">Afiche no disponible</p>
        </div>
      )}
    </div>
  );
}