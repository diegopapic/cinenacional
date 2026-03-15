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

DEFINICIÓN DE CRÍTICA:
Una crítica (o reseña) es un texto donde un autor evalúa la película, analiza su propuesta estética o narrativa y emite un juicio de valor. Típicamente incluye opiniones sobre la dirección, las actuaciones, la fotografía, el guion, etc.

NO SON CRÍTICAS (excluir siempre):
- Notas informativas o de prensa (anuncios de estreno, datos de taquilla, noticias del rodaje)
- Coberturas generales de festival (listas de películas seleccionadas, crónicas del evento)
- Entrevistas a directores, actores o equipo técnico
- Perfiles o notas biográficas sobre el director o actores
- Artículos de producción o making-of
- Sinopsis, fichas técnicas o fichas de cartelera
- Listas de "mejores películas del año" o rankings (a menos que cada entrada sea una reseña individual extensa)
- Artículos que mencionan la película tangencialmente dentro de una nota más amplia
- Notas de anticipación o preview previas al estreno que describen la película sin evaluarla críticamente
- Artículos de la edición impresa que son ensayos, perfiles del director o contextualizaciones que no evalúan la película como obra

CÓMO DISTINGUIR una crítica de una nota informativa:
- Una CRÍTICA dice si la película es buena o mala, analiza sus méritos artísticos, emite juicios de valor ("lograda", "fallida", "notable", "decepcionante", etc.)
- Una NOTA INFORMATIVA describe la película, da contexto sobre su producción o estreno, pero NO emite un juicio evaluativo sobre su calidad
- Si la nota habla MÁS del director/contexto que de la calidad de la película, probablemente NO es una crítica

Ante la duda, NO incluyas el resultado. Es preferible omitir un texto dudoso a incluir uno que no sea una crítica.

PASO 1 — Medios conocidos:
Buscá críticas de la película en TODOS estos medios. Para cada uno, hacé una búsqueda con site: o el nombre del medio:
${outletList}

PASO 2 — Descubrimiento:
Después de buscar en los medios conocidos, hacé búsquedas generales para encontrar críticas en otros medios que no estén en la lista anterior.

IMPORTANTE — Deduplicación:
Si una misma crítica aparece en más de una URL del mismo medio (por ejemplo, URLs distintas que llevan al mismo texto), incluí solo una.
PERO: si el mismo autor en el mismo medio publicó dos textos DISTINTOS (por ejemplo, uno durante un festival y otro en el estreno comercial), incluí ambos — son críticas diferentes.

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
]`
}

function buildUserMessage(title: string, year?: number | null, director?: string | null): string {
  const parts = [`Buscá críticas de la película "${title}"`]
  const context: string[] = []
  if (year) context.push(`año ${year}`)
  if (director) context.push(`dirigida por ${director}`)
  if (context.length > 0) parts.push(`(${context.join(', ')})`)
  return parts.join(' ')
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  try {
    const { movieTitle, movieYear, movieDirector } = await request.json()
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
          content: buildUserMessage(movieTitle.trim(), movieYear, movieDirector)
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
