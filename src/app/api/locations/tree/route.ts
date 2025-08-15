// src/app/api/locations/tree/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface LocationNode {
  id: number
  name: string
  slug: string
  parentId: number | null
  children: LocationNode[]
  _count: {
    children: number
    peopleBornHere: number
    peopleDiedHere: number
  }
}

// GET /api/locations/tree - Obtener estructura de árbol completa
export async function GET(request: NextRequest) {
  try {
    // Obtener todos los lugares
    const locations = await prisma.location.findMany({
      orderBy: [
        { parentId: 'asc' },
        { name: 'asc' }
      ],
      include: {
        _count: {
          select: {
            children: true,
            peopleBornHere: true,
            peopleDiedHere: true
          }
        }
      }
    })

    // Construir el árbol
    const locationMap = new Map<number, LocationNode>()
    const roots: LocationNode[] = []

    // Primero, crear todos los nodos
    locations.forEach(location => {
      locationMap.set(location.id, {
        id: location.id,
        name: location.name,
        slug: location.slug,
        parentId: location.parentId,
        children: [],
        _count: location._count
      })
    })

    // Luego, establecer las relaciones padre-hijo
    locations.forEach(location => {
      const node = locationMap.get(location.id)!
      if (location.parentId) {
        const parent = locationMap.get(location.parentId)
        if (parent) {
          parent.children.push(node)
        }
      } else {
        roots.push(node)
      }
    })

    // Ordenar los hijos de cada nodo alfabéticamente
    const sortChildren = (node: LocationNode) => {
      node.children.sort((a, b) => a.name.localeCompare(b.name))
      node.children.forEach(sortChildren)
    }
    roots.forEach(sortChildren)

    return NextResponse.json(roots, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  } catch (error) {
    console.error('Error fetching location tree:', error)
    return NextResponse.json(
      { error: 'Error al obtener el árbol de lugares' },
      { status: 500 }
    )
  }
}