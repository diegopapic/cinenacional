// scripts/pre-deploy-check.js
const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

// Colores para la terminal
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m'
}

async function checkDatabaseIndexes() {
  console.log(`${colors.blue}📊 Verificando índices de base de datos...${colors.reset}`)
  
  try {
    // Verificar índices en PostgreSQL
    const indexes = await prisma.$queryRaw`
      SELECT tablename, indexname 
      FROM pg_indexes 
      WHERE schemaname = 'public'
    `
    
    const requiredIndexes = [
      'movies_slug_key',
      'movies_release_year_idx',
      'movie_cast_movie_id_idx',
      'movie_crew_movie_id_idx'
    ]
    
    const indexNames = indexes.map(idx => idx.indexname)
    const missingIndexes = requiredIndexes.filter(idx => !indexNames.includes(idx))
    
    if (missingIndexes.length > 0) {
      console.log(`${colors.yellow}⚠️  Índices faltantes: ${missingIndexes.join(', ')}${colors.reset}`)
      return false
    }
    
    console.log(`${colors.green}✅ Índices OK (${indexes.length} encontrados)${colors.reset}`)
    return true
  } catch (error) {
    console.log(`${colors.red}❌ Error verificando índices: ${error.message}${colors.reset}`)
    return false
  }
}

async function checkQueryPerformance() {
  console.log(`${colors.blue}⚡ Verificando performance de queries...${colors.reset}`)
  
  const queries = [
    {
      name: 'Listado de películas',
      query: async () => {
        const start = Date.now()
        await prisma.movie.findMany({
          take: 20,
          select: {
            id: true,
            title: true,
            slug: true,
            year: true
          }
        })
        return Date.now() - start
      }
    },
    {
      name: 'Película con relaciones',
      query: async () => {
        const start = Date.now()
        const movie = await prisma.movie.findFirst()
        if (movie) {
          await prisma.movie.findUnique({
            where: { id: movie.id },
            include: {
              genres: true,
              cast: { take: 5 },
              crew: { take: 5 }
            }
          })
        }
        return Date.now() - start
      }
    }
  ]
  
  let allPassed = true
  
  for (const { name, query } of queries) {
    try {
      const time = await query()
      if (time > 500) {
        console.log(`${colors.red}❌ ${name}: ${time}ms (muy lento!)${colors.reset}`)
        allPassed = false
      } else if (time > 200) {
        console.log(`${colors.yellow}⚠️  ${name}: ${time}ms (mejorable)${colors.reset}`)
      } else {
        console.log(`${colors.green}✅ ${name}: ${time}ms${colors.reset}`)
      }
    } catch (error) {
      console.log(`${colors.red}❌ Error en ${name}: ${error.message}${colors.reset}`)
      allPassed = false
    }
  }
  
  return allPassed
}

async function checkForNPlusOneQueries() {
  console.log(`${colors.blue}🔍 Detectando queries N+1...${colors.reset}`)
  
  // Buscar archivos con includes anidados problemáticos
  const apiDir = path.join(process.cwd(), 'src', 'app', 'api')
  let problematicFiles = []
  
  function scanDirectory(dir) {
    if (!fs.existsSync(dir)) return
    
    const files = fs.readdirSync(dir)
    
    for (const file of files) {
      const filePath = path.join(dir, file)
      const stat = fs.statSync(filePath)
      
      if (stat.isDirectory()) {
        scanDirectory(filePath)
      } else if (file.endsWith('.ts') || file.endsWith('.js')) {
        const content = fs.readFileSync(filePath, 'utf8')
        
        // Detectar includes anidados problemáticos
        if (content.includes('include: { person: true }') ||
            content.includes('include: { movie: true }') ||
            (content.includes('findMany') && content.includes('include') && content.includes('include'))) {
          problematicFiles.push(filePath.replace(process.cwd(), '.'))
        }
      }
    }
  }
  
  scanDirectory(apiDir)
  
  if (problematicFiles.length > 0) {
    console.log(`${colors.yellow}⚠️  Posibles N+1 queries en:${colors.reset}`)
    problematicFiles.forEach(file => {
      console.log(`   - ${file}`)
    })
    return false
  }
  
  console.log(`${colors.green}✅ No se detectaron N+1 queries obvios${colors.reset}`)
  return true
}

async function checkCacheImplementation() {
  console.log(`${colors.blue}💾 Verificando implementación de caché...${colors.reset}`)
  
  const cacheFiles = [
    'src/lib/cache.ts',
    'src/lib/cache.js',
    'src/utils/cache.ts',
    'src/utils/cache.js'
  ]
  
  let hasCacheFile = false
  for (const file of cacheFiles) {
    if (fs.existsSync(path.join(process.cwd(), file))) {
      hasCacheFile = true
      console.log(`${colors.green}✅ Archivo de caché encontrado: ${file}${colors.reset}`)
      break
    }
  }
  
  if (!hasCacheFile) {
    console.log(`${colors.red}❌ No se encontró implementación de caché${colors.reset}`)
    console.log(`${colors.yellow}   Considera crear src/lib/cache.ts${colors.reset}`)
    return false
  }
  
  return true
}

