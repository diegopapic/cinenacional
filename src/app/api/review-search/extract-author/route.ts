// src/app/api/review-search/extract-author/route.ts
// Fetches a review URL and extracts the author from HTML metadata.

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:extract-author')

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  try {
    const { url, movieTitle } = await request.json()
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL requerida' }, { status: 400 })
    }

    const result = await extractAuthorFromPage(url, typeof movieTitle === 'string' ? movieTitle : undefined)
    return NextResponse.json(result)
  } catch (error) {
    log.error('Error extracting author', error)
    return NextResponse.json({ author: null, title: null, fecha: null, method: null, debug: `Exception: ${error}`, nonReviewSignals: [] })
  }
}

interface ExtractionResult {
  author: string | null
  title: string | null
  fecha: string | null
  method: string | null
  debug: string
  nonReviewSignals: string[]
}

/**
 * Detect signals that an article is NOT a review (interview, feature, etc.).
 * Returns an array of human-readable signal descriptions.
 */
function detectNonReviewSignals(html: string): string[] {
  const signals: string[] = []

  // Strip HTML to get plain text for analysis
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&ldquo;|&rdquo;|&laquo;|&raquo;/gi, '"')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#?\w+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (text.length < 200) return signals

  // 1. Interview patterns: direct speech with attribution verbs (Spanish)
  // Matches: "quoted text", dice/dijo/explica/etc.
  const speechPatternEs = /["«"][^""«»"']{15,}["»"]\s*,?\s*(?:dice|dijo|explica|explicó|señala|señaló|afirma|afirmó|sostiene|sostuvo|cuenta|contó|relata|relataba|agrega|agregó|comenta|comentó|recuerda|recordó|advierte|asegura|aseguró|apunta|detalla|detalló|precisó|precisa|resume|describe|describió|reconoce|reconoció|confiesa|confesó|revela|reveló|plantea|planteó|destaca|destacó|subraya|subrayó|propone|propuso|analiza|reflexiona)\b/gi
  const speechMatchesEs = text.match(speechPatternEs) || []

  // 2. Interview patterns: direct speech with attribution verbs (English)
  const speechPatternEn = /[""][^""]{15,}[""]\s*,?\s*(?:says|said|explains|explained|notes|noted|adds|added|recalls|recalled|tells|told|describes|described|stated|remarked|observed|acknowledges|acknowledged|reveals|revealed|admits|admitted|argues|argued|suggests|suggested|reflects|reflected)\b/gi
  const speechMatchesEn = text.match(speechPatternEn) || []

  const totalSpeechMatches = speechMatchesEs.length + speechMatchesEn.length
  if (totalSpeechMatches >= 4) {
    signals.push(`${totalSpeechMatches} citas directas con atribución (perfil de entrevista)`)
  }

  // 3. Q&A format detection (Spanish)
  const qaPattern = /[-–—]\s*¿[^?]{10,}\?/g
  const qaMatches = text.match(qaPattern) || []
  if (qaMatches.length >= 3) {
    signals.push(`Formato pregunta-respuesta (${qaMatches.length} preguntas)`)
  }

  // 4. Explicit interview markers
  const interviewMarkers = /\b(?:en diálogo con|en entrevista con|en conversación con|hablamos con|conversamos con|charlamos con|habló en exclusiva|entrevista exclusiva|interview with)\b/gi
  const markerMatches = text.match(interviewMarkers) || []
  if (markerMatches.length >= 1) {
    signals.push('Marcadores explícitos de entrevista en el texto')
  }

  // 5. Article section metadata suggesting non-review content
  const sectionPatterns = [
    /<meta[^>]*property=["']article:section["'][^>]*content=["']([^"']+)["']/i,
    /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']article:section["']/i
  ]
  for (const pattern of sectionPatterns) {
    const match = html.match(pattern)
    if (match?.[1]) {
      const section = match[1].toLowerCase()
      if (/\b(radar|suplemento|entrevista|interview|reportaje|feature|perfil|profile|especial)\b/.test(section)) {
        signals.push(`Sección "${match[1]}" (no es sección de críticas)`)
      }
      break
    }
  }

  // 6. JSON-LD articleSection
  const articleSectionMatch = html.match(/"articleSection"\s*:\s*"([^"]+)"/i)
  if (articleSectionMatch?.[1]) {
    const section = articleSectionMatch[1].toLowerCase()
    if (/\b(radar|suplemento|entrevista|interview|reportaje|feature|perfil|profile|especial)\b/.test(section)) {
      signals.push(`Sección JSON-LD: "${articleSectionMatch[1]}"`)
    }
  }

  return signals
}

