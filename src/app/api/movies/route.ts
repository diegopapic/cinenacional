// src/app/api/movies/route.ts - CON REDIS CACHE
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { movieSchema } from '@/lib/schemas'
import { generateUniqueSlug } from '@/lib/utils/slugs'
import RedisClient from '@/lib/redis'

// ============================================
// CACHE CONFIGURATION
// ============================================

// Cache en memoria como fallback
const memoryCache = new Map<string, { data: any; timestamp: number }>();
const MEMORY_CACHE_TTL = 60 * 60 * 1000; // 1 hora en ms

// TTL diferenciado según tipo de consulta
function getRedisTTL(searchParams: URLSearchParams): number {
  const upcoming = searchParams.get('upcoming');
  const year = searchParams.get('year');
  const yearFrom = searchParams.get('yearFrom');
  
  // Próximos estrenos: 15 minutos (cambian frecuentemente)
  if (upcoming === 'true') {
    return 900; // 15 minutos
  }
  
  // Datos históricos: 24 horas (no cambian)
  if (year || yearFrom) {
    return 86400; // 24 horas
  }
  
  // Por defecto: 1 hora
  return 3600;
}

// Genera clave única basada en los parámetros de búsqueda
function generateCacheKey(searchParams: URLSearchParams): string {
  const relevantParams = [
    'page',
    'limit',
    'search',
    'genre',
    'year',
    'yearFrom',
    'yearTo',
    'stage',
    'sortBy',
    'sortOrder',
    'upcoming'
  ];
  
  const keyParts = relevantParams
    .map(param => {
      const value = searchParams.get(param);
      return value ? `${param}:${value}` : null;
    })
    .filter(Boolean);
  
  return `movies:list:${keyParts.join(':')}:v1`;
}

