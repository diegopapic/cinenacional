import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiHandler } from '@/lib/api/api-handler'

export const dynamic = 'force-dynamic'

// GET /api/color-types - Listar todos los tipos de color
export const GET = apiHandler(async () => {
  const colorTypes = await prisma.colorType.findMany({
    orderBy: { displayOrder: 'asc' }
  })

  return NextResponse.json(colorTypes)
}, 'obtener los tipos de color')
