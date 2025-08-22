# Problemas Resueltos y Soluciones

### 1. ✅ **Props Drilling Extremo en MovieModal - SOLUCIONADO**

**Problema**: MovieModal recibía 46+ props que se pasaban a 5 tabs
**Impacto**: Mantenimiento imposible, testing complejo, performance degradada

**Solución Implementada**: Context API Completo
```typescript
// ANTES - Props Drilling
<MovieModal 
  isOpen={isOpen}
  onClose={onClose}
  editingMovie={editingMovie}
  // ... 43 props más
/>

// DESPUÉS - Context API
<MovieModalProvider editingMovie={movie} onSuccess={handleSuccess}>
  <MovieModal isOpen={isOpen} onClose={onClose} />
</MovieModalProvider>
```

**Resultados**:
- ✅ **Props reducidas**: 46+ → 2 props (96% reducción)
- ✅ **Componentes desacoplados**: Cada tab accede directamente al Context
- ✅ **Mantenibilidad**: Cambios centralizados en una ubicación
- ✅ **Performance**: Eliminado re-renders por props drilling

### 2. ✅ **Auto-increment de Base de Datos - SOLUCIONADO**

**Problema**: Error "Unique constraint failed on the fields: (id)" al crear películas
**Causa**: Migración de WordPress mantuvo IDs originales pero no actualizó secuencia

**Solución Implementada**:
```sql
-- Aplicado en Supabase
SELECT setval('movies_id_seq', (SELECT MAX(id) + 1 FROM movies));
SELECT setval('people_id_seq', (SELECT MAX(id) + 1 FROM people));
SELECT setval('genres_id_seq', (SELECT MAX(id) + 1 FROM genres));
SELECT setval('roles_id_seq', (SELECT MAX(id) + 1 FROM roles));
SELECT setval('locations_id_seq', (SELECT MAX(id) + 1 FROM locations));
```

**Resultado**: ✅ Creación de películas, personas y roles funciona perfectamente

### 3. ✅ **CRUD de Roles sin tabla específica - SOLUCIONADO** 🆕

**Problema**: Los roles del crew estaban hardcodeados sin tabla en la base de datos
**Impacto**: No se podían gestionar dinámicamente los roles disponibles

**Solución Implementada**:
1. Creación de tabla `roles` en el esquema Prisma
2. Migración de datos existentes a la nueva tabla
3. Actualización de MovieCrew para referenciar roleId
4. Implementación de CRUD completo con API y UI

**Resultados**:
- ✅ Gestión dinámica de roles
- ✅ Validación de unicidad
- ✅ Búsqueda y filtros por departamento
- ✅ Contador de uso en películas
- ✅ Ordenamiento personalizable

### 4. ✅ **Toasts Duplicados - SOLUCIONADO**

**Problema**: Aparecían 2 toasts al crear/actualizar películas
**Causa**: useMovieForm y page.tsx ambos mostraban toasts

**Solución Implementada**: Eliminar toasts del hook, mantener solo en callbacks
```typescript
// ELIMINADO de useMovieForm:
// toast.success('Película actualizada exitosamente')

// MANTENIDO en page.tsx:
toast.success(`Película "${movie.title}" actualizada exitosamente`)
```

**Resultado**: ✅ Solo aparece un toast descriptivo con el nombre de la película

### 5. ✅ **Validación de Campos Numéricos - SOLUCIONADO**

**Problema**: Error "Expected number, received nan" en duration y durationSeconds
**Causa**: Zod no manejaba campos vacíos correctamente

**Solución Implementada**: z.preprocess para campos numéricos
```typescript
duration: z.preprocess(
  (val) => {
    if (val === '' || val === null || val === undefined || isNaN(Number(val))) {
      return null;
    }
    return Number(val);
  },
  z.number().positive().nullable().optional()
)
```

**Resultado**: ✅ Campos numéricos manejan valores vacíos, null y 0 correctamente

### 6. ✅ **Error de Prisma al crear roles - SOLUCIONADO** 🆕

**Problema**: "Unknown argument `description`" al intentar crear roles
**Causa**: Campo faltante en el esquema de Prisma

**Solución**:
```prisma
model Role {
  id          Int      @id @default(autoincrement())
  name        String   @unique
  slug        String   @unique
  description String?  // 🆕 Campo agregado
  department  String?  // 🆕 Campo agregado
  isActive    Boolean  @default(true)
  displayOrder Int     @default(0)
  // ... resto del modelo
}
```

**Resultado**: ✅ CRUD de roles funcionando completamente

### 7. ✅ **Tipos de React Hook Form Simplificados**

**Problema**: Incompatibilidad de tipos entre React Hook Form y Zod
**Solución Implementada**: Tipos pragmáticos como `any` para métodos del form
```typescript
// Solución temporal mientras se resuelven incompatibilidades de versiones
register: any
handleSubmit: any
watch: any
// ... otros métodos
```

**Resultado**: ✅ Compilación exitosa en desarrollo y Vercel

### 8. ✅ **Carga Automática de Datos en Edición**

**Problema**: Al refactorizar se perdió la carga automática de datos al editar
**Solución Implementada**: useEffect en Context detecta cambios en editingMovie
```typescript
useEffect(() => {
  if (editingMovie) {
    movieFormData.loadMovieData(editingMovie)
  } else {
    movieFormData.resetForNewMovie()
  }
}, [editingMovie?.id])
```

**Resultado**: ✅ Datos se cargan automáticamente al hacer clic en "Editar"

### 9. ✅ **Error de validación "Expected string, received null"**

**Problema**: Campos de películas llegaban como null pero Zod esperaba strings

**Solución Implementada**: 
```typescript
// En movieTypes.ts - SIN transform en campos problemáticos
tagline: z.string().optional(),
imdbId: z.string().optional(),

// En useMovieForm.ts - Limpieza antes de setear en formulario
const cleanedMovie = {
  ...fullMovie,
  tagline: fullMovie.tagline || '',
  imdbId: fullMovie.imdbId || '',
  // ... limpiar todos los campos string
}
```

**Resultado**: ✅ Formularios manejan correctamente valores null

### 10. ✅ **Fechas parciales con undefined vs null**

**Problema**: TypeScript esperaba `null` pero llegaba `undefined` en PartialDate

**Solución Implementada**:
```typescript
// Uso de nullish coalescing en peopleUtils.ts
const birthPartial: PartialDate = {
  year: person.birthYear ?? null,    // Convierte undefined a null
  month: person.birthMonth ?? null,
  day: person.birthDay ?? null
}
```

**Resultado**: ✅ Fechas parciales funcionan correctamente

### 11. ✅ **Ubicaciones en personas no se cargaban al editar**

**Problema**: Los campos birthLocation/deathLocation no se recuperaban

**Solución Implementada**:
```typescript
// En API /api/people/[id]/route.ts
const person = await prisma.person.update({
  where: { id },
  data: {
    ...updateData,
    birthLocationId: data.birthLocationId || null,
    deathLocationId: data.deathLocationId || null
  },
  include: {
    birthLocation: true,  // Incluir relación
    deathLocation: true,  // Incluir relación
    // ... otras relaciones
  }
})
```

**Resultado**: ✅ Ubicaciones se cargan y guardan correctamente

---