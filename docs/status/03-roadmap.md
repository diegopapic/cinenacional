# Roadmap - Próximas Mejoras

## 🔮 Próximas Mejoras

### 1. Secciones Adicionales de la Home
Impacto: Completar las secciones planificadas

Obituarios: personas fallecidas recientemente
Efemérides: eventos importantes en la historia del cine argentino
Últimas personas ingresadas al sitio
Hero section con imagen rotativa

### 2. **Integración de Roles en MovieModal**
**Impacto**: Mejorar la selección de roles en CrewTab
```typescript
// Selector de roles con autocompletar
<RoleSelector
  department={department}
  value={roleId}
  onChange={handleRoleChange}
/>
```

### 3. **Migración de Roles Históricos**
**Impacto**: Normalizar datos existentes
```sql
-- Script de migración
INSERT INTO roles (name, slug, department)
SELECT DISTINCT role, LOWER(REPLACE(role, ' ', '-')), department
FROM movie_crew
WHERE roleId IS NULL;

-- Actualizar referencias
UPDATE movie_crew mc
SET roleId = r.id
FROM roles r
WHERE mc.role = r.name;
```

### 3. **Lazy Loading para Tabs** 
**Impacto**: Mejorar performance inicial
```typescript
const BasicInfoTab = lazy(() => import('./tabs/BasicInfoTab'))

// En el render
<Suspense fallback={<TabSkeleton />}>
  {activeTab === 'basic' && <BasicInfoTab />}
</Suspense>
```

### 4. **Componente Reutilizable para Fechas Parciales**
**Impacto**: Eliminar duplicación en formularios
```typescript
<PartialDateField
  label="Fecha de estreno"
  isPartial={isPartialDate}
  onPartialChange={setIsPartialDate}
  partialDate={partialReleaseDate}
  onPartialDateChange={setPartialReleaseDate}
  register={register}
  fieldName="releaseDate"
  errors={errors}
/>
```

### 5. **React Query Integration**
**Impacto**: Mejor caché y sincronización de datos
```typescript
const { data: movies, isLoading } = useMovies(filters)
const createMovie = useCreateMovie()
```

### 6. **División de useMovieForm**
**Impacto**: Hooks más específicos y mantenibles
```typescript
useMovieForm()          // Orquestador
├── useMovieMetadata() // Ratings, colors
├── useMovieDates()    // Fechas parciales
├── useMovieRelations() // Cast, crew, etc
└── useMovieValidation() // Zod + RHF
```

### 7. **Dashboard de Roles**
**Impacto**: Visualización de estadísticas
- Roles más utilizados
- Distribución por departamento
- Tendencias temporales
- Personas por rol

### 8. **Optimización de Transacciones**
**Impacto**: Reducir timeouts en updates complejos
```typescript
// En lugar de una transacción gigante
await prisma.$transaction([
  prisma.movieGenre.deleteMany({ where: { movieId } }),
  prisma.movieGenre.createMany({ data: genres }),
  // ... otras operaciones
])
```

### 9. **Sistema de Búsqueda Avanzada**
**Impacto**: Mejor UX en listados
- Filtros múltiples combinables
- Búsqueda full-text
- Ordenamiento por múltiples campos
- Guardado de filtros favoritos

### 10. **Autocompletar Inteligente**
**Impacto**: Mejorar UX en formularios
- Sugerencias basadas en historial
- Agrupación por departamento
- Búsqueda fuzzy

---

🏆 Logros de la Actualización
Estadísticas Finales - ACTUALIZADAS 🆕

Secciones dinámicas agregadas: 2 (Últimos y Próximos Estrenos)
Nueva tabla agregada: roles con 8 campos
Total de tablas: 32 (17 entidades + 15 relaciones)
API Routes nuevas: 5 endpoints para roles
Componentes actualizados: HomePage con secciones dinámicas
Componentes creados: 2 (RoleForm, RolesList)
Hook nuevo: useRoles con gestión completa
Servicio nuevo: rolesService con 8 métodos
Tipos TypeScript: 4 interfaces nuevas para roles
Validación Zod: roleFormSchema implementado
Archivos modificados totales: 20+ archivos
Props eliminadas en MovieModal: ~100+ props → 4 props finales
Interfaces eliminadas: 9 interfaces completas
Líneas de código optimizadas: ~600+ líneas
Context API implementado: 1 context centralizado
Hooks refactorizados: useMovieForm optimizado para Context
Películas migradas: 10,589 desde WordPress

