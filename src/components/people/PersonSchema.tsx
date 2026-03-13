import type { PersonLink } from '@/lib/people/peopleTypes'

interface PersonSchemaProps {
  firstName?: string | null
  lastName?: string | null
  realName?: string | null
  slug: string
  birthYear?: number | null
  birthMonth?: number | null
  birthDay?: number | null
  deathYear?: number | null
  deathMonth?: number | null
  deathDay?: number | null
  birthLocation?: LocationNode | null
  deathLocation?: LocationNode | null
  photoUrl?: string | null
  gender?: string | null
  links?: PersonLink[]
  roleBadges?: string[]
}

interface LocationNode {
  name: string
  parent?: LocationNode | null
}

const BASE_URL = 'https://cinenacional.com'

function formatPartialDateISO(
  year?: number | null,
  month?: number | null,
  day?: number | null
): string | undefined {
  if (!year) return undefined
  if (month && day) return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  if (month) return `${year}-${String(month).padStart(2, '0')}`
  return String(year)
}

function formatLocationName(location: LocationNode | null | undefined): string | undefined {
  if (!location) return undefined
  const parts: string[] = []
  let current: LocationNode | null | undefined = location
  while (current) {
    parts.push(current.name)
    current = current.parent
  }
  return parts.join(', ')
}

function buildPersonJsonLd(props: PersonSchemaProps): Record<string, unknown> | null {
  const name = [props.firstName, props.lastName].filter(Boolean).join(' ')
  if (!name) return null

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name,
    url: `${BASE_URL}/persona/${props.slug}`,
  }

  if (props.realName && props.realName !== name) {
    jsonLd.alternateName = props.realName
  }

  if (props.roleBadges && props.roleBadges.length > 0) {
    const relevantRoles = props.roleBadges.filter(
      r => !r.startsWith('Aparición como')
    )
    if (relevantRoles.length > 0) {
      jsonLd.jobTitle = relevantRoles[0]
    }
  }

  if (props.gender === 'MALE') {
    jsonLd.gender = 'Male'
  } else if (props.gender === 'FEMALE') {
    jsonLd.gender = 'Female'
  }

  const birthDateISO = formatPartialDateISO(props.birthYear, props.birthMonth, props.birthDay)
  if (birthDateISO) {
    jsonLd.birthDate = birthDateISO
  }

  const deathDateISO = formatPartialDateISO(props.deathYear, props.deathMonth, props.deathDay)
  if (deathDateISO) {
    jsonLd.deathDate = deathDateISO
  }

  const birthPlaceName = formatLocationName(props.birthLocation)
  if (birthPlaceName) {
    jsonLd.birthPlace = { '@type': 'Place', name: birthPlaceName }
  }

  const deathPlaceName = formatLocationName(props.deathLocation)
  if (deathPlaceName) {
    jsonLd.deathPlace = { '@type': 'Place', name: deathPlaceName }
  }

  if (props.photoUrl) {
    jsonLd.image = props.photoUrl.startsWith('http') ? props.photoUrl : `${BASE_URL}${props.photoUrl}`
  }

  const sameAs: string[] = []
  if (props.links) {
    for (const link of props.links) {
      if (link.isActive && link.url) {
        sameAs.push(link.url)
      }
    }
  }
  if (sameAs.length > 0) {
    jsonLd.sameAs = sameAs
  }

  return jsonLd
}

export function PersonSchema(props: PersonSchemaProps) {
  const jsonLd = buildPersonJsonLd(props)
  if (!jsonLd) return null

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}
