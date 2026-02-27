// src/app/api/movies/filters/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { MOVIE_STAGES, SOUND_TYPES, TIPOS_DURACION } from '@/lib/movies/movieConstants';
import { apiHandler } from '@/lib/api/api-handler';

// Esta ruta debe ser dinámica
export const dynamic = 'force-dynamic';

export const GET = apiHandler(async (request: NextRequest) => {
  // Ejecutar todas las consultas en paralelo
  const [
    soundTypes,
    colorTypes,
    durationTypes,
    countries,
    genres,
    ratings,
    stages,
    yearRanges
  ] = await Promise.all([
    // Tipos de sonido con conteo
    prisma.$queryRaw<Array<{ sound_type: string; count: bigint }>>`
      SELECT sound_type, COUNT(*) as count
      FROM movies
      WHERE sound_type IS NOT NULL AND sound_type != ''
      GROUP BY sound_type
      ORDER BY count DESC
    `,

    // Tipos de color con conteo
    prisma.$queryRaw<Array<{ id: number; name: string; count: bigint }>>`
      SELECT ct.id, ct.name, COUNT(m.id) as count
      FROM color_types ct
      INNER JOIN movies m ON m.color_type_id = ct.id
      GROUP BY ct.id, ct.name
      ORDER BY count DESC
    `,

    // Tipos de duración con conteo
    prisma.$queryRaw<Array<{ tipo_duracion: string; count: bigint }>>`
      SELECT tipo_duracion, COUNT(*) as count
      FROM movies
      WHERE tipo_duracion IS NOT NULL AND tipo_duracion != ''
      GROUP BY tipo_duracion
      ORDER BY count DESC
    `,

    // Países coproductores (excluyendo Argentina que siempre está)
    prisma.$queryRaw<Array<{ id: number; name: string; count: bigint }>>`
      SELECT l.id, l.name, COUNT(DISTINCT mc.movie_id) as count
      FROM locations l
      INNER JOIN movie_countries mc ON mc.country_id = l.id
      WHERE l.name != 'Argentina'
      GROUP BY l.id, l.name
      HAVING COUNT(DISTINCT mc.movie_id) > 0
      ORDER BY l.name ASC
    `,

    // Géneros con conteo
    prisma.$queryRaw<Array<{ id: number; name: string; count: bigint }>>`
      SELECT g.id, g.name, COUNT(DISTINCT mg.movie_id) as count
      FROM genres g
      INNER JOIN movie_genres mg ON mg.genre_id = g.id
      GROUP BY g.id, g.name
      ORDER BY g.name ASC
    `,

    // Calificaciones/restricciones con conteo
    prisma.$queryRaw<Array<{ id: number; name: string; abbreviation: string | null; count: bigint }>>`
      SELECT r.id, r.name, r.abbreviation, COUNT(m.id) as count
      FROM ratings r
      INNER JOIN movies m ON m.rating_id = r.id
      GROUP BY r.id, r.name, r.abbreviation, r."order"
      ORDER BY r."order" ASC
    `,

    // Estados con conteo
    prisma.$queryRaw<Array<{ stage: string; count: bigint }>>`
      SELECT stage, COUNT(*) as count
      FROM movies
      GROUP BY stage
      ORDER BY count DESC
    `,

    // Rangos de años
    prisma.$queryRaw<Array<{
      release_year_min: number | null;
      release_year_max: number | null;
      production_year_min: number | null;
      production_year_max: number | null;
    }>>`
      SELECT
        MIN(release_year) as release_year_min,
        MAX(release_year) as release_year_max,
        MIN(year) as production_year_min,
        MAX(year) as production_year_max
      FROM movies
    `
  ]);

  // Formatear respuesta
  const response = {
    soundTypes: soundTypes.map(s => ({
      id: s.sound_type,
      name: formatSoundType(s.sound_type),
      count: Number(s.count)
    })),
    colorTypes: colorTypes.map(c => ({
      id: c.id,
      name: c.name,
      count: Number(c.count)
    })),
    durationTypes: durationTypes.map(d => ({
      id: d.tipo_duracion,
      name: formatDurationType(d.tipo_duracion),
      count: Number(d.count)
    })),
    countries: countries.map(c => ({
      id: c.id,
      name: c.name,
      count: Number(c.count)
    })),
    genres: genres.map(g => ({
      id: g.id,
      name: g.name,
      count: Number(g.count)
    })),
    ratings: ratings.map(r => ({
      id: r.id,
      name: r.abbreviation || r.name,
      count: Number(r.count)
    })),
    stages: stages.map(s => ({
      id: s.stage,
      name: formatStage(s.stage),
      count: Number(s.count)
    })),
    years: {
      releaseYearMin: yearRanges[0]?.release_year_min || null,
      releaseYearMax: yearRanges[0]?.release_year_max || null,
      productionYearMin: yearRanges[0]?.production_year_min || null,
      productionYearMax: yearRanges[0]?.production_year_max || null
    }
  };

  return NextResponse.json(response);
}, 'obtener opciones de filtros');

// Funciones de formateo usando las constantes centralizadas de movieConstants.ts
function formatSoundType(type: string): string {
  const found = SOUND_TYPES.find(s => s.value.toLowerCase() === type.toLowerCase())
  return found ? found.label : type
}

function formatDurationType(type: string): string {
  const found = TIPOS_DURACION.find(d => d.value.toLowerCase() === type.toLowerCase())
  return found ? found.label : type
}

function formatStage(stage: string): string {
  const found = MOVIE_STAGES.find(s => s.value === stage)
  return found ? found.label : stage
}
