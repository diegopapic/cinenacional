// src/app/api/movies/list/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// Esta ruta usa searchParams, debe ser dinámica
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    // Extraer parámetros
    const search = searchParams.get('search') || '';
    const soundType = searchParams.get('soundType') || '';
    const colorTypeId = searchParams.get('colorTypeId');
    const tipoDuracion = searchParams.get('tipoDuracion') || '';
    const countryId = searchParams.get('countryId');
    const genreId = searchParams.get('genreId');
    const ratingId = searchParams.get('ratingId');
    const releaseDateFrom = searchParams.get('releaseDateFrom');
    const releaseDateTo = searchParams.get('releaseDateTo');
    const productionYearFrom = searchParams.get('productionYearFrom');
    const productionYearTo = searchParams.get('productionYearTo');
    const sortBy = searchParams.get('sortBy') || 'updatedAt';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '60'), 100);
    const skip = (page - 1) * limit;

    // Construir condiciones WHERE
    const where: Prisma.MovieWhereInput = {};

    // Búsqueda por título
    if (search) {
      where.title = {
        contains: search,
        mode: 'insensitive'
      };
    }

    // Filtro de sonido
    if (soundType) {
      where.soundType = soundType;
    }

    // Filtro de color
    if (colorTypeId) {
      where.colorTypeId = parseInt(colorTypeId);
    }

    // Filtro de tipo de duración
    if (tipoDuracion) {
      where.tipoDuracion = tipoDuracion;
    }

    // Filtro de país coproductor
    if (countryId) {
      where.movieCountries = {
        some: {
          countryId: parseInt(countryId)
        }
      };
    }

    // Filtro de género
    if (genreId) {
      where.genres = {
        some: {
          genreId: parseInt(genreId)
        }
      };
    }

    // Filtro de calificación/restricción
    if (ratingId) {
      where.ratingId = parseInt(ratingId);
    }

    // Filtros de fecha de estreno (fecha completa YYYY-MM-DD)
    if (releaseDateFrom || releaseDateTo) {
      const conditions: Prisma.MovieWhereInput[] = [];

      if (releaseDateFrom) {
        const [yearFrom, monthFrom, dayFrom] = releaseDateFrom.split('-').map(Number);
        // Películas con fecha >= releaseDateFrom
        conditions.push({
          OR: [
            { releaseYear: { gt: yearFrom } },
            {
              releaseYear: yearFrom,
              OR: [
                { releaseMonth: { gt: monthFrom } },
                {
                  releaseMonth: monthFrom,
                  releaseDay: { gte: dayFrom }
                },
                {
                  releaseMonth: monthFrom,
                  releaseDay: null
                },
                { releaseMonth: null }
              ]
            }
          ]
        });
      }

      if (releaseDateTo) {
        const [yearTo, monthTo, dayTo] = releaseDateTo.split('-').map(Number);
        // Películas con fecha <= releaseDateTo
        conditions.push({
          OR: [
            { releaseYear: { lt: yearTo } },
            {
              releaseYear: yearTo,
              OR: [
                { releaseMonth: { lt: monthTo } },
                {
                  releaseMonth: monthTo,
                  releaseDay: { lte: dayTo }
                },
                {
                  releaseMonth: monthTo,
                  releaseDay: null
                },
                { releaseMonth: null }
              ]
            }
          ]
        });
      }

      if (conditions.length > 0) {
        where.AND = conditions;
      }
    }

    // Filtros de año de producción
    if (productionYearFrom || productionYearTo) {
      where.year = {};
      if (productionYearFrom) {
        where.year.gte = parseInt(productionYearFrom);
      }
      if (productionYearTo) {
        where.year.lte = parseInt(productionYearTo);
      }
    }

    // Para ordenamiento alfabético, usar raw query con unaccent y sin artículos
    if (sortBy === 'title') {
      // Usar raw query para ordenamiento alfabético refinado
      const movies = await getMoviesWithAlphabeticSort(where, sortOrder, skip, limit);
      const totalCount = await prisma.movie.count({ where });
      const totalPages = Math.ceil(totalCount / limit);

      return NextResponse.json({
        data: movies,
        totalCount,
        page,
        totalPages,
        hasMore: page < totalPages
      });
    }

    // Determinar ordenamiento para otros casos
    let orderBy: Prisma.MovieOrderByWithRelationInput | Prisma.MovieOrderByWithRelationInput[];

    switch (sortBy) {
      case 'releaseDate':
        orderBy = [
          { releaseYear: sortOrder === 'desc' ? { sort: 'desc', nulls: 'last' } : { sort: 'asc', nulls: 'last' } },
          { releaseMonth: sortOrder === 'desc' ? { sort: 'desc', nulls: 'last' } : { sort: 'asc', nulls: 'last' } },
          { releaseDay: sortOrder === 'desc' ? { sort: 'desc', nulls: 'last' } : { sort: 'asc', nulls: 'last' } }
        ];
        break;
      case 'duration':
        orderBy = { duration: sortOrder === 'desc' ? { sort: 'desc', nulls: 'last' } : { sort: 'asc', nulls: 'last' } };
        break;
      case 'id':
        orderBy = { id: sortOrder };
        break;
      case 'updatedAt':
      default:
        orderBy = { updatedAt: sortOrder };
        break;
    }

    // Ejecutar consultas en paralelo
    const [movies, totalCount] = await Promise.all([
      prisma.movie.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          slug: true,
          title: true,
          year: true,
          releaseYear: true,
          releaseMonth: true,
          releaseDay: true,
          duration: true,
          tipoDuracion: true,
          posterUrl: true,
          stage: true,
          soundType: true,
          synopsis: true,
          colorType: {
            select: {
              id: true,
              name: true
            }
          },
          genres: {
            select: {
              genre: {
                select: {
                  id: true,
                  name: true
                }
              }
            },
            take: 3
          },
          crew: {
            where: {
              roleId: 2 // Director
            },
            select: {
              person: {
                select: {
                  id: true,
                  slug: true,
                  firstName: true,
                  lastName: true
                }
              }
            },
            take: 2
          },
          movieCountries: {
            select: {
              location: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      }),
      prisma.movie.count({ where })
    ]);

    // Transformar datos
    const data = movies.map(movie => ({
      id: movie.id,
      slug: movie.slug,
      title: movie.title,
      year: movie.year,
      releaseYear: movie.releaseYear,
      releaseMonth: movie.releaseMonth,
      releaseDay: movie.releaseDay,
      duration: movie.duration,
      tipoDuracion: movie.tipoDuracion,
      posterUrl: movie.posterUrl,
      stage: movie.stage,
      soundType: movie.soundType,
      synopsis: movie.synopsis,
      colorType: movie.colorType,
      genres: movie.genres.map(g => ({
        id: g.genre.id,
        name: g.genre.name
      })),
      directors: movie.crew.map(c => ({
        id: c.person.id,
        slug: c.person.slug,
        name: [c.person.firstName, c.person.lastName].filter(Boolean).join(' ')
      })),
      countries: movie.movieCountries.map(mc => ({
        id: mc.location.id,
        name: mc.location.name
      }))
    }));

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      data,
      totalCount,
      page,
      totalPages,
      hasMore: page < totalPages
    });

  } catch (error) {
    console.error('Error fetching movies list:', error);
    return NextResponse.json(
      { error: 'Failed to fetch movies' },
      { status: 500 }
    );
  }
}

