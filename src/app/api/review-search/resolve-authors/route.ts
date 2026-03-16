// src/app/api/review-search/resolve-authors/route.ts
// Resolves author names to Person IDs: exact match → existing ID, no match → creates new Person.

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { handleApiError } from '@/lib/api/api-handler'
import { createLogger } from '@/lib/logger'
import { splitFullName } from '@/lib/people/nameUtils'
import { generatePersonSlug } from '@/lib/people/peopleUtils'
import { z } from 'zod'
import { Prisma } from '@prisma/client'

const log = createLogger('api:resolve-authors')

const ACCENTS_FROM = 'áéíóúàèìòùâêîôûäëïöüãõñÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÄËÏÖÜÃÕÑ'
const ACCENTS_TO = 'aeiouaeiouaeiouaeiouaonAEIOUAEIOUAEIOUAEIOUAON'

const resolveAuthorsSchema = z.object({
  names: z.array(z.string().min(1)).min(1).max(100)
})

interface ResolvedAuthor {
  name: string
  personId: number
  firstName: string | null
  lastName: string | null
  created: boolean
}

/**
 * Finds a person by exact first+last name match (accent and case insensitive).
 * Uses PostgreSQL translate() + lower() for accent-insensitive matching.
 */
async function findPersonByName(
  firstName: string | null,
  lastName: string | null
): Promise<{ id: number; firstName: string | null; lastName: string | null } | null> {
  if (firstName && lastName) {
    const results = await prisma.$queryRaw<Array<{ id: number; first_name: string | null; last_name: string | null }>>(
      Prisma.sql`
        SELECT id, first_name, last_name FROM people
        WHERE lower(translate(first_name, ${ACCENTS_FROM}, ${ACCENTS_TO})) = lower(translate(${firstName}, ${ACCENTS_FROM}, ${ACCENTS_TO}))
          AND lower(translate(last_name, ${ACCENTS_FROM}, ${ACCENTS_TO})) = lower(translate(${lastName}, ${ACCENTS_FROM}, ${ACCENTS_TO}))
        LIMIT 1
      `
    )
    if (results.length > 0) {
      return { id: results[0].id, firstName: results[0].first_name, lastName: results[0].last_name }
    }
  } else if (lastName && !firstName) {
    // Single word name - could be in firstName or lastName
    const results = await prisma.$queryRaw<Array<{ id: number; first_name: string | null; last_name: string | null }>>(
      Prisma.sql`
        SELECT id, first_name, last_name FROM people
        WHERE (
          (first_name IS NULL AND lower(translate(last_name, ${ACCENTS_FROM}, ${ACCENTS_TO})) = lower(translate(${lastName}, ${ACCENTS_FROM}, ${ACCENTS_TO})))
          OR
          (last_name IS NULL AND lower(translate(first_name, ${ACCENTS_FROM}, ${ACCENTS_TO})) = lower(translate(${lastName}, ${ACCENTS_FROM}, ${ACCENTS_TO})))
        )
        LIMIT 1
      `
    )
    if (results.length > 0) {
      return { id: results[0].id, firstName: results[0].first_name, lastName: results[0].last_name }
    }
  }

  return null
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  try {
    const body = await request.json()
    const { names } = resolveAuthorsSchema.parse(body)

    // Deduplicate names
    const uniqueNames = [...new Set(names.map(n => n.trim()).filter(Boolean))]
    const results: ResolvedAuthor[] = []

    for (const name of uniqueNames) {
      try {
        // 1. Split name into first/last
        const { firstName, lastName } = await splitFullName(name, prisma)

        // 2. Search for exact match in DB (accent + case insensitive)
        const existingPerson = await findPersonByName(firstName, lastName)

        if (existingPerson) {
          results.push({
            name,
            personId: existingPerson.id,
            firstName: existingPerson.firstName,
            lastName: existingPerson.lastName,
            created: false
          })
          log.info(`Resolved author "${name}" → existing person ID ${existingPerson.id}`)
          continue
        }

        // 3. Not found → detect gender from first name
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

        // 4. Generate unique slug
        let baseSlug = generatePersonSlug(firstName || undefined, lastName || undefined)
        if (!baseSlug) {
          baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
        }
        let slug = baseSlug
        let counter = 1
        while (await prisma.person.findUnique({ where: { slug } })) {
          slug = `${baseSlug}-${counter}`
          counter++
        }

        // 5. Create the person
        const newPerson = await prisma.person.create({
          data: {
            slug,
            firstName: firstName || null,
            lastName: lastName || null,
            gender
          }
        })

        results.push({
          name,
          personId: newPerson.id,
          firstName: newPerson.firstName,
          lastName: newPerson.lastName,
          created: true
        })
        log.info(`Created author "${name}" → new person ID ${newPerson.id} (${firstName || ''} ${lastName || ''}, gender: ${gender || 'unknown'})`)
      } catch (err) {
        log.error(`Error resolving author "${name}"`, err)
      }
    }

    const created = results.filter(r => r.created).length
    const resolved = results.filter(r => !r.created).length

    return NextResponse.json({
      results,
      summary: { total: results.length, resolved, created }
    })
  } catch (error) {
    return handleApiError(error, 'resolver autores')
  }
}
