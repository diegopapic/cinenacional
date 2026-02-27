// src/app/api/locations/countries/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiHandler } from '@/lib/api/api-handler';

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (request: NextRequest) => {
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
}, 'obtener países')
