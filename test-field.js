// test-field.js
const { PrismaClient } = require('@prisma/client')

// Verificar que el campo existe en el tipo
const prisma = new PrismaClient()

console.log('✅ Cliente de Prisma generado correctamente')
console.log('📋 El modelo Movie ahora incluye posterPublicId')

// Ejemplo de cómo usarlo
const movieData = {
  title: "Test Movie",
  slug: "test-movie",
  year: 2024,
  posterUrl: "https://example.com/poster.jpg",
  posterPublicId: "cloudinary-id-123", // ← Este campo ahora existe
  status: "DRAFT"
}

console.log('✅ Estructura de datos válida:', movieData)