async function extractAuthorFromPage(url: string, movieTitle?: string): Promise<ExtractionResult> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    const res = await fetch(url, {
      signal: controller.signal,
      cache: 'no-store',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'es-AR,es;q=0.9,en;q=0.8'
      }
    })

    clearTimeout(timeout)

    if (!res.ok) {
      log.debug(`Failed to fetch ${url}: ${res.status}`)
      return { author: null, title: null, fecha: null, method: null, debug: `HTTP ${res.status} fetching URL`, nonReviewSignals: [] }
    }

    const html = await res.text()
    const htmlLen = html.length

    // Extract title and date regardless of author method
    const title = extractTitle(html, movieTitle)
    const fecha = extractPublishDate(html)
    const nonReviewSignals = detectNonReviewSignals(html)

    if (nonReviewSignals.length > 0) {
      log.info(`Non-review signals for ${url}: ${nonReviewSignals.join('; ')}`)
    }

    // 1. JSON-LD structured data
    const jsonLdAuthor = extractFromJsonLd(html)
    if (jsonLdAuthor) {
      log.info(`Found author "${jsonLdAuthor}" via JSON-LD in ${url}`)
      return { author: jsonLdAuthor, title, fecha, method: 'json-ld', debug: `HTML ${htmlLen} chars`, nonReviewSignals }
    }

    // 2. Meta tags
    const metaAuthor = extractFromMetaTags(html)
    if (metaAuthor) {
      log.info(`Found author "${metaAuthor}" via meta tag in ${url}`)
      return { author: metaAuthor, title, fecha, method: 'meta', debug: `HTML ${htmlLen} chars`, nonReviewSignals }
    }

    // 3. HTML byline patterns
    const bylineAuthor = extractFromByline(html)
    if (bylineAuthor) {
      log.info(`Found author "${bylineAuthor}" via byline in ${url}`)
      return { author: bylineAuthor, title, fecha, method: 'byline', debug: `HTML ${htmlLen} chars`, nonReviewSignals }
    }

    log.debug(`No author found in ${url}`)
    return { author: null, title, fecha, method: null, debug: `HTML ${htmlLen} chars, no author pattern matched`, nonReviewSignals }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    log.debug(`Error fetching ${url}: ${msg}`)
    return { author: null, title: null, fecha: null, method: null, debug: `Fetch error: ${msg}`, nonReviewSignals: [] }
  }
}

function extractFromJsonLd(html: string): string | null {
  const scriptMatches = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  )

  for (const match of scriptMatches) {
    try {
      const data = JSON.parse(match[1])
      const author = findAuthorInJsonLd(data)
      if (author) return author
    } catch {
      // malformed JSON-LD
    }
  }

  return null
}

