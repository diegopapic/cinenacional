// src/app/api/movies/[id]/reviews/[reviewId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { parseId } from '@/lib/api/crud-factory'
import { movieReviewSchema } from '@/lib/schemas'
import { handleApiError } from '@/lib/api/api-handler'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:movie-review')

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
      url: true
    }
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; reviewId: string }> }
) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  try {
    const { id: idStr, reviewId: reviewIdStr } = await params
    const movieId = parseId(idStr)
    const reviewId = parseId(reviewIdStr)
    if (movieId === null || reviewId === null) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const existing = await prisma.movieReview.findFirst({
      where: { id: reviewId, movieId }
    })
    if (!existing) {
      return NextResponse.json(
        { error: 'Crítica no encontrada' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const data = movieReviewSchema.parse(body)

    const review = await prisma.movieReview.update({
      where: { id: reviewId },
      data: {
        title: data.title || null,
        summary: data.summary || null,
        url: data.url || null,
        content: data.content || null,
        language: data.language || 'es',
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

    return NextResponse.json(review)
  } catch (error) {
    return handleApiError(error, 'actualizar crítica')
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; reviewId: string }> }
) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  try {
    const { id: idStr, reviewId: reviewIdStr } = await params
    const movieId = parseId(idStr)
    const reviewId = parseId(reviewIdStr)
    if (movieId === null || reviewId === null) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const existing = await prisma.movieReview.findFirst({
      where: { id: reviewId, movieId }
    })
    if (!existing) {
      return NextResponse.json(
        { error: 'Crítica no encontrada' },
        { status: 404 }
      )
    }

    await prisma.movieReview.delete({ where: { id: reviewId } })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    log.error('Error deleting review', error)
    return NextResponse.json(
      { error: 'Error al eliminar la crítica' },
      { status: 500 }
    )
  }
}
