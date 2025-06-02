// Componente para mostrar el trailer de YouTube
interface TrailerSectionProps {
  trailerUrl?: string;
  movieTitle: string;
  variant?: 'default' | 'minimal' | 'card';
}

export function TrailerSection({ trailerUrl, movieTitle, variant = 'default' }: TrailerSectionProps) {
  if (!trailerUrl) return null;

  // Extraer el ID del video de YouTube de la URL
  const getYouTubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const videoId = getYouTubeId(trailerUrl);

  if (!videoId) return null;

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

// Ejemplo de integración completa en page.tsx para Relatos Salvajes
export default function MoviePage() {
  // Datos de la película (esto vendría de tu base de datos)
  const movie = {
    id: 1,
    title: "Relatos Salvajes",
    year: 2014,
    synopsis: "Seis relatos que alternan entre la comedia y el drama, que exploran los temas de la venganza, el amor y la vulnerabilidad del ser humano en situaciones extraordinarias. Una película que retrata la condición humana cuando es llevada al límite.",
    trailer: "https://www.youtube.com/watch?v=Wm7DU4FBBVs",
    additionalVideos: [
      {
        url: "https://www.youtube.com/watch?v=Wm7DU4FBBVs",
        title: "Trailer Oficial",
        type: "trailer" as const
      },
      // Puedes agregar más videos aquí
    ],
    // ... resto de los datos
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* ... header y contenido principal ... */}
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* ... información de la película ... */}
        
        {/* Galería de imágenes existente */}
        <div className="bg-black/5 dark:bg-white/5 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Galería
          </h2>
          <div className="h-64 flex items-center justify-center text-gray-400">
            Cargando imágenes...
          </div>
        </div>

        {/* Trailer - Opción 1: Componente simple */}
        <TrailerSection 
          trailerUrl={movie.trailer} 
          movieTitle={movie.title}
          variant="card" // puedes usar 'default', 'minimal' o 'card'
        />

        {/* Trailer - Opción 2: Galería de videos si tienes múltiples */}
        {/* <VideoGallery 
          videos={movie.additionalVideos} 
          movieTitle={movie.title}
        /> */}

        {/* Películas relacionadas */}
        <div className="mt-8">
          {/* ... código de películas relacionadas ... */}
        </div>
      </div>
    </div>
  );
}