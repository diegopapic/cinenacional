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
    const { url } = await request.json()
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL requerida' }, { status: 400 })
    }

    const result = await extractAuthorFromPage(url)
    return NextResponse.json(result)
  } catch (error) {
    log.error('Error extracting author', error)
    return NextResponse.json({ author: null, title: null, fecha: null, method: null, debug: `Exception: ${error}` })
  }
}

interface ExtractionResult {
  author: string | null
  title: string | null
  fecha: string | null
  method: string | null
  debug: string
}

async function extractAuthorFromPage(url: string): Promise<ExtractionResult> {
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
      return { author: null, title: null, fecha: null, method: null, debug: `HTTP ${res.status} fetching URL` }
    }

    const html = await res.text()
    const htmlLen = html.length

    // Extract title and date regardless of author method
    const title = extractTitle(html)
    const fecha = extractPublishDate(html)

    // 1. JSON-LD structured data
    const jsonLdAuthor = extractFromJsonLd(html)
    if (jsonLdAuthor) {
      log.info(`Found author "${jsonLdAuthor}" via JSON-LD in ${url}`)
      return { author: jsonLdAuthor, title, fecha, method: 'json-ld', debug: `HTML ${htmlLen} chars` }
    }

    // 2. Meta tags
    const metaAuthor = extractFromMetaTags(html)
    if (metaAuthor) {
      log.info(`Found author "${metaAuthor}" via meta tag in ${url}`)
      return { author: metaAuthor, title, fecha, method: 'meta', debug: `HTML ${htmlLen} chars` }
    }

    // 3. HTML byline patterns
    const bylineAuthor = extractFromByline(html)
    if (bylineAuthor) {
      log.info(`Found author "${bylineAuthor}" via byline in ${url}`)
      return { author: bylineAuthor, title, fecha, method: 'byline', debug: `HTML ${htmlLen} chars` }
    }

    log.debug(`No author found in ${url}`)
    return { author: null, title, fecha, method: null, debug: `HTML ${htmlLen} chars, no author pattern matched` }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    log.debug(`Error fetching ${url}: ${msg}`)
    return { author: null, title: null, fecha: null, method: null, debug: `Fetch error: ${msg}` }
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

function resolveAuthorName(author: unknown): string | null {
  if (typeof author === 'string' && author.length > 1 && author.length < 100) {
    return author
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
    if (typeof obj.name === 'string' && obj.name.length > 1) {
      return obj.name
    }
  }

  return null
}

function extractFromMetaTags(html: string): string | null {
  const patterns = [
    // name/property first, then content
    /<meta[^>]*(?:name|property)=["'](?:author|article:author|og:article:author|citation_author|dc\.creator|sailthru\.author)["'][^>]*content=["']([^"']+)["']/i,
    // content first, then name/property
    /<meta[^>]*content=["']([^"']+)["'][^>]*(?:name|property)=["'](?:author|article:author|og:article:author|citation_author|dc\.creator|sailthru\.author)["']/i
  ]

  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1]) {
      const name = match[1].trim()
      if (name && name.length > 1 && name.length < 100 && !name.includes('<')) {
        return name
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

function extractTitle(html: string): string | null {
  // 1. og:title meta tag (usually the cleanest)
  const ogTitle = html.match(
    /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i
  ) || html.match(
    /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i
  )
  if (ogTitle?.[1]) {
    const t = ogTitle[1].trim()
    if (t.length > 2 && t.length < 500) return t
  }

  // 2. JSON-LD headline
  const headlineMatch = html.match(/"headline"\s*:\s*"([^"]{2,500})"/i)
  if (headlineMatch?.[1]) return headlineMatch[1]

  // 3. <title> tag (often has site name appended)
  const titleTag = html.match(/<title[^>]*>([^<]{2,500})<\/title>/i)
  if (titleTag?.[1]) {
    let t = titleTag[1].trim()
    // Remove common site name separators
    t = t.replace(/\s*[|\-–—]\s*[^|\-–—]+$/, '').trim()
    if (t.length > 2) return t
  }

  return null
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
