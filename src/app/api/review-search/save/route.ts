// src/app/api/review-search/save/route.ts
// Saves selected reviews: resolves movie + media outlet, creates MovieReview records.

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { handleApiError } from '@/lib/api/api-handler'
import { createLogger } from '@/lib/logger'
import { z } from 'zod'

const log = createLogger('api:review-search-save')

const reviewItemSchema = z.object({
  medio: z.string().min(1),
  autor: z.string().nullable(),
  titulo: z.string().nullable().optional(),
  fecha: z.string().nullable().optional(),
  link: z.string().url(),
  pelicula: z.string().min(1)
})

const saveReviewsSchema = z.object({
  movieId: z.number().int().positive(),
  reviews: z.array(reviewItemSchema).min(1)
})

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  try {
    const body = await request.json()
    const { movieId, reviews } = saveReviewsSchema.parse(body)

    // Verify movie exists
    const movie = await prisma.movie.findUnique({ where: { id: movieId } })
    if (!movie) {
      return NextResponse.json({ error: 'Película no encontrada' }, { status: 404 })
    }

    const results: { review: typeof reviewItemSchema._type; success: boolean; error?: string; id?: number }[] = []

    for (const review of reviews) {
      try {
        // Find or create MediaOutlet
        let mediaOutlet = await prisma.mediaOutlet.findFirst({
          where: { name: { equals: review.medio, mode: 'insensitive' } }
        })

        if (!mediaOutlet) {
          // Generate slug from name
          const slug = review.medio
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')

          mediaOutlet = await prisma.mediaOutlet.create({
            data: {
              name: review.medio,
              slug,
              url: null
            }
          })
          log.info(`Created media outlet: ${review.medio} (id: ${mediaOutlet.id})`)
        }

        // Check if this URL already exists for this movie
        const existingReview = await prisma.movieReview.findFirst({
          where: { movieId, url: review.link }
        })

        if (existingReview) {
          results.push({ review, success: false, error: 'Ya existe una crítica con esta URL' })
          continue
        }

        // Parse partial date (YYYY-MM-DD, YYYY-MM, or YYYY)
        let publishYear: number | null = null
        let publishMonth: number | null = null
        let publishDay: number | null = null
        if (review.fecha) {
          const parts = review.fecha.split('-')
          if (parts[0]) publishYear = parseInt(parts[0], 10) || null
          if (parts[1]) publishMonth = parseInt(parts[1], 10) || null
          if (parts[2]) publishDay = parseInt(parts[2], 10) || null
        }

        // Detect language from URL domain
        const urlDomain = new URL(review.link).hostname
        const isSpanish = /\.ar$|\.es$|\.com\.ar|pagina12|lanacion|escribiendocine|asalallena|otroscines|micropsia|reencuadre|agenciapacourondo|cineargentinohoy|laestatuilla|elcontraplano/i.test(urlDomain)

        // Create the review
        const created = await prisma.movieReview.create({
          data: {
            movieId,
            mediaOutletId: mediaOutlet.id,
            title: review.titulo || null,
            url: review.link,
            language: isSpanish ? 'es' : 'en',
            publishYear,
            publishMonth,
            publishDay
          }
        })

        results.push({ review, success: true, id: created.id })
      } catch (err) {
        log.error(`Error saving review from ${review.medio}`, err)
        results.push({ review, success: false, error: 'Error al guardar' })
      }
    }

    const saved = results.filter((r) => r.success).length
    const failed = results.filter((r) => !r.success).length

    return NextResponse.json({ results, summary: { saved, failed } })
  } catch (error) {
    return handleApiError(error, 'guardar críticas')
  }
}
