// src/app/api/review-search/route.ts
// Streams Claude's web search results for movie reviews.

import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireAuth } from '@/lib/auth'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:review-search')

const SYSTEM_PROMPT = `Sos un asistente especializado en búsqueda de críticas cinematográficas en medios argentinos e internacionales.
Cuando el usuario te pida críticas de una película, tu tarea es buscar en la web únicamente reseñas críticas: textos donde un autor evalúa la película, analiza su propuesta estética o narrativa y emite un juicio de valor. No son críticas las notas informativas, las coberturas de festival, las entrevistas a directores o actores, los artículos de producción, las sinopsis ni las fichas de cartelera.
Comenzá buscando en los siguientes sitios, que deben rastrearse siempre:
- lanacion.com
- otroscines.com
- variety.com
Luego continuá buscando en otros medios y sitios especializados para ampliar el resultado.

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

    const client = new Anthropic({ apiKey })

    const stream = await client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 10 }],
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
