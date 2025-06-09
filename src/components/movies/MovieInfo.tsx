'use client';

interface Director {
  name: string;
  image?: string;
}

interface MovieInfoProps {
  synopsis: string;
  director: Director;
  trailerUrl?: string;
  onTrailerClick?: () => void;
  onShareClick?: () => void;
}

export function MovieInfo({ 
  synopsis, 
  director, 
  trailerUrl, 
  onTrailerClick,
  onShareClick 
}: MovieInfoProps) {
  return (
    <div className="space-y-6">
      {/* Synopsis */}
      <div>
        <p className="serif-body text-lg text-gray-300 leading-relaxed">
          {synopsis}
        </p>
      </div>

      {/* Director */}
      <div className="grid grid-cols-1 gap-6">
        <div>
          <h3 className="text-lg font-medium mb-3 text-cine-accent">Dirección</h3>
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-full person-placeholder">
              {director.image ? (
                <img 
                  src={director.image} 
                  alt={director.name}
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              )}
            </div>
            <div>
              <p className="font-medium text-white">{director.name}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-4">
        {trailerUrl && (
          <button 
            onClick={onTrailerClick}
            className="bg-cine-accent hover:bg-blue-600 px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2 text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Ver Trailer</span>
          </button>
        )}
        <button 
          onClick={onShareClick}
          className="border border-gray-600 hover:border-cine-accent px-6 py-3 rounded-lg font-medium transition-colors text-white"
        >
          Compartir
        </button>
      </div>
    </div>
  );
}