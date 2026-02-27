// =====================================================
// src/app/api/companies/distribution/route.ts
// =====================================================
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSlug } from '@/lib/utils'
import { requireAuth } from '@/lib/auth'
import { apiHandler } from '@/lib/api/api-handler'

// GET /api/companies/distribution - Listar distribuidoras
export const GET = apiHandler(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams
  const search = searchParams.get('search') || ''

  const where = search ? {
    name: { contains: search, mode: 'insensitive' as const }
  } : {}

  const companies = await prisma.distributionCompany.findMany({
    where,
    orderBy: { name: 'asc' }
  })

  return NextResponse.json(companies)
}, 'obtener las distribuidoras')

// POST /api/companies/distribution - Crear nueva distribuidora
export const POST = apiHandler(async (request: NextRequest) => {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const body = await request.json()

  let slug = createSlug(body.name)
  let slugExists = await prisma.distributionCompany.findUnique({ where: { slug } })
  let counter = 1

  while (slugExists) {
    slug = `${createSlug(body.name)}-${counter}`
    slugExists = await prisma.distributionCompany.findUnique({ where: { slug } })
    counter++
  }

  const company = await prisma.distributionCompany.create({
    data: {
      ...body,
      slug
    }
  })

  return NextResponse.json(company, { status: 201 })
}, 'crear la distribuidora')
