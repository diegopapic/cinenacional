// src/app/api/efemerides/route.ts - ACTUALIZADO CON SOPORTE PARA MÚLTIPLES DIRECTORES

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calcularAniosDesde, formatearEfemeride } from '@/lib/utils/efemerides';
import { Efemeride, DirectorInfo } from '@/types/home.types';
import { parseIntClamped } from '@/lib/api/parse-params';
import RedisClient from '@/lib/redis';
import { createLogger } from '@/lib/logger';

const log = createLogger('api:efemerides');

export const dynamic = 'force-dynamic';

// ============================================
// CACHE CONFIGURATION
// ============================================

const memoryCache = new Map<string, { data: any; timestamp: number }>();
const MEMORY_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 horas
const REDIS_TTL = 86400; // 24 horas

function generateCacheKey(dia: number, mes: number, randomSample?: boolean): string {
  const suffix = randomSample ? ':random' : ':all';
  return `efemerides:${mes}-${dia}${suffix}:v3`; // v3 por el cambio de directores
}

/**
 * Procesa el array de crew y extrae los directores como DirectorInfo[]
 */
function extractDirectors(crew: Array<{ person: { slug: string; firstName: string | null; lastName: string | null } }>): DirectorInfo[] {
  return crew.map(c => ({
    name: `${c.person.firstName || ''} ${c.person.lastName || ''}`.trim(),
    slug: c.person.slug
  })).filter(d => d.name); // Filtrar directores sin nombre
}

