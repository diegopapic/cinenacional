# Refactorización: Unificar Arquitectura de Página de Personas

**Fecha de creación**: Diciembre 2024  
**Prioridad**: Media  
**Estimación**: 2-3 horas  
**Estado**: Pendiente

---

## 📋 Resumen

Actualmente existe una inconsistencia arquitectónica entre las páginas de detalle de películas y personas. Este documento detalla el plan para unificar la página de personas (`/persona/[slug]`) al mismo patrón que películas (`/pelicula/[slug]`).

---

## 🔍 Situación Actual

### Página de Películas (✅ Patrón correcto)
- **Ubicación**: `src/app/pelicula/[slug]/`
- **Archivos**:
  - `page.tsx` - Server Component (async) con Prisma directo
  - `MoviePageClient.tsx` - Client Component para interactividad
  - `loading.tsx` - Skeleton loader con Suspense

```
src/app/pelicula/[slug]/
├── page.tsx            # Server Component - datos con Prisma
├── MoviePageClient.tsx # Client Component - UI interactiva
└── loading.tsx         # Skeleton loader
```

### Página de Personas (❌ Patrón a corregir)
- **Ubicación**: `src/app/persona/[slug]/`
- **Archivos**:
  - `page.tsx` - Client Component con fetch a APIs

```
src/app/persona/[slug]/
└── page.tsx            # Client Component - todo junto
```

---

## 🎯 Objetivos de la Refactorización

1. **SEO mejorado**: Metadata generada en servidor con datos reales
2. **Performance**: HTML pre-renderizado, menos JavaScript
3. **Consistencia**: Mismo patrón en todas las páginas de detalle
4. **Mantenibilidad**: Código más predecible y estandarizado

---

## 📊 Comparativa de Enfoques

| Aspecto | Actual (Client) | Objetivo (Server) |
|---------|-----------------|-------------------|
| Tipo de componente | 'use client' | Server Component |
| Obtención de datos | fetch() en useEffect | Prisma directo |
| Loading state | useState interno | loading.tsx (Suspense) |
| SEO/Metadata | ⚠️ Limitado | ✅ generateMetadata() |
| First Paint | Lento (waterfall) | Rápido (SSR) |
| Bundle size | Mayor | Menor |
| Hidratación | Completa | Parcial |

---

## 📁 Estructura Final Esperada

```
src/app/persona/[slug]/
├── page.tsx              # Server Component - datos con Prisma
├── PersonPageClient.tsx  # Client Component - UI interactiva (tabs, estados)
└── loading.tsx           # Skeleton loader
```

---

## 🔧 Plan de Implementación

### Paso 1: Crear `loading.tsx`

```tsx
// src/app/persona/[slug]/loading.tsx
export default function Loading() {
  return (
    <div className="bg-gray-900 text-white min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto"></div>
        <p className="mt-4 text-gray-400">Cargando...</p>
      </div>
    </div>
  );
}
```

### Paso 2: Crear `PersonPageClient.tsx`

Extraer toda la lógica de UI interactiva:
- Tabs de filmografía
- Estado de "ver más/menos"
- Efectos visuales

**Props que debe recibir**:
```tsx
interface PersonPageClientProps {
  person: {
    id: number;
    slug: string;
    firstName: string;
    lastName: string;
    realName?: string;
    photoUrl?: string;
    biography?: string;
    birthYear?: number;
    birthMonth?: number;
    birthDay?: number;
    deathYear?: number;
    deathMonth?: number;
    deathDay?: number;
    birthLocation?: any;
    deathLocation?: any;
    nationalities?: any[];
    links?: any[];
  };
  filmography: {
    castRoles: CastRole[];
    crewRoles: CrewRole[];
  };
  stats: {
    totalMovies: number;
    asActor: number;
    asCrew: number;
  };
}
```

### Paso 3: Refactorizar `page.tsx`

Convertir a Server Component:

