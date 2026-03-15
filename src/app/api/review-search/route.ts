// src/app/api/review-search/route.ts
// Streams Claude's web search results for movie reviews,
// then enriches results by fetching pages to extract missing authors.

import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireAuth } from '@/lib/auth'
import { createLogger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'

const log = createLogger('api:review-search')

interface ReviewResult {
  medio: string
  autor: string | null
  link: string
  pelicula: string
}

function buildSystemPrompt(outlets: { name: string; url: string }[]): string {
  const outletList = outlets.map((o) => `- ${o.url} (${o.name})`).join('\n')

  return `Sos un asistente especializado en búsqueda de críticas cinematográficas en medios argentinos e internacionales.
Cuando el usuario te pida críticas de una película, tu tarea es buscar en la web únicamente reseñas críticas: textos donde un autor evalúa la película, analiza su propuesta estética o narrativa y emite un juicio de valor. No son críticas las notas informativas, las coberturas de festival, las entrevistas a directores o actores, los artículos de producción, las sinopsis ni las fichas de cartelera.

PASO 1 — Medios conocidos:
Buscá críticas de la película en TODOS estos medios. Para cada uno, hacé una búsqueda con site: o el nombre del medio:
${outletList}

PASO 2 — Descubrimiento:
Después de buscar en los medios conocidos, hacé búsquedas generales para encontrar críticas en otros medios que no estén en la lista anterior.

IMPORTANTE — Identificación de autores:
Para CADA crítica encontrada, debés hacer el esfuerzo de identificar al autor. El autor casi siempre está disponible. Buscalo en:
- El byline del artículo (ej: "Por Paula Vázquez Prieto", "By Guy Lodge")
- La firma al final del texto
- Los metadatos de la página (meta author, schema.org, JSON-LD)
- El snippet del resultado de búsqueda, que suele incluir el nombre del autor
Solo devolvé null en "autor" si genuinamente no encontrás el nombre después de revisar la página. No devuelvas null por defecto.

Para cada crítica encontrada, devolvé ÚNICAMENTE un JSON array con este formato exacto, sin texto adicional:
[
  {
    "medio": "nombre del medio",
    "autor": "nombre del autor o null si no está disponible",
    "link": "URL directa al artículo",
    "pelicula": "título exacto de la película buscada"
  }
]
Si un texto aparece replicado en varios sitios, incluí solo una instancia.`
}

/**
 * Fetches a review page and extracts the author from HTML metadata.
 * Checks JSON-LD, meta tags, and common byline patterns.
 */
async function extractAuthorFromPage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; CineNacionalBot/1.0; +https://cinenacional.com)',
        Accept: 'text/html'
      }
    })

    clearTimeout(timeout)

    if (!res.ok) return null

    const html = await res.text()

    // 1. JSON-LD: look for author in structured data
    const jsonLdMatches = html.matchAll(
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
    )
    for (const match of jsonLdMatches) {
      try {
        const data = JSON.parse(match[1])
        const author = extractAuthorFromJsonLd(data)
        if (author) return author
      } catch {
        // malformed JSON-LD, skip
      }
    }

    // 2. Meta tags: og:article:author, author, citation_author
    const metaPatterns = [
      /< *meta[^>]*(?:name|property)=["'](?:author|article:author|og:article:author|citation_author|dc\.creator)["'][^>]*content=["']([^"']+)["']/i,
      /< *meta[^>]*content=["']([^"']+)["'][^>]*(?:name|property)=["'](?:author|article:author|og:article:author|citation_author|dc\.creator)["']/i
    ]
    for (const pattern of metaPatterns) {
      const match = html.match(pattern)
      if (match?.[1]) {
        const name = match[1].trim()
        if (name && name.length < 100 && !name.includes('<')) return name
      }
    }

    // 3. Common byline patterns in HTML
    const bylinePatterns = [
      /<[^>]*class=["'][^"']*(?:byline|author-name|post-author|entry-author|article-author|writer)[^"']*["'][^>]*>([^<]{2,80})<\//i,
      /<a[^>]*class=["'][^"']*author[^"']*["'][^>]*>([^<]{2,80})<\/a>/i,
      /<[^>]*rel=["']author["'][^>]*>([^<]{2,80})<\//i
    ]
    for (const pattern of bylinePatterns) {
      const match = html.match(pattern)
      if (match?.[1]) {
        const name = match[1].trim()
        // Filter out common false positives
        if (
          name &&
          name.length > 2 &&
          name.length < 80 &&
          !name.includes('{') &&
          !name.includes('<') &&
          !/^\d+$/.test(name)
        ) {
          return name
        }
      }
    }

    return null
  } catch (err) {
    log.debug(`Failed to fetch author from ${url}: ${err}`)
    return null
  }
}

function extractAuthorFromJsonLd(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null

  if (Array.isArray(data)) {
    for (const item of data) {
      const result = extractAuthorFromJsonLd(item)
      if (result) return result
    }
    return null
  }

  const obj = data as Record<string, unknown>

  // Direct author field
  if (obj.author) {
    if (typeof obj.author === 'string') return obj.author
    if (Array.isArray(obj.author)) {
      const first = obj.author[0]
      if (typeof first === 'string') return first
      if (first && typeof first === 'object' && 'name' in first) {
        return (first as { name: string }).name
      }
    }
    if (typeof obj.author === 'object' && 'name' in obj.author) {
      return (obj.author as { name: string }).name
    }
  }

  // Check @graph array (common in Yoast SEO, etc.)
  if (obj['@graph'] && Array.isArray(obj['@graph'])) {
    for (const node of obj['@graph']) {
      if (
        node &&
        typeof node === 'object' &&
        '@type' in node &&
        (node as Record<string, unknown>)['@type'] === 'Person' &&
        'name' in node
      ) {
        return (node as { name: string }).name
      }
    }
    // Fallback: look for Article type with author reference
    for (const node of obj['@graph']) {
      const result = extractAuthorFromJsonLd(node)
      if (result) return result
    }
  }

  return null
}

/**
 * For reviews with null author, fetch the page and try to extract the author.
 */
async function enrichReviewsWithAuthors(
  reviews: ReviewResult[]
): Promise<ReviewResult[]> {
  const needsEnrichment = reviews.filter((r) => !r.autor)
  if (needsEnrichment.length === 0) return reviews

  log.info(
    `Enriching ${needsEnrichment.length} reviews with missing authors...`
  )

  // Fetch pages in parallel (max 5 concurrent)
  const CONCURRENCY = 5
  const results = new Map<string, string | null>()

  for (let i = 0; i < needsEnrichment.length; i += CONCURRENCY) {
    const batch = needsEnrichment.slice(i, i + CONCURRENCY)
    const promises = batch.map(async (review) => {
      const author = await extractAuthorFromPage(review.link)
      results.set(review.link, author)
    })
    await Promise.all(promises)
  }

  return reviews.map((review) => {
    if (review.autor) return review
    const extracted = results.get(review.link)
    if (extracted) {
      log.info(`Extracted author "${extracted}" from ${review.link}`)
      return { ...review, autor: extracted }
    }
    return review
  })
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  try {
    const { movieTitle } = await request.json()
    if (!movieTitle || typeof movieTitle !== 'string' || movieTitle.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'El título de la película es requerido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      log.error('ANTHROPIC_API_KEY not configured')
      return new Response(JSON.stringify({ error: 'API key de Anthropic no configurada' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Fetch media outlets with URLs from DB
    const mediaOutlets = await prisma.mediaOutlet.findMany({
      where: { url: { not: null } },
      select: { name: true, url: true },
      orderBy: { name: 'asc' }
    })

    const outletsWithUrl = mediaOutlets.filter(
      (o): o is { name: string; url: string } => o.url !== null
    )

    log.info(`Found ${outletsWithUrl.length} media outlets with URLs`)

    const systemPrompt = buildSystemPrompt(outletsWithUrl)

    const client = new Anthropic({ apiKey })

    const stream = await client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      system: systemPrompt,
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 30 }],
      messages: [
        {
          role: 'user',
          content: `Buscá críticas de la película "${movieTitle.trim()}"`
        }
      ]
    })

    const encoder = new TextEncoder()

    const readable = new ReadableStream({
      async start(controller) {
        try {
          let accumulated = ''

          for await (const event of stream) {
            if (event.type === 'content_block_delta') {
              const delta = event.delta as unknown as Record<string, unknown>
              if (delta.type === 'text_delta' && typeof delta.text === 'string') {
                accumulated += delta.text
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: 'text', content: delta.text })}\n\n`)
                )
              }
            } else if (event.type === 'message_stop') {
              // Before sending 'done', try to enrich reviews with missing authors
              try {
                const parsed = parseJsonFromText(accumulated)
                if (parsed && parsed.length > 0) {
                  const enriched = await enrichReviewsWithAuthors(parsed)
                  // Send enriched results as a separate event
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({ type: 'enriched', content: enriched })}\n\n`
                    )
                  )
                }
              } catch (err) {
                log.error('Error enriching reviews', err)
              }

              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
              )
            }
          }
          controller.close()
        } catch (err) {
          log.error('Stream error', err)
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: 'error', content: 'Error durante la búsqueda' })}\n\n`
            )
          )
          controller.close()
        }
      }
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive'
      }
    })
  } catch (error) {
    log.error('Error in review search', error)
    return new Response(JSON.stringify({ error: 'Error al buscar críticas' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

/** Extract JSON array from Claude's text output */
function parseJsonFromText(text: string): ReviewResult[] | null {
  try {
    const parsed = JSON.parse(text.trim())
    if (Array.isArray(parsed)) return parsed
  } catch {
    // continue
  }

  const firstBracket = text.indexOf('[')
  const lastBracket = text.lastIndexOf(']')
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    try {
      const parsed = JSON.parse(text.slice(firstBracket, lastBracket + 1))
      if (Array.isArray(parsed)) return parsed
    } catch {
      // continue
    }
  }

  return null
}