// ============================================
// GET /api/movies - Obtener lista de películas con filtros
// ============================================
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Generar clave de caché única
    const cacheKey = generateCacheKey(searchParams);
    const redisTTL = getRedisTTL(searchParams);
    
    // 1. Intentar obtener de Redis
    try {
      const redisCached = await RedisClient.get(cacheKey);
      
      if (redisCached) {
        console.log(`✅ Cache HIT desde Redis para listado: ${cacheKey.substring(0, 60)}...`);
        return NextResponse.json(
          JSON.parse(redisCached),
          {
            headers: {
              'Cache-Control': `public, s-maxage=${redisTTL}, stale-while-revalidate=${redisTTL * 2}`,
              'X-Cache': 'HIT',
              'X-Cache-Source': 'redis'
            }
          }
        );
      }
    } catch (redisError) {
      console.error('Redis error (non-fatal):', redisError);
    }
    
    // 2. Verificar caché en memoria como fallback
    const now = Date.now();
    const memoryCached = memoryCache.get(cacheKey);
    
    if (memoryCached && (now - memoryCached.timestamp) < MEMORY_CACHE_TTL) {
      console.log(`✅ Cache HIT desde memoria para listado: ${cacheKey.substring(0, 60)}...`);
      
      // Intentar guardar en Redis para próximas requests
      RedisClient.set(cacheKey, JSON.stringify(memoryCached.data), redisTTL)
        .catch(err => console.error('Error guardando en Redis:', err));
      
      return NextResponse.json(memoryCached.data, {
        headers: {
          'Cache-Control': `public, s-maxage=${redisTTL}, stale-while-revalidate=${redisTTL * 2}`,
          'X-Cache': 'HIT',
          'X-Cache-Source': 'memory'
        }
      });
    }
    
    // 3. No hay caché, consultar base de datos
    console.log(`🔄 Cache MISS - Consultando BD para listado: ${cacheKey.substring(0, 60)}...`);
    
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const genre = searchParams.get('genre') || ''
    const year = searchParams.get('year') || ''
    const stage = searchParams.get('stage') || ''
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc' as 'asc' | 'desc'
    const yearFrom = searchParams.get('yearFrom') || ''
    const yearTo = searchParams.get('yearTo') || ''
    const upcoming = searchParams.get('upcoming') || ''

    // Si hay búsqueda, usar query SQL con unaccent
    if (search) {
      try {
        const searchQuery = search.toLowerCase().trim()
        const searchPattern = `%${searchQuery}%`
        const skip = (page - 1) * limit

        const movies = await prisma.$queryRaw<any[]>`
          SELECT
            id,
            slug,
            title,
            year,
            release_year as "releaseYear",
            release_month as "releaseMonth",
            release_day as "releaseDay",
            duration,
            poster_url as "posterUrl",
            stage
          FROM movies
          WHERE
            unaccent(LOWER(title)) LIKE unaccent(${searchPattern})
          ORDER BY
            CASE
              WHEN unaccent(LOWER(title)) = unaccent(${searchQuery}) THEN 0
              WHEN unaccent(LOWER(title)) LIKE unaccent(${searchQuery + '%'}) THEN 1
              ELSE 2
            END,
            LENGTH(title) ASC,
            title ASC
          LIMIT ${limit}
          OFFSET ${skip}
        `

        const totalResult = await prisma.$queryRaw<{ count: number }[]>`
          SELECT COUNT(*)::int as count
          FROM movies
          WHERE 
            unaccent(LOWER(title)) LIKE unaccent(${searchPattern})
        `

        const total = totalResult[0]?.count || 0
        const movieIds = movies.map(m => m.id)

        if (movieIds.length > 0) {
          const [genres, countries] = await Promise.all([
            prisma.movieGenre.findMany({
              where: { movieId: { in: movieIds } },
              include: { genre: true }
            }),
            prisma.movieCountry.findMany({
              where: { movieId: { in: movieIds }, isPrimary: true },
              include: { location: true }
            })
          ])

          const formattedMovies = movies.map((movie: any) => {
            const movieGenres = genres.filter(g => g.movieId === movie.id)
            const movieCountry = countries.find(c => c.movieId === movie.id)

            return {
              id: movie.id,
              slug: movie.slug,
              title: movie.title,
              year: movie.year,
              releaseYear: movie.releaseYear,
              releaseMonth: movie.releaseMonth,
              releaseDay: movie.releaseDay,
              duration: movie.duration,
              posterUrl: movie.posterUrl,
              stage: movie.stage,
              genres: movieGenres.map(g => ({
                id: g.genre.id,
                name: g.genre.name
              })),
              country: movieCountry?.location?.name || 'Argentina'
            }
          })

          const result = {
            movies: formattedMovies,
            pagination: {
              page,
              limit,
              total,
              totalPages: Math.ceil(total / limit),
              currentPage: page,
              totalItems: total
            }
          };
          
          // Guardar en ambos cachés
          RedisClient.set(cacheKey, JSON.stringify(result), redisTTL)
            .then(saved => {
              if (saved) {
                console.log(`✅ Listado guardado en Redis con TTL ${redisTTL}s (${redisTTL/60} min)`);
              }
            })
            .catch(err => console.error('Error guardando en Redis:', err));
          
          memoryCache.set(cacheKey, {
            data: result,
            timestamp: now
          });

          return NextResponse.json(result, {
            headers: {
              'Cache-Control': `public, s-maxage=${redisTTL}, stale-while-revalidate=${redisTTL * 2}`,
              'X-Cache': 'MISS',
              'X-Cache-Source': 'database'
            }
          });
        }

        const emptyResult = {
          movies: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
            currentPage: page,
            totalItems: 0
          }
        };
        
        // También cachear resultados vacíos (por menos tiempo)
        RedisClient.set(cacheKey, JSON.stringify(emptyResult), 300)
          .catch(err => console.error('Error guardando en Redis:', err));

        return NextResponse.json(emptyResult, {
          headers: {
            'Cache-Control': 'public, s-maxage=300',
            'X-Cache': 'MISS',
            'X-Cache-Source': 'database'
          }
        });

      } catch (err) {
        console.error('Error with unaccent search:', err)
        // Continuar con fallback
      }
    }

    // Búsqueda estándar sin unaccent
    const where: any = {}

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { synopsis: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (genre) {
      where.genres = {
        some: {
          genre: {
            slug: genre
          }
        }
      }
    }

    if (year) {
      where.releaseYear = parseInt(year)
    }

    if (yearFrom && yearTo && !year) {
      where.releaseYear = {
        gte: parseInt(yearFrom),
        lte: parseInt(yearTo)
      }
    }

    if (upcoming === 'true') {
      const now = new Date()
      const currentYear = now.getFullYear()

      where.releaseYear = {
        gte: currentYear
      }
    }

    if (stage) {
      where.stage = stage
    }

    const skip = (page - 1) * limit

    // Definir orderBy con tipo explícito
    const orderByClause = sortBy === 'releaseYear' 
      ? [
          { releaseYear: sortOrder as 'asc' | 'desc' },
          { releaseMonth: sortOrder as 'asc' | 'desc' },
          { releaseDay: sortOrder as 'asc' | 'desc' }
        ]
      : { [sortBy]: sortOrder as 'asc' | 'desc' };

    const [movies, total] = await Promise.all([
      prisma.movie.findMany({
        where,
        skip,
        take: limit,
        orderBy: orderByClause,
        include: {
          genres: {
            include: {
              genre: true
            }
          },
          movieCountries: {
            where: {
              isPrimary: true
            },
            include: {
              location: true
            }
          },
          crew: {
            where: {
              roleId: 2
            },
            include: {
              person: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  slug: true
                }
              },
              role: true
            },
            orderBy: {
              billingOrder: 'asc'
            }
          }
        }
      }),
      prisma.movie.count({ where })
    ])

    const formattedMovies = movies.map(movie => ({
      id: movie.id,
      slug: movie.slug,
      title: movie.title,
      year: movie.year,
      releaseYear: movie.releaseYear,
      releaseMonth: movie.releaseMonth,
      releaseDay: movie.releaseDay,
      releaseDateFormatted: movie.releaseYear
        ? `${movie.releaseYear}${movie.releaseMonth ? `-${String(movie.releaseMonth).padStart(2, '0')}` : ''}${movie.releaseDay ? `-${String(movie.releaseDay).padStart(2, '0')}` : ''}`
        : null,
      duration: movie.duration,
      posterUrl: movie.posterUrl,
      stage: movie.stage,
      genres: movie.genres.map(g => ({
        id: g.genre.id,
        name: g.genre.name
      })),
      country: movie.movieCountries[0]?.location?.name || 'Argentina',
      crew: movie.crew?.map(c => ({
        roleId: c.roleId,
        role: c.role?.name || c.role,
        person: c.person
      })) || []
    }))

    const result = {
      movies: formattedMovies,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        totalItems: total
      }
    };
    
    // 4. Guardar en ambos cachés
    RedisClient.set(cacheKey, JSON.stringify(result), redisTTL)
      .then(saved => {
        if (saved) {
          console.log(`✅ Listado guardado en Redis con TTL ${redisTTL}s (${redisTTL/60} min)`);
        }
      })
      .catch(err => console.error('Error guardando en Redis:', err));
    
    memoryCache.set(cacheKey, {
      data: result,
      timestamp: now
    });
    
    // Limpiar caché de memoria viejo (mantener máximo 200 listados)
    if (memoryCache.size > 200) {
      const oldestKey = memoryCache.keys().next().value;
      if (oldestKey) {
        memoryCache.delete(oldestKey);
      }
    }

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': `public, s-maxage=${redisTTL}, stale-while-revalidate=${redisTTL * 2}`,
        'X-Cache': 'MISS',
        'X-Cache-Source': 'database'
      }
    });

  } catch (error) {
    console.error('Error fetching movies:', error)
    
    // Intentar servir desde caché stale si hay error
    const cacheKey = generateCacheKey(request.nextUrl.searchParams);
    const staleCache = memoryCache.get(cacheKey);
    
    if (staleCache) {
      console.log('⚠️ Sirviendo caché stale debido a error');
      return NextResponse.json(staleCache.data, {
        headers: {
          'Cache-Control': 'public, s-maxage=60',
          'X-Cache': 'STALE',
          'X-Cache-Source': 'memory-fallback'
        }
      });
    }
    
    return NextResponse.json(
      { error: 'Error al obtener las películas' },
      { status: 500 }
    )
  }
}

