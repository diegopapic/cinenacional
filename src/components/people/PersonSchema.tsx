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

export function PersonSchema({
  firstName,
  lastName,
  realName,
  slug,
  birthYear,
  birthMonth,
  birthDay,
  deathYear,
  deathMonth,
  deathDay,
  birthLocation,
  deathLocation,
  photoUrl,
  gender,
  links,
  roleBadges,
}: PersonSchemaProps) {
  const name = [firstName, lastName].filter(Boolean).join(' ')
  if (!name) return null

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name,
    url: `${BASE_URL}/persona/${slug}`,
  }

  // alternateName: realName si difiere del nombre principal
  if (realName && realName !== name) {
    jsonLd.alternateName = realName
  }

  // jobTitle: primer rol relevante
  if (roleBadges && roleBadges.length > 0) {
    // Filtrar roles genéricos como "Aparición como sí mismo/a"
    const relevantRoles = roleBadges.filter(
      r => !r.startsWith('Aparición como')
    )
    if (relevantRoles.length > 0) {
      jsonLd.jobTitle = relevantRoles[0]
    }
  }

  // gender
  if (gender === 'MALE') {
    jsonLd.gender = 'Male'
  } else if (gender === 'FEMALE') {
    jsonLd.gender = 'Female'
  }

  // birthDate
  const birthDateISO = formatPartialDateISO(birthYear, birthMonth, birthDay)
  if (birthDateISO) {
    jsonLd.birthDate = birthDateISO
  }

  // deathDate
  const deathDateISO = formatPartialDateISO(deathYear, deathMonth, deathDay)
  if (deathDateISO) {
    jsonLd.deathDate = deathDateISO
  }

  // birthPlace
  const birthPlaceName = formatLocationName(birthLocation)
  if (birthPlaceName) {
    jsonLd.birthPlace = {
      '@type': 'Place',
      name: birthPlaceName,
    }
  }

  // deathPlace
  const deathPlaceName = formatLocationName(deathLocation)
  if (deathPlaceName) {
    jsonLd.deathPlace = {
      '@type': 'Place',
      name: deathPlaceName,
    }
  }

  // image
  if (photoUrl) {
    jsonLd.image = photoUrl.startsWith('http') ? photoUrl : `${BASE_URL}${photoUrl}`
  }

  // sameAs: links externos
  const sameAs: string[] = []
  if (links) {
    for (const link of links) {
      if (link.isActive && link.url) {
        sameAs.push(link.url)
      }
    }
  }
  if (sameAs.length > 0) {
    jsonLd.sameAs = sameAs
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}
