// src/app/pelicula/[slug]/page.tsx - CON REDIS PURO (sin unstable_cache)
import { notFound } from 'next/navigation';
import { MoviePageClient } from './MoviePageClient';
import type { Metadata } from 'next';

interface PageProps {
  params: {
    slug: string;
  };
}

// Configuración de página dinámica
export const dynamic = 'force-dynamic';
export const revalidate = false; // Desactivar revalidación automática de Next.js
export const dynamicParams = true;

// Generar parámetros estáticos - vacío para generación bajo demanda
export async function generateStaticParams() {
  return [];
}

// Función para obtener la URL base según el entorno
function getApiBaseUrl(): string {
  // En servidor (tanto desarrollo como producción), usar localhost interno
  if (typeof window === 'undefined') {
    return 'http://localhost:3000';
  }
  // En cliente (browser), usar URL relativa
  return '';
}

// Obtener datos de película desde API endpoint (con caché Redis)
async function getMovieData(slug: string) {
  try {
    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}/api/movies/${slug}`;
    
    console.log(`📡 Fetching movie from API: ${slug}`);
    
    const response = await fetch(url, {
      // NO usar cache de Next.js - dejar que Redis maneje todo
      cache: 'no-store',
      // Headers opcionales para debugging
      headers: {
        'X-Requested-By': 'movie-page'
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.log(`❌ Movie not found: ${slug}`);
        return null;
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const movie = await response.json();
    
    // Log de información de caché
    const cacheStatus = response.headers.get('X-Cache');
    const cacheSource = response.headers.get('X-Cache-Source');
    
    if (cacheStatus && cacheSource) {
      console.log(`📦 Movie "${movie.title}": Cache ${cacheStatus} from ${cacheSource}`);
    } else {
      console.log(`📦 Movie "${movie.title}": Loaded successfully`);
    }

    return movie;
  } catch (error) {
    console.error(`Error fetching movie ${slug}:`, error);
    return null;
  }
}

// Metadata dinámica
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const movie = await getMovieData(params.slug);

  if (!movie) {
    return {
      title: 'Película no encontrada - CineNacional',
      description: 'La película que buscas no existe o fue eliminada.'
    };
  }

  const year = movie.releaseYear || movie.year;
  const genres = movie.genres?.map((g: any) => g.genre.name).slice(0, 3).join(', ');
  const defaultDescription = `${movie.title}${year ? ` (${year})` : ''}${genres ? ` - ${genres}` : ''}. Película argentina.`;

  return {
    title: `${movie.title}${year ? ` (${year})` : ''} - CineNacional`,
    description: movie.metaDescription || movie.synopsis?.substring(0, 160) || defaultDescription,
    keywords: movie.metaKeywords?.join(', ') || `${movie.title}, cine argentino, película argentina${genres ? `, ${genres}` : ''}`,
    openGraph: {
      title: movie.title,
      description: movie.synopsis?.substring(0, 160) || defaultDescription,
      images: movie.posterUrl ? [movie.posterUrl] : [],
      type: 'video.movie',
    },
    twitter: {
      card: 'summary_large_image',
      title: movie.title,
      description: movie.synopsis?.substring(0, 160) || defaultDescription,
      images: movie.posterUrl ? [movie.posterUrl] : [],
    }
  };
}

// Función helper para formatear el nombre completo de una persona
function formatPersonName(person: any): string {
  const parts = [];
  if (person.firstName) parts.push(person.firstName);
  if (person.lastName) parts.push(person.lastName);
  return parts.join(' ') || person.realName || 'Sin nombre';
}

export default async function MoviePage({ params }: PageProps) {
  // Obtener película desde API (con caché Redis)
  const movie = await getMovieData(params.slug);

  if (!movie) {
    notFound();
  }

  // Formatear duración total en minutos
  const totalDuration = movie.duration || 0;

  // Procesar géneros con estructura correcta
  const genres = movie.genres?.map((g: any) => ({
    id: g.genre.id,
    name: g.genre.name
  })).filter(Boolean) || [];

  // Procesar temas con estructura correcta
  const themes = movie.themes?.map((t: any) => ({
    id: t.theme.id,
    name: t.theme.name
  })).filter(Boolean) || [];

  // Procesar países coproductores (excluyendo Argentina si es el único)
  const countries = movie.movieCountries?.map((c: any) => ({
    id: c.location.id,
    name: c.location.name
  }))
    .filter((c: any) => c.name !== 'Argentina' || movie.movieCountries.length > 1) || [];

  const rating = movie.rating ? {
    id: movie.rating.id,
    name: movie.rating.name,
    description: movie.rating.description || undefined
  } : null;

  const colorType = movie.colorType ? {
    id: movie.colorType.id,
    name: movie.colorType.name
  } : null;

  // Formatear año - usar releaseYear si existe, sino year
  const displayYear = movie.releaseYear || movie.year;

  // PROCESAR CAST
  const allCast = movie.cast?.map((c: any) => ({
    name: formatPersonName(c.person),
    character: c.characterName,
    isPrincipal: c.isPrincipal || false,
    billingOrder: c.billingOrder || 999,
    personId: c.person.id,
    personSlug: c.person.slug,
    image: c.person.photoUrl || undefined
  })) || [];

  // Log reducido en producción
  if (process.env.NODE_ENV === 'development') {
    console.log('Película:', movie.title);
    console.log('Total de actores:', allCast.length);
    console.log('Actores con isPrincipal:', allCast.filter((c: any) => c.isPrincipal).length);
  }

  // Separar cast principal del cast completo
  let mainCast: any[] = [];
  let fullCast: any[] = [];

  const principalActors = allCast.filter((c: any) => c.isPrincipal === true);

  if (principalActors.length > 0) {
    mainCast = principalActors;
    fullCast = allCast.filter((c: any) => !c.isPrincipal);
  } else if (allCast.length > 0) {
    mainCast = allCast.slice(0, Math.min(3, allCast.length));
    if (allCast.length > 3) {
      fullCast = allCast.slice(3);
    }
  }

  // PROCESAR CREW
  const mainCrewRoleIds = [2, 3, 703, 526, 836, 636, 402, 641];

  const mainRoleDepartmentMap: { [key: number]: string } = {
    2: 'Dirección',
    3: 'Guión',
    703: 'Producción Ejecutiva',
    526: 'Dirección de Fotografía',
    836: 'Dirección de Arte',
    636: 'Montaje',
    402: 'Dirección de Sonido',
    641: 'Música'
  };

  const allCrew = movie.crew?.map((c: any) => ({
    name: formatPersonName(c.person),
    role: c.role?.name || 'Sin rol especificado',
    roleId: c.roleId,
    department: c.role?.department || 'Otros',
    billingOrder: c.billingOrder || 999,
    personId: c.person.id,
    personSlug: c.person.slug
  })) || [];

  const basicCrewMembers = allCrew.filter((c: any) => mainCrewRoleIds.includes(c.roleId));

  const basicCrewByDepartment: { [department: string]: Array<{ name: string; role: string; personSlug?: string }> } = {};

  const mainDepartmentOrder = [
    'Dirección',
    'Guión',
    'Producción Ejecutiva',
    'Dirección de Fotografía',
    'Dirección de Arte',
    'Montaje',
    'Dirección de Sonido',
    'Música'
  ];

  mainDepartmentOrder.forEach(dept => {
    basicCrewByDepartment[dept] = [];
  });

  basicCrewMembers.forEach((member: any) => {
    const dept = mainRoleDepartmentMap[member.roleId] || member.department || 'Otros';
    if (!basicCrewByDepartment[dept]) {
      basicCrewByDepartment[dept] = [];
    }
    basicCrewByDepartment[dept].push({
      name: member.name,
      role: member.role,
      personSlug: member.personSlug
    });
  });

  Object.keys(basicCrewByDepartment).forEach(dept => {
    if (basicCrewByDepartment[dept].length === 0) {
      delete basicCrewByDepartment[dept];
    }
  });

  const fullCrewByDepartment: { [department: string]: Array<{ name: string; role: string; personSlug?: string }> } = {};

  allCrew
    .sort((a: any, b: any) => {
      if (a.department !== b.department) {
        return (a.department || 'Otros').localeCompare(b.department || 'Otros');
      }
      return a.billingOrder - b.billingOrder;
    })
    .forEach((member: any) => {
      const dept = member.department || mainRoleDepartmentMap[member.roleId] || 'Otros';

      if (!fullCrewByDepartment[dept]) {
        fullCrewByDepartment[dept] = [];
      }

      fullCrewByDepartment[dept].push({
        name: member.name,
        role: member.role,
        personSlug: member.personSlug
      });
    });

  if (process.env.NODE_ENV === 'development') {
    console.log('Departamentos en crew principal:', Object.keys(basicCrewByDepartment));
    console.log('Departamentos en crew completo:', Object.keys(fullCrewByDepartment));
  }

  return (
    <MoviePageClient
      movie={{
        ...movie,
        hasImages: movie.images?.length > 0,
        hasVideos: movie.videos?.length > 0,
        hasAlternativeTitles: movie.alternativeTitles?.length > 0,
        hasLinks: movie.links?.length > 0,
        hasAwards: movie.awards?.length > 0,
        imageCount: movie.images?.length || 0,
        videoCount: movie.videos?.length || 0
      }}
      displayYear={displayYear}
      totalDuration={totalDuration}
      durationSeconds={movie.durationSeconds}
      genres={genres}
      themes={themes}
      countries={countries}
      rating={rating}
      colorType={colorType}
      soundType={movie.soundType}
      mainCast={mainCast}
      fullCast={fullCast}
      basicCrew={basicCrewByDepartment}
      fullCrew={fullCrewByDepartment}
      releaseDate={
        movie.releaseDay && movie.releaseMonth && movie.releaseYear
          ? {
              day: movie.releaseDay,
              month: movie.releaseMonth,
              year: movie.releaseYear
            }
          : null
      }
    />
  );
}