### Impacto en Desarrollo
- **Velocidad de desarrollo**: Significativamente acelerada
- **Debugging**: Mucho más simple con estado centralizado
- **Testing**: Componentes independientes y testeables
- **Onboarding**: Nuevos desarrolladores pueden entender la arquitectura más fácilmente
- **Escalabilidad**: Arquitectura preparada para crecimiento
- **Flexibilidad**: Roles ahora son dinámicos y gestionables
- **Mantenibilidad**: Código organizado por dominio
- **Consistencia**: Sigue los patrones establecidos del proyecto

### Arquitectura Moderna Conseguida
```
ANTES (Props Drilling):
Page → MovieModal (46 props) → Tabs (20+ props cada uno)

DESPUÉS (Context API + Roles):
Page → MovieModalProvider → MovieModal (2 props) → Tabs (0 props)
                ↕
        useMovieModalContext()
                ↕
           Roles Service (CRUD completo)
```

---

## 📚 Referencias y Recursos

- [Next.js 14 Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [React Hook Form](https://react-hook-form.com/)
- [React Context API](https://react.dev/reference/react/useContext)
- [Radix UI](https://www.radix-ui.com/)
- [Supabase](https://supabase.com/docs)
- [Cloudinary](https://cloudinary.com/documentation)
- [Zod](https://zod.dev/)
- [TypeScript](https://www.typescriptlang.org/docs/)

---

## 🗂 Apéndices

### A. Comandos Git para la Actualización

```bash
# Actualización CRUD de Roles
git add .
git commit -m "feat: implementar CRUD completo de roles cinematográficos

- Crear tabla roles en esquema Prisma con campos completos
- Implementar API Routes (GET, POST, PUT, DELETE)
- Crear servicio rolesService con operaciones CRUD
- Desarrollar hook useRoles para gestión de estado
- Agregar componentes RoleForm y RolesList
- Implementar validación con Zod
- Agregar búsqueda, filtros y paginación
- Actualizar MovieCrew para referenciar roleId
- Corregir errores de campos faltantes en Prisma
- Documentar cambios en PROJECT_DOCS.md"

git push origin main
```

### B. Estructura de Commits

Seguir convención [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` Nueva funcionalidad ✅
- `fix:` Corrección de bug
- `refactor:` Refactorización de código ✅
- `docs:` Cambios en documentación
- `style:` Cambios de formato
- `test:` Añadir tests
- `chore:` Tareas de mantenimiento
- `perf:` Mejoras de performance
- `ci:` Cambios en CI/CD

### C. Variables de Entorno

```env
# .env.local
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
NEXT_PUBLIC_SUPABASE_URL="https://....supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
CLOUDINARY_CLOUD_NAME="..."
CLOUDINARY_API_KEY="..."
CLOUDINARY_API_SECRET="..."
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="..."
```

### D. Scripts de Migración de Roles 🆕

```sql
-- 1. Crear roles únicos desde datos existentes
INSERT INTO roles (name, slug, department, created_at, updated_at)
SELECT DISTINCT 
  role as name,
  LOWER(REPLACE(REPLACE(role, ' ', '-'), 'á', 'a')) as slug,
  CASE 
    WHEN role LIKE '%Director%' THEN 'Dirección'
    WHEN role LIKE '%Productor%' THEN 'Producción'
    WHEN role LIKE '%Fotografía%' THEN 'Fotografía'
    WHEN role LIKE '%Editor%' OR role LIKE '%Montaje%' THEN 'Edición'
    WHEN role LIKE '%Sonido%' THEN 'Sonido'
    WHEN role LIKE '%Música%' OR role LIKE '%Compositor%' THEN 'Música'
    ELSE 'Otros'
  END as department,
  NOW() as created_at,
  NOW() as updated_at
FROM movie_crew
WHERE role IS NOT NULL
ON CONFLICT (name) DO NOTHING;

-- 2. Actualizar movie_crew con roleId
UPDATE movie_crew mc
SET role_id = r.id
FROM roles r
WHERE mc.role = r.name;

-- 3. Verificar migración
SELECT 
  COUNT(*) as total_crew,
  COUNT(role_id) as with_role_id,
  COUNT(*) - COUNT(role_id) as without_role_id
FROM movie_crew;
```

### E. Debugging Tips para Context API

```typescript
// Para debugging del Context
const context = useMovieModalContext()
console.log('🔍 Context state:', {
  activeTab: context.activeTab,
  isSubmitting: context.isSubmitting,
  editingMovie: context.editingMovie?.title
})

// Para debugging de React Hook Form desde Context
const { watch, formState } = useMovieModalContext()
const watchedValues = watch()
console.log('📋 Form values:', watchedValues)
console.log('❌ Form errors:', formState.errors)

// Para debugging de fechas parciales
console.log('📅 Fechas parciales:', {
  release: {
    isPartial: context.isPartialDate,
    data: context.partialReleaseDate
  },
  filmingStart: {
    isPartial: context.isPartialFilmingStartDate,
    data: context.partialFilmingStartDate
  },
  filmingEnd: {
    isPartial: context.isPartialFilmingEndDate,
    data: context.partialFilmingEndDate
  }
})
```

### F. Scripts de Migración WordPress

Los scripts de migración se encuentran en `/scripts`:

```bash
# Análisis de datos WordPress
node scripts/analyze-wp-completeness.js
node scripts/analyze-wp-structure.js

# Migración a Supabase
node scripts/migrate-wp-titles-supabase.js
node scripts/migrate-wp-people-supabase.js
node scripts/migrate-wp-relations-supabase.js
node scripts/migrate-wp-roles-supabase.js # 🆕

# Corrección post-migración ✅
# Ejecutar en Supabase SQL Editor:
SELECT setval('movies_id_seq', (SELECT MAX(id) + 1 FROM movies));
SELECT setval('people_id_seq', (SELECT MAX(id) + 1 FROM people));
SELECT setval('genres_id_seq', (SELECT MAX(id) + 1 FROM genres));
SELECT setval('roles_id_seq', (SELECT MAX(id) + 1 FROM roles));
SELECT setval('locations_id_seq', (SELECT MAX(id) + 1 FROM locations));
SELECT setval('themes_id_seq', (SELECT MAX(id) + 1 FROM themes));
SELECT setval('countries_id_seq', (SELECT MAX(id) + 1 FROM countries));
```

### G. Troubleshooting Común

**Error: "Property does not exist on type MovieModalContextValue"**
- Verificar que la propiedad esté declarada en la interface
- Revisar que el Context incluya todas las propiedades de useMovieForm

**Error: "Expected string, received null"**
- Verificar que los campos en `loadMovieData` estén siendo limpiados
- Revisar que el schema no tenga transform en campos problemáticos

**Error: Compilación en Vercel falla**
- Revisar tipos de parámetros en funciones (ej: `setValueAs: (v: any) =>`)
- Verificar que no haya imports circulares
- Chequear versiones de dependencias

**Error: "Unique constraint failed on fields: (id)"**
- Ejecutar corrección de auto-increment en Supabase
- Verificar que no se esté enviando ID en creación

**Error: Context undefined**
- Verificar que el componente esté dentro del Provider
- Revisar que el import del hook sea correcto

**Error: Fechas parciales no se guardan**
- Verificar que se estén enviando como campos INT separados
- Revisar que la API esté procesando year/month/day

**Error: Ubicaciones no se cargan**
- Verificar includes en la API
- Revisar que formatLocationPath esté funcionando

**Error: Roles no aparecen en el selector** 🆕
- Verificar que la tabla roles tenga datos
- Revisar que el endpoint /api/roles esté funcionando
- Comprobar que roleId se esté guardando en movie_crew

### H. Estructura de la Tabla Roles

```prisma
model Role {
  id          Int      @id @default(autoincrement())
  name        String   @unique
  slug        String   @unique
  description String?
  department  String?
  isActive    Boolean  @default(true)
  displayOrder Int     @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relaciones
  crewRoles   MovieCrew[]
  
  // Índices para optimización
  @@index([slug])
  @@index([department])
  @@index([isActive])
  @@index([displayOrder])
  @@map("roles")
}
```

---

*Última actualización: Diciembre 2024*  
*Versión: 2.1.0 - CRUD DE ROLES IMPLEMENTADO*  
*Mantenedor: Diego Papic*  
*Líneas de documentación: 3,700+*  
*Estado: Documentación completa con módulo de roles y todas las refactorizaciones*