function findAuthorInJsonLd(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null

  if (Array.isArray(data)) {
    for (const item of data) {
      const result = findAuthorInJsonLd(item)
      if (result) return result
    }
    return null
  }

  const obj = data as Record<string, unknown>

  // Direct author field on Article/Review/NewsArticle etc
  const type = obj['@type']
  const isContentType =
    typeof type === 'string' &&
    /Article|Review|NewsArticle|BlogPosting|WebPage|Report/i.test(type)

  if (isContentType && obj.author) {
    const name = resolveAuthorName(obj.author)
    if (name) return name
  }

  // Non-typed object with author field
  if (!type && obj.author) {
    const name = resolveAuthorName(obj.author)
    if (name) return name
  }

  // @graph array (Yoast SEO, WordPress, etc.)
  if (Array.isArray(obj['@graph'])) {
    // First pass: find Article/Review with author
    for (const node of obj['@graph']) {
      if (!node || typeof node !== 'object') continue
      const nodeObj = node as Record<string, unknown>
      const nodeType = nodeObj['@type']
      const nodeIsContent =
        typeof nodeType === 'string' &&
        /Article|Review|NewsArticle|BlogPosting|WebPage|Report/i.test(nodeType)

      if (nodeIsContent && nodeObj.author) {
        // Author might be an object or a reference { "@id": "..." }
        const name = resolveAuthorName(nodeObj.author)
        if (name) return name

        // If author is a reference, look up the Person node
        if (
          typeof nodeObj.author === 'object' &&
          nodeObj.author !== null &&
          '@id' in nodeObj.author
        ) {
          const authorId = (nodeObj.author as { '@id': string })['@id']
          for (const personNode of obj['@graph'] as Record<string, unknown>[]) {
            if (
              personNode &&
              typeof personNode === 'object' &&
              personNode['@id'] === authorId &&
              personNode['@type'] === 'Person' &&
              typeof personNode.name === 'string'
            ) {
              return personNode.name
            }
          }
        }
      }
    }

    // Second pass: find any Person node
    for (const node of obj['@graph']) {
      if (!node || typeof node !== 'object') continue
      const nodeObj = node as Record<string, unknown>
      if (nodeObj['@type'] === 'Person' && typeof nodeObj.name === 'string') {
        return nodeObj.name
      }
    }
  }

  return null
}

/**
 * Validate that a string looks like a person name, not a URL/email/junk.
 */
