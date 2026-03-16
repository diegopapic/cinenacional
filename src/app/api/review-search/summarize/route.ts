// src/app/api/review-search/summarize/route.ts
// Fetches a review URL, extracts text, and generates a summary using Claude.

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireAuth } from '@/lib/auth'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:review-summarize')

const SUMMARY_SYSTEM_PROMPT = `Sos un asistente especializado en resumir críticas de cine. Cuando recibas el texto de una crítica, devolvé un único párrafo en castellano que resuma la valoración del autor sobre la película. El párrafo debe:
- Capturar el tono y la opinión central del crítico
- Poder funcionar como copete o bajada de la propia crítica
- Estar escrito en tercera persona impersonal (sin frases como "el autor dice", "el crítico sostiene", etc.)
- No mencionar el título de la película
- No contar la trama ni describir escenas o personajes
- Tener un máximo estricto de 550 caracteres (espacios incluidos). Contá los caracteres antes de responder y, si te pasás, recortá por la última oración completa que quepa

Sobre qué opiniones incluir:
Incluí únicamente las valoraciones del autor sobre la película como objeto: su forma, su construcción, sus logros y fracasos cinematográficos. No incluyas opiniones sobre el mundo, la sociedad, la política o la historia que el autor pueda expresar en la crítica, aunque la película trate esos temas. La pregunta guía es: ¿esto lo dice la película, o lo dice el crítico sobre la realidad?
Si la opinión política o social es inescindible de la valoración estética —es decir, si el crítico juzga la película porque toma tal posición sobre el mundo— podés incluirla con una marca de atribución ("según el autor", "en la lectura del crítico", etc.).

Ejemplos:
- ❌ "Una obra que pone en primer plano a los que perdieron" → es un veredicto sobre el referente del documental, no sobre la película.
- ❌ "Continúa explorando el colonialismo" → es una opinión sobre el tema, no sobre el tratamiento cinematográfico.
- ✅ "Empuja los contornos del documental hacia un territorio donde el sonido y el montaje construyen algo mayor que la reconstrucción de un crimen" → es una valoración formal y estética.

EXPRESIONES PARA USAR:
- "película" en lugar de "film"

Tener la extensión necesaria y no más: si la valoración es simple, el párrafo puede ser breve. No rellenes ni alargues.

Devolvé únicamente el párrafo, sin aclaraciones ni comentarios adicionales.`

function stripHtmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<aside[\s\S]*?<\/aside>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&ldquo;|&rdquo;|&laquo;|&raquo;/gi, '"')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#?\w+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  try {
    const { url } = await request.json()
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL requerida' }, { status: 400 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      log.error('ANTHROPIC_API_KEY not configured')
      return NextResponse.json({ error: 'API key de Anthropic no configurada' }, { status: 500 })
    }

    // Fetch the review page
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

    const res = await fetch(url, {
      signal: controller.signal,
      cache: 'no-store',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'es-AR,es;q=0.9,en;q=0.8'
      }
    })

    clearTimeout(timeout)

    if (!res.ok) {
      log.debug(`Failed to fetch ${url}: ${res.status}`)
      return NextResponse.json({ error: `No se pudo acceder a la URL (HTTP ${res.status})` }, { status: 422 })
    }

    const html = await res.text()
    const text = stripHtmlToText(html)

    if (text.length < 200) {
      return NextResponse.json({ error: 'El contenido de la página es demasiado corto para resumir' }, { status: 422 })
    }

    // Truncate to ~12k chars to keep costs down (enough for most reviews)
    const truncatedText = text.length > 12000 ? text.slice(0, 12000) + '...' : text

    const client = new Anthropic({ apiKey })

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: SUMMARY_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Resumí la siguiente crítica de cine:\n\n${truncatedText}`
        }
      ]
    })

    const summary = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('')
      .trim()

    if (!summary) {
      return NextResponse.json({ error: 'No se pudo generar un resumen' }, { status: 422 })
    }

    // Enforce 800 char hard limit — truncate at last complete sentence if over
    let finalSummary = summary
    if (finalSummary.length > 800) {
      const truncated = finalSummary.slice(0, 800)
      const lastPeriod = Math.max(
        truncated.lastIndexOf('. '),
        truncated.lastIndexOf('.\n'),
        truncated.endsWith('.') ? truncated.length - 1 : -1
      )
      const lastSemicolon = truncated.lastIndexOf('; ')
      const cutPoint = Math.max(lastPeriod, lastSemicolon)
      if (cutPoint > 200) {
        finalSummary = truncated.slice(0, cutPoint + 1)
      } else {
        const lastSpace = truncated.lastIndexOf(' ')
        finalSummary = (lastSpace > 200 ? truncated.slice(0, lastSpace) : truncated.slice(0, 797)) + '...'
      }
    }

    log.info(`Generated summary for ${url} (${finalSummary.length} chars)`)
    return NextResponse.json({ summary: finalSummary })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    log.error(`Error summarizing review: ${msg}`)
    return NextResponse.json({ error: `Error al generar resumen: ${msg}` }, { status: 500 })
  }
}
