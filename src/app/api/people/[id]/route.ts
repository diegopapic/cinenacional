// src/app/api/people/[id]/route.ts - CON REDIS CACHE
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generatePersonSlug } from '@/lib/people/peopleUtils';
import RedisClient from '@/lib/redis';
import { requireAuth } from '@/lib/auth';
import { apiHandler } from '@/lib/api/api-handler';
import { deleteCloudinaryImage } from '@/lib/cloudinary';

// Cache en memoria como fallback
const memoryCache = new Map<string, { data: any; timestamp: number }>();
const MEMORY_CACHE_TTL = 60 * 60 * 1000; // 1 hora en ms
const REDIS_CACHE_TTL = 3600; // 1 hora en segundos

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const personId = parseInt(id);

        if (isNaN(personId)) {
            return NextResponse.json(
                { error: 'ID inválido' },
                { status: 400 }
            );
        }

        // Generar clave de caché única
        const cacheKey = `person:id:${personId}:v1`;

        // 1. Intentar obtener de Redis
        try {
            const redisCached = await RedisClient.get(cacheKey);

            if (redisCached) {
                console.log(`✅ Cache HIT desde Redis para persona: ${personId}`);
                return NextResponse.json(
                    JSON.parse(redisCached),
                    {
                        headers: {
                            'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
                            'X-Cache': 'HIT',
                            'X-Cache-Source': 'redis',
                            'X-Person-Id': id
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
            console.log(`✅ Cache HIT desde memoria para persona: ${personId}`);

            // Intentar guardar en Redis para próximas requests
            RedisClient.set(cacheKey, JSON.stringify(memoryCached.data), REDIS_CACHE_TTL)
                .catch(err => console.error('Error guardando en Redis:', err));

            return NextResponse.json(memoryCached.data, {
                headers: {
                    'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
                    'X-Cache': 'HIT',
                    'X-Cache-Source': 'memory',
                    'X-Person-Id': id
                }
            });
        }

        // 3. No hay caché, consultar base de datos
        console.log(`🔄 Cache MISS - Consultando BD para persona: ${personId}`);

        const person = await prisma.person.findUnique({
            where: { id: personId },
            include: {
                links: {
                    orderBy: { displayOrder: 'asc' },
                },
                alternativeNames: {
                    orderBy: { createdAt: 'asc' },
                },
                nationalities: {
                    include: {
                        location: true
                    }
                },
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
                _count: {
                    select: {
                        castRoles: true,
                        crewRoles: true,
                        awards: true,
                    },
                },
            },
        });

        if (!person) {
            return NextResponse.json(
                { error: 'Persona no encontrada' },
                { status: 404 }
            );
        }

        // 4. Guardar en ambos cachés
        // Redis con TTL de 1 hora
        RedisClient.set(cacheKey, JSON.stringify(person), REDIS_CACHE_TTL)
            .then(saved => {
                if (saved) {
                    console.log(`✅ Persona ${personId} guardada en Redis`);
                }
            })
            .catch(err => console.error('Error guardando en Redis:', err));

        // Memoria como fallback
        memoryCache.set(cacheKey, {
            data: person,
            timestamp: now
        });

        // Limpiar caché de memoria viejo (mantener máximo 100 personas)
        if (memoryCache.size > 100) {
            const oldestKey = memoryCache.keys().next().value;
            if (oldestKey) {
                memoryCache.delete(oldestKey);
            }
        }

        return NextResponse.json(person, {
            headers: {
                'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
                'X-Cache': 'MISS',
                'X-Cache-Source': 'database',
                'X-Person-Id': id
            }
        });
    } catch (error) {
        console.error('Error fetching person:', error);

        // Intentar servir desde caché stale si hay error
        const { id } = await params;
        const cacheKey = `person:id:${parseInt(id)}:v1`;
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
            { error: 'Error al obtener persona' },
            { status: 500 }
        );
    }
}

export const PUT = apiHandler(async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) => {
    const auth = await requireAuth()
    if (auth.error) return auth.error

    const { id } = await params;
    const personId = parseInt(id);

    if (isNaN(personId)) {
        return NextResponse.json(
            { error: 'ID inválido' },
            { status: 400 }
        );
    }

    const data = await request.json();

    console.log('Data received in API:', data);
    console.log('Nationalities received:', data.nationalities);

    // Verificar si necesitamos actualizar el slug
    let slug = undefined;
    const currentPerson = await prisma.person.findUnique({
        where: { id: personId },
        select: { firstName: true, lastName: true, slug: true, photoPublicId: true },
    });

    if (!currentPerson) {
        return NextResponse.json(
            { error: 'Persona no encontrada' },
            { status: 404 }
        );
    }

    const nameChanged =
        currentPerson.firstName !== data.firstName ||
        currentPerson.lastName !== data.lastName;

    if (nameChanged) {
        // Generar nuevo slug si cambió el nombre
        let baseSlug = generatePersonSlug(data.firstName, data.lastName);
        slug = baseSlug;
        let counter = 1;

        // Verificar que el nuevo slug no exista (excepto para la persona actual)
        while (true) {
            const existing = await prisma.person.findUnique({
                where: { slug },
                select: { id: true },
            });

            if (!existing || existing.id === personId) break;

            slug = `${baseSlug}-${counter}`;
            counter++;
        }
    }

    // Verificar duplicados de imdbId y tmdbId
    const conflicts: Array<{ field: string; value: string; personId: number; personName: string }> = [];

    if (data.imdbId) {
        const existing = await prisma.person.findFirst({
            where: { imdbId: data.imdbId, id: { not: personId } },
            select: { id: true, firstName: true, lastName: true },
        });
        if (existing) {
            conflicts.push({
                field: 'imdbId',
                value: data.imdbId,
                personId: existing.id,
                personName: [existing.firstName, existing.lastName].filter(Boolean).join(' '),
            });
        }
    }

    if (data.tmdbId) {
        const tmdbIdInt = typeof data.tmdbId === 'string' ? parseInt(data.tmdbId) : data.tmdbId;
        if (tmdbIdInt) {
            const existing = await prisma.person.findFirst({
                where: { tmdbId: tmdbIdInt, id: { not: personId } },
                select: { id: true, firstName: true, lastName: true },
            });
            if (existing) {
                conflicts.push({
                    field: 'tmdbId',
                    value: String(tmdbIdInt),
                    personId: existing.id,
                    personName: [existing.firstName, existing.lastName].filter(Boolean).join(' '),
                });
            }
        }
    }

    if (conflicts.length > 0 && !data.forceReassign) {
        return NextResponse.json(
            { error: 'ID duplicado', conflicts },
            { status: 409 }
        );
    }

    // Preparar datos de actualización con campos de fecha parciales
    const updateData: any = {
        ...(slug && { slug }),
        firstName: data.firstName || null,
        lastName: data.lastName || null,
        realName: data.realName || null,
        birthYear: data.birthYear || null,
        birthMonth: data.birthMonth || null,
        birthDay: data.birthDay || null,
        deathYear: data.deathYear || null,
        deathMonth: data.deathMonth || null,
        deathDay: data.deathDay || null,
        birthLocation: data.birthLocationId
            ? { connect: { id: data.birthLocationId } }
            : { disconnect: true },
        deathLocation: data.deathLocationId
            ? { connect: { id: data.deathLocationId } }
            : { disconnect: true },
        biography: data.biography || null,
        photoUrl: data.photoUrl || null,
        photoPublicId: data.photoPublicId || null,
        gender: data.gender || null,
        hideAge: data.hideAge || false,
        isActive: data.isActive ?? true,
        hasLinks: data.links && data.links.length > 0,
        imdbId: data.imdbId || null,
        tmdbId: data.tmdbId ? parseInt(data.tmdbId) : null,
    };

    console.log('Update data prepared:', updateData);

    // Actualizar persona, links y nacionalidades en una transacción
    const person = await prisma.$transaction(async (tx) => {
        // Si forceReassign, desasignar IDs de las otras personas
        if (data.forceReassign && conflicts.length > 0) {
            for (const conflict of conflicts) {
                await tx.person.update({
                    where: { id: conflict.personId },
                    data: { [conflict.field]: null },
                });
            }
        }

        // Actualizar la persona
        const updatedPerson = await tx.person.update({
            where: { id: personId },
            data: updateData,
        });

        // Eliminar links existentes
        await tx.personLink.deleteMany({
            where: { personId },
        });

        // Crear nuevos links si existen
        if (data.links && data.links.length > 0) {
            await tx.personLink.createMany({
                data: data.links.map((link: any, index: number) => ({
                    personId,
                    type: link.type,
                    url: link.url,
                    displayOrder: link.displayOrder ?? index,
                    isVerified: link.isVerified || false,
                    isActive: link.isActive ?? true,
                })),
            });
        }

        // Eliminar nacionalidades existentes
        await tx.personNationality.deleteMany({
            where: { personId },
        });

        // Crear nuevas nacionalidades si existen
        if (data.nationalities && data.nationalities.length > 0) {
            await tx.personNationality.createMany({
                data: data.nationalities.map((locationId: number) => ({
                    personId,
                    locationId: locationId,
                })),
            });
        }

        // Eliminar nombres alternativos existentes
        await tx.personAlternativeName.deleteMany({
            where: { personId },
        });

        // Crear nuevos nombres alternativos si existen
        if (data.alternativeNames && data.alternativeNames.length > 0) {
            await tx.personAlternativeName.createMany({
                data: data.alternativeNames
                    .filter((alt: any) => alt.fullName && alt.fullName.trim() !== '')
                    .map((alt: any) => ({
                        personId,
                        fullName: alt.fullName.trim(),
                    })),
            });
        }

        // Retornar la persona actualizada con sus relaciones
        return tx.person.findUnique({
            where: { id: personId },
            include: {
                links: true,
                alternativeNames: true,
                nationalities: {
                    include: {
                        location: true
                    }
                },
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

    // Eliminar foto vieja de Cloudinary si cambió
    const newPhotoPublicId = data.photoPublicId || null
    const oldPhotoPublicId = currentPerson.photoPublicId || null
    if (oldPhotoPublicId && oldPhotoPublicId !== newPhotoPublicId) {
        deleteCloudinaryImage(oldPhotoPublicId).catch(() => {})
    }

    // INVALIDAR CACHÉS después de actualizar exitosamente
    console.log('🗑️ Invalidando cachés para persona actualizada');

    const cacheKeysToInvalidate = [
        `person:id:${personId}:v1`,
        `person:slug:${currentPerson.slug}:v1`,
        `person:filmography:${personId}:v1`, // También invalidar filmografía
        'people-list:v1' // Lista de personas si existe
    ];

    // Si el slug cambió, también invalidar el nuevo slug
    if (slug && slug !== currentPerson.slug) {
        cacheKeysToInvalidate.push(`person:slug:${slug}:v1`);
    }

    // Invalidar en Redis
    await Promise.all(
        cacheKeysToInvalidate.map(key =>
            RedisClient.del(key).catch(err =>
                console.error(`Error invalidando Redis key ${key}:`, err)
            )
        )
    );

    // Invalidar en memoria
    cacheKeysToInvalidate.forEach(key => memoryCache.delete(key));

    console.log(`✅ Cachés invalidados: ${cacheKeysToInvalidate.join(', ')}`);

    return NextResponse.json(person);
}, 'actualizar persona')

export const DELETE = apiHandler(async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) => {
    const auth = await requireAuth()
    if (auth.error) return auth.error

    const { id } = await params;
    const personId = parseInt(id);

    if (isNaN(personId)) {
        return NextResponse.json(
            { error: 'ID inválido' },
            { status: 400 }
        );
    }

    // Verificar si la persona tiene películas asociadas
    const person = await prisma.person.findUnique({
        where: { id: personId },
        select: {
            slug: true,
            photoPublicId: true,
            _count: {
                select: {
                    castRoles: true,
                    crewRoles: true,
                },
            },
        }
    });

    if (!person) {
        return NextResponse.json(
            { error: 'Persona no encontrada' },
            { status: 404 }
        );
    }

    const totalRoles = person._count.castRoles + person._count.crewRoles;
    if (totalRoles > 0) {
        return NextResponse.json(
            {
                error: `No se puede eliminar esta persona porque está asociada a ${totalRoles} película(s)`
            },
            { status: 400 }
        );
    }

    // Eliminar la persona (los links y nacionalidades se eliminan en cascada)
    await prisma.person.delete({
        where: { id: personId },
    });

    // Eliminar foto de Cloudinary (fire-and-forget)
    if (person.photoPublicId) {
        deleteCloudinaryImage(person.photoPublicId).catch(() => {})
    }

    // INVALIDAR CACHÉS después de eliminar
    console.log('🗑️ Invalidando cachés para persona eliminada');

    const cacheKeysToInvalidate = [
        `person:id:${personId}:v1`,
        `person:slug:${person.slug}:v1`,
        `person:filmography:${personId}:v1`,
        'people-list:v1'
    ];

    // Invalidar en Redis
    await Promise.all(
        cacheKeysToInvalidate.map(key =>
            RedisClient.del(key).catch(err =>
                console.error(`Error invalidando Redis key ${key}:`, err)
            )
        )
    );

    // Invalidar en memoria
    cacheKeysToInvalidate.forEach(key => memoryCache.delete(key));

    console.log(`✅ Cachés invalidados tras eliminar: ${cacheKeysToInvalidate.join(', ')}`);

    return new NextResponse(null, { status: 204 });
}, 'eliminar persona')