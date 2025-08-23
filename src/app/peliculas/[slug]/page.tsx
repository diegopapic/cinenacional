// src/app/peliculas/[slug]/page.tsx
import { notFound } from 'next/navigation';
import { MoviePageClient } from './MoviePageClient';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';

interface PageProps {
  params: {
    slug: string;
  };
}

// Función para obtener los datos de la película directamente desde la base de datos
async function getMovieData(slug: string) {
  try {
    const movie = await prisma.movie.findFirst({
      where: { 
        slug: slug 
      },
      include: {
        genres: {
          include: {
            genre: true
          }
        },
        cast: {
          include: {
            person: true
          },
          orderBy: [
            { isPrincipal: 'desc' },
            { billingOrder: 'asc' }
          ]
        },
        crew: {
          include: {
            person: true,
            role: true
          },
          orderBy: {
            billingOrder: 'asc'
          }
        },
        movieCountries: {
          include: {
            country: true
          }
        },
        themes: {
          include: {
            theme: true
          }
        },
        rating: true,
        colorType: true,
        productionCompanies: {
          include: {
            company: true
          }
        },
        distributionCompanies: {
          include: {
            company: true
          }
        },
        images: true,
        videos: true,
        alternativeTitles: true,
        links: true
      }
    });

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
      title: 'Película no encontrada - CineNacional',
    };
  }
  
  return {
    title: `${movie.title} - cinenacional.com`,
    description: movie.synopsis || `${movie.title} (${movie.releaseYear || movie.year})`,
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
    id: c.country.id,
    name: c.country.name
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

  // PROCESAR CAST - LÓGICA CORREGIDA CON DEBUG
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

  console.log('🎬 Película:', movie.title);
  console.log('👥 Total de actores:', allCast.length);
  console.log('🌟 Actores con isPrincipal:', allCast.filter((c: any) => c.isPrincipal).length);
  
  // Separar cast principal del cast completo
  let mainCast: any[] = [];
  let fullCast: any[] = [];
  
  // Primero buscar los que tienen isPrincipal = true
  const principalActors = allCast.filter((c: any) => c.isPrincipal === true);
  
  console.log('✨ Actores principales encontrados:', principalActors.length);
  
  if (principalActors.length > 0) {
    // Si hay actores marcados como principales, usarlos
    mainCast = principalActors;
    // El resto va a fullCast
    fullCast = allCast.filter((c: any) => !c.isPrincipal);
    console.log('Usando actores con isPrincipal=true');
  } else if (allCast.length > 0) {
    // Si no hay ninguno marcado como principal, tomar EXACTAMENTE los primeros 3
    mainCast = allCast.slice(0, Math.min(3, allCast.length));
    // El resto (desde el 4to en adelante) va a fullCast
    if (allCast.length > 3) {
      fullCast = allCast.slice(3);
    }
    console.log('No hay principales marcados. Tomando los primeros 3');
  }

  console.log('📊 Reparto principal:', mainCast.length, 'actores');
  console.log('📊 Reparto completo adicional:', fullCast.length, 'actores');
  console.log('Actores principales:', mainCast.map(a => a.name));
  console.log('Actores en fullCast:', fullCast.map(a => a.name));

  // PROCESAR CREW - NUEVA LÓGICA PARA LEER DE LA BASE DE DATOS
  console.log('🎬 Procesando equipo técnico para:', movie.title);
  
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
    department: c.role.department || 'Otros',
    billingOrder: c.billingOrder || 999,
    personId: c.person.id,
    personSlug: c.person.slug
  })) || [];
  
  console.log('👥 Total de crew:', allCrew.length);
  
  // Separar crew principal del crew completo
  const basicCrewMembers = allCrew.filter((c: any) => mainCrewRoleIds.includes(c.roleId));
  const additionalCrewMembers = allCrew.filter((c: any) => !mainCrewRoleIds.includes(c.roleId));
  
  console.log('⭐ Crew principal:', basicCrewMembers.length);
  console.log('📋 Crew adicional:', additionalCrewMembers.length);
  
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
  
  console.log('📊 Departamentos en crew principal:', Object.keys(basicCrewByDepartment));
  console.log('📊 Departamentos en crew completo:', Object.keys(fullCrewByDepartment));

  // Pasar los datos procesados al componente cliente
  return (
    <MoviePageClient
      movie={movie}
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
      basicCrew={basicCrewByDepartment}  // NUEVO
      fullCrew={fullCrewByDepartment}    // NUEVO
    />
  );
}