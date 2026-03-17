/**
 * Script de importación masiva de críticas cinematográficas.
 *
 * Recorre todas las películas (de la más reciente hacia atrás), busca críticas
 * con Claude web_search, extrae metadatos del HTML, resuelve autores y medios,
 * genera resúmenes con Haiku y persiste en la BD.
 *
 * Uso:
 *   npx ts-node scripts/batch-import-reviews.ts
 *   npx ts-node scripts/batch-import-reviews.ts --hours 8
 *   npx ts-node scripts/batch-import-reviews.ts --start-year 2020
 *   npx ts-node scripts/batch-import-reviews.ts --release-from 2025-01-15  (solo pelis estrenadas desde esa fecha)
 *   npx ts-node scripts/batch-import-reviews.ts --skip-existing   (saltar pelis con reviews)
 *   npx ts-node scripts/batch-import-reviews.ts --dry-run          (no guarda nada)
 */

import Anthropic from '@anthropic-ai/sdk'
import { Pool } from 'pg'
import * as fs from 'fs'
import * as path from 'path'

// ─── Env ───────────────────────────────────────────────────────────
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const dotenv = require('dotenv')
  // override: true porque la variable puede existir vacía en el entorno del sistema
  dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true })
  dotenv.config({ path: path.resolve(__dirname, '../.env.local'), override: true })
} catch { /* no dotenv in prod */ }

// ─── CLI flags ─────────────────────────────────────────────────────
const args = process.argv.slice(2)
function getFlag(name: string, defaultVal: string): string {
  const i = args.indexOf(`--${name}`)
  return i >= 0 && args[i + 1] ? args[i + 1] : defaultVal
}
const MAX_HOURS = parseFloat(getFlag('hours', '8'))
const START_YEAR = parseInt(getFlag('start-year', '9999'), 10)
const RELEASE_FROM = getFlag('release-from', '')  // YYYY-MM-DD, YYYY-MM, or YYYY
const SKIP_EXISTING = args.includes('--skip-existing')
const DRY_RUN = args.includes('--dry-run')
const CONCURRENCY_ENRICHMENT = 3  // parallel URL fetches per movie
const DELAY_BETWEEN_MOVIES_MS = 2000
const DELAY_BETWEEN_FETCHES_MS = 500

// ─── Stats ─────────────────────────────────────────────────────────
const stats = {
  moviesProcessed: 0,
  moviesSkipped: 0,
  moviesWithResults: 0,
  reviewsFound: 0,
  reviewsDuplicate: 0,
  reviewsNonReview: 0,
  reviewsFetchFail: 0,
  reviewsSaved: 0,
  reviewsAlreadyInDb: 0,
  reviewsSummaryFail: 0,
  personsCreated: 0,
  personsResolved: 0,
  mediaOutletsCreated: 0,
  inputTokens: 0,
  outputTokens: 0,
  searchInputTokens: 0,
  searchOutputTokens: 0,
  summaryInputTokens: 0,
  summaryOutputTokens: 0,
  errors: 0,
  startTime: Date.now(),
}

// ─── Logging ───────────────────────────────────────────────────────
const LOG_DIR = path.resolve(__dirname, '../logs')
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true })
const logFile = path.join(LOG_DIR, `batch-reviews-${new Date().toISOString().replace(/[:.]/g, '-')}.log`)
const logStream = fs.createWriteStream(logFile, { flags: 'a' })

function log(level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG', msg: string) {
  const ts = new Date().toISOString()
  const line = `[${ts}] [${level}] ${msg}`
  if (level !== 'DEBUG') console.log(line)
  logStream.write(line + '\n')
}

function logStats() {
  const elapsed = ((Date.now() - stats.startTime) / 1000 / 60).toFixed(1)
  const totalTokens = stats.inputTokens + stats.outputTokens
  // Estimate costs: Sonnet input $3/MTok output $15/MTok, Haiku input $0.80/MTok output $4/MTok
  const searchCost = (stats.searchInputTokens * 3 + stats.searchOutputTokens * 15) / 1_000_000
  const summaryCost = (stats.summaryInputTokens * 0.80 + stats.summaryOutputTokens * 4) / 1_000_000
  const totalCost = searchCost + summaryCost

  log('INFO', `\n════════════════════ ESTADÍSTICAS ════════════════════`)
  log('INFO', `Tiempo transcurrido: ${elapsed} minutos`)
  log('INFO', `Películas procesadas: ${stats.moviesProcessed} (skip: ${stats.moviesSkipped})`)
  log('INFO', `Películas con resultados: ${stats.moviesWithResults}`)
  log('INFO', `Reviews encontradas: ${stats.reviewsFound}`)
  log('INFO', `  - Duplicadas (dedup interna): ${stats.reviewsDuplicate}`)
  log('INFO', `  - No-críticas filtradas: ${stats.reviewsNonReview}`)
  log('INFO', `  - Ya en BD: ${stats.reviewsAlreadyInDb}`)
  log('INFO', `  - Fetch fallido: ${stats.reviewsFetchFail}`)
  log('INFO', `  - Resumen fallido: ${stats.reviewsSummaryFail}`)
  log('INFO', `  - Guardadas: ${stats.reviewsSaved}`)
  log('INFO', `Personas: creadas ${stats.personsCreated}, resueltas ${stats.personsResolved}`)
  log('INFO', `Medios creados: ${stats.mediaOutletsCreated}`)
  log('INFO', `Tokens totales: ${totalTokens.toLocaleString()} (search: ${(stats.searchInputTokens + stats.searchOutputTokens).toLocaleString()}, summary: ${(stats.summaryInputTokens + stats.summaryOutputTokens).toLocaleString()})`)
  log('INFO', `Costo estimado: $${totalCost.toFixed(2)} (search: $${searchCost.toFixed(2)}, summary: $${summaryCost.toFixed(2)})`)
  log('INFO', `Errores: ${stats.errors}`)
  log('INFO', `══════════════════════════════════════════════════════\n`)
}

// ─── DB ────────────────────────────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://cinenacional:Paganitzu@localhost:5433/cinenacional',
  keepAlive: true,
  keepAliveInitialDelayMillis: 30_000,
})
pool.on('error', (err: Error) => log('ERROR', `Pool error: ${err.message}`))

// ─── Anthropic clients ────────────────────────────────────────────
const apiKey = process.env.ANTHROPIC_API_KEY
if (!apiKey) { console.error('ANTHROPIC_API_KEY not set'); process.exit(1) }
const anthropic = new Anthropic({ apiKey })

// ─── Graceful shutdown ────────────────────────────────────────────
let shuttingDown = false
function requestShutdown(signal: string) {
  if (shuttingDown) return
  shuttingDown = true
  log('WARN', `${signal} recibido — finalizando después de la película actual…`)
}
process.on('SIGINT', () => requestShutdown('SIGINT'))
process.on('SIGTERM', () => requestShutdown('SIGTERM'))

