// src/app/pelicula/[slug]/page.tsx
import { notFound } from 'next/navigation';
import { MoviePageClient } from './MoviePageClient';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { unstable_cache } from 'next/cache';

interface PageProps {
  params: {
    slug: string;
  };
}

// Configuración para build y runtime
const isBuilding = process.env.BUILDING === 'true';

// Configuración de página dinámica
export const dynamic = isBuilding ? 'force-dynamic' : 'auto';
export const revalidate = isBuilding ? 0 : 3600; // 1 hora cuando NO estamos en build
export const dynamicParams = true; // Permitir slugs no pre-generados

// Generar parámetros estáticos (solo cuando no estamos en build de Docker)
export async function generateStaticParams() {
  // Durante el build de Docker, no pre-generar nada
  if (isBuilding) {
    return [];
  }
  
  try {
    const movies = await prisma.movie.findMany({
      select: { slug: true },
      take: 50, // Limitar a las 50 más recientes
      orderBy: { updatedAt: 'desc' }
    });
    
    return movies.map((movie) => ({
      slug: movie.slug,
    }));
  } catch (error) {
    console.error('Error generating static params:', error);
    return [];
  }
}

// OPTIMIZACIÓN: Cachear la query de película con unstable_cache
const getCachedMovieData = unstable_cache(
  async (slug: string) => {
    console.log(`🔍 Buscando película: ${slug}`);
    
    const movie = await prisma.movie.findFirst({
      where: {
        slug: slug
      },
      select: {
        // Campos básicos - optimizado con select
        id: true,
        slug: true,
        title: true,
        year: true,
        releaseYear: true,
        releaseMonth: true,
        releaseDay: true,
        duration: true,
        durationSeconds: true,
        synopsis: true,
        posterUrl: true,
        trailerUrl: true,
        soundType: true,
        stage: true,
        dataCompleteness: true,
        notes: true,
        tagline: true,
        imdbId: true,
        metaDescription: true,
        metaKeywords: true,
        
        // Relaciones optimizadas
        genres: {
          select: {
            genre: {
              select: {
                id: true,
                name: true,
                slug: true
              }
            }
          }
        },
        
        cast: {
          select: {
            characterName: true,
            isPrincipal: true,
            billingOrder: true,
            person: {
              select: {
                id: true,
                slug: true,
                firstName: true,
                lastName: true,
                realName: true,
                photoUrl: true
              }
            }
          },
          orderBy: [
            { isPrincipal: 'desc' },
            { billingOrder: 'asc' }
          ],
          take: 100 // Limitar a 100 actores máximo
        },
        
        crew: {
          select: {
            roleId: true,
            billingOrder: true,
            person: {
              select: {
                id: true,
                slug: true,
                firstName: true,
                lastName: true,
                realName: true
              }
            },
            role: {
              select: {
                id: true,
                name: true,
                department: true
              }
            }
          },
          orderBy: {
            billingOrder: 'asc'
          },
          take: 50 // Limitar a 50 miembros del crew
        },
        
        movieCountries: {
          select: {
            location: {
              select: {
                id: true,
                name: true,
                slug: true
              }
            }
          }
        },
        
        themes: {
          select: {
            theme: {
              select: {
                id: true,
                name: true,
                slug: true
              }
            }
          },
          take: 20 // Limitar a 20 temas
        },
        
        rating: {
          select: {
            id: true,
            name: true,
            description: true,
            abbreviation: true
          }
        },
        
        colorType: {
          select: {
            id: true,
            name: true,
            category: true
          }
        },
        
        productionCompanies: {
          select: {
            isPrimary: true,
            company: {
              select: {
                id: true,
                name: true,
                slug: true
              }
            }
          },
          take: 10
        },
        
        distributionCompanies: {
          select: {
            territory: true,
            company: {
              select: {
                id: true,
                name: true,
                slug: true
              }
            }
          },
          take: 10
        },
        
        // Solo traer counts para estas relaciones pesadas
        _count: {
          select: {
            images: true,
            videos: true,
            alternativeTitles: true,
            links: true,
            awards: true,
            screenings: true
          }
        }
      }
    });
    
    if (movie) {
      console.log(`✅ Película encontrada: ${movie.title}`);
    }
    
    return movie;
  },
  ['movie-detail'], // Tag para el cache
  {
    revalidate: 3600, // Cache por 1 hora
    tags: ['movies'] // Tag genérico para todas las películas
  }
);

// Función wrapper para manejar errores
async function getMovieData(slug: string) {
  try {
    // Durante el build, simular que no hay datos
    if (isBuilding) {
      return null;
    }
    return await getCachedMovieData(slug);
  } catch (error) {
    console.error('Error fetching movie:', error);
    return null;
  }
}

