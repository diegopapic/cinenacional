const fs = require('fs');
const path = require('path');

// Configuración de colores para console.log
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m'
};

// Configuración de secciones a extraer del documento principal
const sections = {
  // Archivos principales
  'overview': {
    file: '01-overview.md',
    start: '## 📄 Descripción General',
    end: '## 🛠 Stack Tecnológico',
    title: '# Descripción General del Proyecto'
  },
  'stack': {
    file: '02-stack.md',
    start: '## 🛠 Stack Tecnológico',
    end: '## 🏗 Arquitectura del Proyecto',
    title: '# Stack Tecnológico'
  },
  'architecture': {
    file: '03-architecture.md',
    start: '## 🏗 Arquitectura del Proyecto',
    end: '## 📁 Estructura de Carpetas',
    title: '# Arquitectura del Proyecto'
  },
  'structure': {
    file: '04-structure.md',
    start: '## 📁 Estructura de Carpetas',
    end: '## 🗄 Base de Datos',
    title: '# Estructura de Carpetas'
  },
  'database': {
    file: '05-database.md',
    start: '## 🗄 Base de Datos',
    end: '## 🎬 Módulos Principales',
    title: '# Base de Datos'
  },
  
  // Módulos
  'modules/movies': {
    file: 'modules/01-movies.md',
    start: '### 1. Módulo de Películas',
    end: '### 2. Módulo de Personas',
    title: '# Módulo de Películas'
  },
  'modules/people': {
    file: 'modules/02-people.md',
    start: '### 2. Módulo de Personas',
    end: '### 3. Módulo de Roles',
    title: '# Módulo de Personas'
  },
  'modules/roles': {
    file: 'modules/03-roles.md',
    start: '### 3. Módulo de Roles',
    end: '### 4. Módulos Auxiliares',
    title: '# Módulo de Roles'
  },
  'modules/auxiliary': {
    file: 'modules/04-auxiliary.md',
    start: '### 4. Módulos Auxiliares',
    end: '## 📅 Sistema de Fechas Parciales',
    title: '# Módulos Auxiliares'
  },
  
  // Features
  'features/partial-dates': {
    file: 'features/01-partial-dates.md',
    start: '## 📅 Sistema de Fechas Parciales',
    end: '## 🪝 Hooks Personalizados',
    title: '# Sistema de Fechas Parciales'
  },
  'features/hooks': {
    file: 'features/02-hooks.md',
    start: '## 🪝 Hooks Personalizados',
    end: '## 🎯 Context API',
    title: '# Hooks Personalizados'
  },
  'features/context-api': {
    file: 'features/03-context-api.md',
    start: '## 🎯 Context API',
    end: '## 📌 Capa de Servicios',
    title: '# Context API y State Management'
  },
  
  // Servicios
  'services/api-client': {
    file: 'services/01-api-client.md',
    start: '## 📌 Capa de Servicios',
    end: '## 📝 Tipos TypeScript',
    title: '# Capa de Servicios'
  },
  'services/types': {
    file: 'services/02-types.md',
    start: '## 📝 Tipos TypeScript',
    end: '## 🌐 API Routes',
    title: '# Tipos TypeScript'
  },
  
  // API
  'api/movies': {
    file: 'api/01-movies.md',
    start: '### Movies API',
    end: '### People API',
    title: '# Movies API'
  },
  'api/people': {
    file: 'api/02-people.md',
    start: '### People API',
    end: '### Roles API',
    title: '# People API'
  },
  'api/roles': {
    file: 'api/03-roles.md',
    start: '### Roles API',
    end: '### Locations API',
    title: '# Roles API'
  },
  'api/locations': {
    file: 'api/04-locations.md',
    start: '### Locations API',
    end: '## 🧰 Funciones de Utilidad',
    title: '# Locations API'
  },
  
  // Utilidades
  'utils/movie-utils': {
    file: 'utils/01-movie-utils.md',
    start: '### Movie Utils',
    end: '### People Utils',
    title: '# Movie Utils'
  },
  'utils/people-utils': {
    file: 'utils/02-people-utils.md',
    start: '### People Utils',
    end: '## 🎯 Componentes Complejos',
    title: '# People Utils'
  },
  
  // Componentes
  'components/homepage': {
    file: 'components/01-homepage.md',
    start: '## 🎯 Componentes Complejos',
    end: '### MovieModal',
    title: '# Componentes de HomePage'
  },
  'components/movie-modal': {
    file: 'components/02-movie-modal.md',
    start: '### MovieModal',
    end: '## 📄 Flujos de Trabajo',
    title: '# MovieModal Component'
  },
  
  // Flujos de trabajo
  'workflows/patterns': {
    file: 'workflows/01-patterns.md',
    start: '## 📄 Flujos de Trabajo',
    end: '## 📜 Scripts y Comandos',
    title: '# Flujos de Trabajo y Patrones'
  },
  
  // Development
  'development/scripts': {
    file: 'development/01-scripts.md',
    start: '## 📜 Scripts y Comandos',
    end: '## 🔧 Problemas Resueltos',
    title: '# Scripts y Comandos'
  },
  'development/troubleshooting': {
    file: 'development/02-troubleshooting.md',
    start: '## 🔧 Problemas Resueltos',
    end: '## 🚀 Estado de Migración',
    title: '# Problemas Resueltos y Soluciones'
  },
  
  // Estado y mejoras
  'status/migration': {
    file: 'status/01-migration.md',
    start: '## 🚀 Estado de Migración',
    end: '## 💻 Mejoras Implementadas',
    title: '# Estado de Migración'
  },
  'status/improvements': {
    file: 'status/02-improvements.md',
    start: '## 💻 Mejoras Implementadas',
    end: '## 🔮 Próximas Mejoras',
    title: '# Mejoras Implementadas'
  },
  'status/roadmap': {
    file: 'status/03-roadmap.md',
    start: '## 🔮 Próximas Mejoras',
    end: '## 🏆 Logros',
    title: '# Roadmap - Próximas Mejoras'
  },
  
  // Apéndices
  'appendix/stats': {
    file: 'appendix/01-stats.md',
    start: '## 🏆 Logros',
    end: '## 📚 Referencias',
    title: '# Estadísticas y Logros'
  },
  'appendix/references': {
    file: 'appendix/02-references.md',
    start: '## 📚 Referencias',
    end: '## 🗂 Apéndices',
    title: '# Referencias y Recursos'
  },
  'appendix/commands': {
    file: 'appendix/03-commands.md',
    start: '### A. Comandos Git',
    end: '### B. Estructura de Commits',
    title: '# Comandos Git'
  },
  'appendix/migration-scripts': {
    file: 'appendix/04-migration-scripts.md',
    start: '### D. Scripts de Migración',
    end: '### E. Debugging Tips',
    title: '# Scripts de Migración'
  }
};