// ============================================
// POST /api/movies - Crear nueva película
// ============================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Limpiar datos antes de validar
    const cleanedData = {
      ...body,
      ratingId: body.ratingId === 0 ? null : body.ratingId,
      // Asegurar que metaKeywords sea un array
      metaKeywords: body.metaKeywords
        ? Array.isArray(body.metaKeywords)
          ? body.metaKeywords
          : typeof body.metaKeywords === 'string'
            ? body.metaKeywords.split(',').map((k: string) => k.trim()).filter(Boolean)
            : []
        : []
    };

    // Validar datos
    const validatedData = movieSchema.parse(cleanedData)

    // Generar slug único con la función actualizada
const slug = await generateUniqueSlug(validatedData.title, 'movie', prisma)

    // Extraer relaciones y campos especiales
    const {
      genres,
      cast,
      crew,
      countries,
      productionCompanies,
      distributionCompanies,
      themes,
      alternativeTitles,
      links,
      screeningVenues,
      colorTypeId,
      ratingId,
      metaKeywords,
      releaseYear,
      releaseMonth,
      releaseDay,
      filmingStartYear,
      filmingStartMonth,
      filmingStartDay,
      filmingEndYear,
      filmingEndMonth,
      filmingEndDay,
      ...movieDataClean
    } = validatedData

    // Asegurar que metaKeywords sea un array
    const processedMetaKeywords = metaKeywords
      ? Array.isArray(metaKeywords)
        ? metaKeywords
        : typeof metaKeywords === 'string'
          ? metaKeywords.split(',').map((k: string) => k.trim()).filter(Boolean)
          : []
      : []

    // Crear película con relaciones
    const movie = await prisma.movie.create({
      data: {
        ...movieDataClean,
        slug,
        metaKeywords: processedMetaKeywords,
        releaseYear: releaseYear ?? null,
        releaseMonth: releaseMonth ?? null,
        releaseDay: releaseDay ?? null,
        filmingStartYear: filmingStartYear ?? null,
        filmingStartMonth: filmingStartMonth ?? null,
        filmingStartDay: filmingStartDay ?? null,
        filmingEndYear: filmingEndYear ?? null,
        filmingEndMonth: filmingEndMonth ?? null,
        filmingEndDay: filmingEndDay ?? null,

        // Relaciones opcionales con connect
        ...(colorTypeId && {
          colorType: { connect: { id: colorTypeId } }
        }),
        ...(ratingId && {
          rating: { connect: { id: ratingId } }
        }),

        // Relaciones many-to-many
        ...(genres && genres.length > 0 && {
          genres: {
            create: genres.map((genreId: number, index: number) => ({
              genreId,
              isPrimary: index === 0
            }))
          }
        }),

        ...(cast && cast.length > 0 && {
          cast: {
            create: cast.map((item: any) => ({
              personId: item.personId,
              characterName: item.characterName || null,
              billingOrder: item.billingOrder || 0,
              isPrincipal: item.isPrincipal || false
            }))
          }
        }),

        ...(crew && crew.length > 0 && {
          crew: {
            create: crew.map((item: any) => ({
              personId: item.personId,
              roleId: item.roleId,
              billingOrder: item.billingOrder || 0
            }))
          }
        }),

        ...(countries && countries.length > 0 && {
          movieCountries: {
            create: countries.map((countryId: number, index: number) => ({
              countryId,
              isPrimary: index === 0
            }))
          }
        }),

        ...(productionCompanies && productionCompanies.length > 0 && {
          productionCompanies: {
            create: productionCompanies.map((companyId: number, index: number) => ({
              companyId,
              isPrimary: index === 0
            }))
          }
        }),

        ...(distributionCompanies && distributionCompanies.length > 0 && {
          distributionCompanies: {
            create: distributionCompanies.map((companyId: number) => ({
              companyId,
              territory: 'Argentina'
            }))
          }
        }),

        ...(themes && themes.length > 0 && {
          themes: {
            create: themes.map((themeId: number) => ({
              themeId
            }))
          }
        }),

        ...(alternativeTitles && alternativeTitles.length > 0 && {
          alternativeTitles: {
            create: alternativeTitles.map((title: any) => ({
              title: title.title,
              description: title.description || null
            }))
          }
        }),

        ...(links && links.length > 0 && {
          links: {
            create: links.map((link: any) => ({
              type: link.type,
              url: link.url,
              title: link.title || null,
              isActive: link.isActive !== false
            }))
          }
        }),

        ...(screeningVenues && screeningVenues.length > 0 && {
          screenings: {
            create: screeningVenues.map((sv: any) => ({
              venueId: sv.venueId,
              screeningDate: sv.screeningDate ? new Date(sv.screeningDate) : null,
              isPremiere: sv.isPremiere || false,
              isExclusive: sv.isExclusive || false
            }))
          }
        })
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
          }
        },
        crew: {
          include: {
            person: true
          }
        }
      }
    })

    // INVALIDAR CACHÉS de listados después de crear
    console.log('🗑️ Invalidando cachés de listados tras crear película');
    
    const redisClient = RedisClient.getInstance();
    if (redisClient) {
      try {
        const keys = await redisClient.keys('movies:list:*');
        if (keys.length > 0) {
          await redisClient.del(...keys);
          console.log(`✅ ${keys.length} cachés de listados invalidados en Redis`);
        }
      } catch (err) {
        console.error('Error invalidando cachés de Redis:', err);
      }
    }
    
    // Limpiar memoria también
    let memoryKeysDeleted = 0;
    for (const key of memoryCache.keys()) {
      if (key.startsWith('movies:list:')) {
        memoryCache.delete(key);
        memoryKeysDeleted++;
      }
    }
    if (memoryKeysDeleted > 0) {
      console.log(`✅ ${memoryKeysDeleted} cachés de listados invalidados en memoria`);
    }

    return NextResponse.json(movie, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating movie:', error)
    return NextResponse.json(
      { error: 'Error al crear la película' },
      { status: 500 }
    )
  }
}