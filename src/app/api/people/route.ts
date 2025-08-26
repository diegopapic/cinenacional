// src/app/api/people/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
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

    // BÚSQUEDA MEJORADA
    if (search && search.trim().length > 0) {
      const searchQuery = search.toLowerCase().trim();
      
      // Para búsquedas de autocomplete (limit <= 10)
      if (limit <= 10) {
        try {
          // Intentar primero con unaccent
          const searchPattern = `%${searchQuery}%`;
          const searchTerms = searchQuery.split(/\s+/).filter(term => term.length > 0);
          
          let people: any[] = [];
          
          if (searchTerms.length === 1) {
            // Búsqueda simple con un término
            people = await prisma.$queryRaw`
              SELECT 
                id,
                slug,
                first_name,
                last_name,
                real_name,
                photo_url
              FROM people
              WHERE (
                LOWER(unaccent(first_name)) LIKE ${searchPattern}
                OR LOWER(unaccent(last_name)) LIKE ${searchPattern}
                OR LOWER(unaccent(real_name)) LIKE ${searchPattern}
                OR LOWER(unaccent(COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''))) LIKE ${searchPattern}
              )
              ${isActive !== null && isActive !== '' 
                ? Prisma.sql`AND is_active = ${isActive === 'true'}`
                : Prisma.empty
              }
              ORDER BY 
                CASE 
                  WHEN LOWER(unaccent(COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''))) = ${searchQuery} THEN 1
                  WHEN LOWER(unaccent(first_name)) = ${searchQuery} OR LOWER(unaccent(last_name)) = ${searchQuery} THEN 2
                  WHEN LOWER(unaccent(COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''))) LIKE ${searchQuery + '%'} THEN 3
                  ELSE 4
                END,
                last_name ASC NULLS LAST,
                first_name ASC NULLS LAST
              LIMIT ${limit}
            `;
          } else {
            // Búsqueda con múltiples términos
            const firstTerm = `%${searchTerms[0]}%`;
            const secondTerm = searchTerms.length > 1 ? `%${searchTerms[1]}%` : '';
            const thirdTerm = searchTerms.length > 2 ? `%${searchTerms[2]}%` : '';
            
            // Query para múltiples términos
            if (searchTerms.length === 2) {
              people = await prisma.$queryRaw`
                SELECT 
                  id,
                  slug,
                  first_name,
                  last_name,
                  real_name,
                  photo_url
                FROM people
                WHERE (
                  -- Búsqueda de la frase completa
                  LOWER(unaccent(COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''))) LIKE ${searchPattern}
                  OR LOWER(unaccent(COALESCE(last_name, '') || ' ' || COALESCE(first_name, ''))) LIKE ${searchPattern}
                  OR LOWER(unaccent(real_name)) LIKE ${searchPattern}
                  -- O que contenga ambos términos en cualquier orden
                  OR (
                    (LOWER(unaccent(COALESCE(first_name, ''))) LIKE ${firstTerm} 
                     OR LOWER(unaccent(COALESCE(last_name, ''))) LIKE ${firstTerm}
                     OR LOWER(unaccent(COALESCE(real_name, ''))) LIKE ${firstTerm})
                    AND
                    (LOWER(unaccent(COALESCE(first_name, ''))) LIKE ${secondTerm}
                     OR LOWER(unaccent(COALESCE(last_name, ''))) LIKE ${secondTerm}
                     OR LOWER(unaccent(COALESCE(real_name, ''))) LIKE ${secondTerm})
                  )
                )
                ${isActive !== null && isActive !== '' 
                  ? Prisma.sql`AND is_active = ${isActive === 'true'}`
                  : Prisma.empty
                }
                ORDER BY 
                  CASE 
                    WHEN LOWER(unaccent(COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''))) = ${searchQuery} THEN 1
                    WHEN LOWER(unaccent(COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''))) LIKE ${searchQuery + '%'} THEN 2
                    ELSE 3
                  END,
                  last_name ASC NULLS LAST,
                  first_name ASC NULLS LAST
                LIMIT ${limit}
              `;
            } else {
              // Para 3 o más términos
              people = await prisma.$queryRaw`
                SELECT 
                  id,
                  slug,
                  first_name,
                  last_name,
                  real_name,
                  photo_url
                FROM people
                WHERE (
                  LOWER(unaccent(COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''))) LIKE ${searchPattern}
                  OR LOWER(unaccent(COALESCE(last_name, '') || ' ' || COALESCE(first_name, ''))) LIKE ${searchPattern}
                  OR LOWER(unaccent(real_name)) LIKE ${searchPattern}
                )
                ${isActive !== null && isActive !== '' 
                  ? Prisma.sql`AND is_active = ${isActive === 'true'}`
                  : Prisma.empty
                }
                ORDER BY 
                  last_name ASC NULLS LAST,
                  first_name ASC NULLS LAST
                LIMIT ${limit}
              `;
            }
          }

          const formattedPeople = people.map(person => ({
            id: person.id,
            slug: person.slug,
            name: [person.first_name, person.last_name].filter(Boolean).join(' ') || person.real_name || 'Sin nombre',
            firstName: person.first_name,
            lastName: person.last_name,
            photoUrl: person.photo_url
          }));

          return NextResponse.json(formattedPeople);

        } catch (sqlError: any) {
          console.error('SQL Error with unaccent:', sqlError);
          
          // Fallback sin unaccent
          try {
            const searchPattern = `%${searchQuery}%`;
            const searchTerms = searchQuery.split(/\s+/).filter(term => term.length > 0);
            
            let people: any[] = [];
            
            if (searchTerms.length === 1) {
              people = await prisma.$queryRaw`
                SELECT 
                  id,
                  slug,
                  first_name,
                  last_name,
                  real_name,
                  photo_url
                FROM people
                WHERE (
                  LOWER(first_name) LIKE ${searchPattern}
                  OR LOWER(last_name) LIKE ${searchPattern}
                  OR LOWER(real_name) LIKE ${searchPattern}
                  OR LOWER(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) LIKE ${searchPattern}
                )
                ${isActive !== null && isActive !== '' 
                  ? Prisma.sql`AND is_active = ${isActive === 'true'}`
                  : Prisma.empty
                }
                ORDER BY 
                  CASE 
                    WHEN LOWER(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) = ${searchQuery} THEN 1
                    WHEN LOWER(first_name) = ${searchQuery} OR LOWER(last_name) = ${searchQuery} THEN 2
                    WHEN LOWER(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) LIKE ${searchQuery + '%'} THEN 3
                    ELSE 4
                  END,
                  last_name ASC NULLS LAST,
                  first_name ASC NULLS LAST
                LIMIT ${limit}
              `;
            } else {
              const firstTerm = `%${searchTerms[0]}%`;
              const secondTerm = searchTerms.length > 1 ? `%${searchTerms[1]}%` : '';
              
              if (searchTerms.length === 2) {
                people = await prisma.$queryRaw`
                  SELECT 
                    id,
                    slug,
                    first_name,
                    last_name,
                    real_name,
                    photo_url
                  FROM people
                  WHERE (
                    LOWER(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) LIKE ${searchPattern}
                    OR LOWER(COALESCE(last_name, '') || ' ' || COALESCE(first_name, '')) LIKE ${searchPattern}
                    OR LOWER(real_name) LIKE ${searchPattern}
                    OR (
                      (LOWER(COALESCE(first_name, '')) LIKE ${firstTerm} 
                       OR LOWER(COALESCE(last_name, '')) LIKE ${firstTerm}
                       OR LOWER(COALESCE(real_name, '')) LIKE ${firstTerm})
                      AND
                      (LOWER(COALESCE(first_name, '')) LIKE ${secondTerm}
                       OR LOWER(COALESCE(last_name, '')) LIKE ${secondTerm}
                       OR LOWER(COALESCE(real_name, '')) LIKE ${secondTerm})
                    )
                  )
                  ${isActive !== null && isActive !== '' 
                    ? Prisma.sql`AND is_active = ${isActive === 'true'}`
                    : Prisma.empty
                  }
                  ORDER BY 
                    CASE 
                      WHEN LOWER(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) = ${searchQuery} THEN 1
                      WHEN LOWER(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) LIKE ${searchQuery + '%'} THEN 2
                      ELSE 3
                    END,
                    last_name ASC NULLS LAST,
                    first_name ASC NULLS LAST
                  LIMIT ${limit}
                `;
              } else {
                people = await prisma.$queryRaw`
                  SELECT 
                    id,
                    slug,
                    first_name,
                    last_name,
                    real_name,
                    photo_url
                  FROM people
                  WHERE (
                    LOWER(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) LIKE ${searchPattern}
                    OR LOWER(COALESCE(last_name, '') || ' ' || COALESCE(first_name, '')) LIKE ${searchPattern}
                    OR LOWER(real_name) LIKE ${searchPattern}
                  )
                  ${isActive !== null && isActive !== '' 
                    ? Prisma.sql`AND is_active = ${isActive === 'true'}`
                    : Prisma.empty
                  }
                  ORDER BY 
                    last_name ASC NULLS LAST,
                    first_name ASC NULLS LAST
                  LIMIT ${limit}
                `;
              }
            }

            const formattedPeople = people.map(person => ({
              id: person.id,
              slug: person.slug,
              name: [person.first_name, person.last_name].filter(Boolean).join(' ') || person.real_name || 'Sin nombre',
              firstName: person.first_name,
              lastName: person.last_name,
              photoUrl: person.photo_url
            }));

            return NextResponse.json(formattedPeople);
            
          } catch (fallbackError) {
            console.error('Fallback SQL Error:', fallbackError);
            
            // Último fallback con Prisma ORM
            const searchTerms = searchQuery.split(/\s+/).filter(term => term.length > 0);
            
            const where: any = {};
            
            if (searchTerms.length === 1) {
              where.OR = [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { realName: { contains: search, mode: 'insensitive' } },
              ];
            } else {
              // Para múltiples términos, buscar que ambos estén presentes
              where.AND = searchTerms.map(term => ({
                OR: [
                  { firstName: { contains: term, mode: 'insensitive' } },
                  { lastName: { contains: term, mode: 'insensitive' } },
                  { realName: { contains: term, mode: 'insensitive' } }
                ]
              }));
            }
            
            if (isActive !== null && isActive !== '') {
              where.isActive = isActive === 'true';
            }
            
            const people = await prisma.person.findMany({
              where,
              select: {
                id: true,
                slug: true,
                firstName: true,
                lastName: true,
                realName: true,
                photoUrl: true
              },
              take: limit,
              orderBy: [
                { lastName: 'asc' },
                { firstName: 'asc' }
              ]
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
      }
    }

    // Para listados normales con paginación, usar el código existente
    const where: any = {};

    if (search) {
      const searchTerms = search.trim().split(/\s+/).filter(term => term.length > 0);
      
      if (searchTerms.length === 1) {
        where.OR = [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { realName: { contains: search, mode: 'insensitive' } },
        ];
      } else {
        // Para múltiples términos en listado paginado
        where.AND = searchTerms.map(term => ({
          OR: [
            { firstName: { contains: term, mode: 'insensitive' } },
            { lastName: { contains: term, mode: 'insensitive' } },
            { realName: { contains: term, mode: 'insensitive' } }
          ]
        }));
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
      photoPublicId: data.photoPublicId || null,
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