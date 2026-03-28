// ==================================================
// src/app/api/movies/[id]/route.ts - CON ALTERNATIVE_NAME_ID
// ==================================================
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { movieSchema } from '@/lib/schemas'
import RedisClient from '@/lib/redis'
import { revalidatePath, revalidateTag } from 'next/cache'
import { requireAuth } from '@/lib/auth'
import { apiHandler } from '@/lib/api/api-handler'
import { deleteCloudinaryImage } from '@/lib/cloudinary'
import { createLogger } from '@/lib/logger'
import { getMemoryCache, MEMORY_CACHE_TTL, invalidateMemoryCacheByPrefix } from '@/lib/api/memory-cache'

const log = createLogger('api:movies:detail')

// Cache en memoria como fallback (compartido entre route handlers)
const memoryCache = getMemoryCache();
const REDIS_CACHE_TTL = 3600; // 1 hora en segundos

// GET /api/movies/[id] - Obtener película por ID o slug
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: paramId } = await params
  try {
    const idOrSlug = paramId
    const isId = /^\d+$/.test(idOrSlug)
    const skipCache = request.nextUrl.searchParams.get('fresh') === 'true'

    // Generar clave de caché única
    const cacheKey = `movie:${isId ? 'id' : 'slug'}:${idOrSlug}:v1`;

    const now = Date.now();

    if (!skipCache) {
      // 1. Intentar obtener de Redis
      try {
        const redisCached = await RedisClient.get(cacheKey);

        if (redisCached) {
          log.debug('Cache HIT (Redis)', { key: cacheKey });
          return NextResponse.json(
            JSON.parse(redisCached),
            {
              headers: {
                'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
                'X-Cache': 'HIT',
                'X-Cache-Source': 'redis',
                'X-Movie-Id': idOrSlug
              }
            }
          );
        }
      } catch (redisError) {
        log.warn('Redis error (non-fatal)', { error: String(redisError) });
      }

      // 2. Verificar caché en memoria como fallback
      const memoryCached = memoryCache.get(cacheKey);

      if (memoryCached && (now - memoryCached.timestamp) < MEMORY_CACHE_TTL) {
        log.debug('Cache HIT (memory)', { key: cacheKey });

        // Intentar guardar en Redis para próximas requests
        RedisClient.set(cacheKey, JSON.stringify(memoryCached.data), REDIS_CACHE_TTL)
          .catch(err => log.warn('Redis save error', { error: String(err) }));

        return NextResponse.json(memoryCached.data, {
          headers: {
            'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
            'X-Cache': 'HIT',
            'X-Cache-Source': 'memory',
            'X-Movie-Id': idOrSlug
          }
        });
      }
    }

    // 3. No hay caché (o skipCache), consultar base de datos
    log.debug('Cache MISS', { key: cacheKey });

    const movie = await prisma.movie.findUnique({
      where: isId ? { id: parseInt(idOrSlug) } : { slug: idOrSlug },
      select: {
        // Campos básicos de la película
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
        synopsisLocked: true, // ✅ Campo synopsisLocked
        tagline: true,
        notes: true,
        posterUrl: true,
        posterPublicId: true,
        trailerUrl: true,
        imdbId: true,
        tmdbId: true,
        stage: true,
        dataCompleteness: true,
        tipoDuracion: true,
        metaDescription: true,
        metaKeywords: true,
        filmingStartYear: true,
        filmingStartMonth: true,
        filmingStartDay: true,
        filmingEndYear: true,
        filmingEndMonth: true,
        filmingEndDay: true,
        soundType: true,
        rating: true,
        ratingId: true,
        createdAt: true,
        updatedAt: true,

        // Relaciones - solo traer los campos necesarios
        colorType: true,

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

        // 🆕 Cast con alternativeNameId
        cast: {
          orderBy: { billingOrder: 'asc' },
          select: {
            characterName: true,
            billingOrder: true,
            isPrincipal: true,
            isActor: true,
            notes: true,
            alternativeNameId: true,  // 🆕
            alternativeName: {         // 🆕
              select: {
                id: true,
                fullName: true
              }
            },
            person: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                slug: true,
                photoUrl: true,
                alternativeNames: {     // 🆕 Para mostrar opciones en el formulario
                  select: {
                    id: true,
                    fullName: true
                  },
                  orderBy: { createdAt: 'asc' }
                }
              }
            }
          }
        },

        // 🆕 Crew con alternativeNameId
        crew: {
          orderBy: { billingOrder: 'asc' },
          select: {
            roleId: true,
            billingOrder: true,
            notes: true,
            alternativeNameId: true,  // 🆕
            alternativeName: {         // 🆕
              select: {
                id: true,
                fullName: true
              }
            },
            person: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                slug: true,
                alternativeNames: {     // 🆕 Para mostrar opciones en el formulario
                  select: {
                    id: true,
                    fullName: true
                  },
                  orderBy: { createdAt: 'asc' }
                }
              }
            },
            role: true
          }
        },

        movieCountries: {
          select: {
            location: {
              select: {
                id: true,
                name: true,
                slug: true
              }
            },
            countryId: true,
            isPrimary: true

          }
        },

        productionCompanies: {
          select: {
            company: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },

        distributionCompanies: {
          select: {
            company: {
              select: {
                id: true,
                name: true
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
          }
        },

        images: {
          orderBy: { createdAt: 'desc' },
          include: {
            people: {
              include: {
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

        videos: {
          orderBy: { isPrimary: 'desc' }
        },

        awards: {
          include: {
            award: true,
            recipient: true
          }
        },

        links: {
          where: { isActive: true },
          orderBy: { type: 'asc' }
        },

        screenings: {
          include: {
            venue: true
          }
        },

        alternativeTitles: {
          select: {
            id: true,
            title: true,
            description: true
          }
        },

        trivia: {
          select: {
            id: true,
            content: true,
            sortOrder: true
          },
          orderBy: { sortOrder: 'asc' }
        }
      }
    })

    if (!movie) {
      return NextResponse.json(
        { error: 'Película no encontrada' },
        { status: 404 }
      )
    }

    // 4. Guardar en ambos cachés
    // Redis con TTL de 1 hora
    RedisClient.set(cacheKey, JSON.stringify(movie), REDIS_CACHE_TTL)
      .catch(err => log.warn('Redis save error', { error: String(err) }));

    // Memoria como fallback
    memoryCache.set(cacheKey, {
      data: movie,
      timestamp: now
    });

    // Limpiar caché de memoria viejo (mantener máximo 100 películas)
    if (memoryCache.size > 100) {
      const oldestKey = memoryCache.keys().next().value;
      if (oldestKey) {
        memoryCache.delete(oldestKey);
      }
    }

    return NextResponse.json(movie, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        'X-Cache': 'MISS',
        'X-Cache-Source': 'database',
        'X-Movie-Id': idOrSlug
      }
    })
  } catch (error) {
    log.error('Failed to fetch movie', error)

    // Intentar servir desde caché stale si hay error
    const cacheKey = `movie:${/^\d+$/.test(paramId) ? 'id' : 'slug'}:${paramId}:v1`;
    const staleCache = memoryCache.get(cacheKey);

    if (staleCache) {
      log.warn('Serving stale cache');
      return NextResponse.json(staleCache.data, {
        headers: {
          'Cache-Control': 'public, s-maxage=60',
          'X-Cache': 'STALE',
          'X-Cache-Source': 'memory-fallback'
        }
      });
    }

    return NextResponse.json(
      { error: 'Error al obtener la película' },
      { status: 500 }
    )
  }
}

