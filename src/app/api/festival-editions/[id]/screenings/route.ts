// src/app/api/festival-editions/[id]/screenings/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { festivalScreeningFormSchema } from '@/lib/festivals/festivalTypes'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const editionId = parseInt(id)

    if (isNaN(editionId)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const sectionId = searchParams.get('sectionId')
    const movieId = searchParams.get('movieId')
    const premiereType = searchParams.get('premiereType')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: any = { editionId }

    if (sectionId) {
      where.sectionId = parseInt(sectionId)
    }

    if (movieId) {
      where.movieId = parseInt(movieId)
    }

    if (premiereType) {
      where.premiereType = premiereType
    }

    if (dateFrom || dateTo) {
      where.screeningDate = {}
      if (dateFrom) {
        where.screeningDate.gte = new Date(dateFrom)
      }
      if (dateTo) {
        where.screeningDate.lte = new Date(dateTo)
      }
    }

    const [screenings, total] = await Promise.all([
      prisma.festivalScreening.findMany({
        where,
        include: {
          movie: {
            select: {
              id: true,
              title: true,
              slug: true,
              year: true,
              posterUrl: true
            }
          },
          section: {
            select: { id: true, name: true }
          },
          venue: {
            select: { id: true, name: true }
          }
        },
        orderBy: [
          { screeningDate: 'asc' },
          { screeningTime: 'asc' }
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.festivalScreening.count({ where })
    ])

    const data = screenings.map(s => ({
      id: s.id,
      movieTitle: s.movie.title,
      movieSlug: s.movie.slug,
      movieYear: s.movie.year,
      sectionName: s.section.name,
      screeningDate: s.screeningDate,
      screeningTime: s.screeningTime,
      venueName: s.venue?.name || null,
      premiereType: s.premiereType
    }))

    return NextResponse.json({
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    })
  } catch (error) {
    console.error('Error fetching screenings:', error)
    return NextResponse.json(
      { error: 'Error al obtener proyecciones' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const editionId = parseInt(id)

    if (isNaN(editionId)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }

    // Verificar que la edición existe
    const edition = await prisma.festivalEdition.findUnique({
      where: { id: editionId }
    })

    if (!edition) {
      return NextResponse.json(
        { error: 'Edición no encontrada' },
        { status: 404 }
      )
    }

    const body = await request.json()

    // Endpoint especial para bulk create
    if (body.screenings && Array.isArray(body.screenings)) {
      return bulkCreateScreenings(editionId, body.screenings)
    }

    // Agregar editionId al body
    const dataToValidate = { ...body, editionId }

    const validation = festivalScreeningFormSchema.safeParse(dataToValidate)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const data = validation.data

    // Verificar que la sección pertenece a esta edición
    const section = await prisma.festivalSection.findFirst({
      where: {
        id: data.sectionId,
        editionId
      }
    })

    if (!section) {
      return NextResponse.json(
        { error: 'La sección no pertenece a esta edición' },
        { status: 400 }
      )
    }

    // Verificar que la película existe
    const movie = await prisma.movie.findUnique({
      where: { id: data.movieId }
    })

    if (!movie) {
      return NextResponse.json(
        { error: 'Película no encontrada' },
        { status: 404 }
      )
    }

    const screening = await prisma.festivalScreening.create({
      data: {
        editionId,
        sectionId: data.sectionId,
        movieId: data.movieId,
        screeningDate: new Date(data.screeningDate),
        screeningTime: data.screeningTime ? new Date(`1970-01-01T${data.screeningTime}`) : null,
        venueId: data.venueId || null,
        premiereType: data.premiereType || 'REGULAR',
        isOfficial: data.isOfficial ?? true,
        notes: data.notes || null,
      },
      include: {
        movie: {
          select: {
            id: true,
            title: true,
            slug: true,
            year: true
          }
        },
        section: {
          select: { id: true, name: true }
        },
        venue: {
          select: { id: true, name: true }
        }
      }
    })

    return NextResponse.json(screening, { status: 201 })
  } catch (error) {
    console.error('Error creating screening:', error)
    return NextResponse.json(
      { error: 'Error al crear proyección' },
      { status: 500 }
    )
  }
}

async function bulkCreateScreenings(editionId: number, screeningsData: any[]) {
  try {
    const results: any[] = []
    const errors: any[] = []

    for (const data of screeningsData) {
      const dataToValidate = { ...data, editionId }
      const validation = festivalScreeningFormSchema.safeParse(dataToValidate)

      if (!validation.success) {
        errors.push({
          data,
          error: validation.error.flatten()
        })
        continue
      }

      const validData = validation.data

      try {
        const screening = await prisma.festivalScreening.create({
          data: {
            editionId,
            sectionId: validData.sectionId,
            movieId: validData.movieId,
            screeningDate: new Date(validData.screeningDate),
            screeningTime: validData.screeningTime ? new Date(`1970-01-01T${validData.screeningTime}`) : null,
            venueId: validData.venueId || null,
            premiereType: validData.premiereType || 'REGULAR',
            isOfficial: validData.isOfficial ?? true,
            notes: validData.notes || null,
          }
        })
        results.push(screening)
      } catch (err) {
        errors.push({
          data,
          error: 'Error al crear proyección'
        })
      }
    }

    return NextResponse.json({
      created: results.length,
      errors: errors.length,
      screenings: results,
      errorDetails: errors.length > 0 ? errors : undefined
    }, { status: 201 })
  } catch (error) {
    console.error('Error bulk creating screenings:', error)
    return NextResponse.json(
      { error: 'Error al crear proyecciones' },
      { status: 500 }
    )
  }
}
