// src/app/api/locations/search/route.ts

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const excludeId = searchParams.get('excludeId')
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!query || query.length < 2) {
      return NextResponse.json([])
    }

    const where: any = {
      name: {
        contains: query,
        mode: 'insensitive'
      }
    }

    // Excluir el ID actual si estamos editando
    if (excludeId) {
      where.id = {
        not: parseInt(excludeId)
      }
    }

    const locations = await prisma.location.findMany({
      where,
      include: {
        parent: true
      },
      take: limit,
      orderBy: [
        { name: 'asc' }
      ]
    })

    // Construir el path completo para cada ubicación
    const locationsWithPath = await Promise.all(
      locations.map(async (location) => {
        const path = await buildLocationPath(location)
        return {
          id: location.id,
          name: location.name,
          slug: location.slug,
          parentId: location.parentId,
          path
        }
      })
    )

    return NextResponse.json(locationsWithPath)
  } catch (error) {
    console.error('Error searching locations:', error)
    return NextResponse.json({ error: 'Error searching locations' }, { status: 500 })
  }
}

async function buildLocationPath(location: any): Promise<string> {
  const path = [location.name]
  let current = location
  
  while (current.parent) {
    path.unshift(current.parent.name)
    
    // Buscar el padre del padre si existe
    if (current.parent.parentId) {
      current = await prisma.location.findUnique({
        where: { id: current.parent.parentId },
        include: { parent: true }
      })
      
      if (!current) break
    } else {
      break
    }
  }
  
  return path.join(' > ')
}