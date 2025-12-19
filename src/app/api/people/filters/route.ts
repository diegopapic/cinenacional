// src/app/api/people/filters/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Ejecutar todas las consultas en paralelo
    const [
      birthLocations,
      deathLocations,
      nationalities,
      roles,
      yearRanges
    ] = await Promise.all([
      // Ubicaciones de nacimiento (solo las que tienen personas)
      prisma.$queryRaw<Array<{ id: number; name: string; parent_name: string | null; count: number }>>`
        SELECT 
          l.id,
          l.name,
          p.name as parent_name,
          COUNT(DISTINCT pe.id)::int as count
        FROM locations l
        INNER JOIN people pe ON pe.birth_location_id = l.id
        LEFT JOIN locations p ON l.parent_id = p.id
        GROUP BY l.id, l.name, p.name
        ORDER BY l.name ASC
      `,
      
      // Ubicaciones de muerte (solo las que tienen personas)
      prisma.$queryRaw<Array<{ id: number; name: string; parent_name: string | null; count: number }>>`
        SELECT 
          l.id,
          l.name,
          p.name as parent_name,
          COUNT(DISTINCT pe.id)::int as count
        FROM locations l
        INNER JOIN people pe ON pe.death_location_id = l.id
        LEFT JOIN locations p ON l.parent_id = p.id
        GROUP BY l.id, l.name, p.name
        ORDER BY l.name ASC
      `,
      
      // Nacionalidades (países con personas)
      prisma.$queryRaw<Array<{ id: number; name: string; count: number }>>`
        SELECT 
          l.id,
          l.name,
          COUNT(DISTINCT pn.person_id)::int as count
        FROM locations l
        INNER JOIN person_nationalities pn ON pn.location_id = l.id
        GROUP BY l.id, l.name
        ORDER BY l.name ASC
      `,
      
      // Roles técnicos (de la tabla roles)
      prisma.$queryRaw<Array<{ id: number; name: string; department: string; count: number }>>`
        SELECT 
          r.id,
          r.name,
          r.department,
          COUNT(DISTINCT mc.person_id)::int as count
        FROM roles r
        INNER JOIN movie_crew mc ON mc.role_id = r.id
        WHERE r.is_active = true
        GROUP BY r.id, r.name, r.department
        HAVING COUNT(DISTINCT mc.person_id) > 0
        ORDER BY r.name ASC
      `,
      
      // Rangos de años
      prisma.$queryRaw<Array<{
        birth_year_min: number | null;
        birth_year_max: number | null;
        death_year_min: number | null;
        death_year_max: number | null;
      }>>`
        SELECT 
          MIN(birth_year) as birth_year_min,
          MAX(birth_year) as birth_year_max,
          MIN(death_year) as death_year_min,
          MAX(death_year) as death_year_max
        FROM people
        WHERE is_active = true
      `
    ]);

    // Contar actores (personas en movie_cast)
    const actorCount = await prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(DISTINCT person_id)::int as count
      FROM movie_cast
    `;

    // Formatear respuesta
    const response = {
      birthLocations: birthLocations.map(loc => ({
        id: loc.id,
        name: loc.name,
        parentName: loc.parent_name,
        fullPath: loc.parent_name ? `${loc.name}, ${loc.parent_name}` : loc.name,
        count: loc.count
      })),
      
      deathLocations: deathLocations.map(loc => ({
        id: loc.id,
        name: loc.name,
        parentName: loc.parent_name,
        fullPath: loc.parent_name ? `${loc.name}, ${loc.parent_name}` : loc.name,
        count: loc.count
      })),
      
      nationalities: nationalities.map(nat => ({
        id: nat.id,
        name: nat.name,
        count: nat.count
      })),
      
      roles: [
        // Actor/Actriz como primera opción especial
        {
          id: 'ACTOR',
          name: 'Actor / Actriz',
          department: 'ACTUACION',
          isActor: true,
          count: actorCount[0]?.count || 0
        },
        // Luego los roles técnicos
        ...roles.map(role => ({
          id: role.id,
          name: role.name,
          department: role.department,
          isActor: false,
          count: role.count
        }))
      ],
      
      years: {
        birthYearMin: yearRanges[0]?.birth_year_min || null,
        birthYearMax: yearRanges[0]?.birth_year_max || null,
        deathYearMin: yearRanges[0]?.death_year_min || null,
        deathYearMax: yearRanges[0]?.death_year_max || null
      }
    };

    return NextResponse.json(response, {
      headers: {
        // Cachear por 1 hora ya que estos datos no cambian frecuentemente
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200'
      }
    });
    
  } catch (error) {
    console.error('Error fetching filter options:', error);
    return NextResponse.json(
      { message: 'Error al obtener opciones de filtros' },
      { status: 500 }
    );
  }
}
