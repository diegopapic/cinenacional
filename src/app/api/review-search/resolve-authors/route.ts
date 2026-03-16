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

const log = createLogger('api:resolve-authors')

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

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  try {
    const body = await request.json()
    const { names } = resolveAuthorsSchema.parse(body)

    // Deduplicate names
    const uniqueNames = [...new Set(names.map(n => n.trim()).filter(Boolean))]
    const results: ResolvedAuthor[] = []

    // Normalize for comparison
    const normalize = (s: string) =>
      s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()

    for (const name of uniqueNames) {
      try {
        // 1. Split name into first/last
        const { firstName, lastName } = await splitFullName(name, prisma)

        // 2. Search for exact match in DB
        const normalizedFirst = firstName ? normalize(firstName) : null
        const normalizedLast = lastName ? normalize(lastName) : null

        let existingPerson = null

        if (normalizedFirst && normalizedLast) {
          // Both first and last name - search for exact match
          const candidates = await prisma.person.findMany({
            where: {
              AND: [
                { firstName: { not: null } },
                { lastName: { not: null } }
              ]
            },
            select: { id: true, firstName: true, lastName: true },
            take: 500
          })

          existingPerson = candidates.find(p => {
            const pFirst = p.firstName ? normalize(p.firstName) : null
            const pLast = p.lastName ? normalize(p.lastName) : null
            return pFirst === normalizedFirst && pLast === normalizedLast
          })
        } else if (normalizedLast && !normalizedFirst) {
          // Single word (went to lastName)
          const candidates = await prisma.person.findMany({
            where: {
              OR: [
                { lastName: { not: null }, firstName: null },
                { firstName: { not: null }, lastName: null }
              ]
            },
            select: { id: true, firstName: true, lastName: true },
            take: 500
          })

          existingPerson = candidates.find(p => {
            const pLast = p.lastName ? normalize(p.lastName) : null
            const pFirst = p.firstName ? normalize(p.firstName) : null
            return (pFirst === null && pLast === normalizedLast) ||
                   (pLast === null && pFirst === normalizedLast)
          })
        }

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
        // Skip this author but continue with others
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