// Función principal
async function updateDocumentation() {
  console.log(`${colors.bright}${colors.blue}📚 Iniciando actualización de documentación...${colors.reset}\n`);

  try {
    // 1. Verificar que existe el archivo fuente
    const sourceFile = 'PROJECT_DOCS v2.2.0.md';
    if (!fs.existsSync(sourceFile)) {
      // Si no existe PROJECT_DOCS.md, buscar en la carpeta docs
      const altSourceFile = 'docs/PROJECT_DOCS.md';
      if (fs.existsSync(altSourceFile)) {
        sourceFile = altSourceFile;
      } else {
        throw new Error(`No se encuentra ${sourceFile}`);
      }
    }

    // 2. Crear estructura de carpetas
    createFolderStructure();

    // 3. Leer el documento completo
    const fullDoc = fs.readFileSync(sourceFile, 'utf8');
    console.log(`${colors.green}✓${colors.reset} Archivo fuente leído: ${fullDoc.length} caracteres\n`);

    // 4. Extraer y guardar cada sección
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const [key, config] of Object.entries(sections)) {
      try {
        const content = extractSection(fullDoc, config.start, config.end);
        
        if (content && content.length > 100) {
          const outputPath = path.join('docs', config.file);
          const finalContent = `${config.title}\n\n${content}`;
          
          // Asegurar que el directorio existe
          const dir = path.dirname(outputPath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          
          fs.writeFileSync(outputPath, finalContent);
          console.log(`${colors.green}✓${colors.reset} Creado: ${outputPath} (${content.length} caracteres)`);
          successCount++;
        } else {
          console.log(`${colors.yellow}⚠${colors.reset} Sección vacía o muy corta: ${key}`);
          errors.push({ key, reason: 'Contenido vacío o muy corto' });
          errorCount++;
        }
      } catch (error) {
        console.error(`${colors.red}✗${colors.reset} Error procesando ${key}: ${error.message}`);
        errors.push({ key, reason: error.message });
        errorCount++;
      }
    }

    // 5. Crear índice principal
    createMainIndex();

    // 6. Crear CHANGELOG
    createChangelog();

    // 7. Crear archivo de configuración para herramientas de docs
    createDocsConfig();

    // 8. Resumen final
    console.log(`\n${colors.bright}${colors.blue}═══════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bright}📊 Resumen de la operación:${colors.reset}`);
    console.log(`${colors.green}   ✓ Archivos creados: ${successCount}${colors.reset}`);
    if (errorCount > 0) {
      console.log(`${colors.red}   ✗ Errores: ${errorCount}${colors.reset}`);
      console.log(`${colors.yellow}   Secciones con problemas:${colors.reset}`);
      errors.forEach(e => {
        console.log(`     - ${e.key}: ${e.reason}`);
      });
    }
    console.log(`${colors.bright}${colors.blue}═══════════════════════════════════════${colors.reset}\n`);

    // 9. Generar reporte
    generateReport(successCount, errorCount, errors);

  } catch (error) {
    console.error(`${colors.red}${colors.bright}❌ Error fatal: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// Función para extraer secciones
function extractSection(text, startMarker, endMarker) {
  const startIndex = text.indexOf(startMarker);
  
  if (startIndex === -1) {
    return '';
  }

  // Si no hay marcador de fin, tomar hasta el final del archivo
  if (!endMarker) {
    return text.substring(startIndex);
  }

  const endIndex = text.indexOf(endMarker, startIndex + startMarker.length);
  
  if (endIndex === -1) {
    // Si no se encuentra el marcador de fin, tomar hasta el final
    return text.substring(startIndex);
  }
  
  return text.substring(startIndex + startMarker.length, endIndex).trim();
}

// Crear estructura de carpetas
function createFolderStructure() {
  const folders = [
    'docs',
    'docs/modules',
    'docs/features',
    'docs/services',
    'docs/api',
    'docs/utils',
    'docs/components',
    'docs/workflows',
    'docs/development',
    'docs/status',
    'docs/appendix',
    'docs/templates'
  ];

  folders.forEach(folder => {
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
      console.log(`${colors.blue}📁${colors.reset} Carpeta creada: ${folder}`);
    }
  });
}

// Crear índice principal
function createMainIndex() {
  const indexContent = `# 📚 Documentación CineNacional

> **Versión**: 2.2.0  
> **Última actualización**: ${new Date().toLocaleDateString('es-AR')}  
> **Estado**: Producción

## 🚀 Inicio Rápido

- [Setup Inicial](./development/01-scripts.md#desarrollo)
- [Arquitectura](./03-architecture.md)
- [Base de Datos](./05-database.md)

## 📖 Documentación Principal

### Información General
- [📄 Descripción General](./01-overview.md)
- [🛠 Stack Tecnológico](./02-stack.md)
- [🏗 Arquitectura](./03-architecture.md)
- [📁 Estructura de Carpetas](./04-structure.md)
- [🗄 Base de Datos](./05-database.md)

### Módulos del Sistema
- [🎬 Películas](./modules/01-movies.md) - CRUD completo con Context API
- [👥 Personas](./modules/02-people.md) - Gestión de personas
- [🎭 Roles](./modules/03-roles.md) - Sistema de roles cinematográficos
- [📦 Auxiliares](./modules/04-auxiliary.md) - Géneros, ubicaciones, etc.

### Características Técnicas
- [📅 Fechas Parciales](./features/01-partial-dates.md) - Sistema único de fechas
- [🪝 Hooks Personalizados](./features/02-hooks.md) - useMovieForm, usePeople, etc.
- [🎯 Context API](./features/03-context-api.md) - State management

### API y Servicios
- [📌 Capa de Servicios](./services/01-api-client.md)
- [📝 Tipos TypeScript](./services/02-types.md)
- [🎬 Movies API](./api/01-movies.md)
- [👥 People API](./api/02-people.md)
- [🎭 Roles API](./api/03-roles.md)
- [📍 Locations API](./api/04-locations.md)

### Componentes
- [🏠 HomePage](./components/01-homepage.md) - Secciones dinámicas
- [🎬 MovieModal](./components/02-movie-modal.md) - Refactorizado con Context

### Desarrollo
- [📜 Scripts y Comandos](./development/01-scripts.md)
- [🔧 Troubleshooting](./development/02-troubleshooting.md)
- [📄 Flujos de Trabajo](./workflows/01-patterns.md)

### Estado del Proyecto
- [🚀 Estado de Migración](./status/01-migration.md)
- [✅ Mejoras Implementadas](./status/02-improvements.md)
- [🔮 Roadmap](./status/03-roadmap.md)

### Apéndices
- [📊 Estadísticas](./appendix/01-stats.md)
- [📚 Referencias](./appendix/02-references.md)
- [💻 Comandos Git](./appendix/03-commands.md)
- [🔄 Scripts de Migración](./appendix/04-migration-scripts.md)

## 📊 Estadísticas del Proyecto

| Métrica | Valor |
|---------|-------|
| Películas migradas | 10,589 |
| Tablas en BD | 32 |
| Componentes | 50+ |
| Hooks personalizados | 12 |
| API Endpoints | 25+ |
| Props eliminadas en refactor | 46 → 2 |

## 🔗 Enlaces Rápidos

- [GitHub](https://github.com/diegopapic/cinenacional)
- [Producción](https://cinenacional.vercel.app/)
- [Supabase Dashboard](https://supabase.com/dashboard/project/hlelclzxtjipwsikvdpt)

## 📝 Últimas Actualizaciones

Ver [CHANGELOG.md](./CHANGELOG.md) para el historial completo de cambios.

---

*Documentación generada automáticamente por update-docs.js*
`;

  fs.writeFileSync('docs/README.md', indexContent);
  console.log(`${colors.green}✓${colors.reset} Índice principal creado: docs/README.md`);
}

// Crear CHANGELOG
function createChangelog() {
  const changelogContent = `# 📝 CHANGELOG

Todos los cambios notables de este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.2.0] - ${new Date().toISOString().split('T')[0]}

### ✨ Agregado
- Secciones dinámicas en HomePage (Últimos y Próximos Estrenos)
- Integración completa con la API para datos en tiempo real
- Manejo inteligente de fechas parciales en secciones

### 🔄 Cambiado
- HomePage ahora lee datos directamente de la base de datos
- Mejorado el sistema de obtención de directores desde movie_crew

## [2.1.0] - 2024-12-01

### ✨ Agregado
- CRUD completo de roles cinematográficos
- Tabla \`roles\` en base de datos con 8 campos
- API Routes para gestión de roles (GET, POST, PUT, DELETE)
- Hook \`useRoles\` para gestión de estado
- Componentes RoleForm y RolesList

### 🔄 Cambiado
- MovieCrew actualizado para referenciar roleId
- Migración de roles históricos desde datos existentes

## [2.0.0] - 2024-11-15

### ♻️ Refactorizado
- Implementación completa de Context API en MovieModal
- Eliminación de props drilling (46+ props → 2 props)
- Todos los tabs de MovieModal ahora sin props

### 🐛 Corregido
- Auto-increment de base de datos después de migración
- Validación de campos numéricos con z.preprocess
- Manejo de valores null en formularios

## [1.0.0] - 2024-10-01

### ✨ Inicial
- Migración de 10,589 películas desde WordPress
- Sistema de fechas parciales
- CRUD de películas y personas
- Integración con Cloudinary
- Sistema de enlaces externos

---

*Para ver cambios detallados, consultar la documentación específica de cada módulo.*
`;

  fs.writeFileSync('docs/CHANGELOG.md', changelogContent);
  console.log(`${colors.green}✓${colors.reset} CHANGELOG creado: docs/CHANGELOG.md`);
}

// Crear configuración para herramientas de documentación
function createDocsConfig() {
  // Configuración para MkDocs
  const mkdocsConfig = `site_name: CineNacional Docs
site_description: Documentación técnica del proyecto CineNacional
site_author: Diego Papic
repo_url: https://github.com/diegopapic/cinenacional
repo_name: diegopapic/cinenacional

theme:
  name: material
  language: es
  features:
    - navigation.tabs
    - navigation.sections
    - navigation.expand
    - search.highlight
    - search.share
  palette:
    - scheme: default
      primary: indigo
      accent: indigo

nav:
  - Inicio: README.md
  - General:
    - Descripción: 01-overview.md
    - Stack: 02-stack.md
    - Arquitectura: 03-architecture.md
    - Estructura: 04-structure.md
    - Base de Datos: 05-database.md
  - Módulos:
    - Películas: modules/01-movies.md
    - Personas: modules/02-people.md
    - Roles: modules/03-roles.md
    - Auxiliares: modules/04-auxiliary.md
  - Features:
    - Fechas Parciales: features/01-partial-dates.md
    - Hooks: features/02-hooks.md
    - Context API: features/03-context-api.md
  - API:
    - Movies: api/01-movies.md
    - People: api/02-people.md
    - Roles: api/03-roles.md
    - Locations: api/04-locations.md
  - Desarrollo:
    - Scripts: development/01-scripts.md
    - Troubleshooting: development/02-troubleshooting.md

markdown_extensions:
  - admonition
  - codehilite
  - meta
  - toc:
      permalink: true
  - pymdownx.superfences
  - pymdownx.tabbed
  - pymdownx.details
`;

  fs.writeFileSync('docs/mkdocs.yml', mkdocsConfig);
  console.log(`${colors.green}✓${colors.reset} Configuración MkDocs creada: docs/mkdocs.yml`);

  // Package.json scripts para documentación
  const packageJsonScripts = `
  // Agregar estos scripts a tu package.json:
  "docs:split": "node scripts/update-docs.js",
  "docs:serve": "mkdocs serve -f docs/mkdocs.yml",
  "docs:build": "mkdocs build -f docs/mkdocs.yml",
  "docs:deploy": "mkdocs gh-deploy -f docs/mkdocs.yml"
`;

  fs.writeFileSync('docs/package-scripts.txt', packageJsonScripts);
}

// Generar reporte de la operación
function generateReport(successCount, errorCount, errors) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalSections: Object.keys(sections).length,
      successful: successCount,
      failed: errorCount
    },
    errors: errors,
    files: Object.entries(sections).map(([key, config]) => ({
      key,
      file: config.file,
      exists: fs.existsSync(path.join('docs', config.file))
    }))
  };

  fs.writeFileSync('docs/update-report.json', JSON.stringify(report, null, 2));
  console.log(`${colors.blue}📊${colors.reset} Reporte generado: docs/update-report.json`);
}

// Ejecutar el script
updateDocumentation().catch(error => {
  console.error(`${colors.red}${colors.bright}Error no manejado: ${error}${colors.reset}`);
  process.exit(1);
});