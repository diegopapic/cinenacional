// src/app/api/locations/search/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';

    if (!query || query.length < 2) {
      return NextResponse.json([]);
    }

    // Buscar ubicaciones que coincidan con el query
    const locations = await prisma.location.findMany({
      where: {
        name: {
          contains: query,
          mode: 'insensitive'
        }
      },
      include: {
        parent: {
          include: {
            parent: true
          }
        }
      },
      take: 20,
      orderBy: [
        {
          name: 'asc'
        }
      ]
    });

    // Construir el path completo para cada ubicación
    const locationsWithPath = await Promise.all(
      locations.map(async (location) => {
        let path = location.name;
        let current = location;
        
        while (current.parent) {
          path = `${current.parent.name}, ${path}`;
          
          if (current.parent.parent) {
            path = `${current.parent.parent.name}, ${path}`;
            break; // Asumimos máximo 3 niveles
          }
          break;
        }

        return {
          id: location.id,
          name: location.name,
          slug: location.slug,
          parentId: location.parentId,
          path,
          parent: location.parent
        };
      })
    );

    return NextResponse.json(locationsWithPath);
  } catch (error) {
    console.error('Error searching locations:', error);
    return NextResponse.json(
      { error: 'Error al buscar ubicaciones' },
      { status: 500 }
    );
  }
}