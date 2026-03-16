// src/app/api/movies/[id]/reviews/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { parseId } from '@/lib/api/crud-factory'
import { movieReviewSchema } from '@/lib/schemas'
import { handleApiError } from '@/lib/api/api-handler'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:movie-reviews')

const REVIEW_INCLUDE = {
  author: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      slug: true
    }
  },
  mediaOutlet: {
    select: {
      id: true,
      name: true,
      url: true,
      language: true,
      country: true
    }
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params
    const movieId = parseId(idStr)
    if (movieId === null) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const reviews = await prisma.movieReview.findMany({
      where: { movieId },
      include: REVIEW_INCLUDE,
      orderBy: { sortOrder: 'asc' }
    })

    return NextResponse.json(reviews)
  } catch (error) {
    log.error('Error fetching reviews', error)
    return NextResponse.json(
      { error: 'Error al obtener las críticas' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  try {
    const { id: idStr } = await params
    const movieId = parseId(idStr)
    if (movieId === null) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const body = await request.json()
    const data = movieReviewSchema.parse(body)

    const review = await prisma.movieReview.create({
      data: {
        movieId,
        title: data.title || null,
        summary: data.summary || null,
        url: data.url || null,
        content: data.content || null,
        hasPaywall: data.hasPaywall || false,
        score: data.score ?? null,
        authorId: data.authorId || null,
        mediaOutletId: data.mediaOutletId || null,
        publishYear: data.publishYear ?? null,
        publishMonth: data.publishMonth ?? null,
        publishDay: data.publishDay ?? null,
        sortOrder: data.sortOrder ?? 0
      },
      include: REVIEW_INCLUDE
    })

    return NextResponse.json(review, { status: 201 })
  } catch (error) {
    return handleApiError(error, 'crear crítica')
  }
}
