// src/app/api/people/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generatePersonSlug } from '@/lib/people/peopleUtils';
import { splitFullName } from '@/lib/people/nameUtils';
import RedisClient from '@/lib/redis';

// ============================================
// CACHE CONFIGURATION
// ============================================

// Cache en memoria como fallback
const memoryCache = new Map<string, { data: any; timestamp: number }>();
const MEMORY_CACHE_TTL = 60 * 60 * 1000; // 1 hora en ms

// TTL diferenciado según tipo de consulta
function getRedisTTL(searchParams: URLSearchParams): number {
  const deathYear = searchParams.get('deathYear');
  
  // Obituarios de años pasados: 24 horas (no cambian)
  if (deathYear) {
    const year = parseInt(deathYear);
    const currentYear = new Date().getFullYear();
    
    if (year < currentYear) {
      return 86400; // 24 horas
    } else {
      return 900; // 1 hora para año actual
    }
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
    'gender',
    'isActive',
    'hasLinks',
    'hasDeathDate',
    'deathYear',
    'sortBy',
    'sortOrder'
  ];
  
  const keyParts = relevantParams
    .map(param => {
      const value = searchParams.get(param);
      return value ? `${param}:${value}` : null;
    })
    .filter(Boolean);
  
  return `people:list:${keyParts.join(':')}:v1`;
}

