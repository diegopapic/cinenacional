// src/lib/utils/slugs.ts

import { PrismaClient } from '@prisma/client'

/**
 * Genera un hash simple a partir de un string
 * Usado como fallback cuando el título no tiene caracteres alfanuméricos
 */
function generateHash(text: string): string {
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36)
}

/**
 * Genera un slug a partir de un texto
 * Si el texto no contiene caracteres alfanuméricos, genera un slug basado en hash
 */
export function generateSlug(text: string): string {
  

  // Intentar generar slug normal
  const normalSlug = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Elimina acentos
    .replace(/[^a-z0-9]+/g, '-') // Reemplaza caracteres especiales por guiones
    .replace(/^-+|-+$/g, '') // Elimina guiones al inicio y final
    .replace(/-+/g, '-') // Reemplaza múltiples guiones por uno solo

  

  // Si el slug resultante está vacío o tiene menos de 2 caracteres
  // (caso de títulos como ")(", "!!", etc.)
  if (!normalSlug || normalSlug.length < 2) {
    // Generar un hash único basado en el título original
    const hash = generateHash(text)
    const result = `title-${hash}`

    return result
  }


  return normalSlug
}

/**
 * Genera un slug único verificando contra la base de datos
 */
export async function generateUniqueSlug(
  text: string,
  model: 'location' | 'movie' | 'person' | 'genre' | 'productionCompany' | 'distributionCompany',
  prisma: any,
  excludeId?: number
): Promise<string> {
  

  const baseSlug = generateSlug(text)

  

  // Si generateSlug() retornó un slug vacío o muy corto,
  // significa que ya aplicó el hash. No intentar agregar contadores
  // a un string vacío (eso causaría "-1" como slug)
  if (!baseSlug || baseSlug.length === 0) {
    console.warn(`generateSlug retornó string vacío para: "${text}". Esto no debería ocurrir.`)
    // Generar hash directamente como fallback de seguridad
    const hash = generateHash(text)
    return `title-${hash}`
  }

  let slug = baseSlug
  let counter = 1

  while (true) {
    let exists = false

    switch (model) {
      case 'location':
        const locationQuery: any = { slug }
        if (excludeId) locationQuery.NOT = { id: excludeId }
        exists = await prisma.location.findFirst({ where: locationQuery }) !== null
        break
      case 'movie':
        const movieQuery: any = { slug }
        if (excludeId) movieQuery.NOT = { id: excludeId }
        exists = await prisma.movie.findFirst({ where: movieQuery }) !== null
        break
      case 'person':
        const personQuery: any = { slug }
        if (excludeId) personQuery.NOT = { id: excludeId }
        exists = await prisma.person.findFirst({ where: personQuery }) !== null
        break
      case 'genre':
        const genreQuery: any = { slug }
        if (excludeId) genreQuery.NOT = { id: excludeId }
        exists = await prisma.genre.findFirst({ where: genreQuery }) !== null
        break
      case 'productionCompany':
        const prodQuery: any = { slug }
        if (excludeId) prodQuery.NOT = { id: excludeId }
        exists = await prisma.productionCompany.findFirst({ where: prodQuery }) !== null
        break
      case 'distributionCompany':
        const distQuery: any = { slug }
        if (excludeId) distQuery.NOT = { id: excludeId }
        exists = await prisma.distributionCompany.findFirst({ where: distQuery }) !== null
        break
    }

    

    if (!exists) {
    
      return slug
    }

    // Si existe, agregar un número al final
    slug = `${baseSlug}-${counter}`
    counter++
  }
}