function isTimeUp(): boolean {
  return (Date.now() - stats.startTime) >= MAX_HOURS * 60 * 60 * 1000
}

// ─── Types ─────────────────────────────────────────────────────────
interface ReviewResult {
  medio: string
  autor: string | null
  titulo: string | null
  fecha: string | null
  link: string
  pelicula: string
}

interface MovieRow {
  id: number
  title: string
  year: number | null
  release_year: number | null
  release_month: number | null
  release_day: number | null
  director_name: string | null
  review_count: number
}

// ─── Constants ─────────────────────────────────────────────────────
const ACCENTS_FROM = 'áéíóúàèìòùâêîôûäëïöüãõñÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÄËÏÖÜÃÕÑ'
const ACCENTS_TO = 'aeiouaeiouaeiouaeiouaonAEIOUAEIOUAEIOUAEIOUAON'

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

// ─── System prompts (from existing API routes) ─────────────────────

function buildSearchSystemPrompt(outlets: { name: string; url: string }[]): string {
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
- Mantener en inglés los términos técnicos y de género que se usan así en castellano: true crime, found footage, coming of age, slow burn, thriller, gore, slasher, body horror, mockumentary, road movie, western, noir, giallo, exploitation, grindhouse, camp, queer, etc. No traducirlos nunca (no "crímenes reales", no "metraje encontrado")

Tener la extensión necesaria y no más: si la valoración es simple, el párrafo puede ser breve. No rellenes ni alargues.

Devolvé únicamente el párrafo, sin aclaraciones ni comentarios adicionales.`

// ─── Helper: fetch with timeout ────────────────────────────────────
async function fetchWithTimeout(url: string, timeoutMs = 15000): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      cache: 'no-store',
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'es-AR,es;q=0.9,en;q=0.8',
      },
    })
    return res
  } finally {
    clearTimeout(timeout)
  }
}

// ─── HTML extraction (ported from extract-author/route.ts) ─────────
/** Decode common HTML entities in extracted text (titles, author names) */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&ldquo;|&rdquo;|&laquo;|&raquo;/gi, '"')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
}

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

function isValidAuthorName(name: string): boolean {
  if (!name || name.length < 2 || name.length > 100) return false
  if (name.includes('<') || name.includes('{')) return false
  if (/^https?:\/\//i.test(name)) return false
  if (name.includes('@') && name.includes('.')) return false
  if (/^\d+$/.test(name)) return false
  if (/^(Photo|Image|Credit|Courtesy|Foto|Crédito|Imagen|Illustration|Getty|Shutterstock|AP Photo|Reuters|AFP)[\s:]/i.test(name)) return false
  if (/^(Share|Tweet|Email|Print|Comment|Read|More|View|Posted|Written|Admin|Editor|Redacción|Texto por|Por|By)$/i.test(name)) return false
  // Reject common junk: fragments, articles as first word, generic labels
  if (/^(el|la|los|las|un|una|del|al|por|con|en|de|su|se|lo|le|no|es|pero)\s/i.test(name)) return false
  // Reject names that start lowercase (likely sentence fragments)
  if (/^[a-záéíóúñ]/.test(name)) return false
  // Reject if it contains common non-name words suggesting it's a sentence fragment
  if (/\b(correo|electr[oó]nic|suscri|newsletter|cookie|privacidad|contacto|copyright|derechos|reservados)\b/i.test(name)) return false
  // Reject ALL-CAPS single words (likely section headers: "FESTIVALES", "ESTRENOS", etc.)
  if (/^[A-ZÁÉÍÓÚÑ\s]+$/.test(name) && name.split(/\s+/).length <= 2) return false
  // Must contain at least one letter
  if (!/[a-záéíóúñA-ZÁÉÍÓÚÑ]/.test(name)) return false
  return true
}

function resolveAuthorNameFromData(author: unknown): string | null {
  if (typeof author === 'string' && isValidAuthorName(author.trim())) return author.trim()
  if (Array.isArray(author)) {
    for (const a of author) { const n = resolveAuthorNameFromData(a); if (n) return n }
    return null
  }
  if (author && typeof author === 'object') {
    const obj = author as Record<string, unknown>
    if (typeof obj.name === 'string' && isValidAuthorName(obj.name.trim())) return obj.name.trim()
  }
  return null
}

function extractFromJsonLd(html: string): string | null {
  const regex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let match: RegExpExecArray | null
  while ((match = regex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1])
      const author = findAuthorInJsonLd(data)
      if (author) return author
    } catch { /* malformed JSON-LD */ }
  }
  return null
}

function findAuthorInJsonLd(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null
  if (Array.isArray(data)) {
    for (const item of data) { const r = findAuthorInJsonLd(item); if (r) return r }
    return null
  }
  const obj = data as Record<string, unknown>
  const type = obj['@type']
  const isContentType = typeof type === 'string' && /Article|Review|NewsArticle|BlogPosting|WebPage|Report/i.test(type)
  if (isContentType && obj.author) { const n = resolveAuthorNameFromData(obj.author); if (n) return n }
  if (!type && obj.author) { const n = resolveAuthorNameFromData(obj.author); if (n) return n }
  if (Array.isArray(obj['@graph'])) {
    for (const node of obj['@graph']) {
      if (!node || typeof node !== 'object') continue
      const nodeObj = node as Record<string, unknown>
      const nodeType = nodeObj['@type']
      const nodeIsContent = typeof nodeType === 'string' && /Article|Review|NewsArticle|BlogPosting|WebPage|Report/i.test(nodeType)
      if (nodeIsContent && nodeObj.author) {
        const n = resolveAuthorNameFromData(nodeObj.author)
        if (n) return n
        if (typeof nodeObj.author === 'object' && nodeObj.author !== null && '@id' in nodeObj.author) {
          const authorId = (nodeObj.author as { '@id': string })['@id']
          for (const personNode of obj['@graph'] as Record<string, unknown>[]) {
            if (personNode && typeof personNode === 'object' && personNode['@id'] === authorId && personNode['@type'] === 'Person' && typeof personNode.name === 'string' && isValidAuthorName(personNode.name))
              return personNode.name
          }
        }
      }
    }
    for (const node of obj['@graph']) {
      if (!node || typeof node !== 'object') continue
      const nodeObj = node as Record<string, unknown>
      if (nodeObj['@type'] === 'Person' && typeof nodeObj.name === 'string' && isValidAuthorName(nodeObj.name)) return nodeObj.name
    }
  }
  return null
}

function extractFromMetaTags(html: string): string | null {
  const metaTagGroups = [['author'], ['article:author', 'og:article:author'], ['citation_author', 'dc\\.creator', 'sailthru\\.author']]
  for (const group of metaTagGroups) {
    const names = group.join('|')
    const patterns = [
      new RegExp(`<meta[^>]*(?:name|property)=["'](?:${names})["'][^>]*content=["']([^"']+)["']`, 'i'),
      new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*(?:name|property)=["'](?:${names})["']`, 'i'),
    ]
    for (const pattern of patterns) {
      const match = html.match(pattern)
      if (match?.[1] && isValidAuthorName(match[1].trim())) return match[1].trim()
    }
  }
  return null
}

/**
 * Extract author from article headline/h1 ending with "POR AUTHOR NAME".
 * Common in Hacerse la Crítica: "TÍTULO: SUBTÍTULO, POR JOSÉ LUIS VISCONTI"
 */
function extractAuthorFromHeadline(html: string): string | null {
  const headlineMatch = html.match(/"headline"\s*:\s*"([^"]{2,500})"/i)
  if (headlineMatch?.[1]) {
    const author = extractPorFromTitle(headlineMatch[1])
    if (author) return author
  }
  const h1Patterns = [
    /<h1[^>]*>\s*([^<]{2,500})\s*<\/h1>/i,
    /<h1[^>]*class=["'][^"']*entry-title[^"']*["'][^>]*>\s*([^<]{2,500})\s*<\/h1>/i
  ]
  for (const pattern of h1Patterns) {
    const match = html.match(pattern)
    if (match?.[1]) { const author = extractPorFromTitle(match[1]); if (author) return author }
  }
  return null
}

function extractPorFromTitle(title: string): string | null {
  const match = title.match(/[,;:]\s*(?:POR|Por|por)\s+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑa-záéíóúñ.\s]+?)\s*$/)
  if (match?.[1]) {
    const name = match[1].trim()
    const normalized = /^[A-ZÁÉÍÓÚÑ\s.]+$/.test(name)
      ? name.split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
      : name
    if (isValidAuthorName(normalized)) return normalized
  }
  return null
}

