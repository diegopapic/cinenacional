'use client';

interface MovieSidebarProps {
  year: number | null;
  duration: number;
  country: string;
  rating: string;
  format?: string;
  genres: string[];
  themes: string[];
}

export function MovieSidebar({
  year,
  duration,
  country,
  rating,
  format = "Color | Sonora",
  genres,
  themes
}: MovieSidebarProps) {
  return (
    <div className="glass-effect rounded-lg p-6 space-y-6">
      {/* Technical Information */}
      <div>
        <h3 className="text-lg font-medium mb-4 text-cine-accent">Información</h3>
        <div className="space-y-3 text-sm">
          {/* Mostrar año solo si existe */}
          {year && (
            <div className="flex items-start">
              <span className="text-gray-400 w-32 flex-shrink-0">Año:</span>
              <span className="ml-2 text-white">{year}</span>
            </div>
          )}
          <div className="flex items-start">
            <span className="text-gray-400 w-32 flex-shrink-0">Duración:</span>
            <span className="ml-2 text-white">{duration} min</span>
          </div>
          <div className="flex items-start">
            <span className="text-gray-400 w-32 flex-shrink-0">País coproductor:</span>
            <span className="ml-2 text-white">{country}</span>
          </div>
          {/* Calificación por edad - AGREGAR esta sección */}
          <div className="border-b border-gray-700 pb-3">
            <h3 className="text-sm text-gray-400 mb-1">Calificación</h3>
            <p className="text-white">{rating}</p>
          </div>
          <div className="flex justify-end">
            <span className="text-white">{format}</span>
          </div>
        </div>
      </div>

      {/* Genres */}
      <div>
        <h3 className="text-lg font-medium mb-4 text-cine-accent">Géneros</h3>
        <div className="flex flex-wrap gap-2">
          {genres.map((genre, index) => (
            <span
              key={index}
              className="bg-cine-gray px-3 py-1 rounded-full text-sm text-white"
            >
              {genre}
            </span>
          ))}
        </div>
      </div>

      {/* Themes */}
      <div>
        <h3 className="text-lg font-medium mb-4 text-cine-accent">Temas</h3>
        <div className="flex flex-wrap gap-2">
          {themes.map((theme, index) => (
            <span
              key={index}
              className="bg-cine-gray px-3 py-1 rounded-full text-sm text-white"
            >
              {theme}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}