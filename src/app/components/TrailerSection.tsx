// src/app/components/TrailerSection.tsx

interface TrailerSectionProps {
  trailerUrl?: string;
  movieTitle: string;
  variant?: 'default' | 'minimal' | 'card' | 'compact';
}

export function TrailerSection({ trailerUrl, movieTitle, variant = 'compact' }: TrailerSectionProps) {
  if (!trailerUrl) return null;

  // Extraer el ID del video de YouTube de la URL
  const getYouTubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const videoId = getYouTubeId(trailerUrl);

  if (!videoId) return null;

  // Variante compacta (nueva, más pequeña y mejor integrada con tu diseño)
  if (variant === 'compact') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-gray-800">
        <h2 className="serif-heading text-2xl text-white mb-6">Trailer</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-cine-gray shadow-2xl">
              <iframe
                className="absolute top-0 left-0 w-full h-full"
                src={`https://www.youtube.com/embed/${videoId}?modestbranding=1&rel=0`}
                title={`Trailer de ${movieTitle}`}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </div>
          <div className="lg:col-span-1">
            <div className="glass-effect rounded-lg p-6">
              <h3 className="text-lg font-medium mb-3 text-cine-accent">Sobre el trailer</h3>
              <p className="text-sm text-gray-300 mb-4">
                Mira el trailer oficial de {movieTitle} y descubre por qué se convirtió en un fenómeno del cine argentino.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="bg-cine-gray px-3 py-1 rounded-full text-xs text-white">Trailer Oficial</span>
                <span className="bg-cine-gray px-3 py-1 rounded-full text-xs text-white">HD</span>
                <span className="bg-cine-gray px-3 py-1 rounded-full text-xs text-white">Subtitulado</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Variante por defecto con fondo
  if (variant === 'default') {
    return (
      <div className="bg-black/5 dark:bg-white/5 rounded-lg p-6 mt-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Trailer
        </h2>
        <div className="relative w-full aspect-video rounded-lg overflow-hidden shadow-lg">
          <iframe
            className="absolute top-0 left-0 w-full h-full"
            src={`https://www.youtube.com/embed/${videoId}`}
            title={`Trailer de ${movieTitle}`}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      </div>
    );
  }

  // Variante minimalista
  if (variant === 'minimal') {
    return (
      <div className="mt-8">
        <h2 className="text-2xl font-bold text-white mb-4">Trailer</h2>
        <div className="relative w-full aspect-video rounded-lg overflow-hidden shadow-2xl">
          <iframe
            className="absolute top-0 left-0 w-full h-full"
            src={`https://www.youtube.com/embed/${videoId}?modestbranding=1&rel=0`}
            title={`Trailer de ${movieTitle}`}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      </div>
    );
  }

  // Variante tipo tarjeta con thumbnail personalizable
  if (variant === 'card') {
    return (
      <div className="mt-8">
        <h2 className="text-2xl font-bold text-white mb-4">Trailer</h2>
        <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-md rounded-xl p-1">
          <div className="bg-black/40 backdrop-blur-xl rounded-lg p-4">
            <div className="relative w-full aspect-video rounded-lg overflow-hidden">
              <iframe
                className="absolute top-0 left-0 w-full h-full"
                src={`https://www.youtube.com/embed/${videoId}?modestbranding=1&rel=0`}
                title={`Trailer de ${movieTitle}`}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
            <p className="text-sm text-gray-300 mt-3 text-center">
              Ver trailer oficial de {movieTitle}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}