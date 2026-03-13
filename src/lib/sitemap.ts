export const SITEMAP_BASE_URL = 'https://cinenacional.com'
export const SITEMAP_PAGE_SIZE = 45_000

export function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export interface SitemapEntry {
  url: string
  lastModified?: Date | null
  changeFrequency: string
  priority: number
}

export function buildSitemapXml(entries: SitemapEntry[]): string {
  const urls = entries
    .map((entry) => {
      const lastMod = entry.lastModified
        ? `\n    <lastmod>${entry.lastModified.toISOString()}</lastmod>`
        : ''
      return `  <url>
    <loc>${escapeXml(entry.url)}</loc>${lastMod}
    <changefreq>${entry.changeFrequency}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`
}

export function buildSitemapIndex(
  sitemaps: { loc: string; lastModified?: Date | null }[]
): string {
  const entries = sitemaps
    .map((s) => {
      const lastMod = s.lastModified
        ? `\n    <lastmod>${s.lastModified.toISOString()}</lastmod>`
        : ''
      return `  <sitemap>
    <loc>${escapeXml(s.loc)}</loc>${lastMod}
  </sitemap>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</sitemapindex>`
}

export function xmlResponse(xml: string): Response {
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