// Verificar si debe cachear esta consulta
function shouldCache(searchParams: URLSearchParams): boolean {
  // Solo cachear obituarios (deathYear presente)
  return searchParams.has('deathYear');
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    const gender = searchParams.get('gender');
    const isActive = searchParams.get('isActive');
    const hasLinks = searchParams.get('hasLinks');
    const hasDeathDate = searchParams.get('hasDeathDate');
    const deathYear = searchParams.get('deathYear'); // 🆕 NUEVO FILTRO
    const sortBy = searchParams.get('sortBy') || 'last_name';
    const sortOrder = searchParams.get('sortOrder') || 'asc';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // ============================================
    // CACHE LOGIC (solo para obituarios)
    // ============================================
    if (shouldCache(searchParams)) {
      const cacheKey = generateCacheKey(searchParams);
      const redisTTL = getRedisTTL(searchParams);
      const now = Date.now();
      
      // 1. Intentar obtener de Redis
      try {
        const redisCached = await RedisClient.get(cacheKey);
        
        if (redisCached) {
          console.log(`✅ Cache HIT desde Redis para obituarios: ${cacheKey.substring(0, 60)}...`);
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
      const memoryCached = memoryCache.get(cacheKey);
      
      if (memoryCached && (now - memoryCached.timestamp) < MEMORY_CACHE_TTL) {
        console.log(`✅ Cache HIT desde memoria para obituarios: ${cacheKey.substring(0, 60)}...`);
        
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
      console.log(`🔄 Cache MISS - Consultando BD para obituarios: ${cacheKey.substring(0, 60)}...`);
    }
    
    // ============================================
    // QUERY LOGIC (existente)
    // ============================================

    // Si hay búsqueda, usar SQL con unaccent para búsqueda mejorada
    if (search && search.trim().length >= 2) {
      try {
        const searchPattern = `%${search.toLowerCase().trim()}%`;
        const searchTerms = search.toLowerCase().trim().split(/\s+/);
        const skip = (page - 1) * limit;
        
        // ============================================
        // BÚSQUEDA MEJORADA CON NOMBRES ALTERNATIVOS
        // ============================================
        // Busca en nombre principal Y en nombres alternativos
        // Retorna información sobre qué nombre hizo match
        const peopleResults = await prisma.$queryRaw<any[]>`
          WITH search_results AS (
            -- Búsqueda en nombre principal
            SELECT 
              id,
              NULL::integer as matched_alternative_id,
              NULL::text as matched_alternative_name,
              1 as source_priority,
              CASE 
                WHEN unaccent(LOWER(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, '')))) = unaccent(${search.toLowerCase().trim()}) THEN 1
                WHEN unaccent(LOWER(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, '')))) LIKE unaccent(${search.toLowerCase().trim() + '%'}) THEN 2
                WHEN unaccent(LOWER(COALESCE(first_name, ''))) LIKE unaccent(${searchPattern}) OR unaccent(LOWER(COALESCE(last_name, ''))) LIKE unaccent(${searchPattern}) THEN 3
                ELSE 4
              END as match_rank
            FROM people
            WHERE 
              unaccent(LOWER(COALESCE(first_name, ''))) LIKE unaccent(${searchPattern})
              OR unaccent(LOWER(COALESCE(last_name, ''))) LIKE unaccent(${searchPattern})
              OR unaccent(LOWER(COALESCE(real_name, ''))) LIKE unaccent(${searchPattern})
              OR unaccent(LOWER(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, '')))) LIKE unaccent(${searchPattern})
              OR unaccent(LOWER(CONCAT(COALESCE(last_name, ''), ' ', COALESCE(first_name, '')))) LIKE unaccent(${searchPattern})
            
            UNION ALL
            
            -- Búsqueda en nombres alternativos
            SELECT 
              p.id,
              pan.id as matched_alternative_id,
              pan.full_name as matched_alternative_name,
              2 as source_priority,
              CASE 
                WHEN unaccent(LOWER(pan.full_name)) = unaccent(${search.toLowerCase().trim()}) THEN 1
                WHEN unaccent(LOWER(pan.full_name)) LIKE unaccent(${search.toLowerCase().trim() + '%'}) THEN 2
                ELSE 3
              END as match_rank
            FROM people p
            INNER JOIN people_alternative_names pan ON p.id = pan.person_id
            WHERE unaccent(LOWER(pan.full_name)) LIKE unaccent(${searchPattern})
          ),
          -- Eliminar duplicados manteniendo el mejor match
          ranked_results AS (
            SELECT 
              id,
              matched_alternative_id,
              matched_alternative_name,
              ROW_NUMBER() OVER (
                PARTITION BY id 
                ORDER BY source_priority ASC, match_rank ASC
              ) as rn
            FROM search_results
          )
          SELECT id, matched_alternative_id, matched_alternative_name
          FROM ranked_results
          WHERE rn = 1
          ORDER BY 
            CASE WHEN matched_alternative_id IS NULL THEN 0 ELSE 1 END,
            id
          LIMIT ${limit}
          OFFSET ${skip}
        `;

        // Obtener el total para paginación (incluyendo nombres alternativos)
        const countResult = await prisma.$queryRaw<{count: number}[]>`
          SELECT COUNT(DISTINCT person_id)::int as count
          FROM (
            -- Conteo de matches en nombre principal
            SELECT id as person_id
            FROM people
            WHERE 
              unaccent(LOWER(COALESCE(first_name, ''))) LIKE unaccent(${searchPattern})
              OR unaccent(LOWER(COALESCE(last_name, ''))) LIKE unaccent(${searchPattern})
              OR unaccent(LOWER(COALESCE(real_name, ''))) LIKE unaccent(${searchPattern})
              OR unaccent(LOWER(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, '')))) LIKE unaccent(${searchPattern})
              OR unaccent(LOWER(CONCAT(COALESCE(last_name, ''), ' ', COALESCE(first_name, '')))) LIKE unaccent(${searchPattern})
            
            UNION
            
            -- Conteo de matches en nombres alternativos
            SELECT p.id as person_id
            FROM people p
            INNER JOIN people_alternative_names pan ON p.id = pan.person_id
            WHERE unaccent(LOWER(pan.full_name)) LIKE unaccent(${searchPattern})
          ) combined
        `;
        
        const totalCount = countResult[0]?.count || 0;
        const peopleIds = peopleResults.map(p => p.id);

        if (peopleIds.length === 0) {
          return NextResponse.json({
            data: [],
            totalCount: 0,
            page,
            totalPages: 0,
            hasMore: false,
          });
        }

        // Crear mapa de matches alternativos para enriquecer resultados
        const alternativeMatchMap = new Map<number, { id: number; name: string }>();
        for (const result of peopleResults) {
          if (result.matched_alternative_id) {
            alternativeMatchMap.set(result.id, {
              id: result.matched_alternative_id,
              name: result.matched_alternative_name
            });
          }
        }

        // Obtener datos completos con Prisma
        const people = await prisma.person.findMany({
          where: { id: { in: peopleIds } },
          include: {
            nationalities: {
              include: { location: true }
            },
            birthLocation: {
              include: { parent: true }
            },
            deathLocation: {
              include: { parent: true }
            },
            links: {
              where: { isActive: true },
              orderBy: { displayOrder: 'asc' }
            },
            alternativeNames: {
              orderBy: { createdAt: 'asc' }
            },
            _count: {
              select: {
                links: true,
                castRoles: true,
                crewRoles: true,
              },
            },
          },
          orderBy: [
            { lastName: 'asc' },
            { firstName: 'asc' }
          ]
        });

        // IMPORTANTE: Agregar el campo 'name' formateado y info de match alternativo
        const peopleWithName = people.map(person => {
          const altMatch = alternativeMatchMap.get(person.id);
          return {
            ...person,
            name: `${person.firstName || ''} ${person.lastName || ''}`.trim() || person.realName || 'Sin nombre',
            // Info del match alternativo (si aplica)
            matchedAlternativeName: altMatch?.name || null,
            matchedAlternativeNameId: altMatch?.id || null
          };
        });

        return NextResponse.json({
          data: peopleWithName,
          totalCount,
          page,
          totalPages: Math.ceil(totalCount / limit),
          hasMore: page < Math.ceil(totalCount / limit),
        });

      } catch (err) {
        console.error('Error with unaccent:', err);
        // Continuar con búsqueda normal
      }
    }

    // Búsqueda normal sin unaccent o cuando no hay búsqueda
    const where: any = {};

    if (search && search.trim().length >= 2) {
      // Búsqueda mejorada usando Prisma OR (incluye nombres alternativos)
      const searchTerms = search.trim().split(/\s+/);
      
      if (searchTerms.length === 1) {
        // Un solo término: buscar en cada campo Y en nombres alternativos
        where.OR = [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { realName: { contains: search, mode: 'insensitive' } },
          // Buscar en nombres alternativos
          { alternativeNames: { some: { fullName: { contains: search, mode: 'insensitive' } } } },
        ];
      } else {
        // Múltiples términos: buscar combinaciones
        where.OR = [
          // Buscar en nombre real
          { realName: { contains: search, mode: 'insensitive' } },
          // Buscar cada término en nombre o apellido
          {
            AND: searchTerms.map(term => ({
              OR: [
                { firstName: { contains: term, mode: 'insensitive' } },
                { lastName: { contains: term, mode: 'insensitive' } },
              ]
            }))
          },
          // Buscar en nombres alternativos (búsqueda completa)
          { alternativeNames: { some: { fullName: { contains: search, mode: 'insensitive' } } } },
        ];
      }
    }

    if (gender) where.gender = gender;
    if (isActive !== null && isActive !== '') where.isActive = isActive === 'true';
    if (hasLinks !== null && hasLinks !== '') where.hasLinks = hasLinks === 'true';
    
    // 🆕 NUEVO: Filtro por año de defunción específico
    if (deathYear) {
      where.deathYear = parseInt(deathYear);
    } else if (hasDeathDate === 'true') {
      // Si no se especifica año pero se pide hasDeathDate, filtrar los que tienen
      where.deathYear = { not: null };
    } else if (hasDeathDate === 'false') {
      where.deathYear = null;
    }

    let orderBy: any = {};
    if (sortBy === 'deathDate' || sortBy === 'deathYear') {
      // 🆕 MEJORADO: Ordenar por año de muerte considerando mes y día
      orderBy = [
        { deathYear: sortOrder },
        { deathMonth: sortOrder },
        { deathDay: sortOrder }
      ];
    } else if (sortBy === 'birthDate') {
      orderBy = [
        { birthYear: sortOrder },
        { birthMonth: sortOrder },
        { birthDay: sortOrder }
      ];
    } else if (sortBy === 'createdAt') {
      orderBy = { createdAt: sortOrder };
    } else if (sortBy === 'updatedAt') {
      orderBy = { updatedAt: sortOrder };
    } else if (sortBy === 'name') {
      orderBy = [
        { lastName: sortOrder },
        { firstName: sortOrder }
      ];
    } else {
      orderBy = [
        { lastName: 'asc' },
        { firstName: 'asc' }
      ];
    }

    const totalCount = await prisma.person.count({ where });

    const people = await prisma.person.findMany({
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
        },
        links: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' }
        },
        alternativeNames: {
          orderBy: { createdAt: 'asc' }
        },
        _count: {
          select: {
            links: true,
            castRoles: true,
            crewRoles: true,
          },
        },
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    });

    console.log('Found people:', people.length);
    console.log('Where clause:', where);
    console.log('Skip:', (page - 1) * limit);
    console.log('Take:', limit);

    const totalPages = Math.ceil(totalCount / limit);

    // IMPORTANTE: Agregar el campo 'name' formateado a cada persona
    // También identificar si algún nombre alternativo hizo match (para Prisma fallback)
    const peopleWithName = people.map(person => {
      let matchedAlternativeName: string | null = null;
      let matchedAlternativeNameId: number | null = null;
      
      // Si hay búsqueda, verificar si el match fue en un nombre alternativo
      if (search && search.trim().length >= 2 && person.alternativeNames?.length) {
        const searchLower = search.toLowerCase().trim();
        const mainName = `${person.firstName || ''} ${person.lastName || ''}`.toLowerCase().trim();
        
        // Si el nombre principal no contiene el término de búsqueda,
        // buscar cuál nombre alternativo hizo match
        if (!mainName.includes(searchLower) && 
            !(person.firstName?.toLowerCase().includes(searchLower)) &&
            !(person.lastName?.toLowerCase().includes(searchLower))) {
          for (const alt of person.alternativeNames) {
            if (alt.fullName.toLowerCase().includes(searchLower)) {
              matchedAlternativeName = alt.fullName;
              matchedAlternativeNameId = alt.id;
              break;
            }
          }
        }
      }
      
      return {
        ...person,
        name: `${person.firstName || ''} ${person.lastName || ''}`.trim() || person.realName || 'Sin nombre',
        matchedAlternativeName,
        matchedAlternativeNameId
      };
    });

    const result = {
      data: peopleWithName,
      totalCount,
      page,
      totalPages,
      hasMore: page < totalPages,
    };
    
    // ============================================
    // SAVE TO CACHE (solo para obituarios)
    // ============================================
    const useCache = shouldCache(request.nextUrl.searchParams);
    
    if (useCache) {
      const cacheKey = generateCacheKey(request.nextUrl.searchParams);
      const redisTTL = getRedisTTL(request.nextUrl.searchParams);
      const now = Date.now();
      
      console.log(`💾 Guardando en caché: ${cacheKey.substring(0, 60)}...`);
      
      // Guardar en Redis
      RedisClient.set(cacheKey, JSON.stringify(result), redisTTL)
        .then(saved => {
          if (saved) {
            console.log(`✅ Obituarios guardados en Redis con TTL ${redisTTL}s (${redisTTL/60} min)`);
          }
        })
        .catch(err => console.error('Error guardando en Redis:', err));
      
      // Guardar en memoria
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
    }

    // Retornar con headers apropiados
    if (useCache) {
      const redisTTL = getRedisTTL(request.nextUrl.searchParams);
      return NextResponse.json(result, {
        headers: {
          'Cache-Control': `public, s-maxage=${redisTTL}, stale-while-revalidate=${redisTTL * 2}`,
          'X-Cache': 'MISS',
          'X-Cache-Source': 'database'
        }
      });
    }

    // Sin caché (búsquedas normales)
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Error fetching people:', error);
    
    // Intentar servir desde caché stale si hay error (solo obituarios)
    if (shouldCache(request.nextUrl.searchParams)) {
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
    }
    
    return NextResponse.json(
      { message: 'Error al obtener personas' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // ✨ SEPARACIÓN INTELIGENTE DE NOMBRES
    // Usa FirstNameGender para identificar qué palabras son nombres
    if (data.name && !data.firstName && !data.lastName) {
      const { firstName, lastName } = await splitFullName(data.name, prisma);
      data.firstName = firstName;
      data.lastName = lastName;
    }

    let baseSlug = generatePersonSlug(data.firstName, data.lastName);
    let slug = baseSlug;
    let counter = 1;

    while (await prisma.person.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const personData: any = {
      slug,
      firstName: data.firstName || null,
      lastName: data.lastName || null,
      realName: data.realName || null,
      birthYear: data.birthYear || null,
      birthMonth: data.birthMonth || null,
      birthDay: data.birthDay || null,
      deathYear: data.deathYear || null,
      deathMonth: data.deathMonth || null,
      deathDay: data.deathDay || null,
      birthLocationId: data.birthLocationId || null,
      deathLocationId: data.deathLocationId || null,
      biography: data.biography || null,
      photoUrl: data.photoUrl || null,
      photoPublicId: data.photoPublicId || null,
      gender: data.gender || null,
      hideAge: data.hideAge || false,
      isActive: data.isActive ?? true,
      hasLinks: data.links && data.links.length > 0,
    };

    const person = await prisma.$transaction(async (tx) => {
      const newPerson = await tx.person.create({
        data: personData,
      });

      if (data.links && data.links.length > 0) {
        await tx.personLink.createMany({
          data: data.links.map((link: any, index: number) => ({
            personId: newPerson.id,
            type: link.type,
            url: link.url,
            title: link.title || null,
            displayOrder: link.displayOrder ?? index,
            isVerified: link.isVerified || false,
            isActive: link.isActive ?? true,
          })),
        });
      }

      if (data.nationalities && data.nationalities.length > 0) {
        await tx.personNationality.createMany({
          data: data.nationalities.map((locationId: number) => ({
            personId: newPerson.id,
            locationId: locationId,
          })),
        });
      }

      // 🆕 Crear nombres alternativos si se enviaron
      if (data.alternativeNames && data.alternativeNames.length > 0) {
        const validNames = data.alternativeNames.filter(
          (alt: any) => alt.fullName && alt.fullName.trim()
        );
        if (validNames.length > 0) {
          await tx.personAlternativeName.createMany({
            data: validNames.map((alt: any) => ({
              personId: newPerson.id,
              fullName: alt.fullName.trim(),
            })),
          });
        }
      }

      return tx.person.findUnique({
        where: { id: newPerson.id },
        include: {
          links: true,
          nationalities: {
            include: { location: true }
          },
          birthLocation: {
            include: { parent: true }
          },
          deathLocation: {
            include: { parent: true }
          },
          alternativeNames: {
            orderBy: { createdAt: 'asc' }
          },
          _count: {
            select: {
              links: true,
              castRoles: true,
              crewRoles: true,
            },
          },
        },
      });
    });

    // IMPORTANTE: Agregar el campo 'name' al resultado
    const personWithName = {
      ...person,
      name: `${person?.firstName || ''} ${person?.lastName || ''}`.trim() || person?.realName || 'Sin nombre'
    };

    // ============================================
    // INVALIDAR CACHÉS si es un obituario
    // ============================================
    if (person?.deathYear) {
      console.log('🗑️ Invalidando cachés de obituarios tras crear persona fallecida');
      
      const redisClient = RedisClient.getInstance();
      if (redisClient) {
        try {
          const keys = await redisClient.keys('people:list:*deathYear*');
          if (keys.length > 0) {
            await redisClient.del(...keys);
            console.log(`✅ ${keys.length} cachés de obituarios invalidados en Redis`);
          }
          
          // También invalidar death-years
          await redisClient.del('people:death-years:v1');
          console.log('✅ Caché de death-years invalidado en Redis');
        } catch (err) {
          console.error('Error invalidando cachés de Redis:', err);
        }
      }
      
      // Limpiar memoria también
      let memoryKeysDeleted = 0;
      for (const key of memoryCache.keys()) {
        if (key.includes('deathYear') || key === 'people:death-years:v1') {
          memoryCache.delete(key);
          memoryKeysDeleted++;
        }
      }
      if (memoryKeysDeleted > 0) {
        console.log(`✅ ${memoryKeysDeleted} cachés de obituarios invalidados en memoria`);
      }
    }

    return NextResponse.json(personWithName, { status: 201 });
  } catch (error) {
    console.error('Error creating person:', error);
    return NextResponse.json(
      { message: 'Error al crear persona' },
      { status: 500 }
    );
  }
}