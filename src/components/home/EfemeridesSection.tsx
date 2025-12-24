import Link from 'next/link';
import Image from 'next/image';
import { Efemeride, DirectorInfo } from '@/types/home.types';

interface EfemeridesSectionProps {
  efemerides: Efemeride[];
}

/**
 * Renderiza los links de directores
 * Si hay múltiples directores, los separa con comas y "y"
 */
function renderDirectorLinks(item: Efemeride) {
  const directors = item.directors;
  
  // Si hay array de directores, usarlo
  if (directors && directors.length > 0) {
    if (directors.length === 1) {
      return (
        <Link 
          href={`/persona/${directors[0].slug}`}
          className="text-white hover:text-cine-accent transition-colors"
        >
          {directors[0].name}
        </Link>
      );
    }

    if (directors.length === 2) {
      return (
        <>
          <Link 
            href={`/persona/${directors[0].slug}`}
            className="text-white hover:text-cine-accent transition-colors"
          >
            {directors[0].name}
          </Link>
          {' y '}
          <Link 
            href={`/persona/${directors[1].slug}`}
            className="text-white hover:text-cine-accent transition-colors"
          >
            {directors[1].name}
          </Link>
        </>
      );
    }

    // 3 o más directores: "A, B y C"
    return (
      <>
        {directors.slice(0, -1).map((director, index) => (
          <span key={director.slug}>
            <Link 
              href={`/persona/${director.slug}`}
              className="text-white hover:text-cine-accent transition-colors"
            >
              {director.name}
            </Link>
            {index < directors.length - 2 ? ', ' : ' '}
          </span>
        ))}
        {'y '}
        <Link 
          href={`/persona/${directors[directors.length - 1].slug}`}
          className="text-white hover:text-cine-accent transition-colors"
        >
          {directors[directors.length - 1].name}
        </Link>
      </>
    );
  }
  
  // Fallback al campo director/directorSlug único (compatibilidad)
  if (item.director && item.directorSlug) {
    return (
      <Link 
        href={`/persona/${item.directorSlug}`}
        className="text-white hover:text-cine-accent transition-colors"
      >
        {item.director}
      </Link>
    );
  }
  
  // Si solo hay nombre pero no slug
  if (item.director) {
    return <span>{item.director}</span>;
  }
  
  return null;
}

