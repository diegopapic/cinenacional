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
    const hasDeathDate = searchParams.get('hasDeathDate');
    const sortBy = searchParams.get('sortBy') || 'last_name';
    const sortOrder = searchParams.get('sortOrder') || 'asc';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Si hay búsqueda, usar SQL con unaccent para búsqueda mejorada
    if (search && search.trim().length >= 2) {
      try {
        const searchPattern = `%${search.toLowerCase().trim()}%`;
        const searchTerms = search.toLowerCase().trim().split(/\s+/);
        const skip = (page - 1) * limit;
        
        // Búsqueda mejorada que incluye nombre completo concatenado
        const peopleResults = await prisma.$queryRaw<any[]>`
          SELECT id
          FROM people
          WHERE 
            unaccent(LOWER(COALESCE(first_name, ''))) LIKE unaccent(${searchPattern})
            OR unaccent(LOWER(COALESCE(last_name, ''))) LIKE unaccent(${searchPattern})
            OR unaccent(LOWER(COALESCE(real_name, ''))) LIKE unaccent(${searchPattern})
            OR unaccent(LOWER(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, '')))) LIKE unaccent(${searchPattern})
            OR unaccent(LOWER(CONCAT(COALESCE(last_name, ''), ' ', COALESCE(first_name, '')))) LIKE unaccent(${searchPattern})
          ORDER BY 
            CASE 
              WHEN unaccent(LOWER(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, '')))) = unaccent(${search.toLowerCase().trim()}) THEN 1
              WHEN unaccent(LOWER(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, '')))) LIKE unaccent(${search.toLowerCase().trim() + '%'}) THEN 2
              WHEN unaccent(LOWER(COALESCE(first_name, ''))) LIKE unaccent(${searchPattern}) OR unaccent(LOWER(COALESCE(last_name, ''))) LIKE unaccent(${searchPattern}) THEN 3
              ELSE 4
            END,
            last_name ASC, 
            first_name ASC
          LIMIT ${limit}
          OFFSET ${skip}
        `;

        // Obtener el total para paginación
        const countResult = await prisma.$queryRaw<{count: number}[]>`
          SELECT COUNT(*)::int as count
          FROM people
          WHERE 
            unaccent(LOWER(COALESCE(first_name, ''))) LIKE unaccent(${searchPattern})
            OR unaccent(LOWER(COALESCE(last_name, ''))) LIKE unaccent(${searchPattern})
            OR unaccent(LOWER(COALESCE(real_name, ''))) LIKE unaccent(${searchPattern})
            OR unaccent(LOWER(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, '')))) LIKE unaccent(${searchPattern})
            OR unaccent(LOWER(CONCAT(COALESCE(last_name, ''), ' ', COALESCE(first_name, '')))) LIKE unaccent(${searchPattern})
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

        // IMPORTANTE: Agregar el campo 'name' formateado a cada persona
        const peopleWithName = people.map(person => ({
          ...person,
          name: `${person.firstName || ''} ${person.lastName || ''}`.trim() || person.realName || 'Sin nombre'
        }));

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
      // Búsqueda mejorada usando Prisma OR
      const searchTerms = search.trim().split(/\s+/);
      
      if (searchTerms.length === 1) {
        // Un solo término: buscar en cada campo
        where.OR = [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { realName: { contains: search, mode: 'insensitive' } },
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
          }
        ];
      }
    }

    if (gender) where.gender = gender;
    if (isActive !== null && isActive !== '') where.isActive = isActive === 'true';
    if (hasLinks !== null && hasLinks !== '') where.hasLinks = hasLinks === 'true';
    if (hasDeathDate === 'true') where.deathYear = { not: null };
    else if (hasDeathDate === 'false') where.deathYear = null;

    let orderBy: any = {};
    if (sortBy === 'deathDate') {
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
    const peopleWithName = people.map(person => ({
      ...person,
      name: `${person.firstName || ''} ${person.lastName || ''}`.trim() || person.realName || 'Sin nombre'
    }));

    return NextResponse.json({
      data: peopleWithName,
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

// POST sin cambios
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    if (data.name && !data.firstName && !data.lastName) {
      const nameParts = data.name.trim().split(' ');
      data.firstName = nameParts[0];
      data.lastName = nameParts.slice(1).join(' ') || null;
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

    return NextResponse.json(personWithName, { status: 201 });
  } catch (error) {
    console.error('Error creating person:', error);
    return NextResponse.json(
      { message: 'Error al crear persona' },
      { status: 500 }
    );
  }
}