/**
 * Obtiene películas con ordenamiento alfabético refinado:
 * - Ignora artículos al inicio (el, la, los, las, un, una, unos, unas)
 * - Ignora signos de puntuación al inicio
 * - Ignora tildes y diéresis
 */
async function getMoviesWithAlphabeticSort(
  where: Prisma.MovieWhereInput,
  sortOrder: 'asc' | 'desc',
  skip: number,
  limit: number
) {
  // Construir WHERE clause para SQL
  const whereClauses: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (where.title && typeof where.title === 'object' && 'contains' in where.title) {
    whereClauses.push(`m.title ILIKE $${paramIndex}`);
    params.push(`%${where.title.contains}%`);
    paramIndex++;
  }

  if (where.soundType) {
    whereClauses.push(`m.sound_type = $${paramIndex}`);
    params.push(where.soundType);
    paramIndex++;
  }

  if (where.colorTypeId) {
    whereClauses.push(`m.color_type_id = $${paramIndex}`);
    params.push(where.colorTypeId);
    paramIndex++;
  }

  if (where.tipoDuracion) {
    whereClauses.push(`m.tipo_duracion = $${paramIndex}`);
    params.push(where.tipoDuracion);
    paramIndex++;
  }

  if (where.movieCountries && 'some' in where.movieCountries) {
    whereClauses.push(`EXISTS (SELECT 1 FROM movie_countries mc WHERE mc.movie_id = m.id AND mc.country_id = $${paramIndex})`);
    params.push((where.movieCountries.some as any).countryId);
    paramIndex++;
  }

  if (where.genres && 'some' in where.genres) {
    whereClauses.push(`EXISTS (SELECT 1 FROM movie_genres mg WHERE mg.movie_id = m.id AND mg.genre_id = $${paramIndex})`);
    params.push((where.genres.some as any).genreId);
    paramIndex++;
  }

  if (where.ratingId) {
    whereClauses.push(`m.rating_id = $${paramIndex}`);
    params.push(where.ratingId);
    paramIndex++;
  }

  if (where.year && typeof where.year === 'object') {
    if ('gte' in where.year) {
      whereClauses.push(`m.year >= $${paramIndex}`);
      params.push(where.year.gte);
      paramIndex++;
    }
    if ('lte' in where.year) {
      whereClauses.push(`m.year <= $${paramIndex}`);
      params.push(where.year.lte);
      paramIndex++;
    }
  }

  // Manejar filtros de fecha de estreno (AND conditions)
  if (where.AND && Array.isArray(where.AND)) {
    // Por simplicidad, para el ordenamiento alfabético ignoramos los filtros complejos de fecha
    // y usamos solo releaseYear si está presente
  }

  const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
  const orderDirection = sortOrder === 'desc' ? 'DESC' : 'ASC';

  // Query principal con ordenamiento refinado
  // 1. Quitar artículos del inicio (case insensitive) - PRIMERO para que "El "Lusitania"" → ""Lusitania""
  // 2. Quitar signos de puntuación del inicio - DESPUÉS para que ""Lusitania"" → "Lusitania"
  // 3. Aplicar unaccent para normalizar tildes
  // 4. Convertir a minúsculas para comparación
  // Nota: títulos que quedan vacíos después de limpiar van al final
  const query = `
    WITH cleaned_titles AS (
      SELECT
        m.*,
        TRIM(
          regexp_replace(
            regexp_replace(
              m.title,
              '^(el|la|los|las|un|una|unos|unas)[[:space:]]+',
              '',
              'i'
            ),
            '^[^a-zA-Z0-9áéíóúüñÁÉÍÓÚÜÑ]+',
            ''
          )
        ) as sort_title
      FROM movies m
      ${whereSQL}
    )
    SELECT
      id, slug, title, year, release_year, release_month, release_day,
      duration, tipo_duracion, poster_url, stage, sound_type, synopsis,
      color_type_id
    FROM cleaned_titles
    ORDER BY
      CASE WHEN sort_title = '' OR sort_title IS NULL THEN 1 ELSE 0 END,
      LOWER(unaccent(COALESCE(NULLIF(sort_title, ''), title))) ${orderDirection},
      title ${orderDirection}
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  params.push(limit, skip);

  const rawMovies = await prisma.$queryRawUnsafe<any[]>(query, ...params);

  // Obtener IDs para cargar relaciones
  const movieIds = rawMovies.map(m => m.id);

  if (movieIds.length === 0) {
    return [];
  }

  // Cargar relaciones adicionales
  const [colorTypes, genres, crew, countries] = await Promise.all([
    prisma.colorType.findMany({
      where: { id: { in: rawMovies.map(m => m.color_type_id).filter(Boolean) } },
      select: { id: true, name: true }
    }),
    prisma.movieGenre.findMany({
      where: { movieId: { in: movieIds } },
      select: {
        movieId: true,
        genre: { select: { id: true, name: true } }
      },
      take: movieIds.length * 3
    }),
    prisma.movieCrew.findMany({
      where: { movieId: { in: movieIds }, roleId: 2 },
      select: {
        movieId: true,
        person: { select: { id: true, slug: true, firstName: true, lastName: true } }
      },
      take: movieIds.length * 2
    }),
    prisma.movieCountry.findMany({
      where: { movieId: { in: movieIds } },
      select: {
        movieId: true,
        location: { select: { id: true, name: true } }
      }
    })
  ]);

  // Crear mapas para lookup rápido
  const colorTypeMap = new Map(colorTypes.map(ct => [ct.id, ct]));
  const genresByMovie = new Map<number, typeof genres>();
  const crewByMovie = new Map<number, typeof crew>();
  const countriesByMovie = new Map<number, typeof countries>();

  genres.forEach(g => {
    const existing = genresByMovie.get(g.movieId) || [];
    if (existing.length < 3) {
      existing.push(g);
      genresByMovie.set(g.movieId, existing);
    }
  });

  crew.forEach(c => {
    const existing = crewByMovie.get(c.movieId) || [];
    if (existing.length < 2) {
      existing.push(c);
      crewByMovie.set(c.movieId, existing);
    }
  });

  countries.forEach(c => {
    const existing = countriesByMovie.get(c.movieId) || [];
    existing.push(c);
    countriesByMovie.set(c.movieId, existing);
  });

  // Transformar resultados manteniendo el orden del query original
  return rawMovies.map(movie => ({
    id: movie.id,
    slug: movie.slug,
    title: movie.title,
    year: movie.year,
    releaseYear: movie.release_year,
    releaseMonth: movie.release_month,
    releaseDay: movie.release_day,
    duration: movie.duration,
    tipoDuracion: movie.tipo_duracion,
    posterUrl: movie.poster_url,
    stage: movie.stage,
    soundType: movie.sound_type,
    synopsis: movie.synopsis,
    colorType: movie.color_type_id ? colorTypeMap.get(movie.color_type_id) || null : null,
    genres: (genresByMovie.get(movie.id) || []).map(g => ({
      id: g.genre.id,
      name: g.genre.name
    })),
    directors: (crewByMovie.get(movie.id) || []).map(c => ({
      id: c.person.id,
      slug: c.person.slug,
      name: [c.person.firstName, c.person.lastName].filter(Boolean).join(' ')
    })),
    countries: (countriesByMovie.get(movie.id) || []).map(c => ({
      id: c.location.id,
      name: c.location.name
    }))
  }));
}
