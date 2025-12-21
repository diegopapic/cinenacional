// src/app/api/people/list/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Parámetros de filtrado
    const search = searchParams.get('search');
    const gender = searchParams.get('gender');
    const birthLocationId = searchParams.get('birthLocationId');
    const deathLocationId = searchParams.get('deathLocationId');
    const nationalityId = searchParams.get('nationalityId');
    const roleId = searchParams.get('roleId');
    const birthYearFrom = searchParams.get('birthYearFrom');
    const birthYearTo = searchParams.get('birthYearTo');
    const deathYearFrom = searchParams.get('deathYearFrom');
    const deathYearTo = searchParams.get('deathYearTo');
    
    // Parámetros de ordenamiento y paginación
    const sortBy = searchParams.get('sortBy') || 'id';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '60');
    const skip = (page - 1) * limit;

    // Construir WHERE clause
    const where: Prisma.PersonWhereInput = {
      isActive: true
    };

    // Filtro de búsqueda por nombre
    if (search && search.trim().length >= 2) {
      const searchTerms = search.trim().split(/\s+/);
      
      if (searchTerms.length === 1) {
        where.OR = [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { realName: { contains: search, mode: 'insensitive' } },
        ];
      } else {
        where.OR = [
          { realName: { contains: search, mode: 'insensitive' } },
          {
            AND: searchTerms.map(term => ({
              OR: [
                { firstName: { contains: term, mode: 'insensitive' } },
                { lastName: { contains: term, mode: 'insensitive' } },
              ]
            }))
          }
        ];
      }
    }

    // Filtro de género
    if (gender === 'MALE' || gender === 'FEMALE' || gender === 'OTHER') {
      where.gender = gender;
    }

    // Filtro de ubicación de nacimiento
    if (birthLocationId) {
      where.birthLocationId = parseInt(birthLocationId);
    }

    // Filtro de ubicación de muerte
    if (deathLocationId) {
      where.deathLocationId = parseInt(deathLocationId);
    }

    // Filtro de nacionalidad
    if (nationalityId) {
      where.nationalities = {
        some: {
          locationId: parseInt(nationalityId)
        }
      };
    }

    // Filtro de rol (Actor o rol técnico)
    if (roleId) {
      if (roleId === 'ACTOR') {
        where.castRoles = {
          some: {}
        };
      } else {
        where.crewRoles = {
          some: {
            roleId: parseInt(roleId)
          }
        };
      }
    }

    // Filtro de rango de año de nacimiento
    if (birthYearFrom || birthYearTo) {
      where.birthYear = {};
      if (birthYearFrom) {
        where.birthYear.gte = parseInt(birthYearFrom);
      }
      if (birthYearTo) {
        where.birthYear.lte = parseInt(birthYearTo);
      }
    }

    // Filtro de rango de año de muerte
    if (deathYearFrom || deathYearTo) {
      where.deathYear = {};
      if (deathYearFrom) {
        where.deathYear.gte = parseInt(deathYearFrom);
      }
      if (deathYearTo) {
        where.deathYear.lte = parseInt(deathYearTo);
      }
    }

    // Si ordenamos por fecha de nacimiento, excluir personas sin fecha de nacimiento
    if (sortBy === 'birthDate') {
      where.birthYear = where.birthYear || {};
      where.birthYear.not = null;
    }

    // Si ordenamos por fecha de muerte, excluir personas sin fecha de muerte
    if (sortBy === 'deathDate') {
      where.deathYear = where.deathYear || {};
      where.deathYear.not = null;
    }

    // Construir filtros SQL para queries raw
    const buildWhereClause = () => {
      const conditions: Prisma.Sql[] = [Prisma.sql`p.is_active = true`];
      
      if (birthLocationId) {
        conditions.push(Prisma.sql`p.birth_location_id = ${parseInt(birthLocationId)}`);
      }
      if (deathLocationId) {
        conditions.push(Prisma.sql`p.death_location_id = ${parseInt(deathLocationId)}`);
      }
      if (gender) {
        conditions.push(Prisma.sql`p.gender = ${gender}::"Gender"`);
      }
      if (birthYearFrom) {
        conditions.push(Prisma.sql`p.birth_year >= ${parseInt(birthYearFrom)}`);
      }
      if (birthYearTo) {
        conditions.push(Prisma.sql`p.birth_year <= ${parseInt(birthYearTo)}`);
      }
      if (deathYearFrom) {
        conditions.push(Prisma.sql`p.death_year >= ${parseInt(deathYearFrom)}`);
      }
      if (deathYearTo) {
        conditions.push(Prisma.sql`p.death_year <= ${parseInt(deathYearTo)}`);
      }
      if (nationalityId) {
        conditions.push(Prisma.sql`EXISTS (SELECT 1 FROM person_nationalities pn WHERE pn.person_id = p.id AND pn.location_id = ${parseInt(nationalityId)})`);
      }
      if (roleId === 'ACTOR') {
        conditions.push(Prisma.sql`EXISTS (SELECT 1 FROM movie_cast mc WHERE mc.person_id = p.id)`);
      }
      if (roleId && roleId !== 'ACTOR') {
        conditions.push(Prisma.sql`EXISTS (SELECT 1 FROM movie_crew mcr WHERE mcr.person_id = p.id AND mcr.role_id = ${parseInt(roleId)})`);
      }
      if (sortBy === 'birthDate') {
        conditions.push(Prisma.sql`p.birth_year IS NOT NULL`);
      }
      if (sortBy === 'deathDate') {
        conditions.push(Prisma.sql`p.death_year IS NOT NULL`);
      }
      // Búsqueda por nombre
      if (search && search.trim().length >= 2) {
        const searchTerm = `%${search.trim()}%`;
        conditions.push(Prisma.sql`(
          unaccent(p.first_name) ILIKE unaccent(${searchTerm}) OR
          unaccent(p.last_name) ILIKE unaccent(${searchTerm}) OR
          unaccent(p.real_name) ILIKE unaccent(${searchTerm})
        )`);
      }
      
      return Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;
    };

    // Si el ordenamiento es alfabético, usar query raw con unaccent
    if (sortBy === 'lastName') {
      const whereClause = buildWhereClause();
      const orderDirection = sortOrder === 'desc' ? Prisma.sql`DESC` : Prisma.sql`ASC`;
      
      const peopleIds = await prisma.$queryRaw<Array<{ id: number }>>`
        SELECT p.id
        FROM people p
        ${whereClause}
        ORDER BY unaccent(COALESCE(p.last_name, '')) ${orderDirection}, 
                 unaccent(COALESCE(p.first_name, '')) ${orderDirection},
                 p.id DESC
        LIMIT ${limit}
        OFFSET ${skip}
      `;

      const personIds = peopleIds.map(p => p.id);
      
      if (personIds.length === 0) {
        return NextResponse.json({
          data: [],
          totalCount: 0,
          page,
          totalPages: 0,
          hasMore: false
        });
      }

      const people = await prisma.person.findMany({
        where: { id: { in: personIds } },
        include: {
          nationalities: {
            include: { location: true }
          },
          birthLocation: {
            include: { parent: true }
          },
          deathLocation: {
            include: { parent: true }
          }
        }
      });

      // Mantener el orden del query
      const orderedPeople = personIds.map(id => people.find(p => p.id === id)!).filter(Boolean);
      const peopleWithMovies = await addFeaturedMovies(orderedPeople);
      const totalCount = await prisma.person.count({ where });
      const totalPages = Math.ceil(totalCount / limit);

      return NextResponse.json({
        data: peopleWithMovies,
        totalCount,
        page,
        totalPages,
        hasMore: page < totalPages
      });
    }

    // Si el ordenamiento es por cantidad de películas
    if (sortBy === 'movieCount') {
      const whereClause = buildWhereClause();
      const orderDirection = sortOrder === 'desc' ? Prisma.sql`DESC` : Prisma.sql`ASC`;
      
      const peopleWithMovieCount = await prisma.$queryRaw<Array<{ id: number; movie_count: number }>>`
        SELECT 
          p.id,
          (
            SELECT COUNT(DISTINCT movie_id) FROM (
              SELECT movie_id FROM movie_cast WHERE person_id = p.id
              UNION
              SELECT movie_id FROM movie_crew WHERE person_id = p.id
            ) all_movies
          )::int as movie_count
        FROM people p
        ${whereClause}
        ORDER BY movie_count ${orderDirection}, p.id DESC
        LIMIT ${limit}
        OFFSET ${skip}
      `;

      const personIds = peopleWithMovieCount.map(p => p.id);
      
      if (personIds.length === 0) {
        return NextResponse.json({
          data: [],
          totalCount: 0,
          page,
          totalPages: 0,
          hasMore: false
        });
      }

      const people = await prisma.person.findMany({
        where: { id: { in: personIds } },
        include: {
          nationalities: {
            include: { location: true }
          },
          birthLocation: {
            include: { parent: true }
          },
          deathLocation: {
            include: { parent: true }
          }
        }
      });

      const orderedPeople = personIds.map(id => people.find(p => p.id === id)!).filter(Boolean);
      const peopleWithMovies = await addFeaturedMovies(orderedPeople);
      const totalCount = await prisma.person.count({ where });
      const totalPages = Math.ceil(totalCount / limit);

      return NextResponse.json({
        data: peopleWithMovies,
        totalCount,
        page,
        totalPages,
        hasMore: page < totalPages
      });
    }

    // Query normal para id, birthDate, deathDate
    let orderBy: Prisma.PersonOrderByWithRelationInput | Prisma.PersonOrderByWithRelationInput[];
    
    switch (sortBy) {
      case 'birthDate':
        orderBy = [
          { birthYear: sortOrder as Prisma.SortOrder },
          { birthMonth: sortOrder as Prisma.SortOrder },
          { birthDay: sortOrder as Prisma.SortOrder }
        ];
        break;
      case 'deathDate':
        orderBy = [
          { deathYear: sortOrder as Prisma.SortOrder },
          { deathMonth: sortOrder as Prisma.SortOrder },
          { deathDay: sortOrder as Prisma.SortOrder }
        ];
        break;
      case 'id':
      default:
        orderBy = { id: sortOrder as Prisma.SortOrder };
        break;
    }

    const [people, totalCount] = await Promise.all([
      prisma.person.findMany({
        where,
        include: {
          nationalities: {
            include: { location: true }
          },
          birthLocation: {
            include: { parent: true }
          },
          deathLocation: {
            include: { parent: true }
          }
        },
        orderBy,
        skip,
        take: limit
      }),
      prisma.person.count({ where })
    ]);

    const peopleWithMovies = await addFeaturedMovies(people);
    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      data: peopleWithMovies,
      totalCount,
      page,
      totalPages,
      hasMore: page < totalPages
    });

  } catch (error) {
    console.error('Error fetching people list:', error);
    return NextResponse.json(
      { message: 'Error al obtener listado de personas' },
      { status: 500 }
    );
  }
}

