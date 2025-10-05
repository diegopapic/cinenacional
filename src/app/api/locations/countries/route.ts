// src/app/api/locations/countries/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Obtener todas las locations que no tienen parent (son países)
    // Quitamos el filtro 'type' que puede no existir
    const countries = await prisma.location.findMany({
      where: {
        parentId: null  // Solo filtrar por parentId null
      },
      orderBy: {
        name: 'asc'
      },
      select: {
        id: true,
        name: true,
        slug: true
      }
    });

    return NextResponse.json(countries);
  } catch (error) {
    console.error('Error fetching countries:', error);
    
    // Devolver el mensaje de error específico para debugging
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch countries' },
      { status: 500 }
    );
  }
}