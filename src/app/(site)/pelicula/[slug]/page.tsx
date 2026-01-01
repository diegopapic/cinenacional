// src/app/pelicula/[slug]/page.tsx - USAR PRISMA DIRECTO (mejor para SSR)
import { notFound } from 'next/navigation';
import { MoviePageClient } from './MoviePageClient';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';

interface PageProps {
  params: {
    slug: string;
  };
}

// Configuración de página dinámica
export const dynamic = 'force-dynamic';
export const revalidate = 3600; // 1 hora
export const dynamicParams = true;

export async function generateStaticParams() {
  return [];
}

// Función para construir URL de Cloudinary - mismo formato que HeroSection
function buildCloudinaryUrl(publicId: string): string {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  return `https://res.cloudinary.com/${cloudName}/image/upload/w_1280,q_auto,f_auto/${publicId}`;
}

// Función para obtener película directamente de Prisma (para SSR)
async function getMovieData(slug: string) {
  try {
    console.log(`📡 Fetching movie from database: ${slug}`);
    
    const movie = await prisma.movie.findFirst({
      where: { slug: slug },
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
          take: 20
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
        
        screenings: {
          where: {
            isPremiere: true
          },
          select: {
            venue: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        
        // Imágenes de la película para el hero y galería
        images: {
          select: {
            id: true,
            cloudinaryPublicId: true,
            type: true,
            eventName: true,
            people: {
              select: {
                personId: true,
                position: true,
                person: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true
                  }
                }
              },
              orderBy: {
                position: 'asc'
              }
            }
          }
        },
        
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
      console.log(`✅ Movie found: ${movie.title}`);
      console.log(`🖼️ Images found: ${movie.images?.length || 0}`);
    } else {
      console.log(`❌ Movie not found: ${slug}`);
    }
    
    return movie;
  } catch (error) {
    console.error('Error fetching movie:', error);
    return null;
  }
}

// Metadata dinámica
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const movie = await getMovieData(params.slug);

  if (!movie) {
    return {
      title: 'Película no encontrada - cinenacional.com',
      description: 'La película que buscás no existe o fue eliminada.'
    };
  }

  const year = movie.year || movie.releaseYear;
  const genres = movie.genres?.map(g => g.genre.name).slice(0, 3).join(', ');
  const defaultDescription = `${movie.title}${year ? ` (${year})` : ''}${genres ? ` - ${genres}` : ''}. Película argentina.`;

  return {
    title: `${movie.title}${year ? ` (${year})` : ''} - cinenacional.com`,
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

// Función helper para formatear las pantallas de estreno
function formatPremiereVenues(venues: any[]): string {
  if (!venues || venues.length === 0) return '';
  
  const venueNames = venues.map(v => v.venue.name);
  
  if (venueNames.length === 1) {
    return venueNames[0];
  } else if (venueNames.length === 2) {
    return `${venueNames[0]} y ${venueNames[1]}`;
  } else {
    // 3 o más: "A, B y C"
    const lastVenue = venueNames[venueNames.length - 1];
    const otherVenues = venueNames.slice(0, -1).join(', ');
    return `${otherVenues} y ${lastVenue}`;
  }
}

// Tipo para las imágenes que vienen de la BD
interface MovieImageFromDB {
  id: number;
  cloudinaryPublicId: string;
  type: string;
  eventName?: string | null;
  people: Array<{
    personId: number;
    position: number;
    person: {
      id: number;
      firstName?: string | null;
      lastName?: string | null;
    }
  }>;
}

// Tipo para las imágenes de galería (para el cliente)
interface GalleryImage {
  id: number;
  url: string;
  cloudinaryPublicId: string;
  type: string;
  eventName?: string | null;
  people: Array<{
    personId: number;
    position: number;
    person: {
      id: number;
      firstName?: string | null;
      lastName?: string | null;
    }
  }>;
  movie?: {
    id: number;
    title: string;
    releaseYear?: number | null;
  } | null;
}

// Función para seleccionar una imagen al azar para el hero
function getRandomHeroImage(images: MovieImageFromDB[]): string | null {
  if (!images || images.length === 0) {
    return null;
  }
  
  // Seleccionar una imagen al azar
  const randomIndex = Math.floor(Math.random() * images.length);
  const selectedImage = images[randomIndex];
  
  // Construir URL de Cloudinary optimizada para hero
  return buildCloudinaryUrl(selectedImage.cloudinaryPublicId);
}

// Función para construir los datos de galería con información para captions
function buildGalleryImages(
  images: MovieImageFromDB[], 
  movie: { id: number; title: string; releaseYear?: number | null }
): GalleryImage[] {
  if (!images || images.length === 0) {
    return [];
  }
  
  return images.map(img => ({
    id: img.id,
    url: buildCloudinaryUrl(img.cloudinaryPublicId),
    cloudinaryPublicId: img.cloudinaryPublicId,
    type: img.type,
    eventName: img.eventName,
    people: img.people,
    movie: {
      id: movie.id,
      title: movie.title,
      releaseYear: movie.releaseYear
    }
  }));
}

export default async function MoviePage({ params }: PageProps) {
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

  // Procesar pantallas de estreno
  const premiereVenues = formatPremiereVenues(movie.screenings || []);

  const rating = movie.rating ? {
    id: movie.rating.id,
    name: movie.rating.name,
    description: movie.rating.description || undefined,
    abbreviation: movie.rating.abbreviation || undefined
  } : null; 

  const colorType = movie.colorType ? {
    id: movie.colorType.id,
    name: movie.colorType.name
  } : null;

  // Formatear año - usar releaseYear si existe, sino year
  const displayYear = movie.year || movie.releaseYear;

  // Obtener imagen aleatoria para el hero
  const heroBackgroundImage = getRandomHeroImage(movie.images || []);

  // Obtener todas las imágenes para la galería con datos para caption
  const galleryImages = buildGalleryImages(movie.images || [], {
    id: movie.id,
    title: movie.title,
    releaseYear: movie.releaseYear || movie.year
  });

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
    console.log('Hero background image:', heroBackgroundImage ? 'Sí' : 'No (usando placeholder)');
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
      premiereVenues={premiereVenues}
      releaseDate={
        movie.releaseDay && movie.releaseMonth && movie.releaseYear
          ? {
              day: movie.releaseDay,
              month: movie.releaseMonth,
              year: movie.releaseYear
            }
          : null
      }
      heroBackgroundImage={heroBackgroundImage}
      galleryImages={galleryImages}
    />
  );
}