export default function EfemeridesSection({ efemerides }: EfemeridesSectionProps) {
  const renderEvento = (item: Efemeride) => {
    const directorLinks = renderDirectorLinks(item);
    const hasDirector = item.directors?.length || item.director;
    
    if (item.tipo === 'pelicula') {
      switch (item.tipoEvento) {
        case 'estreno':
          return (
            <>
              se estrenaba{' '}
              {item.slug ? (
                <Link 
                  href={`/pelicula/${item.slug}`}
                  className="text-white hover:text-cine-accent transition-colors"
                >
                  {item.titulo}
                </Link>
              ) : (
                <span>{item.titulo}</span>
              )}
              {hasDirector && (
                <>
                  , de {directorLinks}
                </>
              )}
            </>
          );
        case 'inicio_rodaje':
          return (
            <>
              empezaba el rodaje de{' '}
              {item.slug ? (
                <Link 
                  href={`/pelicula/${item.slug}`}
                  className="text-white hover:text-cine-accent transition-colors"
                >
                  {item.titulo}
                </Link>
              ) : (
                <span>{item.titulo}</span>
              )}
              {hasDirector && (
                <>
                  , de {directorLinks}
                </>
              )}
            </>
          );
        case 'fin_rodaje':
          return (
            <>
              terminaba el rodaje de{' '}
              {item.slug ? (
                <Link 
                  href={`/pelicula/${item.slug}`}
                  className="text-white hover:text-cine-accent transition-colors"
                >
                  {item.titulo}
                </Link>
              ) : (
                <span>{item.titulo}</span>
              )}
              {hasDirector && (
                <>
                  , de {directorLinks}
                </>
              )}
            </>
          );
        default:
          return <span>{item.evento}</span>;
      }
    } else if (item.tipo === 'persona') {
      switch (item.tipoEvento) {
        case 'nacimiento':
          return (
            <>
              nacía{' '}
              {item.slug ? (
                <Link 
                  href={`/persona/${item.slug}`}
                  className="text-white hover:text-cine-accent transition-colors"
                >
                  {item.titulo}
                </Link>
              ) : (
                <span>{item.titulo}</span>
              )}
            </>
          );
        case 'muerte':
          return (
            <>
              moría{' '}
              {item.slug ? (
                <Link 
                  href={`/persona/${item.slug}`}
                  className="text-white hover:text-cine-accent transition-colors"
                >
                  {item.titulo}
                </Link>
              ) : (
                <span>{item.titulo}</span>
              )}
            </>
          );
        default:
          return <span>{item.evento}</span>;
      }
    }
    
    // Fallback al texto original si no hay tipoEvento
    return <span>{item.evento}</span>;
  };

  const renderImage = (item: Efemeride) => {
    if (item.tipo === "pelicula") {
      // Para películas
      if (item.posterUrl) {
        // Si tiene poster, mostrarlo
        return item.slug ? (
          <Link 
            href={`/pelicula/${item.slug}`}
            className="block w-16 h-24 rounded overflow-hidden hover:opacity-80 transition-opacity"
          >
            <img 
              src={item.posterUrl} 
              alt={item.titulo || 'Película'}
              className="w-full h-full object-cover"
            />
          </Link>
        ) : (
          <div className="w-16 h-24 rounded overflow-hidden">
            <img 
              src={item.posterUrl} 
              alt={item.titulo || 'Película'}
              className="w-full h-full object-cover"
            />
          </div>
        );
      } else {
        // Si no tiene poster, mostrar placeholder
        return item.slug ? (
          <Link 
            href={`/pelicula/${item.slug}`}
            className="w-16 h-24 rounded movie-placeholder flex items-center justify-center hover:opacity-80 transition-opacity"
          >
            <svg className="w-8 h-8 text-cine-accent opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </Link>
        ) : (
          <div className="w-16 h-24 rounded movie-placeholder flex items-center justify-center">
            <svg className="w-8 h-8 text-cine-accent opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
        );
      }
    } else {
      // Para personas
      if (item.photoUrl) {
        // Si tiene foto, mostrarla
        return item.slug ? (
          <Link 
            href={`/persona/${item.slug}`}
            className="block w-24 h-24 rounded-full overflow-hidden hover:opacity-80 transition-opacity"
          >
            <img 
              src={item.photoUrl} 
              alt={item.titulo || 'Persona'}
              className="w-full h-full object-cover"
            />
          </Link>
        ) : (
          <div className="w-24 h-24 rounded-full overflow-hidden">
            <img 
              src={item.photoUrl} 
              alt={item.titulo || 'Persona'}
              className="w-full h-full object-cover"
            />
          </div>
        );
      } else {
        // Si no tiene foto, mostrar placeholder
        return item.slug ? (
          <Link 
            href={`/persona/${item.slug}`}
            className="w-24 h-24 rounded-full person-placeholder flex items-center justify-center hover:opacity-80 transition-opacity"
          >
            <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </Link>
        ) : (
          <div className="w-24 h-24 rounded-full person-placeholder flex items-center justify-center">
            <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        );
      }
    }
  };

  return (
    <section>
      <h2 className="serif-heading text-3xl mb-6 text-white">Efemérides</h2>
      <div className="glass-effect rounded-lg p-6">
        {efemerides.length > 0 ? (
          <div className="space-y-4">
            {efemerides.map((item) => (
              <div key={item.id} className="flex items-center space-x-4 pb-4 border-b border-gray-700 last:border-0 last:pb-0">
                <div className="w-24 h-24 flex items-center justify-center flex-shrink-0">
                  {renderImage(item)}
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-cine-accent text-lg">{item.hace}</h3>
                  <p className="text-sm mt-1 text-gray-300">
                    ... {renderEvento(item)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-400">No hay efemérides para la fecha</p>
          </div>
        )}
      </div>
      <div className="mt-6 text-center">
        <Link
          href="/efemerides"
          className="inline-block border border-cine-accent text-cine-accent hover:bg-cine-accent hover:text-white px-6 py-2 rounded-lg font-medium transition-colors"
        >
          Ver más efemérides
        </Link>
      </div>
    </section>
  );
}