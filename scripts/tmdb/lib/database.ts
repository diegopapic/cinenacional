/**
 * Funciones de base de datos compartidas
 */

import { Pool } from 'pg';
import config from '../config';
import { DEPARTMENT_MAP, type LocalPerson } from './config';

let pool: Pool | null = null;

export function getPool(): Pool {
    if (!pool) {
        pool = new Pool({
            connectionString: config.databaseUrl,
            max: 5,
            idleTimeoutMillis: 30000,
        });
    }
    return pool;
}

export async function closePool(): Promise<void> {
    if (pool) {
        await pool.end();
        pool = null;
    }
}

/**
 * Destruye el pool actual sin esperar que termine gracefully.
 * Útil para reconectar después de un corte de conexión.
 */
export async function resetPool(): Promise<void> {
    if (pool) {
        try {
            await pool.end();
        } catch {
            // Ignorar errores al cerrar un pool roto
        }
        pool = null;
    }
}

export async function movieExistsByTmdbId(tmdbId: number): Promise<number | null> {
    const pool = getPool();
    const result = await pool.query(
        'SELECT id FROM movies WHERE tmdb_id = $1',
        [tmdbId]
    );
    return result.rows.length > 0 ? result.rows[0].id : null;
}

export async function findPersonByTmdbId(tmdbId: number): Promise<LocalPerson | null> {
    const pool = getPool();
    const result = await pool.query(
        `SELECT id, first_name, last_name, tmdb_id, birth_year, death_year
         FROM people WHERE tmdb_id = $1`,
        [tmdbId]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
}

export async function findPersonByName(name: string): Promise<LocalPerson[]> {
    const pool = getPool();
    const result = await pool.query(`
        SELECT id, first_name, last_name, tmdb_id, birth_year, death_year
        FROM people
        WHERE LOWER(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, ''))) = LOWER($1)
           OR LOWER(CONCAT(COALESCE(last_name, ''), ' ', COALESCE(first_name, ''))) = LOWER($1)
    `, [name]);
    return result.rows;
}

export async function findPersonByNameAndDepartment(
    name: string,
    department: string,
    movieYear: number
): Promise<LocalPerson | null> {
    const candidates = await findPersonByName(name);

    if (candidates.length === 0) {
        return null;
    }

    if (candidates.length === 1) {
        return candidates[0];
    }

    const pool = getPool();

    for (const candidate of candidates) {
        const deptResult = await pool.query(`
            SELECT DISTINCT r.department
            FROM movie_crew mc
            JOIN roles r ON mc.role_id = r.id
            WHERE mc.person_id = $1
        `, [candidate.id]);

        const departments = deptResult.rows.map((r: any) => r.department);
        const localDept = DEPARTMENT_MAP[department] || 'OTROS';

        if (departments.includes(localDept)) {
            if (candidate.birth_year) {
                const estimatedAge = movieYear - candidate.birth_year;
                if (estimatedAge >= 15 && estimatedAge <= 90) {
                    return candidate;
                }
            } else {
                const yearsResult = await pool.query(`
                    SELECT MIN(m.year) as min_year, MAX(m.year) as max_year
                    FROM movies m
                    JOIN movie_crew mc ON m.id = mc.movie_id
                    WHERE mc.person_id = $1
                `, [candidate.id]);

                if (yearsResult.rows[0].min_year && yearsResult.rows[0].max_year) {
                    const minYear = yearsResult.rows[0].min_year;
                    const maxYear = yearsResult.rows[0].max_year;
                    if (movieYear >= minYear - 10 && movieYear <= maxYear + 30) {
                        return candidate;
                    }
                }
            }
        }
    }

    for (const candidate of candidates) {
        const castResult = await pool.query(`
            SELECT COUNT(*) as count FROM movie_cast WHERE person_id = $1
        `, [candidate.id]);

        if (castResult.rows[0].count > 0) {
            if (candidate.birth_year) {
                const estimatedAge = movieYear - candidate.birth_year;
                if (estimatedAge >= 5 && estimatedAge <= 95) {
                    return candidate;
                }
            }
        }
    }

    return null;
}

export async function updatePersonTmdbId(personId: number, tmdbId: number): Promise<void> {
    const pool = getPool();
    await pool.query(
        'UPDATE people SET tmdb_id = $1, updated_at = NOW() WHERE id = $2',
        [tmdbId, personId]
    );
}

export async function getCountryIdByName(countryName: string): Promise<number | null> {
    const pool = getPool();
    const result = await pool.query(
        'SELECT id FROM locations WHERE name = $1 LIMIT 1',
        [countryName]
    );
    return result.rows.length > 0 ? result.rows[0].id : null;
}