// PUT /api/movies/[id] - Actualizar película
export const PUT = apiHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id: paramId } = await params
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const id = parseInt(paramId)

  if (isNaN(id)) {
    return NextResponse.json(
      { error: 'ID inválido' },
      { status: 400 }
    )
  }

  const body = await request.json()

  // Limpiar datos antes de validar
  const cleanedData = {
    ...body,
    year: (body.year === 0 || body.year === '' || body.year === null || (typeof body.year === 'number' && isNaN(body.year))) ? null : body.year,
    colorTypeId: (body.colorTypeId === 0 || body.colorTypeId === '' || body.colorTypeId === null || (typeof body.colorTypeId === 'number' && isNaN(body.colorTypeId))) ? null : body.colorTypeId,
    soundType: body.soundType || null,
    ratingId: body.ratingId === 0 ? null : body.ratingId,
    tmdbId: (body.tmdbId === '' || body.tmdbId === null || body.tmdbId === undefined || isNaN(Number(body.tmdbId)))
      ? null
      : Number(body.tmdbId),
    genres: Array.isArray(body.genres)
      ? body.genres.filter((g: unknown) => g != null && g !== 0 && !isNaN(Number(g)))
      : [],
    countries: Array.isArray(body.countries)
      ? body.countries.filter((c: unknown) => c != null && c !== 0 && !isNaN(Number(c)))
      : body.countries || [],
    productionCompanies: Array.isArray(body.productionCompanies)
      ? body.productionCompanies.filter((pc: unknown) => pc != null && pc !== 0 && !isNaN(Number(pc)))
      : [],
    distributionCompanies: Array.isArray(body.distributionCompanies)
      ? body.distributionCompanies.filter((dc: unknown) => dc != null && dc !== 0 && !isNaN(Number(dc)))
      : [],
    themes: Array.isArray(body.themes)
      ? body.themes.filter((t: unknown) => t != null && t !== 0 && !isNaN(Number(t)))
      : [],
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

  if (validatedData.duration === 0) {
    validatedData.duration = null;
  }
  if (validatedData.durationSeconds === 0) {
    validatedData.durationSeconds = null;
  }

  // Verificar que la película existe y obtener slug + poster para invalidar caché
  const existingMovie = await prisma.movie.findUnique({
    where: { id },
    select: { slug: true, posterPublicId: true }
  })

  if (!existingMovie) {
    return NextResponse.json(
      { error: 'Película no encontrada' },
      { status: 404 }
    )
  }

  // Extraer relaciones
  const {
    genres,
    cast,
    crew,
    countries,
    productionCompanies,
    distributionCompanies,
    themes,
    alternativeTitles,
    trivia,
    links,
    screeningVenues,
    ...movieData
  } = validatedData

  // Usar transacción para actualizar todo
  const movie = await prisma.$transaction(async (tx) => {
    // 🔧 CORRECCIÓN CRÍTICA: Extraer synopsisLocked ANTES de crear movieDataClean
    const {
      colorTypeId,
      ratingId,
      releaseYear,
      releaseMonth,
      releaseDay,
      filmingStartYear,
      filmingStartMonth,
      filmingStartDay,
      filmingEndYear,
      filmingEndMonth,
      filmingEndDay,
      metaKeywords,
      synopsisLocked,  // ✅ Extraer synopsisLocked explícitamente
      ...movieDataClean
    } = movieData

    // 1. Actualizar datos básicos de la película
    await tx.movie.update({
      where: { id },
      data: {
        ...movieDataClean,
        synopsisLocked: synopsisLocked ?? false, // ✅ Usar variable directa (CORREGIDO)
        metaKeywords: Array.isArray(metaKeywords)
          ? metaKeywords
          : typeof metaKeywords === 'string'
            ? metaKeywords.split(',').map((k: string) => k.trim()).filter(Boolean)
            : [],
        releaseYear: releaseYear !== undefined ? releaseYear : null,
        releaseMonth: releaseMonth !== undefined ? releaseMonth : null,
        releaseDay: releaseDay !== undefined ? releaseDay : null,
        filmingStartYear: filmingStartYear !== undefined ? filmingStartYear : null,
        filmingStartMonth: filmingStartMonth !== undefined ? filmingStartMonth : null,
        filmingStartDay: filmingStartDay !== undefined ? filmingStartDay : null,
        filmingEndYear: filmingEndYear !== undefined ? filmingEndYear : null,
        filmingEndMonth: filmingEndMonth !== undefined ? filmingEndMonth : null,
        filmingEndDay: filmingEndDay !== undefined ? filmingEndDay : null,
        ...(ratingId !== undefined && {
          rating: (ratingId === null || ratingId === 0)
            ? { disconnect: true }
            : { connect: { id: ratingId } }
        }),
        ...(colorTypeId !== undefined && {
          colorType: (colorTypeId === null || colorTypeId === 0)
            ? { disconnect: true }
            : { connect: { id: colorTypeId } }
        })
      }
    })

    // 2. Actualizar géneros
    if (genres) {
      await tx.movieGenre.deleteMany({ where: { movieId: id } })
      if (genres.length > 0) {
        await tx.movieGenre.createMany({
          data: genres.map((genreId, index) => ({
            movieId: id,
            genreId,
            isPrimary: index === 0
          }))
        })
      }
    }

    // 3. Actualizar cast - 🆕 CON alternativeNameId
    if (cast) {
      await tx.movieCast.deleteMany({ where: { movieId: id } })
      if (cast.length > 0) {
        await tx.movieCast.createMany({
          data: cast.map((item, index) => ({
            movieId: id,
            personId: item.personId,
            alternativeNameId: item.alternativeNameId || null,  // 🆕
            characterName: item.characterName || null,
            billingOrder: item.billingOrder || index + 1,
            isPrincipal: item.isPrincipal || false,
            isActor: item.isActor !== undefined ? item.isActor : true,
            notes: item.notes || null
          }))
        })
      }
    }

    // 4. Actualizar crew - 🆕 CON alternativeNameId
    if (crew) {
      await tx.movieCrew.deleteMany({ where: { movieId: id } })
      if (crew.length > 0) {
        await tx.movieCrew.createMany({
          data: crew.map((item, index) => ({
            movieId: id,
            personId: item.personId,
            alternativeNameId: item.alternativeNameId || null,
            roleId: item.roleId ?? 0,
            billingOrder: item.billingOrder || index + 1,
            notes: item.notes || null
          } satisfies Prisma.MovieCrewCreateManyInput))
        })
      }
    }

    // 5. Actualizar países
    if (countries) {
      await tx.movieCountry.deleteMany({ where: { movieId: id } })
      if (countries.length > 0) {
        await tx.movieCountry.createMany({
          data: countries.map((countryId, index) => ({
            movieId: id,
            countryId,
            isPrimary: index === 0
          }))
        })
      }
    }

    // 6. Actualizar productoras
    if (productionCompanies) {
      await tx.movieProductionCompany.deleteMany({ where: { movieId: id } })
      if (productionCompanies.length > 0) {
        await tx.movieProductionCompany.createMany({
          data: productionCompanies.map((companyId, index) => ({
            movieId: id,
            companyId,
            isPrimary: index === 0
          }))
        })
      }
    }

    // 7. Actualizar distribuidoras
    if (distributionCompanies) {
      await tx.movieDistributionCompany.deleteMany({ where: { movieId: id } })
      if (distributionCompanies.length > 0) {
        await tx.movieDistributionCompany.createMany({
          data: distributionCompanies.map(companyId => ({
            movieId: id,
            companyId,
            territory: 'Argentina'
          }))
        })
      }
    }

    // 8. Actualizar temas
    if (themes) {
      await tx.movieTheme.deleteMany({ where: { movieId: id } })
      if (themes.length > 0) {
        await tx.movieTheme.createMany({
          data: themes.map(themeId => ({
            movieId: id,
            themeId
          }))
        })
      }
    }

    // 9. Actualizar títulos alternativos
    if (alternativeTitles !== undefined) {
      await tx.movieAlternativeTitle.deleteMany({ where: { movieId: id } })
      if (alternativeTitles && alternativeTitles.length > 0) {
        await tx.movieAlternativeTitle.createMany({
          data: alternativeTitles.map(title => ({
            movieId: id,
            title: title.title,
            description: title.description || null
          }))
        })
      }
    }

    // 10. Actualizar trivia
    if (trivia !== undefined) {
      await tx.movieTrivia.deleteMany({ where: { movieId: id } })
      if (trivia && trivia.length > 0) {
        await tx.movieTrivia.createMany({
          data: trivia.map((item: { content: string }, index: number) => ({
            movieId: id,
            content: item.content,
            sortOrder: index
          }))
        })
      }
    }

    // 11. Actualizar links oficiales
    if (links !== undefined) {
      await tx.movieLink.deleteMany({ where: { movieId: id } })
      if (links && links.length > 0) {
        const linkData: Prisma.MovieLinkCreateManyInput[] = links.map((link: { type: string; url: string; isActive?: boolean }) => ({
            movieId: id,
            type: link.type as 'INSTAGRAM' | 'TWITTER' | 'FACEBOOK' | 'TIKTOK' | 'YOUTUBE' | 'WEBSITE',
            url: link.url,
            isActive: link.isActive !== false
          }))
        await tx.movieLink.createMany({ data: linkData })
      }
    }

    // 11. Actualizar screening venues
    if (screeningVenues !== undefined) {
      await tx.movieScreening.deleteMany({ where: { movieId: id } })
      if (screeningVenues && screeningVenues.length > 0) {
        await tx.movieScreening.createMany({
          data: screeningVenues.map((sv: { venueId: number; screeningDate?: string | null; isPremiere?: boolean; isExclusive?: boolean }) => ({
            movieId: id,
            venueId: sv.venueId,
            screeningDate: sv.screeningDate ? new Date(sv.screeningDate) : null,
            isPremiere: sv.isPremiere || false,
            isExclusive: sv.isExclusive || false
          }))
        })
      }
    }

    // 12. Retornar la película actualizada con todas las relaciones
    return await tx.movie.findUnique({
      where: { id },
      include: {
        genres: {
          include: {
            genre: true
          }
        },
        cast: {
          include: {
            person: true,
            alternativeName: true  // 🆕
          }
        },
        crew: {
          include: {
            person: true,
            alternativeName: true  // 🆕
          }
        },
        themes: {
          include: {
            theme: true
          }
        },
        movieCountries: {
          include: {
            location: true
          }
        },
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
        links: true,
        screenings: {
          include: {
            venue: true
          }
        },
        colorType: true,
      }
    })
  }, {
    maxWait: 10000,
    timeout: 30000,
  })

  // Eliminar poster viejo de Cloudinary si cambió
  const newPosterPublicId = validatedData.posterPublicId || null
  const oldPosterPublicId = existingMovie.posterPublicId || null
  if (oldPosterPublicId && oldPosterPublicId !== newPosterPublicId) {
    deleteCloudinaryImage(oldPosterPublicId).catch(() => {})
  }

  // INVALIDACION COMPLETA DE CACHES
  log.debug('Invalidating caches');

  // 1. Invalidar Redis (detalle + listados)
  const cacheKeysToInvalidate = [
    `movie:id:${id}:v1`,
    `movie:slug:${existingMovie.slug}:v1`,
    'home-feed:movies:v1'
  ];

  await Promise.all(
    cacheKeysToInvalidate.map(key =>
      RedisClient.del(key).catch(err =>
        log.warn('Redis invalidation error', { error: String(err), key })
      )
    )
  );

  // Invalidar listados en Redis (updated_at cambió, el orden es distinto)
  const redisClient = RedisClient.getInstance();
  if (redisClient) {
    try {
      const listKeys = await redisClient.keys('movies:list:*');
      if (listKeys.length > 0) {
        await redisClient.del(...listKeys);
        log.debug('List caches invalidated', { count: listKeys.length });
      }
    } catch (err) {
      log.warn('Redis list invalidation error', { error: String(err) });
    }
  }

  // 2. Invalidar caché en memoria (detalle + listados)
  cacheKeysToInvalidate.forEach(key => memoryCache.delete(key));
  invalidateMemoryCacheByPrefix('movies:list:');

  // 3. Invalidar caché de Next.js (por si acaso, aunque ya no lo usamos principalmente)
  try {
    revalidateTag('movies', 'default');
    revalidateTag(`movie-${existingMovie.slug}`, 'default');
    revalidatePath(`/pelicula/${existingMovie.slug}`);
    revalidatePath('/');
    revalidatePath('/listados/peliculas');

    log.debug('Next.js cache invalidated', { slug: existingMovie.slug });
  } catch {
    log.debug('Next.js revalidation skipped');
  }

  log.debug('Caches invalidated', { slug: existingMovie.slug });

  return NextResponse.json(movie)
}, 'actualizar la película')

