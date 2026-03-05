// src/app/api/people/slug/[slug]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import RedisClient from '@/lib/redis';
import { apiHandler } from '@/lib/api/api-handler';

// Cache en memoria como fallback
const memoryCache = new Map<string, { data: any; timestamp: number }>();
const MEMORY_CACHE_TTL = 60 * 60 * 1000; // 1 hora en ms
const REDIS_CACHE_TTL = 3600; // 1 hora en segundos

export const GET = apiHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) => {
    const { slug } = await params;
    const cacheKey = `person:slug:${slug}:v1`;

    // 1. Intentar obtener de Redis
    try {
      const redisCached = await RedisClient.get(cacheKey);
      if (redisCached) {
        return NextResponse.json(JSON.parse(redisCached), {
          headers: {
            'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
            'X-Cache': 'HIT',
            'X-Cache-Source': 'redis',
          }
        });
      }
    } catch (redisError) {
      console.error('Redis error (non-fatal):', redisError);
    }

    // 2. Verificar caché en memoria como fallback
    const now = Date.now();
    const memoryCached = memoryCache.get(cacheKey);
    if (memoryCached && (now - memoryCached.timestamp) < MEMORY_CACHE_TTL) {
      RedisClient.set(cacheKey, JSON.stringify(memoryCached.data), REDIS_CACHE_TTL)
        .catch(err => console.error('Error guardando en Redis:', err));
      return NextResponse.json(memoryCached.data, {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
          'X-Cache': 'HIT',
          'X-Cache-Source': 'memory',
        }
      });
    }

    // 3. Cache MISS - consultar BD
    const person = await prisma.person.findFirst({
      where: {
        slug,
        isActive: true
      },
      include: {
        birthLocation: {
          include: {
            parent: {
              include: {
                parent: {
                  include: {
                    parent: true
                  }
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
                  include: {
                    parent: true
                  }
                }
              }
            }
          }
        },
        links: {
          where: {
            isActive: true
          },
          orderBy: {
            displayOrder: 'asc'
          }
        },
        nationalities: {
          include: {
            location: true
          }
        },
        alternativeNames: {
          orderBy: {
            createdAt: 'asc'
          }
        },
        trivia: {
          select: { id: true, content: true, sortOrder: true },
          orderBy: { sortOrder: 'asc' }
        },
        // Imágenes en las que aparece la persona
        imageAppearances: {
          include: {
            image: {
              include: {
                movie: {
                  select: {
                    id: true,
                    title: true,
                    releaseYear: true
                  }
                },
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
            }
          }
        }
      }
    });

    if (!person) {
      return NextResponse.json(
        { error: 'Person not found' },
        { status: 404 }
      );
    }

    // Transformar imágenes al formato esperado por el componente ImageGallery
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const galleryImages = person.imageAppearances.map((appearance) => {
      const img = appearance.image;
      return {
        id: img.id,
        url: `https://res.cloudinary.com/${cloudName}/image/upload/w_1280,q_auto,f_auto/${img.cloudinaryPublicId}`,
        cloudinaryPublicId: img.cloudinaryPublicId,
        type: img.type,
        eventName: img.eventName,
        people: img.people.map((p) => ({
          personId: p.personId,
          position: p.position,
          person: {
            id: p.person.id,
            firstName: p.person.firstName,
            lastName: p.person.lastName
          }
        })),
        movie: img.movie ? {
          id: img.movie.id,
          title: img.movie.title,
          releaseYear: img.movie.releaseYear
        } : null
      };
    });

    // Retornar persona con imágenes transformadas
    const { imageAppearances, ...personData } = person;
    const responseData = { ...personData, galleryImages };

    // 4. Guardar en ambos cachés
    RedisClient.set(cacheKey, JSON.stringify(responseData), REDIS_CACHE_TTL)
      .catch(err => console.error('Error guardando en Redis:', err));

    memoryCache.set(cacheKey, { data: responseData, timestamp: now });

    if (memoryCache.size > 100) {
      const oldestKey = memoryCache.keys().next().value;
      if (oldestKey) memoryCache.delete(oldestKey);
    }

    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        'X-Cache': 'MISS',
        'X-Cache-Source': 'database',
      }
    });
}, 'obtener persona')