// src/app/api/people/merge/preview/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

/** Strip diacritics (tildes, dieresis, etc.) for name comparison */
function normalizeForComparison(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  try {
    const { personAId, personBId } = await request.json();

    if (!personAId || !personBId) {
      return NextResponse.json(
        { message: 'Se requieren ambos IDs de personas' },
        { status: 400 }
      );
    }

    if (personAId === personBId) {
      return NextResponse.json(
        { message: 'No se puede mergear una persona consigo misma' },
        { status: 400 }
      );
    }

    const personInclude = {
      birthLocation: {
        include: {
          parent: {
            include: {
              parent: {
                include: { parent: true }
              }
            }
          }
        }
      },
      deathLocation: {
        include: {
          parent: {
            include: {
              parent: {
                include: { parent: true }
              }
            }
          }
        }
      },
      alternativeNames: true,
      links: { orderBy: { displayOrder: 'asc' as const } },
      nationalities: {
        include: { location: true }
      },
      _count: {
        select: {
          castRoles: true,
          crewRoles: true,
          imageAppearances: true,
          awards: true,
          festivalJury: true,
          festivalAwardWinners: true,
          pageViews: true,
        }
      }
    };

    // Fetch persons and their cast/crew in parallel
    const [personA, personB, castA, castB, crewA, crewB] = await Promise.all([
      prisma.person.findUnique({ where: { id: personAId }, include: personInclude }),
      prisma.person.findUnique({ where: { id: personBId }, include: personInclude }),
      prisma.movieCast.findMany({
        where: { personId: personAId },
        select: { movieId: true }
      }),
      prisma.movieCast.findMany({
        where: { personId: personBId },
        select: { movieId: true }
      }),
      prisma.movieCrew.findMany({
        where: { personId: personAId },
        select: { movieId: true, roleId: true }
      }),
      prisma.movieCrew.findMany({
        where: { personId: personBId },
        select: { movieId: true, roleId: true }
      }),
    ]);

    if (!personA || !personB) {
      return NextResponse.json(
        { message: 'Una o ambas personas no fueron encontradas' },
        { status: 404 }
      );
    }

    // Movie counts
    const movieCountA = personA._count.castRoles + personA._count.crewRoles;
    const movieCountB = personB._count.castRoles + personB._count.crewRoles;

    let suggestedSurvivor: 'A' | 'B' | 'TIE';
    if (movieCountA > movieCountB) suggestedSurvivor = 'A';
    else if (movieCountB > movieCountA) suggestedSurvivor = 'B';
    else suggestedSurvivor = 'TIE';

    // Compute shared relation counts (symmetric - same regardless of who survives)
    const castMovieIdsA = new Set(castA.map(c => c.movieId));
    const castMovieIdsB = new Set(castB.map(c => c.movieId));
    const sharedCastCount = [...castMovieIdsA].filter(id => castMovieIdsB.has(id)).length;

    const crewKeysA = new Set(crewA.map(c => `${c.movieId}:${c.roleId}`));
    const crewKeysB = new Set(crewB.map(c => `${c.movieId}:${c.roleId}`));
    const sharedCrewCount = [...crewKeysA].filter(k => crewKeysB.has(k)).length;

    const altNamesSetA = new Set(personA.alternativeNames.map(a => a.fullName.toLowerCase()));
    const altNamesSetB = new Set(personB.alternativeNames.map(a => a.fullName.toLowerCase()));

    const linkUrlsSetA = new Set(personA.links.map(l => l.url));
    const linkUrlsSetB = new Set(personB.links.map(l => l.url));

    const natIdsSetA = new Set(personA.nationalities.map(n => n.locationId));
    const natIdsSetB = new Set(personB.nationalities.map(n => n.locationId));

    // Helper to format location path
    function formatLocationPath(location: any): string {
      if (!location) return '';
      const parts: string[] = [];
      let current = location;
      while (current) {
        parts.push(current.name);
        current = current.parent;
      }
      return parts.join(', ');
    }

    // Helper to format date
    function formatPartialDate(year: number | null, month: number | null, day: number | null): string {
      if (!year) return '';
      const parts = [String(year)];
      if (month) parts.push(String(month).padStart(2, '0'));
      if (day) parts.push(String(day).padStart(2, '0'));
      return parts.join('-');
    }

    // Build neutral field comparisons (both values always included)
    const nameA = [personA.firstName, personA.lastName].filter(Boolean).join(' ');
    const nameB = [personB.firstName, personB.lastName].filter(Boolean).join(' ');

    type FieldComparison = {
      field: string;
      label: string;
      valueA: any;
      valueB: any;
      displayA: string;
      displayB: string;
    };

    const fieldComparisons: FieldComparison[] = [];

    // Name
    if (normalizeForComparison(nameA) !== normalizeForComparison(nameB)) {
      fieldComparisons.push({
        field: 'name',
        label: 'Nombre',
        valueA: { firstName: personA.firstName, lastName: personA.lastName },
        valueB: { firstName: personB.firstName, lastName: personB.lastName },
        displayA: nameA,
        displayB: nameB,
      });
    }

    // Scalar fields - always include if at least one has a value
    const scalarFields = [
      {
        field: 'realName', label: 'Nombre real',
        valA: personA.realName, valB: personB.realName,
        dispA: personA.realName || '', dispB: personB.realName || '',
      },
      {
        field: 'birthDate', label: 'Fecha de nacimiento',
        valA: { year: personA.birthYear, month: personA.birthMonth, day: personA.birthDay },
        valB: { year: personB.birthYear, month: personB.birthMonth, day: personB.birthDay },
        dispA: formatPartialDate(personA.birthYear, personA.birthMonth, personA.birthDay),
        dispB: formatPartialDate(personB.birthYear, personB.birthMonth, personB.birthDay),
      },
      {
        field: 'deathDate', label: 'Fecha de fallecimiento',
        valA: { year: personA.deathYear, month: personA.deathMonth, day: personA.deathDay },
        valB: { year: personB.deathYear, month: personB.deathMonth, day: personB.deathDay },
        dispA: formatPartialDate(personA.deathYear, personA.deathMonth, personA.deathDay),
        dispB: formatPartialDate(personB.deathYear, personB.deathMonth, personB.deathDay),
      },
      {
        field: 'birthLocation', label: 'Lugar de nacimiento',
        valA: personA.birthLocationId, valB: personB.birthLocationId,
        dispA: formatLocationPath(personA.birthLocation), dispB: formatLocationPath(personB.birthLocation),
      },
      {
        field: 'deathLocation', label: 'Lugar de fallecimiento',
        valA: personA.deathLocationId, valB: personB.deathLocationId,
        dispA: formatLocationPath(personA.deathLocation), dispB: formatLocationPath(personB.deathLocation),
      },
      {
        field: 'biography', label: 'Biografía',
        valA: personA.biography, valB: personB.biography,
        dispA: personA.biography ? (personA.biography.length > 100 ? personA.biography.substring(0, 100) + '...' : personA.biography) : '',
        dispB: personB.biography ? (personB.biography.length > 100 ? personB.biography.substring(0, 100) + '...' : personB.biography) : '',
      },
      {
        field: 'photo', label: 'Foto',
        valA: personA.photoUrl, valB: personB.photoUrl,
        dispA: personA.photoUrl || '', dispB: personB.photoUrl || '',
      },
      {
        field: 'gender', label: 'Género',
        valA: personA.gender, valB: personB.gender,
        dispA: personA.gender || '', dispB: personB.gender || '',
      },
      {
        field: 'imdbId', label: 'IMDb ID',
        valA: personA.imdbId, valB: personB.imdbId,
        dispA: personA.imdbId || '', dispB: personB.imdbId || '',
      },
      {
        field: 'tmdbId', label: 'TMDB ID',
        valA: personA.tmdbId, valB: personB.tmdbId,
        dispA: personA.tmdbId ? String(personA.tmdbId) : '', dispB: personB.tmdbId ? String(personB.tmdbId) : '',
      },
    ];

    for (const sf of scalarFields) {
      const isDateField = sf.field === 'birthDate' || sf.field === 'deathDate';
      const aEmpty = isDateField ? !sf.dispA : (sf.valA === null || sf.valA === undefined || sf.valA === '');
      const bEmpty = isDateField ? !sf.dispB : (sf.valB === null || sf.valB === undefined || sf.valB === '');

      // Skip if both empty
      if (aEmpty && bEmpty) continue;

      // Include if at least one has a value
      fieldComparisons.push({
        field: sf.field,
        label: sf.label,
        valueA: sf.valA,
        valueB: sf.valB,
        displayA: sf.dispA,
        displayB: sf.dispB,
      });
    }

    return NextResponse.json({
      personA: {
        ...personA,
        movieCount: movieCountA,
      },
      personB: {
        ...personB,
        movieCount: movieCountB,
      },
      suggestedSurvivor,
      fieldComparisons,
      // Shared counts (symmetric)
      sharedCastCount,
      sharedCrewCount,
      // Per-person unique counts for the frontend to use based on survivorChoice
      uniqueCounts: {
        A: {
          castToTransfer: castA.length - sharedCastCount,
          crewToTransfer: crewA.length - sharedCrewCount,
          altNamesToAdd: [...altNamesSetA].filter(n => !altNamesSetB.has(n)).length,
          linksToTransfer: personA.links.filter(l => !linkUrlsSetB.has(l.url)).length,
          nationalitiesToAdd: personA.nationalities.filter(n => !natIdsSetB.has(n.locationId)).length,
          imageAppearances: personA._count.imageAppearances,
          awards: personA._count.awards,
          festivalJury: personA._count.festivalJury,
          festivalAwardWinners: personA._count.festivalAwardWinners,
          pageViews: personA._count.pageViews,
        },
        B: {
          castToTransfer: castB.length - sharedCastCount,
          crewToTransfer: crewB.length - sharedCrewCount,
          altNamesToAdd: [...altNamesSetB].filter(n => !altNamesSetA.has(n)).length,
          linksToTransfer: personB.links.filter(l => !linkUrlsSetA.has(l.url)).length,
          nationalitiesToAdd: personB.nationalities.filter(n => !natIdsSetA.has(n.locationId)).length,
          imageAppearances: personB._count.imageAppearances,
          awards: personB._count.awards,
          festivalJury: personB._count.festivalJury,
          festivalAwardWinners: personB._count.festivalAwardWinners,
          pageViews: personB._count.pageViews,
        },
      },
    });
  } catch (error) {
    console.error('Error in merge preview:', error);
    return NextResponse.json(
      { message: 'Error al generar preview del merge' },
      { status: 500 }
    );
  }
}