// DELETE /api/movies/[id] - Eliminar película
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: paramId } = await params
  const auth = await requireAuth()
  if (auth.error) return auth.error

  try {
    const id = parseInt(paramId)

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }

    // Verificar que la película existe y obtener slug + poster para invalidar caché
    const movie = await prisma.movie.findUnique({
      where: { id },
      select: { slug: true, posterPublicId: true }
    })

    if (!movie) {
      return NextResponse.json(
        { error: 'Película no encontrada' },
        { status: 404 }
      )
    }

    // Obtener imágenes asociadas antes de borrar (las imágenes tienen onDelete: SetNull,
    // así que no se eliminan, pero necesitamos borrarlas de Cloudinary)
    const movieImages = await prisma.image.findMany({
      where: { movieId: id },
      select: { cloudinaryPublicId: true }
    })

    // Eliminar película (las relaciones se eliminan en cascada)
    await prisma.movie.delete({
      where: { id }
    })

    // Eliminar poster e imágenes de Cloudinary (fire-and-forget)
    if (movie.posterPublicId) {
      deleteCloudinaryImage(movie.posterPublicId).catch(() => {})
    }
    for (const img of movieImages) {
      if (img.cloudinaryPublicId) {
        deleteCloudinaryImage(img.cloudinaryPublicId).catch(() => {})
      }
    }

    // INVALIDAR CACHES después de eliminar
    log.debug('Invalidating caches');

    // 1. Invalidar Redis (detalle + listados)
    const cacheKeysToInvalidate = [
      `movie:id:${id}:v1`,
      `movie:slug:${movie.slug}:v1`,
      'home-feed:movies:v1'
    ];

    await Promise.all(
      cacheKeysToInvalidate.map(key =>
        RedisClient.del(key).catch(err =>
          log.warn('Redis invalidation error', { error: String(err), key })
        )
      )
    );

    // Invalidar listados en Redis
    const redisClient = RedisClient.getInstance();
    if (redisClient) {
      try {
        const listKeys = await redisClient.keys('movies:list:*');
        if (listKeys.length > 0) {
          await redisClient.del(...listKeys);
          log.debug('List caches invalidated', { count: listKeys.length });
        }
      } catch (err) {
        log.warn('Redis list invalidation error', { error: String(err) });
      }
    }

    // 2. Invalidar en memoria (detalle + listados)
    cacheKeysToInvalidate.forEach(key => memoryCache.delete(key));
    invalidateMemoryCacheByPrefix('movies:list:');

    // 3. Invalidar caché de Next.js
    try {
      revalidateTag('movies', 'default');
      revalidateTag(`movie-${movie.slug}`, 'default');
      revalidatePath(`/pelicula/${movie.slug}`);
      revalidatePath('/');
      revalidatePath('/listados/peliculas');

      log.debug('Next.js cache invalidated', { slug: movie.slug });
    } catch {
      log.debug('Next.js revalidation skipped');
    }

    log.debug('Caches invalidated', { slug: movie.slug });

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    log.error('Failed to delete movie', error)

    const prismaError = error as { code?: string; message?: string } | undefined
    const detail = prismaError?.code === 'P2003'
      ? 'La película tiene registros asociados que impiden su eliminación'
      : prismaError?.message || 'Error desconocido'

    return NextResponse.json(
      { error: 'Error al eliminar la película', detail },
      { status: 500 }
    )
  }
}