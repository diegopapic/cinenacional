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

  const person: Record<string, unknown> = {
    '@type': 'Person',
    name,
    url: `${BASE_URL}/persona/${props.slug}`,
  }

  if (props.realName && props.realName !== name) {
    person.alternateName = props.realName
  }

  if (props.roleBadges && props.roleBadges.length > 0) {
    const relevantRoles = props.roleBadges.filter(
      r => !r.startsWith('Aparición como')
    )
    if (relevantRoles.length > 0) {
      person.jobTitle = relevantRoles[0]
    }
  }

  if (props.gender === 'MALE') {
    person.gender = 'Male'
  } else if (props.gender === 'FEMALE') {
    person.gender = 'Female'
  }

  const birthDateISO = formatPartialDateISO(props.birthYear, props.birthMonth, props.birthDay)
  if (birthDateISO) {
    person.birthDate = birthDateISO
  }

  const deathDateISO = formatPartialDateISO(props.deathYear, props.deathMonth, props.deathDay)
  if (deathDateISO) {
    person.deathDate = deathDateISO
  }

  const birthPlaceName = formatLocationName(props.birthLocation)
  if (birthPlaceName) {
    person.birthPlace = { '@type': 'Place', name: birthPlaceName }
  }

  const deathPlaceName = formatLocationName(props.deathLocation)
  if (deathPlaceName) {
    person.deathPlace = { '@type': 'Place', name: deathPlaceName }
  }

  if (props.photoUrl) {
    person.image = props.photoUrl.startsWith('http') ? props.photoUrl : `${BASE_URL}${props.photoUrl}`
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
    person.sameAs = sameAs
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: person,
  }
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
