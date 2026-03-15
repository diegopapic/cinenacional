// src/app/api/review-search/route.ts
// Streams Claude's web search results for movie reviews.

import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireAuth } from '@/lib/auth'
import { createLogger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'

const log = createLogger('api:review-search')

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
    "titulo": "título del artículo/reseña o null",
    "fecha": "fecha de publicación en formato YYYY-MM-DD o YYYY-MM o YYYY, o null",
    "link": "URL directa al artículo",
    "pelicula": "título exacto de la película buscada"
  }
]
Si un texto aparece replicado en varios sitios, incluí solo una instancia.`
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
          for await (const event of stream) {
            if (event.type === 'content_block_delta') {
              const delta = event.delta as unknown as Record<string, unknown>
              if (delta.type === 'text_delta' && typeof delta.text === 'string') {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: 'text', content: delta.text })}\n\n`)
                )
              }
            } else if (event.type === 'message_stop') {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
              )
            }
          }
          controller.close()
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Error desconocido'
          log.error('Stream error', { message, err })
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: 'error', content: `Error durante la búsqueda: ${message}` })}\n\n`
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
