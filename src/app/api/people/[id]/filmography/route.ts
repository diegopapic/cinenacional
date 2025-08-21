// src/app/api/people/[id]/filmography/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const personId = parseInt(params.id);

    // Obtener roles como actor/actriz
    const castRoles = await prisma.movieCast.findMany({
      where: {
        personId: personId
      },
      include: {
        movie: {
          select: {
            id: true,
            slug: true,
            title: true,
            year: true,
            releaseYear: true,
            releaseMonth: true,
            releaseDay: true
          }
        }
      },
      orderBy: [
        { movie: { releaseYear: 'desc' } },
        { movie: { year: 'desc' } }
      ]
    });

    // Obtener roles en el equipo técnico
    const crewRoles = await prisma.movieCrew.findMany({
      where: {
        personId: personId
      },
      include: {
        movie: {
          select: {
            id: true,
            slug: true,
            title: true,
            year: true,
            releaseYear: true,
            releaseMonth: true,
            releaseDay: true
          }
        },
        role: true // Incluir la referencia al rol si existe
      },
      orderBy: [
        { movie: { releaseYear: 'desc' } },
        { movie: { year: 'desc' } }
      ]
    });

    return NextResponse.json({
      castRoles,
      crewRoles
    });
  } catch (error) {
    console.error('Error fetching person filmography:', error);
    return NextResponse.json(
      { error: 'Failed to fetch filmography' },
      { status: 500 }
    );
  }
}