// src/lib/utils/schemas.ts

import { PrismaClient } from '@prisma/client'

/**
 * Genera un slug a partir de un texto
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Elimina acentos
    .replace(/[^a-z0-9]+/g, '-') // Reemplaza caracteres especiales por guiones
    .replace(/^-+|-+$/g, '') // Elimina guiones al inicio y final
    .replace(/-+/g, '-') // Reemplaza múltiples guiones por uno solo
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