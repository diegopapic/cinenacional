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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Construir where clause
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

    // Obtener total para paginación
    const totalCount = await prisma.person.count({ where });

    // Obtener personas con paginación
    const people = await prisma.person.findMany({
      where,
      include: {
        nationalities: {
          include: {
            location: true  // Cambiado de 'location' a 'country'
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
      orderBy: [
        { lastName: 'asc' },
        { firstName: 'asc' },
      ],
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
              location: true  // Cambiado de 'location' a 'country'
            }
          },
          birthLocation: true,
          deathLocation: true,
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