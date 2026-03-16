// src/app/api/review-search/save/route.ts
// Saves selected reviews: resolves movie + media outlet, creates MovieReview records.

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { handleApiError } from '@/lib/api/api-handler'
import { createLogger } from '@/lib/logger'
import { splitFullName } from '@/lib/people/nameUtils'
import { generatePersonSlug } from '@/lib/people/peopleUtils'
import { z } from 'zod'
import { Prisma } from '@prisma/client'

const log = createLogger('api:review-search-save')

const reviewItemSchema = z.object({
  medio: z.string().min(1),
  autor: z.string().nullable(),
  titulo: z.string().nullable().optional(),
  fecha: z.string().nullable().optional(),
  link: z.string().url(),
  pelicula: z.string().min(1),
  summary: z.string().nullable().optional(),
  authorId: z.number().int().positive().nullable().optional()
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

        // Detect language from URL domain and update media outlet if it has no language set
        if (!mediaOutlet.language) {
          const urlDomain = new URL(review.link).hostname
          const isSpanish = /\.ar$|\.es$|\.com\.ar|pagina12|lanacion|escribiendocine|asalallena|otroscines|micropsia|reencuadre|agenciapacourondo|cineargentinohoy|laestatuilla|elcontraplano/i.test(urlDomain)
          await prisma.mediaOutlet.update({
            where: { id: mediaOutlet.id },
            data: { language: isSpanish ? 'es' : 'en' }
          })
        }

        // Resolve author: use provided authorId, or auto-resolve from name
        let resolvedAuthorId: number | null = review.authorId || null
        if (!resolvedAuthorId && review.autor) {
          resolvedAuthorId = await resolveAuthorByName(review.autor)
        }

        // Create the review
        const created = await prisma.movieReview.create({
          data: {
            movieId,
            mediaOutletId: mediaOutlet.id,
            authorId: resolvedAuthorId,
            title: review.titulo || null,
            summary: review.summary || null,
            url: review.link,
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

const ACCENTS_FROM = 'áéíóúàèìòùâêîôûäëïöüãõñÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÄËÏÖÜÃÕÑ'
const ACCENTS_TO = 'aeiouaeiouaeiouaeiouaonAEIOUAEIOUAEIOUAEIOUAON'

// Cache to avoid re-resolving the same author within one request
const authorCache = new Map<string, number>()

/**
 * Resolves an author name to a Person ID.
 * Searches for exact match (accent+case insensitive) first, creates new Person if not found.
 */
async function resolveAuthorByName(name: string): Promise<number | null> {
  const trimmed = name.trim()
  if (!trimmed) return null

  const cacheKey = trimmed.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()

  // Check cache first
  if (authorCache.has(cacheKey)) {
    return authorCache.get(cacheKey)!
  }

  try {
    // Split name
    const { firstName, lastName } = await splitFullName(trimmed, prisma)

    // Search for exact match using PostgreSQL translate() for accent-insensitive matching
    let existingPerson: { id: number } | null = null

    if (firstName && lastName) {
      const results = await prisma.$queryRaw<Array<{ id: number }>>(
        Prisma.sql`
          SELECT id FROM people
          WHERE lower(translate(first_name, ${ACCENTS_FROM}, ${ACCENTS_TO})) = lower(translate(${firstName}, ${ACCENTS_FROM}, ${ACCENTS_TO}))
            AND lower(translate(last_name, ${ACCENTS_FROM}, ${ACCENTS_TO})) = lower(translate(${lastName}, ${ACCENTS_FROM}, ${ACCENTS_TO}))
          LIMIT 1
        `
      )
      if (results.length > 0) existingPerson = results[0]
    } else if (lastName && !firstName) {
      const results = await prisma.$queryRaw<Array<{ id: number }>>(
        Prisma.sql`
          SELECT id FROM people
          WHERE (
            (first_name IS NULL AND lower(translate(last_name, ${ACCENTS_FROM}, ${ACCENTS_TO})) = lower(translate(${lastName}, ${ACCENTS_FROM}, ${ACCENTS_TO})))
            OR
            (last_name IS NULL AND lower(translate(first_name, ${ACCENTS_FROM}, ${ACCENTS_TO})) = lower(translate(${lastName}, ${ACCENTS_FROM}, ${ACCENTS_TO})))
          )
          LIMIT 1
        `
      )
      if (results.length > 0) existingPerson = results[0]
    }

    if (existingPerson) {
      authorCache.set(cacheKey, existingPerson.id)
      log.info(`Resolved author "${trimmed}" → existing person ID ${existingPerson.id}`)
      return existingPerson.id
    }

    // Not found → detect gender and create
    let gender: 'MALE' | 'FEMALE' | null = null
    if (firstName) {
      const firstWord = firstName.split(/\s+/)[0].toLowerCase()
      const genderRecord = await prisma.firstNameGender.findUnique({
        where: { name: firstWord }
      })
      if (genderRecord && (genderRecord.gender === 'MALE' || genderRecord.gender === 'FEMALE')) {
        gender = genderRecord.gender
      }
    }

    // Generate unique slug
    let baseSlug = generatePersonSlug(firstName || undefined, lastName || undefined)
    if (!baseSlug) {
      baseSlug = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    }
    let slug = baseSlug
    let counter = 1
    while (await prisma.person.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`
      counter++
    }

    const newPerson = await prisma.person.create({
      data: {
        slug,
        firstName: firstName || null,
        lastName: lastName || null,
        gender
      }
    })

    authorCache.set(cacheKey, newPerson.id)
    log.info(`Created author "${trimmed}" → new person ID ${newPerson.id} (${firstName || ''} ${lastName || ''}, gender: ${gender || 'unknown'})`)
    return newPerson.id
  } catch (err) {
    log.error(`Error resolving author "${trimmed}"`, err)
    return null
  }
}
