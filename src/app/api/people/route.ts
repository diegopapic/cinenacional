// src/app/api/people/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generatePersonSlug } from '@/lib/people/peopleUtils';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    const gender = searchParams.get('gender');
    const isActive = searchParams.get('isActive');
    const hasLinks = searchParams.get('hasLinks');

    // NUEVO: Parámetros para obituarios y ordenamiento
    const hasDeathDate = searchParams.get('hasDeathDate');
    const sortBy = searchParams.get('sortBy') || 'last_name';
    const sortOrder = searchParams.get('sortOrder') || 'asc';

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // NUEVO: Si es una búsqueda para autocomplete (limit <= 10) y hay search term
    // usar raw SQL para búsqueda concatenada
    if (search && limit <= 10) {
      const searchQuery = search.toLowerCase().trim();

      // Debug log
      console.log('Search query:', searchQuery);
      console.log('Limit:', limit);
      console.log('isActive param:', isActive);

      try {
        // Simplificar la query para ver si el problema es con isActive
        const people = await prisma.$queryRaw<Array<{
          id: number;
          slug: string;
          first_name: string | null;
          last_name: string | null;
          real_name: string | null;
          photo_url: string | null;
        }>>`
          SELECT 
            id,
            slug,
            "first_name",
            "last_name",
            "real_name",
            "photo_url"
          FROM people
          WHERE 
            (
              -- Búsqueda en campos individuales
              LOWER("first_name") LIKE ${`%${searchQuery}%`}
              OR LOWER("last_name") LIKE ${`%${searchQuery}%`}
              OR LOWER("real_name") LIKE ${`%${searchQuery}%`}
              -- BÚSQUEDA CONCATENADA con || (operador de PostgreSQL)
              OR LOWER(COALESCE("first_name", '') || ' ' || COALESCE("last_name", '')) LIKE ${`%${searchQuery}%`}
              -- También buscar last_name, first_name por si buscan al revés
              OR LOWER(COALESCE("last_name", '') || ' ' || COALESCE("first_name", '')) LIKE ${`%${searchQuery}%`}
            )
          ORDER BY 
            -- Priorizar coincidencias exactas
            CASE 
              WHEN LOWER(COALESCE("first_name", '') || ' ' || COALESCE("last_name", '')) = ${searchQuery} THEN 1
              WHEN LOWER("first_name") = ${searchQuery} OR LOWER("last_name") = ${searchQuery} THEN 2
              WHEN LOWER(COALESCE("first_name", '') || ' ' || COALESCE("last_name", '')) LIKE ${`${searchQuery}%`} THEN 3
              ELSE 4
            END,
            "last_name",
            "first_name"
          LIMIT ${limit}
        `;

        console.log('Found people:', people.length);
        console.log('First person raw data:', people[0]);

        // Formatear respuesta para autocomplete
        const formattedPeople = people.map(person => ({
          id: person.id,
          slug: person.slug,
          name: [person.first_name, person.last_name].filter(Boolean).join(' ') || person.real_name || 'Sin nombre',
          firstName: person.first_name,
          lastName: person.last_name,
          photoUrl: person.photo_url
        }));
console.log('First person formatted:', formattedPeople[0]);
console.log('Searching for "miguel k" should find:', formattedPeople.filter(p => 
  p.name.toLowerCase().includes('miguel') && p.name.toLowerCase().includes('k')
));
        // Para búsquedas de autocomplete, retornar array simple
        return NextResponse.json(formattedPeople);

      } catch (sqlError) {
        console.error('SQL Error:', sqlError);
        // Si falla el SQL, intentar con Prisma normal
        const people = await prisma.person.findMany({
          where: {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { realName: { contains: search, mode: 'insensitive' } },
            ]
          },
          select: {
            id: true,
            slug: true,
            firstName: true,
            lastName: true,
            realName: true,
            photoUrl: true
          },
          take: limit
        });

        const formattedPeople = people.map(person => ({
          id: person.id,
          slug: person.slug,
          name: [person.firstName, person.lastName].filter(Boolean).join(' ') || person.realName || 'Sin nombre',
          firstName: person.firstName,
          lastName: person.lastName,
          photoUrl: person.photoUrl
        }));

        return NextResponse.json(formattedPeople);
      }
    }

    // Para listados normales con paginación, usar el código existente
    const where: any = {};

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { realName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (gender) {
      where.gender = gender;
    }

    if (isActive !== null && isActive !== '') {
      where.isActive = isActive === 'true';
    }

    if (hasLinks !== null && hasLinks !== '') {
      where.hasLinks = hasLinks === 'true';
    }

    // NUEVO: Filtro para personas con fecha de muerte
    if (hasDeathDate === 'true') {
      where.deathYear = { not: null };
    } else if (hasDeathDate === 'false') {
      where.deathYear = null;
    }

    // Construir orderBy dinámicamente
    let orderBy: any = {};

    if (sortBy === 'deathDate') {
      // Ordenar por fecha de muerte (año, mes, día)
      orderBy = [
        { deathYear: sortOrder },
        { deathMonth: sortOrder },
        { deathDay: sortOrder }
      ];
    } else if (sortBy === 'birthDate') {
      // Ordenar por fecha de nacimiento (año, mes, día)
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
      // Ordenar por apellido y nombre
      orderBy = [
        { lastName: sortOrder },
        { firstName: sortOrder }
      ];
    } else {
      // Default: ordenar por apellido y nombre
      orderBy = [
        { lastName: 'asc' },
        { firstName: 'asc' }
      ];
    }

    // Obtener total para paginación
    const totalCount = await prisma.person.count({ where });

    // Obtener personas con paginación
    const people = await prisma.person.findMany({
      where,
      include: {
        nationalities: {
          include: {
            location: true
          }
        },
        birthLocation: {
          include: {
            parent: true
          }
        },
        deathLocation: {
          include: {
            parent: true
          }
        },
        links: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' }
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

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      data: people,
      totalCount,
      page,
      totalPages,
      hasMore: page < totalPages,
    });
  } catch (error) {
    console.error('Error fetching people:', error);
    return NextResponse.json(
      { message: 'Error al obtener personas' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Si es una creación rápida (solo con nombre)
    if (data.name && !data.firstName && !data.lastName) {
      // Dividir el nombre en firstName y lastName
      const nameParts = data.name.trim().split(' ');
      data.firstName = nameParts[0];
      data.lastName = nameParts.slice(1).join(' ') || null;
    }

    // Generar slug único basado en firstName y lastName
    let baseSlug = generatePersonSlug(data.firstName, data.lastName);
    let slug = baseSlug;
    let counter = 1;

    // Verificar si el slug ya existe y generar uno único
    while (await prisma.person.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Preparar los datos de la persona (campos de fecha parcial)
    const personData: any = {
      slug,
      firstName: data.firstName || null,
      lastName: data.lastName || null,
      realName: data.realName || null,
      // Fechas parciales de nacimiento
      birthYear: data.birthYear || null,
      birthMonth: data.birthMonth || null,
      birthDay: data.birthDay || null,
      // Fechas parciales de muerte
      deathYear: data.deathYear || null,
      deathMonth: data.deathMonth || null,
      deathDay: data.deathDay || null,
      // Ubicaciones
      birthLocationId: data.birthLocationId || null,
      deathLocationId: data.deathLocationId || null,
      biography: data.biography || null,
      photoUrl: data.photoUrl || null,
      gender: data.gender || null,
      hideAge: data.hideAge || false,
      isActive: data.isActive ?? true,
      hasLinks: data.links && data.links.length > 0,
    };

    // Crear la persona, sus links y nacionalidades en una transacción
    const person = await prisma.$transaction(async (tx) => {
      // Crear la persona
      const newPerson = await tx.person.create({
        data: personData,
      });

      // Si hay links, crearlos
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

      // Si hay nacionalidades, crearlas
      if (data.nationalities && data.nationalities.length > 0) {
        await tx.personNationality.createMany({
          data: data.nationalities.map((locationId: number) => ({
            personId: newPerson.id,
            locationId: locationId,
          })),
        });
      }

      // Retornar la persona con sus relaciones
      return tx.person.findUnique({
        where: { id: newPerson.id },
        include: {
          links: true,
          nationalities: {
            include: {
              location: true
            }
          },
          birthLocation: {
            include: {
              parent: true
            }
          },
          deathLocation: {
            include: {
              parent: true
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

    return NextResponse.json(person, { status: 201 });
  } catch (error) {
    console.error('Error creating person:', error);
    return NextResponse.json(
      { message: 'Error al crear persona' },
      { status: 500 }
    );
  }
}