// ---------------------------------------------------------------------------
// Site-specific extraction rules
// ---------------------------------------------------------------------------

type SiteExtractor = (html: string) => string | null

const siteRules: { domain: string; extract: SiteExtractor }[] = [
  {
    domain: 'hacerselacritica.com',
    extract: (html) => extractAuthorFromHeadline(html)
  },
  {
    domain: 'cinefreaks.net',
    extract: (html) => {
      const m = html.match(/<(?:strong|b|em)>\s*(?:Por|By)\s+<a[^>]*>\s*([^<]{2,80})\s*<\/a>/i)
      return m?.[1]?.trim() && isValidAuthorName(m[1].trim()) ? m[1].trim() : null
    }
  }
]

function findSiteRule(url: string): SiteExtractor | null {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '')
    for (const rule of siteRules) {
      if (hostname === rule.domain || hostname.endsWith('.' + rule.domain)) return rule.extract
    }
  } catch { /* bad URL */ }
  return null
}

function extractFromByline(html: string): string | null {
  const patterns = [
    /<[^>]*class=["'][^"']*\b(?:byline|author-name|post-author-name|entry-author-name|article-author-name|author__name|writer-name|reviewer-name)\b[^"']*["'][^>]*>(?:\s*<[^>]*>)*\s*([^<]{2,80})\s*</i,
    /<a[^>]*rel=["']author["'][^>]*>(?:\s*<[^>]*>)*\s*([^<]{2,80})\s*<\/a>/i,
    /<a[^>]*class=["'][^"']*\bauthor\b[^"']*["'][^>]*>(?:\s*<[^>]*>)*\s*([^<]{2,80})\s*<\/a>/i,
    // "author" or "autor" (Spanish) in container class, with <a> child containing the name
    // Limited to 200 chars to avoid crossing into unrelated page sections (tags, nav)
    /<[^>]*class=["'][^"']*\b(?:author|autor)\b[^"']*["'][^>]*>[\s\S]{0,200}?<a[^>]*>\s*([^<]{2,80})\s*<\/a>/i,
    // "autor" class with direct text (no <a>)
    /<[^>]*class=["'][^"']*\b(?:autor)\b[^"']*["'][^>]*>(?:\s*<[^>]*>)*\s*([^<]{2,80})\s*</i,
    /<[^>]*class=["'][^"']*\bvcard\b[^"']*["'][^>]*>(?:\s*<[^>]*>)*\s*([^<]{2,80})\s*</i,
    /<[^>]*class=["'][^"']*columnista[^"']*["'][^>]*>[\s\S]{0,500}?<img[^>]*alt=["']([^"']{2,80})["']/i,
    /<img[^>]*class=["'][^"']*(?:author|avatar)[^"']*["'][^>]*alt=["']([^"']{2,80})["']/i,
    /<img[^>]*alt=["']([^"']{2,80})["'][^>]*class=["'][^"']*(?:author|avatar)[^"']*["']/i,
    /<[^>]*class=["'][^"']*\bbyline\b[^"']*["'][^>]*>[\s\S]*?\b(?:By|Por|por)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,4})/i,
    /class=["'][^"']*(?:article-header|article-info|article-meta|post-header|entry-header)[^"']*["'][\s\S]{0,500}?\b(?:By|Por)\s+(?:<a[^>]*>)\s*([^<]{2,80})\s*<\/a>/i,
    /class=["'][^"']*(?:article|post|entry)[^"']*["'][\s\S]{0,500}?\b(?:By|Por)\s+(?:<a[^>]*>\s*)?([A-ZÁÉÍÓÚÑ][a-záéíóúñA-ZÁÉÍÓÚÑ.]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñA-ZÁÉÍÓÚÑ.]*){1,3})/i,
  ]
  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1]) {
      const name = match[1].trim()
      if (isValidAuthorName(name)) return name
    }
  }
  return null
}

function extractPublishDate(html: string): string | null {
  const jsonLdDate = html.match(/"datePublished"\s*:\s*"([^"]+)"/i)
  if (jsonLdDate?.[1]) return normalizeDate(jsonLdDate[1])
  const metaDate = html.match(/<meta[^>]*property=["']article:published_time["'][^>]*content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']article:published_time["']/i)
  if (metaDate?.[1]) return normalizeDate(metaDate[1])
  const timeEl = html.match(/<time[^>]*datetime=["']([^"']+)["']/i)
  if (timeEl?.[1]) return normalizeDate(timeEl[1])
  const dateMeta = html.match(/<meta[^>]*(?:name|property)=["'](?:date|DC\.date|pubdate|publish_date)["'][^>]*content=["']([^"']+)["']/i)
  if (dateMeta?.[1]) return normalizeDate(dateMeta[1])
  return null
}

function normalizeDate(raw: string): string | null {
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
  const ym = raw.match(/^(\d{4})-(\d{2})$/)
  if (ym) return `${ym[1]}-${ym[2]}`
  const y = raw.match(/^(\d{4})$/)
  if (y) return y[1]
  return null
}

function extractTitle(html: string, movieTitle?: string): string | null {
  const candidates: string[] = []
  const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i)
  if (ogTitle?.[1]?.trim()) candidates.push(ogTitle[1].trim())
  const twitterTitle = html.match(/<meta[^>]*(?:name|property)=["']twitter:title["'][^>]*content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*(?:name|property)=["']twitter:title["']/i)
  if (twitterTitle?.[1]?.trim()) candidates.push(twitterTitle[1].trim())
  const headlineMatch = html.match(/"headline"\s*:\s*"([^"]{2,500})"/i)
  if (headlineMatch?.[1]) candidates.push(headlineMatch[1])
  const h1Match = html.match(/<h1[^>]*class=["'][^"']*(?:entry-title|post-title|article-title|headline)[^"']*["'][^>]*>([^<]{2,500})<\/h1>/i)
  if (h1Match?.[1]?.trim()) candidates.push(h1Match[1].trim())
  const titleTag = html.match(/<title[^>]*>([^<]{2,500})<\/title>/i)
  if (titleTag?.[1]) {
    const t = titleTag[1].trim().replace(/\s*[|\-–—]\s*[^|\-–—]+$/, '').trim()
    if (t.length > 2) candidates.push(t)
  }
  const validCandidates = candidates.filter(c => c.length > 2 && c.length < 500)
  const pageTitle = validCandidates.length > 0 ? validCandidates.reduce((a, b) => a.length >= b.length ? a : b) : null

  if (movieTitle && pageTitle && isTitleJustMovieName(pageTitle, movieTitle)) {
    const reviewHeadline = extractReviewHeadline(html)
    if (reviewHeadline) return decodeHtmlEntities(reviewHeadline)
  }
  return pageTitle ? decodeHtmlEntities(pageTitle) : null
}

function normalizeForComparison(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

function isTitleJustMovieName(title: string, movieTitle: string): boolean {
  const cleanMovie = normalizeForComparison(movieTitle)
  if (normalizeForComparison(title) === cleanMovie) return true
  const stripped = title.replace(/\s*\([^)]*\)\s*/g, ' ').trim()
  if (normalizeForComparison(stripped) === cleanMovie) return true
  const segments = stripped.split(/\s*[|–—]\s*|\s+-\s+/)
  const prefixPattern = /^(critica|review|resena|critica de|review of)\s*/i
  for (const seg of segments) {
    const normalized = normalizeForComparison(seg)
    if (normalized === cleanMovie) return true
    const withoutPrefix = normalized.replace(prefixPattern, '').trim()
    if (withoutPrefix === cleanMovie) return true
  }
  return false
}

function extractReviewHeadline(html: string): string | null {
  const subtitlePatterns = [
    /<[^>]*class=["'][^"']*subtítulo[^"']*["'][^>]*>\s*([^<]{2,200})/i,
    /<[^>]*class=["'][^"']*\bsubtitle\b[^"']*["'][^>]*>\s*([^<]{2,200})/i,
    /<[^>]*class=["'][^"']*\bpost-subtitle\b[^"']*["'][^>]*>\s*([^<]{2,200})/i,
    /<[^>]*class=["'][^"']*\bentry-subtitle\b[^"']*["'][^>]*>\s*([^<]{2,200})/i,
  ]
  for (const p of subtitlePatterns) {
    const m = html.match(p); if (m?.[1]) { const t = m[1].trim(); if (t.length > 2 && t.length < 200) return t }
  }
  const styledStrongPatterns = [
    /<p[^>]*style=["'][^"']*text-align:\s*(?:center|right)[^"']*["'][^>]*>\s*<strong>\s*([^<]{2,200})\s*<\/strong>/i,
    /<p[^>]*class=["'][^"']*has-text-align-(?:center|right)[^"']*["'][^>]*>\s*<strong>\s*([^<]{2,200})\s*<\/strong>/i,
  ]
  for (const p of styledStrongPatterns) {
    const m = html.match(p); if (m?.[1]) { const t = m[1].trim(); if (t.length > 2 && t.length < 200) return t }
  }
  const articleBodyPatterns = [
    /class=["'][^"']*(?:article-text|entry-content|post-content|post-body|article-body|article__body)[^"']*["'][^>]*>\s*(?:<p[^>]*>)?\s*<strong>\s*([^<]{2,200})\s*<\/strong>/i,
    /class=["'][^"']*(?:article-text|entry-content|post-content|post-body|article-body|article__body)[^"']*["'][^>]*>\s*<p[^>]*>\s*<strong>\s*([^<]{2,200})\s*<\/strong>/i,
  ]
  for (const p of articleBodyPatterns) {
    const m = html.match(p); if (m?.[1]) { const t = m[1].trim(); if (t.length > 2 && t.length < 120 && !t.includes('.')) return t }
  }
  return null
}

function detectNonReviewSignals(html: string): string[] {
  const signals: string[] = []
  const text = stripHtmlToText(html)
  if (text.length < 200) return signals

  const speechPatternEs = /["«"][^""«»"']{15,}["»"]\s*,?\s*(?:dice|dijo|explica|explicó|señala|señaló|afirma|afirmó|sostiene|sostuvo|cuenta|contó|relata|relataba|agrega|agregó|comenta|comentó|recuerda|recordó|advierte|asegura|aseguró|apunta|detalla|detalló|precisó|precisa|resume|describe|describió|reconoce|reconoció|confiesa|confesó|revela|reveló|plantea|planteó|destaca|destacó|subraya|subrayó|propone|propuso|analiza|reflexiona)\b/gi
  const speechMatchesEs = text.match(speechPatternEs) || []
  const speechPatternEn = /[""][^""]{15,}[""]\s*,?\s*(?:says|said|explains|explained|notes|noted|adds|added|recalls|recalled|tells|told|describes|described|stated|remarked|observed|acknowledges|acknowledged|reveals|revealed|admits|admitted|argues|argued|suggests|suggested|reflects|reflected)\b/gi
  const speechMatchesEn = text.match(speechPatternEn) || []
  const totalSpeech = speechMatchesEs.length + speechMatchesEn.length
  if (totalSpeech >= 4) signals.push(`${totalSpeech} citas directas (entrevista)`)

  const qaPattern = /[-–—]\s*¿[^?]{10,}\?/g
  const qaMatches = text.match(qaPattern) || []
  if (qaMatches.length >= 3) signals.push(`Q&A (${qaMatches.length} preguntas)`)

  const interviewMarkers = /\b(?:en diálogo con|en entrevista con|en conversación con|hablamos con|conversamos con|charlamos con|habló en exclusiva|entrevista exclusiva|interview with)\b/gi
  if ((text.match(interviewMarkers) || []).length >= 1) signals.push('Marcadores de entrevista')

  const sectionPatterns = [
    /<meta[^>]*property=["']article:section["'][^>]*content=["']([^"']+)["']/i,
    /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']article:section["']/i,
  ]
  for (const p of sectionPatterns) {
    const m = html.match(p)
    if (m?.[1]) {
      const section = m[1].toLowerCase()
      if (/\b(radar|suplemento|entrevista|interview|reportaje|feature|perfil|profile|especial)\b/.test(section)) {
        signals.push(`Sección "${m[1]}"`)
      }
      break
    }
  }

  const articleSectionMatch = html.match(/"articleSection"\s*:\s*"([^"]+)"/i)
  if (articleSectionMatch?.[1]) {
    const section = articleSectionMatch[1].toLowerCase()
    if (/\b(radar|suplemento|entrevista|interview|reportaje|feature|perfil|profile|especial)\b/.test(section))
      signals.push(`JSON-LD section: "${articleSectionMatch[1]}"`)
  }

  return signals
}

// ─── Deduplication (3-pass, ported from frontend) ──────────────────
function getDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return '' }
}

function getSlug(url: string): string {
  try {
    const pathname = new URL(url).pathname.replace(/\/$/, '')
    const segments = pathname.split('/')
    return segments[segments.length - 1] || ''
  } catch { return '' }
}

const slugStopWords = new Set([
  'de', 'del', 'la', 'el', 'los', 'las', 'en', 'a', 'y', 'un', 'una', 'por', 'con', 'para', 'sobre',
  'the', 'of', 'and', 'in', 'an', 'by', 'for', 'with', 'at', 'to', 'from', 'that', 'which', 'who',
  'critica', 'review', 'resena', 'estrenos', 'estreno', 'festival', 'venecia', 'venice',
  'cannes', 'berlin', 'berlinale', 'toronto', 'tiff', 'bafici', 'ssiff', 'mar',
  'seccion', 'oficial', 'fuera', 'competicion', 'competencia', 'especial',
  'post', 'nota', 'entry', 'article',
  'cine', 'pelicula', 'film', 'movie', 'director', 'directora', 'dirigida',
  'entrevista', 'interview', 'perfil', 'profile', 'reportaje',
])

function getSlugEssence(url: string): string[] {
  const slug = getSlug(url)
  if (!slug) return []
  const words = slug.split(/[-_]/).filter(w => w.length > 1 && !slugStopWords.has(w) && !/^\d{4}$/.test(w) && !/^\d{1,2}$/.test(w))
  return words
}

function deduplicateReviews(reviews: ReviewResult[]): Set<number> {
  const duplicates = new Set<number>()

  // Helper: normalize title
  const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '').replace(/\s+/g, ' ').trim()

  // Pass 1: Same domain + author + normalized title
  for (let i = 0; i < reviews.length; i++) {
    if (duplicates.has(i)) continue
    for (let j = i + 1; j < reviews.length; j++) {
      if (duplicates.has(j)) continue
      const a = reviews[i], b = reviews[j]
      if (getDomain(a.link) !== getDomain(b.link)) continue
      if ((a.autor || '').toLowerCase() !== (b.autor || '').toLowerCase()) continue
      if (a.titulo && b.titulo && normalize(a.titulo) === normalize(b.titulo)) {
        duplicates.add(j)
      }
    }
  }

  // Pass 2: Slug containment
  for (let i = 0; i < reviews.length; i++) {
    if (duplicates.has(i)) continue
    for (let j = i + 1; j < reviews.length; j++) {
      if (duplicates.has(j)) continue
      const a = reviews[i], b = reviews[j]
      if (getDomain(a.link) !== getDomain(b.link)) continue
      if ((a.autor || '').toLowerCase() !== (b.autor || '').toLowerCase()) continue
      const slugA = getSlug(a.link), slugB = getSlug(b.link)
      if (slugA.length >= 3 && slugB.length >= 3 && (slugA.includes(slugB) || slugB.includes(slugA))) {
        duplicates.add(j)
      }
    }
  }

  // Pass 3: Slug essence overlap
  for (let i = 0; i < reviews.length; i++) {
    if (duplicates.has(i)) continue
    for (let j = i + 1; j < reviews.length; j++) {
      if (duplicates.has(j)) continue
      const a = reviews[i], b = reviews[j]
      if (getDomain(a.link) !== getDomain(b.link)) continue
      if ((a.autor || '').toLowerCase() !== (b.autor || '').toLowerCase()) continue
      const essA = getSlugEssence(a.link), essB = getSlugEssence(b.link)
      if (essA.length >= 2 && essB.length >= 2) {
        const shorter = essA.length <= essB.length ? essA : essB
        const longer = shorter === essA ? essB : essA
        if (shorter.every(w => longer.includes(w))) {
          duplicates.add(j)
        }
      }
    }
  }

  return duplicates
}

// ─── Name utils (ported from nameUtils.ts) ─────────────────────────
let knownNamesCache: Set<string> | null = null

async function loadKnownNames(): Promise<Set<string>> {
  if (knownNamesCache) return knownNamesCache
  const { rows } = await pool.query<{ name: string }>('SELECT name FROM first_name_genders')
  knownNamesCache = new Set(rows.map(r => r.name.toLowerCase()))
  return knownNamesCache
}

const PREPOSITIONS = new Set(['de', 'del', 'la', 'las', 'los', 'el'])

function splitFullNameSync(fullName: string, knownNames: Set<string>): { firstName: string | null; lastName: string | null } {
  const trimmed = fullName.trim()
  if (!trimmed) return { firstName: null, lastName: null }

  const words = trimmed.split(/\s+/)
  if (words.length === 1) return { firstName: null, lastName: words[0] }

  const isKnown = (w: string) => knownNames.has(w.toLowerCase())
  const isPrep = (w: string) => PREPOSITIONS.has(w.toLowerCase())
  const isInitial = (w: string) => /^[A-ZÁÉÍÓÚÑÜ]{1,2}\.$/.test(w)

  // Check if there's at least one known name
  const hasKnown = words.some(w => !isPrep(w) && isKnown(w))
  const hasInitial = words.some(w => isInitial(w))

  if (!hasKnown && !hasInitial) return { firstName: null, lastName: trimmed }

  // Find where lastName starts
  let i = 0
  while (i < words.length) {
    const w = words[i]
    if (isInitial(w) || isKnown(w)) { i++; continue }
    if (isPrep(w)) {
      let next = i + 1
      while (next < words.length && isPrep(words[next])) next++
      if (next >= words.length) break
      if (isKnown(words[next]) || isInitial(words[next])) { i = next + 1; continue }
      break
    }
    break
  }

  if (i === 0) {
    // First word unknown — if there are known names after it, might be a single firstName
    if (hasKnown) return { firstName: words[0], lastName: words.slice(1).join(' ') || null }
    return { firstName: null, lastName: trimmed }
  }

  if (i >= words.length) {
    // All known — last word is lastName
    return { firstName: words.slice(0, -1).join(' ') || null, lastName: words[words.length - 1] }
  }

  return { firstName: words.slice(0, i).join(' ') || null, lastName: words.slice(i).join(' ') || null }
}

// ─── Author resolution ─────────────────────────────────────────────
const authorIdCache = new Map<string, number>()

async function resolveAuthor(name: string): Promise<number | null> {
  const trimmed = name.trim()
  if (!trimmed) return null

  const cacheKey = trimmed.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
  if (authorIdCache.has(cacheKey)) return authorIdCache.get(cacheKey)!

  const knownNames = await loadKnownNames()
  const { firstName, lastName } = splitFullNameSync(trimmed, knownNames)

  // Search existing person
  let existingId: number | null = null
  if (firstName && lastName) {
    const { rows } = await pool.query<{ id: number }>(
      `SELECT id FROM people WHERE lower(translate(first_name, $1, $2)) = lower(translate($3, $1, $2)) AND lower(translate(last_name, $1, $2)) = lower(translate($4, $1, $2)) LIMIT 1`,
      [ACCENTS_FROM, ACCENTS_TO, firstName, lastName]
    )
    if (rows.length > 0) existingId = rows[0].id
  } else if (lastName && !firstName) {
    const { rows } = await pool.query<{ id: number }>(
      `SELECT id FROM people WHERE (first_name IS NULL AND lower(translate(last_name, $1, $2)) = lower(translate($3, $1, $2))) OR (last_name IS NULL AND lower(translate(first_name, $1, $2)) = lower(translate($3, $1, $2))) LIMIT 1`,
      [ACCENTS_FROM, ACCENTS_TO, lastName]
    )
    if (rows.length > 0) existingId = rows[0].id
  }

  if (existingId) {
    authorIdCache.set(cacheKey, existingId)
    stats.personsResolved++
    return existingId
  }

  if (DRY_RUN) return null

  // Detect gender
  let gender: string | null = null
  if (firstName) {
    const firstWord = firstName.split(/\s+/)[0].toLowerCase()
    const { rows } = await pool.query<{ gender: string }>('SELECT gender FROM first_name_genders WHERE name = $1', [firstWord])
    if (rows.length > 0 && (rows[0].gender === 'MALE' || rows[0].gender === 'FEMALE')) {
      gender = rows[0].gender
    }
  }

  // Generate unique slug
  let baseSlug = [firstName, lastName].filter(Boolean).join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '')
  if (!baseSlug) baseSlug = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  let slug = baseSlug
  let counter = 1
  while (true) {
    const { rows } = await pool.query('SELECT 1 FROM people WHERE slug = $1', [slug])
    if (rows.length === 0) break
    slug = `${baseSlug}-${counter++}`
  }

  const { rows } = await pool.query<{ id: number }>(
    'INSERT INTO people (slug, first_name, last_name, gender, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING id',
    [slug, firstName || null, lastName || null, gender]
  )
  const newId = rows[0].id
  authorIdCache.set(cacheKey, newId)
  stats.personsCreated++
  log('INFO', `  + Persona creada: "${trimmed}" → ID ${newId} (${firstName || ''} / ${lastName || ''}, gender: ${gender || '?'})`)
  return newId
}

// ─── Media outlet resolution ───────────────────────────────────────
const outletCache = new Map<string, number>()

async function resolveMediaOutlet(name: string, reviewUrl: string): Promise<number> {
  const key = name.toLowerCase().trim()
  if (outletCache.has(key)) return outletCache.get(key)!

  const { rows: existing } = await pool.query<{ id: number; language: string | null }>(
    'SELECT id, language FROM media_outlets WHERE lower(name) = $1 LIMIT 1',
    [key]
  )

  if (existing.length > 0) {
    const outlet = existing[0]
    outletCache.set(key, outlet.id)
    // Update language if missing
    if (!outlet.language) {
      const urlDomain = new URL(reviewUrl).hostname
      const isSpanish = /\.ar$|\.es$|\.com\.ar|pagina12|lanacion|escribiendocine|asalallena|otroscines|micropsia|reencuadre|agenciapacourondo|cineargentinohoy|laestatuilla|elcontraplano/i.test(urlDomain)
      await pool.query('UPDATE media_outlets SET language = $1, updated_at = NOW() WHERE id = $2', [isSpanish ? 'es' : 'en', outlet.id])
    }
    return outlet.id
  }

  if (DRY_RUN) return -1

  // Create new outlet
  const slug = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const urlDomain = new URL(reviewUrl).hostname
  const isSpanish = /\.ar$|\.es$|\.com\.ar|pagina12|lanacion|escribiendocine|asalallena|otroscines|micropsia|reencuadre|agenciapacourondo|cineargentinohoy|laestatuilla|elcontraplano/i.test(urlDomain)

  const { rows } = await pool.query<{ id: number }>(
    'INSERT INTO media_outlets (slug, name, language, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW()) RETURNING id',
    [slug, name, isSpanish ? 'es' : 'en']
  )
  const newId = rows[0].id
  outletCache.set(key, newId)
  stats.mediaOutletsCreated++
  log('INFO', `  + Medio creado: "${name}" → ID ${newId}`)
  return newId
}

// ─── JSON extraction ────────────────────────────────────────────────
/** Extract the first top-level JSON array from text using bracket-depth matching.
 *  Handles brackets inside strings correctly. */
function extractFirstJsonArray(text: string): string | null {
  const startIdx = text.indexOf('[')
  if (startIdx === -1) return null
  let depth = 0
  let inString = false
  let escape = false
  for (let i = startIdx; i < text.length; i++) {
    const ch = text[i]
    if (escape) { escape = false; continue }
    if (ch === '\\' && inString) { escape = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue
    if (ch === '[') depth++
    else if (ch === ']') {
      depth--
      if (depth === 0) return text.substring(startIdx, i + 1)
    }
  }
  return null
}

// ─── Claude: web search for reviews ────────────────────────────────
async function searchReviews(movieTitle: string, year: number | null, director: string | null, outlets: { name: string; url: string }[]): Promise<ReviewResult[]> {
  const systemPrompt = buildSearchSystemPrompt(outlets)
  const parts = [`Buscá críticas de la película "${movieTitle}"`]
  const context: string[] = []
  if (year) context.push(`año ${year}`)
  if (director) context.push(`dirigida por ${director}`)
  if (context.length > 0) parts.push(`(${context.join(', ')})`)
  const userMessage = parts.join(' ')

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      system: systemPrompt,
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 30 }],
      messages: [{ role: 'user', content: userMessage }],
    })

    // Track tokens
    stats.searchInputTokens += response.usage.input_tokens
    stats.searchOutputTokens += response.usage.output_tokens
    stats.inputTokens += response.usage.input_tokens
    stats.outputTokens += response.usage.output_tokens

    // Extract text from response
    const textBlocks = response.content.filter((b): b is Anthropic.TextBlock => b.type === 'text')
    const fullText = textBlocks.map(b => b.text).join('')

    // Parse JSON array from the text using bracket-depth matching
    const jsonStr = extractFirstJsonArray(fullText)
    if (!jsonStr) {
      log('WARN', `  No JSON array found in Claude response for "${movieTitle}"`)
      return []
    }

    const parsed = JSON.parse(jsonStr) as ReviewResult[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter(r => r.link && r.medio)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    log('ERROR', `  Error en búsqueda para "${movieTitle}": ${msg}`)
    stats.errors++
    return []
  }
}

// ─── Claude: generate summary ──────────────────────────────────────
async function generateSummary(url: string): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(url, 15000)
    if (!res.ok) { stats.reviewsSummaryFail++; return null }
    const html = await res.text()
    const text = stripHtmlToText(html)
    if (text.length < 200) { stats.reviewsSummaryFail++; return null }
    const truncated = text.length > 12000 ? text.slice(0, 12000) + '...' : text

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: SUMMARY_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `Resumí la siguiente crítica de cine:\n\n${truncated}` }],
    })

    stats.summaryInputTokens += message.usage.input_tokens
    stats.summaryOutputTokens += message.usage.output_tokens
    stats.inputTokens += message.usage.input_tokens
    stats.outputTokens += message.usage.output_tokens

    let summary = message.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map(b => b.text).join('').trim()
    if (!summary) { stats.reviewsSummaryFail++; return null }

    // Enforce 800 char hard limit
    if (summary.length > 800) {
      const t = summary.slice(0, 800)
      const lastPeriod = Math.max(t.lastIndexOf('. '), t.lastIndexOf('.\n'), t.endsWith('.') ? t.length - 1 : -1)
      const lastSemicolon = t.lastIndexOf('; ')
      const cutPoint = Math.max(lastPeriod, lastSemicolon)
      if (cutPoint > 200) summary = t.slice(0, cutPoint + 1)
      else { const ls = t.lastIndexOf(' '); summary = (ls > 200 ? t.slice(0, ls) : t.slice(0, 797)) + '...' }
    }

    return summary
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    log('DEBUG', `  Summary fail for ${url}: ${msg}`)
    stats.reviewsSummaryFail++
    return null
  }
}

// ─── Enrich a review: fetch HTML, extract metadata ─────────────────
interface EnrichedReview extends ReviewResult {
  htmlAuthor: string | null
  htmlTitle: string | null
  htmlFecha: string | null
  nonReviewSignals: string[]
  fetchFailed: boolean
}

async function enrichReview(review: ReviewResult, movieTitle: string): Promise<EnrichedReview> {
  try {
    const res = await fetchWithTimeout(review.link, 10000)
    if (!res.ok) return { ...review, htmlAuthor: null, htmlTitle: null, htmlFecha: null, nonReviewSignals: [], fetchFailed: true }

    const html = await res.text()
    const siteExtract = findSiteRule(review.link)
    const rawAuthor = (siteExtract ? siteExtract(html) : null) || extractFromJsonLd(html) || extractFromMetaTags(html) || extractFromByline(html)
    const author = rawAuthor ? decodeHtmlEntities(rawAuthor) : null
    const title = extractTitle(html, movieTitle)
    const fecha = extractPublishDate(html)
    const nonReviewSignals = detectNonReviewSignals(html)

    return { ...review, htmlAuthor: author, htmlTitle: title, htmlFecha: fecha, nonReviewSignals, fetchFailed: false }
  } catch {
    return { ...review, htmlAuthor: null, htmlTitle: null, htmlFecha: null, nonReviewSignals: [], fetchFailed: true }
  }
}

// ─── Process batches with concurrency limit ────────────────────────
async function processInBatches<T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>, delayMs: number): Promise<R[]> {
  const results: R[] = []
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency)
    const batchResults = await Promise.all(batch.map(fn))
    results.push(...batchResults)
    if (i + concurrency < items.length && delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }
  return results
}

// ─── Save a review to DB ───────────────────────────────────────────
async function saveReview(movieId: number, review: EnrichedReview, summary: string | null): Promise<boolean> {
  if (DRY_RUN) { log('INFO', `  [DRY-RUN] Guardaría: ${review.medio} — ${review.htmlTitle || review.titulo}`); return true }

  try {
    // Check if URL already exists
    const { rows: existing } = await pool.query('SELECT 1 FROM movie_reviews WHERE movie_id = $1 AND url = $2', [movieId, review.link])
    if (existing.length > 0) { stats.reviewsAlreadyInDb++; return false }

    // Resolve media outlet
    const mediaOutletId = await resolveMediaOutlet(review.medio, review.link)

    // Resolve author
    const authorName = review.htmlAuthor || review.autor
    let authorId: number | null = null
    if (authorName) authorId = await resolveAuthor(authorName)

    // Parse date — prefer HTML date over Claude date
    const dateStr = review.htmlFecha || review.fecha
    let publishYear: number | null = null, publishMonth: number | null = null, publishDay: number | null = null
    if (dateStr) {
      const parts = dateStr.split('-')
      if (parts[0]) publishYear = parseInt(parts[0], 10) || null
      if (parts[1]) publishMonth = parseInt(parts[1], 10) || null
      if (parts[2]) publishDay = parseInt(parts[2], 10) || null
    }

    const title = review.htmlTitle || review.titulo || null

    await pool.query(
      `INSERT INTO movie_reviews (movie_id, media_outlet_id, author_id, title, summary, url, publish_year, publish_month, publish_day, sort_order, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 0, NOW(), NOW())`,
      [movieId, mediaOutletId, authorId, title, summary, review.link, publishYear, publishMonth, publishDay]
    )

    stats.reviewsSaved++
    return true
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    log('ERROR', `  Error guardando review ${review.link}: ${msg}`)
    stats.errors++
    return false
  }
}

// ─── Main ──────────────────────────────────────────────────────────
async function main() {
  log('INFO', `═══════════════════════════════════════════════════════`)
  log('INFO', `Batch Import de Reviews`)
  log('INFO', `  Tiempo máximo: ${MAX_HOURS} horas`)
  log('INFO', `  Año de inicio: ${START_YEAR === 9999 ? 'más reciente' : START_YEAR}`)
  log('INFO', `  Skip existing: ${SKIP_EXISTING}`)
  log('INFO', `  Dry run: ${DRY_RUN}`)
  log('INFO', `  Log file: ${logFile}`)
  log('INFO', `═══════════════════════════════════════════════════════\n`)

  // Pre-load known names
  await loadKnownNames()
  log('INFO', `Nombres conocidos cargados: ${knownNamesCache!.size}`)

  // Load media outlets with URLs
  const { rows: outlets } = await pool.query<{ name: string; url: string }>(
    'SELECT name, url FROM media_outlets WHERE url IS NOT NULL ORDER BY name'
  )
  log('INFO', `Medios con URL cargados: ${outlets.length}`)

  // Parse --release-from into year/month/day components
  let rfYear = 0, rfMonth = 0, rfDay = 0
  if (RELEASE_FROM) {
    const parts = RELEASE_FROM.split('-').map(Number)
    rfYear = parts[0] || 0
    rfMonth = parts[1] || 0
    rfDay = parts[2] || 0
    if (rfYear < 1890 || rfYear > 2100) {
      log('ERROR', `--release-from inválido: ${RELEASE_FROM}`)
      process.exit(1)
    }
    log('INFO', `Filtro release-from: ${RELEASE_FROM} (año=${rfYear}, mes=${rfMonth}, día=${rfDay})`)
  }

  // Build date filter SQL (release date <= specified date, to skip newer movies already processed)
  let releaseDateFilter = ''
  if (rfYear && rfMonth && rfDay) {
    releaseDateFilter = `
      AND (
        m.release_year < ${rfYear}
        OR (m.release_year = ${rfYear} AND m.release_month < ${rfMonth})
        OR (m.release_year = ${rfYear} AND m.release_month = ${rfMonth} AND m.release_day <= ${rfDay})
        OR (m.release_year = ${rfYear} AND m.release_month = ${rfMonth} AND m.release_day IS NULL)
        OR (m.release_year = ${rfYear} AND m.release_month IS NULL)
      )`
  } else if (rfYear && rfMonth) {
    releaseDateFilter = `
      AND (
        m.release_year < ${rfYear}
        OR (m.release_year = ${rfYear} AND m.release_month <= ${rfMonth})
        OR (m.release_year = ${rfYear} AND m.release_month IS NULL)
      )`
  } else if (rfYear) {
    releaseDateFilter = `AND m.release_year <= ${rfYear}`
  }

  // Get movies with release date, ordered by release date DESC
  const { rows: movies } = await pool.query<MovieRow>(`
    SELECT
      m.id,
      m.title,
      m.year,
      m.release_year,
      m.release_month,
      m.release_day,
      (
        SELECT string_agg(
          COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''), ', '
        )
        FROM movie_crew mc
        JOIN people p ON p.id = mc.person_id
        WHERE mc.movie_id = m.id AND mc.role_id = 2
      ) AS director_name,
      (SELECT COUNT(*)::int FROM movie_reviews mr WHERE mr.movie_id = m.id) AS review_count
    FROM movies m
    WHERE m.release_year IS NOT NULL
      AND ($1 = 9999 OR m.release_year <= $1)
      ${releaseDateFilter}
    ORDER BY m.release_year DESC, COALESCE(m.release_month, 0) DESC, COALESCE(m.release_day, 0) DESC, m.id DESC
  `, [START_YEAR])

  log('INFO', `Películas a procesar: ${movies.length}\n`)

  for (const movie of movies) {
    if (shuttingDown || isTimeUp()) break

    // Skip movies with existing reviews if flag is set
    if (SKIP_EXISTING && movie.review_count > 0) {
      stats.moviesSkipped++
      continue
    }

    stats.moviesProcessed++
    const releaseDateStr = [movie.release_year, movie.release_month?.toString().padStart(2, '0'), movie.release_day?.toString().padStart(2, '0')].filter(Boolean).join('-')
    const movieLabel = `${movie.title} (${movie.year || 'S/A'}) [estreno: ${releaseDateStr}]${movie.director_name ? ` — ${movie.director_name.trim()}` : ''}`
    log('INFO', `\n[${stats.moviesProcessed}] ${movieLabel} (reviews existentes: ${movie.review_count})`)

    // 1. Search reviews with Claude
    const rawReviews = await searchReviews(movie.title, movie.year, movie.director_name?.trim() || null, outlets)
    stats.reviewsFound += rawReviews.length
    log('INFO', `  Encontradas: ${rawReviews.length} críticas`)

    if (rawReviews.length === 0) {
      await sleep(DELAY_BETWEEN_MOVIES_MS)
      continue
    }

    stats.moviesWithResults++

    // 2. Deduplicate
    const duplicates = deduplicateReviews(rawReviews)
    const uniqueReviews = rawReviews.filter((_, i) => !duplicates.has(i))
    stats.reviewsDuplicate += duplicates.size
    if (duplicates.size > 0) log('INFO', `  Dedup: ${duplicates.size} duplicadas removidas → ${uniqueReviews.length} únicas`)

    // 3. Check which URLs already exist in DB
    const urls = uniqueReviews.map(r => r.link)
    const { rows: existingUrls } = await pool.query<{ url: string }>(
      'SELECT url FROM movie_reviews WHERE movie_id = $1 AND url = ANY($2)',
      [movie.id, urls]
    )
    const existingUrlSet = new Set(existingUrls.map(r => r.url))
    const newReviews = uniqueReviews.filter(r => !existingUrlSet.has(r.link))
    const skippedExisting = uniqueReviews.length - newReviews.length
    if (skippedExisting > 0) {
      stats.reviewsAlreadyInDb += skippedExisting
      log('INFO', `  Ya en BD: ${skippedExisting} → ${newReviews.length} nuevas`)
    }

    if (newReviews.length === 0) {
      await sleep(DELAY_BETWEEN_MOVIES_MS)
      continue
    }

    // 4. Enrich reviews (fetch HTML, extract metadata)
    const enriched = await processInBatches(
      newReviews, CONCURRENCY_ENRICHMENT,
      (r) => enrichReview(r, movie.title),
      DELAY_BETWEEN_FETCHES_MS
    )

    // 5. Filter out non-reviews and fetch failures
    const validReviews: EnrichedReview[] = []
    for (const r of enriched) {
      if (r.fetchFailed) {
        stats.reviewsFetchFail++
        log('DEBUG', `  ✗ Fetch fallido: ${r.link}`)
        continue
      }
      if (r.nonReviewSignals.length > 0) {
        stats.reviewsNonReview++
        log('INFO', `  ✗ No-crítica: ${r.medio} — ${r.nonReviewSignals.join('; ')}`)
        continue
      }
      validReviews.push(r)
    }

    log('INFO', `  Válidas para guardar: ${validReviews.length}`)

    // 6. For each valid review: generate summary and save
    for (const review of validReviews) {
      if (shuttingDown || isTimeUp()) break

      // Generate summary
      const summary = await generateSummary(review.link)

      // Save
      const saved = await saveReview(movie.id, review, summary)
      if (saved) {
        const authorStr = review.htmlAuthor || review.autor || 'sin autor'
        log('INFO', `  ✓ ${review.medio} — ${authorStr}${summary ? ` (${summary.length} chars)` : ' (sin resumen)'}`)
      }

      await sleep(200)  // Small delay between saves
    }

    // Print periodic stats every 10 movies
    if (stats.moviesProcessed % 10 === 0) logStats()

    await sleep(DELAY_BETWEEN_MOVIES_MS)
  }

  // Final stats
  log('INFO', '\n\n═══════════ FINALIZADO ═══════════')
  logStats()

  // Save stats to JSON file
  const statsFile = path.join(LOG_DIR, `batch-reviews-stats-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  fs.writeFileSync(statsFile, JSON.stringify({ ...stats, endTime: Date.now(), durationMinutes: (Date.now() - stats.startTime) / 60000 }, null, 2))
  log('INFO', `Stats guardadas en: ${statsFile}`)

  await pool.end()
  logStream.end()
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

main().catch(err => {
  log('ERROR', `Fatal: ${err instanceof Error ? err.message : String(err)}`)
  logStats()
  pool.end()
  logStream.end()
  process.exit(1)
})