// ============================================
// GET /api/efemerides
// ============================================
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Obtener parámetros - si no se especifican, usar fecha actual
    // parseIntClamped garantiza rango válido (no se necesita validación adicional)
    const hoy = new Date();
    const dia = parseIntClamped(searchParams.get('day') || searchParams.get('dia'), hoy.getDate(), 1, 31);
    const mes = parseIntClamped(searchParams.get('month') || searchParams.get('mes'), hoy.getMonth() + 1, 1, 12);

    // Parámetro para indicar si queremos muestra aleatoria (para la home)
    const randomSample = searchParams.get('random') === 'true';

    // ============================================
    // 1. INTENTAR REDIS CACHE
    // ============================================
    const cacheKey = generateCacheKey(dia, mes, randomSample);
    const now = Date.now();
    
    try {
      const redisCached = await RedisClient.get(cacheKey);
      
      if (redisCached) {
        log.debug('Cache HIT (Redis)', { key: cacheKey });
        return NextResponse.json(
          JSON.parse(redisCached),
          {
            headers: {
              'Cache-Control': `public, s-maxage=${REDIS_TTL}, stale-while-revalidate=${REDIS_TTL * 2}`,
              'X-Cache': 'HIT',
              'X-Cache-Source': 'redis'
            }
          }
        );
      }
    } catch (redisError) {
      log.warn('Redis error (non-fatal)', { error: String(redisError) });
    }

    // ============================================
    // 2. INTENTAR MEMORY CACHE
    // ============================================
    const memoryCached = memoryCache.get(cacheKey);
    
    if (memoryCached && (now - memoryCached.timestamp) < MEMORY_CACHE_TTL) {
      log.debug('Cache HIT (memory)', { key: cacheKey });

      RedisClient.set(cacheKey, JSON.stringify(memoryCached.data), REDIS_TTL)
        .catch(err => log.warn('Redis save error', err));
      
      return NextResponse.json(memoryCached.data, {
        headers: {
          'Cache-Control': `public, s-maxage=${REDIS_TTL}, stale-while-revalidate=${REDIS_TTL * 2}`,
          'X-Cache': 'HIT',
          'X-Cache-Source': 'memory'
        }
      });
    }

    // ============================================
    // 3. CONSULTAR BASE DE DATOS
    // ============================================
    log.debug('Cache MISS', { key: cacheKey });
    
    // Obtener películas con fechas de estreno para esta fecha
    const peliculasEstreno = await prisma.movie.findMany({
      where: {
        releaseDay: dia,
        releaseMonth: mes,
        releaseYear: { not: null }
      },
      select: {
        id: true,
        slug: true,
        title: true,
        releaseYear: true,
        releaseMonth: true,
        releaseDay: true,
        posterUrl: true,
        crew: {
          where: {
            roleId: 2 // Director
          },
          select: {
            person: {
              select: {
                slug: true,
                firstName: true,
                lastName: true
              }
            }
          }
          // SIN take: 1 - obtener TODOS los directores
        }
      }
    });
    
    // Obtener películas con inicio de rodaje
    const peliculasInicioRodaje = await prisma.movie.findMany({
      where: {
        filmingStartDay: dia,
        filmingStartMonth: mes,
        filmingStartYear: { not: null }
      },
      select: {
        id: true,
        slug: true,
        title: true,
        filmingStartYear: true,
        filmingStartMonth: true,
        filmingStartDay: true,
        posterUrl: true,
        crew: {
          where: {
            roleId: 2
          },
          select: {
            person: {
              select: {
                slug: true,
                firstName: true,
                lastName: true
              }
            }
          }
          // SIN take: 1 - obtener TODOS los directores
        }
      }
    });
    
    // Obtener películas con fin de rodaje
    const peliculasFinRodaje = await prisma.movie.findMany({
      where: {
        filmingEndDay: dia,
        filmingEndMonth: mes,
        filmingEndYear: { not: null }
      },
      select: {
        id: true,
        slug: true,
        title: true,
        filmingEndYear: true,
        filmingEndMonth: true,
        filmingEndDay: true,
        posterUrl: true,
        crew: {
          where: {
            roleId: 2
          },
          select: {
            person: {
              select: {
                slug: true,
                firstName: true,
                lastName: true
              }
            }
          }
          // SIN take: 1 - obtener TODOS los directores
        }
      }
    });
    
    // Obtener personas nacidas en esta fecha
    const personasNacimiento = await prisma.person.findMany({
      where: {
        birthDay: dia,
        birthMonth: mes,
        birthYear: { not: null }
      },
      select: {
        id: true,
        slug: true,
        firstName: true,
        lastName: true,
        birthYear: true,
        birthMonth: true,
        birthDay: true,
        photoUrl: true
      }
    });
    
    // Obtener personas fallecidas en esta fecha
    const personasMuerte = await prisma.person.findMany({
      where: {
        deathDay: dia,
        deathMonth: mes,
        deathYear: { not: null }
      },
      select: {
        id: true,
        slug: true,
        firstName: true,
        lastName: true,
        deathYear: true,
        deathMonth: true,
        deathDay: true,
        photoUrl: true
      }
    });
    
    // ============================================
    // 4. FORMATEAR EFEMÉRIDES
    // ============================================
    const efemerides: (Efemeride | null)[] = [];
    
    // Procesar estrenos
    peliculasEstreno.forEach(pelicula => {
      const directors = extractDirectors(pelicula.crew);
      const efemeride = formatearEfemeride({
        tipo: 'pelicula',
        tipoEvento: 'estreno',
        año: pelicula.releaseYear!,
        mes: pelicula.releaseMonth!,
        dia: pelicula.releaseDay!,
        fecha: new Date(pelicula.releaseYear!, pelicula.releaseMonth! - 1, pelicula.releaseDay!),
        titulo: pelicula.title,
        directors: directors,
        directorSlug: directors[0]?.slug,
        slug: pelicula.slug,
        posterUrl: pelicula.posterUrl || undefined
      });
      if (efemeride) efemerides.push(efemeride);
    });
    
    // Procesar inicio de rodajes
    peliculasInicioRodaje.forEach(pelicula => {
      const directors = extractDirectors(pelicula.crew);
      const efemeride = formatearEfemeride({
        tipo: 'pelicula',
        tipoEvento: 'inicio_rodaje',
        año: pelicula.filmingStartYear!,
        mes: pelicula.filmingStartMonth!,
        dia: pelicula.filmingStartDay!,
        fecha: new Date(pelicula.filmingStartYear!, pelicula.filmingStartMonth! - 1, pelicula.filmingStartDay!),
        titulo: pelicula.title,
        directors: directors,
        directorSlug: directors[0]?.slug,
        slug: pelicula.slug,
        posterUrl: pelicula.posterUrl || undefined
      });
      if (efemeride) efemerides.push(efemeride);
    });
    
    // Procesar fin de rodajes
    peliculasFinRodaje.forEach(pelicula => {
      const directors = extractDirectors(pelicula.crew);
      const efemeride = formatearEfemeride({
        tipo: 'pelicula',
        tipoEvento: 'fin_rodaje',
        año: pelicula.filmingEndYear!,
        mes: pelicula.filmingEndMonth!,
        dia: pelicula.filmingEndDay!,
        fecha: new Date(pelicula.filmingEndYear!, pelicula.filmingEndMonth! - 1, pelicula.filmingEndDay!),
        titulo: pelicula.title,
        directors: directors,
        directorSlug: directors[0]?.slug,
        slug: pelicula.slug,
        posterUrl: pelicula.posterUrl || undefined
      });
      if (efemeride) efemerides.push(efemeride);
    });
    
    // Procesar nacimientos
    personasNacimiento.forEach(persona => {
      const nombre = `${persona.firstName || ''} ${persona.lastName || ''}`.trim();
      
      const efemeride = formatearEfemeride({
        tipo: 'persona',
        tipoEvento: 'nacimiento',
        año: persona.birthYear!,
        mes: persona.birthMonth!,
        dia: persona.birthDay!,
        fecha: new Date(persona.birthYear!, persona.birthMonth! - 1, persona.birthDay!),
        nombre,
        slug: persona.slug,
        photoUrl: persona.photoUrl || undefined
      });
      if (efemeride) efemerides.push(efemeride);
    });
    
    // Procesar muertes
    personasMuerte.forEach(persona => {
      const nombre = `${persona.firstName || ''} ${persona.lastName || ''}`.trim();
      
      const efemeride = formatearEfemeride({
        tipo: 'persona',
        tipoEvento: 'muerte',
        año: persona.deathYear!,
        mes: persona.deathMonth!,
        dia: persona.deathDay!,
        fecha: new Date(persona.deathYear!, persona.deathMonth! - 1, persona.deathDay!),
        nombre,
        slug: persona.slug,
        photoUrl: persona.photoUrl || undefined
      });
      if (efemeride) efemerides.push(efemeride);
    });
    
    // Filtrar nulls y ordenar por años (más recientes primero)
    const efemeridesValidas = efemerides
      .filter((e): e is Efemeride => e !== null)
      .sort((a, b) => {
        const añosA = parseInt(a.hace.match(/\d+/)?.[0] || '0');
        const añosB = parseInt(b.hace.match(/\d+/)?.[0] || '0');
        return añosA - añosB; // Menos años primero (más reciente)
      });
    
    // ============================================
    // 5. APLICAR LÓGICA DE MUESTRA ALEATORIA (PARA HOME)
    // ============================================
    let resultado: { efemerides: Efemeride[] };
    
    if (randomSample && efemeridesValidas.length === 0) {
      // Si no hay efemérides para hoy y se pidió muestra aleatoria, buscar ejemplos
      const peliculasEjemplo = await prisma.movie.findMany({
        where: {
          releaseDay: { not: null },
          releaseMonth: { not: null },
          releaseYear: { not: null }
        },
        select: {
          id: true,
          slug: true,
          title: true,
          releaseYear: true,
          releaseMonth: true,
          releaseDay: true,
          posterUrl: true,
          crew: {
            where: {
              roleId: 2
            },
            select: {
              person: {
                select: {
                  slug: true,
                  firstName: true,
                  lastName: true
                }
              }
            }
            // SIN take: 1
          }
        },
        take: 5
      });
      
      const efemeridesEjemplo = peliculasEjemplo.slice(0, 2).map(pelicula => {
        const directors = extractDirectors(pelicula.crew);
        const directorText = directors.length > 0
          ? directors.length === 1
            ? directors[0].name
            : directors.length === 2
              ? `${directors[0].name} y ${directors[1].name}`
              : `${directors.slice(0, -1).map(d => d.name).join(', ')} y ${directors[directors.length - 1].name}`
          : null;
        
        const añosDesde = new Date().getFullYear() - pelicula.releaseYear!;
        
        return {
          id: `ejemplo-${pelicula.id}`,
          tipo: 'pelicula' as const,
          hace: `Hace ${añosDesde} ${añosDesde === 1 ? 'año' : 'años'}`,
          evento: `se estrenaba "${pelicula.title}"${directorText ? `, de ${directorText}` : ''}`,
          fecha: new Date(pelicula.releaseYear!, pelicula.releaseMonth! - 1, pelicula.releaseDay!),
          slug: pelicula.slug,
          posterUrl: pelicula.posterUrl || undefined,
          directors: directors,
          director: directorText || undefined,
          directorSlug: directors[0]?.slug
        };
      });
      
      resultado = { efemerides: efemeridesEjemplo };
      
      // No cachear ejemplos aleatorios
      return NextResponse.json(resultado);
      
    } else if (randomSample && efemeridesValidas.length > 2) {
      // Si hay muchas efemérides y se pidió muestra, tomar 2 aleatorias
      const shuffled = [...efemeridesValidas].sort(() => Math.random() - 0.5);
      resultado = { efemerides: shuffled.slice(0, 2) };
      
      // No cachear muestras aleatorias
      return NextResponse.json(resultado);
      
    } else {
      // Devolver todas las efemérides (para página de efemérides)
      resultado = { efemerides: efemeridesValidas };
    }
    
    // ============================================
    // 6. GUARDAR EN CACHÉ (solo si no es muestra aleatoria)
    // ============================================
    if (!randomSample) {
      RedisClient.set(cacheKey, JSON.stringify(resultado), REDIS_TTL)
        .catch(err => log.warn('Redis save error', err));
      
      memoryCache.set(cacheKey, {
        data: resultado,
        timestamp: now
      });
      
      if (memoryCache.size > 365) {
        const oldestKey = memoryCache.keys().next().value;
        if (oldestKey) {
          memoryCache.delete(oldestKey);
        }
      }
    }
    
    return NextResponse.json(resultado, {
      headers: randomSample ? {} : {
        'Cache-Control': `public, s-maxage=${REDIS_TTL}, stale-while-revalidate=${REDIS_TTL * 2}`,
        'X-Cache': 'MISS',
        'X-Cache-Source': 'database'
      }
    });
    
  } catch (error) {
    log.error('Failed to fetch efemerides', error);
    
    // Intentar servir desde caché stale si hay error
    const searchParams = request.nextUrl.searchParams;
    const hoy = new Date();
    const dia = parseIntClamped(searchParams.get('day') || searchParams.get('dia'), hoy.getDate(), 1, 31);
    const mes = parseIntClamped(searchParams.get('month') || searchParams.get('mes'), hoy.getMonth() + 1, 1, 12);
    const randomSample = searchParams.get('random') === 'true';
    
    const cacheKey = generateCacheKey(dia, mes, randomSample);
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
      { error: 'Error al obtener efemérides' },
      { status: 500 }
    );
  }
}