async function checkSecurityBasics() {
  console.log(`${colors.blue}🔒 Verificando seguridad básica...${colors.reset}`)
  
  const issues = []
  
  // Verificar si hay rate limiting
  const middlewarePath = path.join(process.cwd(), 'src', 'middleware.ts')
  if (!fs.existsSync(middlewarePath)) {
    issues.push('No hay middleware.ts para rate limiting')
  }
  
  // Verificar variables de entorno
  const envExample = path.join(process.cwd(), '.env.example')
  if (fs.existsSync(envExample)) {
    const envContent = fs.readFileSync(envExample, 'utf8')
    if (!envContent.includes('DATABASE_URL')) {
      issues.push('DATABASE_URL no está en .env.example')
    }
  }
  
  // Buscar endpoints sin autenticación
  const apiDir = path.join(process.cwd(), 'src', 'app', 'api')
  const adminRoutes = []
  
  function findAdminRoutes(dir) {
    if (!fs.existsSync(dir)) return
    
    const files = fs.readdirSync(dir)
    for (const file of files) {
      const filePath = path.join(dir, file)
      if (file === 'route.ts' || file === 'route.js') {
        const content = fs.readFileSync(filePath, 'utf8')
        if ((content.includes('POST') || content.includes('PUT') || content.includes('DELETE')) &&
            !content.includes('auth') && !content.includes('session')) {
          adminRoutes.push(filePath.replace(process.cwd(), '.'))
        }
      } else if (fs.statSync(filePath).isDirectory()) {
        findAdminRoutes(filePath)
      }
    }
  }
  
  findAdminRoutes(apiDir)
  
  if (adminRoutes.length > 0) {
    issues.push(`${adminRoutes.length} rutas de modificación sin autenticación aparente`)
  }
  
  if (issues.length > 0) {
    console.log(`${colors.yellow}⚠️  Problemas de seguridad:${colors.reset}`)
    issues.forEach(issue => {
      console.log(`   - ${issue}`)
    })
    return false
  }
  
  console.log(`${colors.green}✅ Seguridad básica OK${colors.reset}`)
  return true
}

async function checkDataCompleteness() {
  console.log(`${colors.blue}📈 Verificando completitud de datos...${colors.reset}`)
  
  const stats = await prisma.movie.aggregate({
    _count: true
  })
  
  const withPoster = await prisma.movie.count({
    where: { posterUrl: { not: null } }
  })
  
  const withSynopsis = await prisma.movie.count({
    where: { synopsis: { not: null } }
  })
  
  const withDirector = await prisma.movieCrew.count({
    where: { roleId: 2 } // Director
  })
  
  console.log(`   Total películas: ${stats._count}`)
  console.log(`   Con poster: ${withPoster} (${Math.round(withPoster/stats._count*100)}%)`)
  console.log(`   Con sinopsis: ${withSynopsis} (${Math.round(withSynopsis/stats._count*100)}%)`)
  console.log(`   Con director: ${withDirector}`)
  
  return true
}

async function main() {
  console.log(`\n${colors.blue}🚀 === PRE-DEPLOY CHECK ===${colors.reset}\n`)
  
  const checks = [
    { name: 'Índices de DB', fn: checkDatabaseIndexes },
    { name: 'Performance', fn: checkQueryPerformance },
    { name: 'N+1 Queries', fn: checkForNPlusOneQueries },
    { name: 'Caché', fn: checkCacheImplementation },
    { name: 'Seguridad', fn: checkSecurityBasics },
    { name: 'Datos', fn: checkDataCompleteness }
  ]
  
  const results = []
  
  for (const check of checks) {
    console.log(`\n${'='.repeat(50)}`)
    const result = await check.fn()
    results.push({ name: check.name, passed: result })
  }
  
  console.log(`\n${'='.repeat(50)}`)
  console.log(`\n${colors.blue}📋 RESUMEN:${colors.reset}\n`)
  
  let allPassed = true
  results.forEach(({ name, passed }) => {
    const icon = passed ? '✅' : '❌'
    const color = passed ? colors.green : colors.red
    console.log(`${color}${icon} ${name}${colors.reset}`)
    if (!passed) allPassed = false
  })
  
  console.log('')
  if (allPassed) {
    console.log(`${colors.green}🎉 ¡Listo para deploy!${colors.reset}`)
  } else {
    console.log(`${colors.yellow}⚠️  Hay cosas para mejorar antes del deploy${colors.reset}`)
    console.log(`${colors.yellow}   Revisa los warnings arriba para más detalles${colors.reset}`)
  }
  
  await prisma.$disconnect()
  process.exit(allPassed ? 0 : 1)
}

main().catch(error => {
  console.error(`${colors.red}Error: ${error.message}${colors.reset}`)
  process.exit(1)
})