// Metadata dinámica - también optimizada con cache
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  // Durante el build, retornar metadata básica
  if (isBuilding) {
    return {
      title: 'CineNacional',
      description: 'Cine argentino'
    };
  }

  const movie = await getMovieData(params.slug);

  if (!movie) {
    return {
      title: 'Película no encontrada - CineNacional',
      description: 'La película que buscas no existe o fue eliminada.'
    };
  }

  // Generar descripción optimizada para SEO
  const year = movie.releaseYear || movie.year;
  const genres = movie.genres?.map(g => g.genre.name).slice(0, 3).join(', ');
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
  // Durante el build, retornar un placeholder
  if (isBuilding) {
    return <div>Loading...</div>;
  }

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

  // PROCESAR CAST - LÓGICA CORREGIDA
  // Formatear todo el cast con estructura correcta
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
    console.log('🎬 Película:', movie.title);
    console.log('👥 Total de actores:', allCast.length);
    console.log('🌟 Actores con isPrincipal:', allCast.filter((c: any) => c.isPrincipal).length);
  }

  // Separar cast principal del cast completo
  let mainCast: any[] = [];
  let fullCast: any[] = [];

  // Primero buscar los que tienen isPrincipal = true
  const principalActors = allCast.filter((c: any) => c.isPrincipal === true);

  if (principalActors.length > 0) {
    // Si hay actores marcados como principales, usarlos
    mainCast = principalActors;
    // El resto va a fullCast
    fullCast = allCast.filter((c: any) => !c.isPrincipal);
  } else if (allCast.length > 0) {
    // Si no hay ninguno marcado como principal, tomar los primeros 3
    mainCast = allCast.slice(0, Math.min(3, allCast.length));
    // El resto (desde el 4to en adelante) va a fullCast
    if (allCast.length > 3) {
      fullCast = allCast.slice(3);
    }
  }

  // PROCESAR CREW - NUEVA LÓGICA PARA LEER DE LA BASE DE DATOS
  // IDs de los roles principales según lo especificado
  const mainCrewRoleIds = [2, 3, 703, 526, 836, 636, 402, 641];

  // Mapeo de roleId a nombre de departamento para el equipo principal
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

  // Procesar todo el crew
  const allCrew = movie.crew?.map((c: any) => ({
    name: formatPersonName(c.person),
    role: c.role?.name || 'Sin rol especificado',
    roleId: c.roleId,
    department: c.role?.department || 'Otros',
    billingOrder: c.billingOrder || 999,
    personId: c.person.id,
    personSlug: c.person.slug
  })) || [];

  // Separar crew principal del crew completo
  const basicCrewMembers = allCrew.filter((c: any) => mainCrewRoleIds.includes(c.roleId));

  // Organizar el crew principal por departamento (orden específico)
  const basicCrewByDepartment: { [department: string]: Array<{ name: string; role: string; personSlug?: string }> } = {};

  // Orden específico de los departamentos principales
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

  // Inicializar departamentos vacíos en el orden correcto
  mainDepartmentOrder.forEach(dept => {
    basicCrewByDepartment[dept] = [];
  });

  // Llenar con los miembros del crew principal
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

  // Eliminar departamentos vacíos del crew principal
  Object.keys(basicCrewByDepartment).forEach(dept => {
    if (basicCrewByDepartment[dept].length === 0) {
      delete basicCrewByDepartment[dept];
    }
  });

  // Organizar el crew completo por departamento
  const fullCrewByDepartment: { [department: string]: Array<{ name: string; role: string; personSlug?: string }> } = {};

  // Incluir TODO el crew (principal + adicional) en el crew completo
  allCrew
    .sort((a: any, b: any) => {
      // Primero ordenar por departamento
      if (a.department !== b.department) {
        return (a.department || 'Otros').localeCompare(b.department || 'Otros');
      }
      // Luego por billingOrder
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
    console.log('📊 Departamentos en crew principal:', Object.keys(basicCrewByDepartment));
    console.log('📊 Departamentos en crew completo:', Object.keys(fullCrewByDepartment));
  }

  // Pasar los datos procesados al componente cliente
  return (
    <MoviePageClient
      movie={{
        ...movie,
        // Agregar contadores para que el cliente sepa si hay contenido adicional
        hasImages: movie._count.images > 0,
        hasVideos: movie._count.videos > 0,
        hasAlternativeTitles: movie._count.alternativeTitles > 0,
        hasLinks: movie._count.links > 0,
        hasAwards: movie._count.awards > 0,
        imageCount: movie._count.images,
        videoCount: movie._count.videos
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
    />
  );
}