function isValidAuthorName(name: string): boolean {
  if (!name || name.length < 2 || name.length > 100) return false
  if (name.includes('<') || name.includes('{')) return false
  if (/^https?:\/\//i.test(name)) return false
  if (name.includes('@') && name.includes('.')) return false // email
  if (/^\d+$/.test(name)) return false
  // Reject photo/image credits
  if (/^(Photo|Image|Credit|Courtesy|Foto|Crédito|Imagen|Illustration|Getty|Shutterstock|AP Photo|Reuters|AFP)[\s:]/i.test(name)) return false
  if (/^(Share|Tweet|Email|Print|Comment|Read|More|View|Posted|Written|Admin|Editor|Redacción|Texto por)$/i.test(name)) return false
  return true
}

function resolveAuthorName(author: unknown): string | null {
  if (typeof author === 'string' && isValidAuthorName(author.trim())) {
    return author.trim()
  }

  if (Array.isArray(author)) {
    for (const a of author) {
      const name = resolveAuthorName(a)
      if (name) return name
    }
    return null
  }

  if (author && typeof author === 'object') {
    const obj = author as Record<string, unknown>
    if (typeof obj.name === 'string' && isValidAuthorName(obj.name.trim())) {
      return obj.name.trim()
    }
  }

  return null
}

function extractFromMetaTags(html: string): string | null {
  // Check meta tags in priority order: author > article:author > DC.creator
  const metaTagGroups = [
    ['author'],
    ['article:author', 'og:article:author'],
    ['citation_author', 'dc\\.creator', 'sailthru\\.author']
  ]

  for (const group of metaTagGroups) {
    const names = group.join('|')
    const patterns = [
      new RegExp(`<meta[^>]*(?:name|property)=["'](?:${names})["'][^>]*content=["']([^"']+)["']`, 'i'),
      new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*(?:name|property)=["'](?:${names})["']`, 'i')
    ]

    for (const pattern of patterns) {
      const match = html.match(pattern)
      if (match?.[1]) {
        const name = match[1].trim()
        if (isValidAuthorName(name)) {
          return name
        }
      }
    }
  }

  return null
}

function extractFromByline(html: string): string | null {
  const patterns = [
    // Class-based byline patterns
    /<[^>]*class=["'][^"']*\b(?:byline|author-name|post-author-name|entry-author-name|article-author-name|author__name|writer-name|reviewer-name)\b[^"']*["'][^>]*>(?:<[^>]*>)*\s*([^<]{2,80})\s*</i,
    // Author link with rel="author"
    /<a[^>]*rel=["']author["'][^>]*>(?:<[^>]*>)*\s*([^<]{2,80})\s*<\/a>/i,
    // Author link with class containing "author"
    /<a[^>]*class=["'][^"']*\bauthor\b[^"']*["'][^>]*>(?:<[^>]*>)*\s*([^<]{2,80})\s*<\/a>/i,
    // Author div/span with "Por" text followed by a link (Drupal/Agencia Paco Urondo pattern)
    /<[^>]*class=["'][^"']*\bauthor\b[^"']*["'][^>]*>[\s\S]*?<a[^>]*>\s*([^<]{2,80})\s*<\/a>/i,
    // WordPress-style author vcard
    /<[^>]*class=["'][^"']*\bvcard\b[^"']*["'][^>]*>(?:<[^>]*>)*\s*([^<]{2,80})\s*</i,
    // Author container with img alt (Escribiendo Cine "columnistas-noticia" pattern)
    /<[^>]*class=["'][^"']*columnista[^"']*["'][^>]*>[\s\S]{0,500}?<img[^>]*alt=["']([^"']{2,80})["']/i,
    // Author image with class containing author/avatar
    /<img[^>]*class=["'][^"']*(?:author|avatar)[^"']*["'][^>]*alt=["']([^"']{2,80})["']/i,
    /<img[^>]*alt=["']([^"']{2,80})["'][^>]*class=["'][^"']*(?:author|avatar)[^"']*["']/i,
    // "By <name>" pattern in text
    /<[^>]*class=["'][^"']*\bbyline\b[^"']*["'][^>]*>[\s\S]*?\b(?:By|Por|por)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,4})/i,
    // Simple "By Name" near article start
    /class=["'][^"']*(?:article|post|entry)[^"']*["'][\s\S]{0,500}?\b(?:By|Por)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,3})/i
  ]

  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1]) {
      const name = match[1].trim()
      if (
        name.length > 2 &&
        name.length < 80 &&
        !name.includes('{') &&
        !name.includes('<') &&
        !name.includes('http') &&
        !/^\d+$/.test(name) &&
        !/^(Share|Tweet|Email|Print|Comment|Read|More|View|Posted|Written)$/i.test(name)
      ) {
        return name
      }
    }
  }

  return null
}

/**
 * Normalize a string for comparison: lowercase, strip accents, remove non-alphanumeric.
 */
function normalizeForComparison(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Check if an extracted page title is essentially just the movie name
 * (possibly with generic prefixes like "Crítica |" or suffixes like "(Landmarks)").
 */
function isTitleJustMovieName(title: string, movieTitle: string): boolean {
  const cleanMovie = normalizeForComparison(movieTitle)

  // Direct match after normalizing
  if (normalizeForComparison(title) === cleanMovie) return true

  // Remove parentheticals: "(Landmarks)", "(2025)"
  const stripped = title.replace(/\s*\([^)]*\)\s*/g, ' ').trim()
  if (normalizeForComparison(stripped) === cleanMovie) return true

  // Split by common separators (|, –, —, spaced dash) and check each segment
  const segments = stripped.split(/\s*[|–—]\s*|\s+-\s+/)
  const prefixPattern = /^(critica|review|resena|critica de|review of)\s*/i

  for (const seg of segments) {
    const normalized = normalizeForComparison(seg)
    if (normalized === cleanMovie) return true
    // Also try after removing review label prefix: "Crítica | Movie" → "Movie"
    const withoutPrefix = normalized.replace(prefixPattern, '').trim()
    if (withoutPrefix === cleanMovie) return true
  }

  return false
}

/**
 * Try to extract the review's own creative headline from the article body.
 * Used when the page title is just the movie name.
 */
function extractReviewHeadline(html: string): string | null {
  // 1. Subtitle elements (e.g. elantepenultimomohicano: <div class="subtítulo-artículo">)
  const subtitlePatterns = [
    /<[^>]*class=["'][^"']*subtítulo[^"']*["'][^>]*>\s*([^<]{2,200})/i,
    /<[^>]*class=["'][^"']*\bsubtitle\b[^"']*["'][^>]*>\s*([^<]{2,200})/i,
    /<[^>]*class=["'][^"']*\bpost-subtitle\b[^"']*["'][^>]*>\s*([^<]{2,200})/i,
    /<[^>]*class=["'][^"']*\bentry-subtitle\b[^"']*["'][^>]*>\s*([^<]{2,200})/i
  ]
  for (const pattern of subtitlePatterns) {
    const match = html.match(pattern)
    if (match?.[1]) {
      const t = match[1].trim()
      if (t.length > 2 && t.length < 200) return t
    }
  }

  // 2. Styled <strong> in paragraph — centered or right-aligned
  //    Inline style: <p style="text-align: center;"><strong>DOS DISPAROS</strong>
  //    WordPress class: <p class="has-text-align-right"><strong>LOS DE ANTES</strong>
  const styledStrongPatterns = [
    /<p[^>]*style=["'][^"']*text-align:\s*(?:center|right)[^"']*["'][^>]*>\s*<strong>\s*([^<]{2,200})\s*<\/strong>/i,
    /<p[^>]*class=["'][^"']*has-text-align-(?:center|right)[^"']*["'][^>]*>\s*<strong>\s*([^<]{2,200})\s*<\/strong>/i
  ]
  for (const pattern of styledStrongPatterns) {
    const match = html.match(pattern)
    if (match?.[1]) {
      const t = match[1].trim()
      if (t.length > 2 && t.length < 200) return t
    }
  }

  // 3. First <strong> at very start of article body
  //    (e.g. reverseshot: <div class="article-text"><p class="body"><strong>Earth and Sky</strong>)
  const articleBodyPatterns = [
    /class=["'][^"']*(?:article-text|entry-content|post-content|post-body|article-body|article__body)[^"']*["'][^>]*>\s*(?:<p[^>]*>)?\s*<strong>\s*([^<]{2,200})\s*<\/strong>/i,
    /class=["'][^"']*(?:article-text|entry-content|post-content|post-body|article-body|article__body)[^"']*["'][^>]*>\s*<p[^>]*>\s*<strong>\s*([^<]{2,200})\s*<\/strong>/i
  ]
  for (const pattern of articleBodyPatterns) {
    const match = html.match(pattern)
    if (match?.[1]) {
      const t = match[1].trim()
      // Only use if it's short enough to be a headline (not a full sentence)
      if (t.length > 2 && t.length < 120 && !t.includes('.')) return t
    }
  }

  // 4. og:description first sentence — sometimes contains the review title
  //    e.g. "El sentido de mirar a cámara. Crítica de Nuestra tierra..."
  const ogDesc = html.match(
    /<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i
  ) || html.match(
    /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:description["']/i
  )
  if (ogDesc?.[1]) {
    const firstSentence = ogDesc[1].split(/\.\s/)[0]?.trim()
    if (firstSentence && firstSentence.length > 3 && firstSentence.length < 120) {
      // Check it's not just the movie name or a generic description
      const normalized = normalizeForComparison(firstSentence)
      if (!normalized.startsWith('critica') && !normalized.startsWith('review')) {
        return firstSentence
      }
    }
  }

  return null
}

function extractTitle(html: string, movieTitle?: string): string | null {
  // Collect candidate titles from all standard sources
  const candidates: string[] = []

  // 1. og:title
  const ogTitle = html.match(
    /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i
  ) || html.match(
    /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i
  )
  if (ogTitle?.[1]?.trim()) candidates.push(ogTitle[1].trim())

  // 2. twitter:title (sometimes longer/more complete)
  const twitterTitle = html.match(
    /<meta[^>]*(?:name|property)=["']twitter:title["'][^>]*content=["']([^"']+)["']/i
  ) || html.match(
    /<meta[^>]*content=["']([^"']+)["'][^>]*(?:name|property)=["']twitter:title["']/i
  )
  if (twitterTitle?.[1]?.trim()) candidates.push(twitterTitle[1].trim())

  // 3. JSON-LD headline
  const headlineMatch = html.match(/"headline"\s*:\s*"([^"]{2,500})"/i)
  if (headlineMatch?.[1]) candidates.push(headlineMatch[1])

  // 4. <h1> in article area (sometimes has the full untruncated title)
  const h1Match = html.match(
    /<h1[^>]*class=["'][^"']*(?:entry-title|post-title|article-title|headline)[^"']*["'][^>]*>([^<]{2,500})<\/h1>/i
  )
  if (h1Match?.[1]?.trim()) candidates.push(h1Match[1].trim())

  // 5. <title> tag (cleaned)
  const titleTag = html.match(/<title[^>]*>([^<]{2,500})<\/title>/i)
  if (titleTag?.[1]) {
    let t = titleTag[1].trim()
    t = t.replace(/\s*[|\-–—]\s*[^|\-–—]+$/, '').trim()
    if (t.length > 2) candidates.push(t)
  }

  // Filter valid candidates and pick the best one (longest, as it's usually most complete)
  const validCandidates = candidates.filter((c) => c.length > 2 && c.length < 500)
  const pageTitle = validCandidates.length > 0
    ? validCandidates.reduce((a, b) => (a.length >= b.length ? a : b))
    : null

  // If we know the movie title, check if the page title is just the movie name
  if (movieTitle && pageTitle && isTitleJustMovieName(pageTitle, movieTitle)) {
    const reviewHeadline = extractReviewHeadline(html)
    if (reviewHeadline) {
      log.info(`Review headline "${reviewHeadline}" found (page title "${pageTitle}" ≈ movie name)`)
      return reviewHeadline
    }
  }

  return pageTitle
}

function extractPublishDate(html: string): string | null {
  // 1. JSON-LD datePublished
  const jsonLdDate = html.match(/"datePublished"\s*:\s*"([^"]+)"/i)
  if (jsonLdDate?.[1]) return normalizeDate(jsonLdDate[1])

  // 2. article:published_time meta
  const metaDate = html.match(
    /<meta[^>]*property=["']article:published_time["'][^>]*content=["']([^"']+)["']/i
  ) || html.match(
    /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']article:published_time["']/i
  )
  if (metaDate?.[1]) return normalizeDate(metaDate[1])

  // 3. <time datetime="..."> element
  const timeEl = html.match(/<time[^>]*datetime=["']([^"']+)["']/i)
  if (timeEl?.[1]) return normalizeDate(timeEl[1])

  // 4. date meta tag
  const dateMeta = html.match(
    /<meta[^>]*(?:name|property)=["'](?:date|DC\.date|pubdate|publish_date)["'][^>]*content=["']([^"']+)["']/i
  )
  if (dateMeta?.[1]) return normalizeDate(dateMeta[1])

  return null
}

function normalizeDate(raw: string): string | null {
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`

  const ymMatch = raw.match(/^(\d{4})-(\d{2})$/)
  if (ymMatch) return `${ymMatch[1]}-${ymMatch[2]}`

  const yMatch = raw.match(/^(\d{4})$/)
  if (yMatch) return yMatch[1]

  return null
}