```tsx
// src/app/persona/[slug]/page.tsx
import { notFound } from 'next/navigation';
import { PersonPageClient } from './PersonPageClient';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';

interface PageProps {
  params: {
    slug: string;
  };
}

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

// Función para obtener persona directamente de Prisma
async function getPersonData(slug: string) {
  try {
    const person = await prisma.person.findFirst({
      where: { slug },
      select: {
        id: true,
        slug: true,
        firstName: true,
        lastName: true,
        realName: true,
        photoUrl: true,
        biography: true,
        birthYear: true,
        birthMonth: true,
        birthDay: true,
        deathYear: true,
        deathMonth: true,
        deathDay: true,
        birthLocation: {
          select: {
            id: true,
            name: true,
            parent: {
              select: {
                id: true,
                name: true,
                parent: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          }
        },
        deathLocation: {
          select: {
            id: true,
            name: true,
            parent: {
              select: {
                id: true,
                name: true,
                parent: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          }
        },
        nationalities: {
          select: {
            location: {
              select: {
                id: true,
                name: true,
                gentilicio: true
              }
            }
          }
        },
        links: {
          where: { isActive: true },
          select: {
            id: true,
            type: true,
            url: true,
            title: true
          }
        }
      }
    });
    
    return person;
  } catch (error) {
    console.error('Error fetching person:', error);
    return null;
  }
}

// Función para obtener filmografía
async function getFilmography(personId: number) {
  try {
    const [castRoles, crewRoles] = await Promise.all([
      prisma.movieCast.findMany({
        where: { personId },
        select: {
          characterName: true,
          billingOrder: true,
          isPrincipal: true,
          movie: {
            select: {
              id: true,
              slug: true,
              title: true,
              year: true,
              releaseYear: true,
              releaseMonth: true,
              releaseDay: true,
              tipoDuracion: true,
              stage: true
            }
          }
        }
      }),
      prisma.movieCrew.findMany({
        where: { personId },
        select: {
          roleId: true,
          department: true,
          billingOrder: true,
          role: {
            select: {
              id: true,
              name: true,
              slug: true,
              department: true
            }
          },
          movie: {
            select: {
              id: true,
              slug: true,
              title: true,
              year: true,
              releaseYear: true,
              releaseMonth: true,
              releaseDay: true,
              tipoDuracion: true,
              stage: true
            }
          }
        }
      })
    ]);
    
    return { castRoles, crewRoles };
  } catch (error) {
    console.error('Error fetching filmography:', error);
    return { castRoles: [], crewRoles: [] };
  }
}

// Metadata dinámica
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const person = await getPersonData(params.slug);

  if (!person) {
    return {
      title: 'Persona no encontrada - cinenacional.com',
      description: 'La persona que buscás no existe en nuestra base de datos.'
    };
  }

  const fullName = [person.firstName, person.lastName].filter(Boolean).join(' ');
  const description = person.biography?.substring(0, 160) || 
    `${fullName} - Filmografía completa en el cine argentino.`;

  return {
    title: `${fullName} - cinenacional.com`,
    description,
    openGraph: {
      title: fullName,
      description,
      images: person.photoUrl ? [person.photoUrl] : [],
      type: 'profile',
    },
  };
}

export default async function PersonPage({ params }: PageProps) {
  const person = await getPersonData(params.slug);

  if (!person) {
    notFound();
  }

  const filmography = await getFilmography(person.id);
  
  // Calcular stats
  const uniqueMoviesAsActor = new Set(filmography.castRoles.map(r => r.movie.id));
  const uniqueMoviesAsCrew = new Set(filmography.crewRoles.map(r => r.movie.id));
  const allUniqueMovies = new Set([...uniqueMoviesAsActor, ...uniqueMoviesAsCrew]);

  const stats = {
    totalMovies: allUniqueMovies.size,
    asActor: uniqueMoviesAsActor.size,
    asCrew: uniqueMoviesAsCrew.size
  };

  return (
    <PersonPageClient
      person={person}
      filmography={filmography}
      stats={stats}
    />
  );
}
```

### Paso 4: Mover lógica a PersonPageClient

El componente `PersonPageClient.tsx` contendrá:
- Formateo de fechas y ubicaciones (funciones helper)
- Estado de tabs (`activeTab`, `showAllFilmography`)
- Lógica de ordenamiento de filmografía
- Lógica de badges para películas
- Todo el JSX de la UI

---

## ✅ Checklist de Implementación

- [ ] Crear `src/app/persona/[slug]/loading.tsx`
- [ ] Crear `src/app/persona/[slug]/PersonPageClient.tsx`
  - [ ] Definir interfaces de props
  - [ ] Mover lógica de UI (tabs, estados)
  - [ ] Mover funciones helper (formateo, badges)
  - [ ] Mover JSX completo
- [ ] Refactorizar `src/app/persona/[slug]/page.tsx`
  - [ ] Convertir a Server Component (quitar 'use client')
  - [ ] Implementar `getPersonData()` con Prisma
  - [ ] Implementar `getFilmography()` con Prisma
  - [ ] Implementar `generateMetadata()`
  - [ ] Procesar datos y pasar a PersonPageClient
- [ ] Eliminar endpoints de API obsoletos (opcional)
  - [ ] `/api/people/slug/[slug]`
  - [ ] `/api/people/[id]/filmography`
- [ ] Testing
  - [ ] Verificar que la página carga correctamente
  - [ ] Verificar SEO (View Source debe mostrar HTML completo)
  - [ ] Verificar tabs de filmografía funcionan
  - [ ] Verificar links externos
  - [ ] Verificar loading state
- [ ] Actualizar documentación PROJECT_DOCS.md

---

## ⚠️ Consideraciones

1. **APIs existentes**: Las APIs `/api/people/slug/[slug]` y `/api/people/[id]/filmography` pueden seguir existiendo para otros usos, pero ya no serán necesarias para esta página.

2. **Hidratación**: El componente cliente necesita hidratarse con los mismos datos que el servidor renderizó. Asegurar que los props sean serializables (no funciones ni objetos complejos).

3. **DOMPurify**: El sanitizado de HTML de la biografía debe seguir haciéndose en el cliente, ya que `isomorphic-dompurify` funciona en ambos entornos.

4. **Performance**: Con este cambio, el TTFB (Time To First Byte) será mayor porque el servidor hace el trabajo, pero el TTI (Time To Interactive) será menor porque hay menos JavaScript.

---

## 📈 Beneficios Esperados

- **SEO**: Google indexará correctamente nombre, biografía y filmografía
- **Performance**: ~30-50% menos JavaScript enviado al cliente
- **UX**: Contenido visible más rápido (sin spinner inicial)
- **Consistencia**: Mismo patrón que `/pelicula/[slug]`
- **Mantenibilidad**: Código más predecible

---

## 🔗 Archivos Relacionados

- `src/app/pelicula/[slug]/page.tsx` - Ejemplo a seguir
- `src/app/pelicula/[slug]/MoviePageClient.tsx` - Ejemplo de Client Component
- `src/lib/shared/dateUtils.ts` - Funciones de formateo de fechas
- `src/lib/prisma.ts` - Cliente Prisma singleton

---

*Documento generado para futura implementación*