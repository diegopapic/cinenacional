// src/components/movies/MovieSidebar.tsx
'use client';

interface MovieSidebarProps {
  year: number | null;
  releaseYear?: number | null;
  duration: number | null;
  durationSeconds?: number | null;
  countries?: Array<{ id: number; name: string }> | null;
  rating?: { id: number; name: string; description?: string } | null;
  colorType?: { id: number; name: string } | null;
  soundType?: string | null;
  genres?: Array<{ id: number; name: string }>;
  themes?: Array<{ id: number; name: string }>;
}

export function MovieSidebar({
  year,
  releaseYear,
  duration,
  durationSeconds,
  countries,
  rating,
  colorType,
  soundType,
  genres = [],
  themes = []
}: MovieSidebarProps) {
  // Formatear duración con segundos si existen
  const formatDuration = () => {
    if (!duration) return null;
    let durationStr = `${duration} min`;
    if (durationSeconds) {
      durationStr += ` ${durationSeconds} seg`;
    }
    return durationStr;
  };

  // Formatear tipo de película (color/sonido)
  const formatFilmType = () => {
    const parts = [];
    // Solo mostrar colorType si existe y NO es "No disponible" (id: 12)
    if (colorType && colorType.id !== 12) {
      // Traducir nombres comunes
      const colorName = colorType.name === 'COLOR' ? 'Color' : 
                       colorType.name === 'BLACK_AND_WHITE' ? 'Blanco y Negro' :
                       colorType.name === 'MIXED' ? 'Mixto' : 
                       colorType.name;
      parts.push(colorName);
    }
    if (soundType) {
      parts.push(soundType === 'SOUND' || soundType === 'Sonora' ? 'Sonora' : 'Muda');
    }
    return parts.length > 0 ? parts.join(' | ') : null;
  };

  const formattedDuration = formatDuration();
  const filmType = formatFilmType();
  const hasCountries = countries && countries.length > 0;
  const displayYear = year || releaseYear;

  return (
    <div className="glass-effect rounded-lg p-6 space-y-6">
      {/* Technical Information */}
      <div>
        <h3 className="text-lg font-medium mb-4 text-cine-accent">Información</h3>
        <div className="space-y-3 text-sm">
          {/* Mostrar año solo si existe */}
          {displayYear && (
            <div className="flex items-start">
              <span className="text-gray-400 w-32 flex-shrink-0">Año de producción:</span>
              <span className="ml-2 text-white">{displayYear}</span>
            </div>
          )}
          
          {/* Duración */}
          {formattedDuration && (
            <div className="flex items-start">
              <span className="text-gray-400 w-32 flex-shrink-0">Duración:</span>
              <span className="ml-2 text-white">{formattedDuration}</span>
            </div>
          )}
          
          {/* Países coproductores - solo si hay */}
          {hasCountries && (
            <div className="flex items-start">
              <span className="text-gray-400 w-32 flex-shrink-0">
                Coproducción con:
              </span>
              <span className="ml-2 text-white">
                {countries.map(c => c.name).join(', ')}
              </span>
            </div>
          )}
          
          {/* Calificación por edad - solo si existe */}
          {rating && (
            <div className="flex items-start">
              <span className="text-gray-400 w-32 flex-shrink-0">Calificación:</span>
              <span className="ml-2 text-white">{rating.name}</span>
            </div>
          )}
          
          {/* Formato (Color/Sonido) - solo si existe */}
          {filmType && (
            <div className="flex justify-end mt-4 pt-3 border-t border-gray-700">
              <span className="ml-2 text-white">{filmType}</span>
            </div>
          )}
        </div>
      </div>

      {/* Genres - solo si hay */}
      {genres && genres.length > 0 && (
        <div>
          <h3 className="text-lg font-medium mb-4 text-cine-accent">Géneros</h3>
          <div className="flex flex-wrap gap-2">
            {genres.map((genre) => (
              <span
                key={genre.id}
                className="bg-cine-gray px-3 py-1 rounded-full text-sm text-white hover:bg-cine-accent/20 transition-colors cursor-pointer"
              >
                {genre.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Themes - solo si hay */}
      {themes && themes.length > 0 && (
        <div>
          <h3 className="text-lg font-medium mb-4 text-cine-accent">Temas</h3>
          <div className="flex flex-wrap gap-2">
            {themes.map((theme) => (
              <span
                key={theme.id}
                className="bg-cine-gray px-3 py-1 rounded-full text-sm text-white hover:bg-cine-accent/20 transition-colors cursor-pointer"
              >
                {theme.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}