/**
 * Agrega la película destacada (más reciente) y conteo correcto a cada persona
 */
async function addFeaturedMovies(people: any[]): Promise<any[]> {
  if (people.length === 0) return [];

  const personIds = people.map(p => p.id);

  const castMovies = await prisma.$queryRaw<Array<{
    person_id: number;
    movie_id: number;
    movie_slug: string;
    movie_title: string;
    movie_year: number | null;
  }>>`
    SELECT DISTINCT ON (mc.person_id)
      mc.person_id,
      m.id as movie_id,
      m.slug as movie_slug,
      m.title as movie_title,
      m.year as movie_year
    FROM movie_cast mc
    INNER JOIN movies m ON m.id = mc.movie_id
    WHERE mc.person_id = ANY(${personIds})
    ORDER BY mc.person_id, m.year DESC NULLS LAST, m.id DESC
  `;

  const crewMovies = await prisma.$queryRaw<Array<{
    person_id: number;
    movie_id: number;
    movie_slug: string;
    movie_title: string;
    movie_year: number | null;
    role_name: string;
  }>>`
    SELECT DISTINCT ON (mcr.person_id)
      mcr.person_id,
      m.id as movie_id,
      m.slug as movie_slug,
      m.title as movie_title,
      m.year as movie_year,
      r.name as role_name
    FROM movie_crew mcr
    INNER JOIN movies m ON m.id = mcr.movie_id
    INNER JOIN roles r ON r.id = mcr.role_id
    WHERE mcr.person_id = ANY(${personIds})
    ORDER BY mcr.person_id, m.year DESC NULLS LAST, m.id DESC
  `;

  const movieCounts = await prisma.$queryRaw<Array<{ person_id: number; movie_count: number }>>`
    SELECT 
      person_id,
      COUNT(DISTINCT movie_id)::int as movie_count
    FROM (
      SELECT person_id, movie_id FROM movie_cast WHERE person_id = ANY(${personIds})
      UNION ALL
      SELECT person_id, movie_id FROM movie_crew WHERE person_id = ANY(${personIds})
    ) all_roles
    GROUP BY person_id
  `;

  const castMap = new Map(castMovies.map(c => [c.person_id, c]));
  const crewMap = new Map(crewMovies.map(c => [c.person_id, c]));
  const movieCountMap = new Map(movieCounts.map(c => [c.person_id, c.movie_count]));

  return people.map(person => {
    const castMovie = castMap.get(person.id);
    const crewMovie = crewMap.get(person.id);

    let featuredMovie = null;

    if (castMovie && crewMovie) {
      const castYear = castMovie.movie_year || 0;
      const crewYear = crewMovie.movie_year || 0;
      
      if (castYear >= crewYear) {
        featuredMovie = {
          id: castMovie.movie_id,
          slug: castMovie.movie_slug,
          title: castMovie.movie_title,
          year: castMovie.movie_year,
          role: 'Actor'
        };
      } else {
        featuredMovie = {
          id: crewMovie.movie_id,
          slug: crewMovie.movie_slug,
          title: crewMovie.movie_title,
          year: crewMovie.movie_year,
          role: crewMovie.role_name
        };
      }
    } else if (castMovie) {
      featuredMovie = {
        id: castMovie.movie_id,
        slug: castMovie.movie_slug,
        title: castMovie.movie_title,
        year: castMovie.movie_year,
        role: 'Actor'
      };
    } else if (crewMovie) {
      featuredMovie = {
        id: crewMovie.movie_id,
        slug: crewMovie.movie_slug,
        title: crewMovie.movie_title,
        year: crewMovie.movie_year,
        role: crewMovie.role_name
      };
    }

    return {
      ...person,
      name: `${person.firstName || ''} ${person.lastName || ''}`.trim() || person.realName || 'Sin nombre',
      featuredMovie,
      movieCount: movieCountMap.get(person.id) || 0
    };
  });
}