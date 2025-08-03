-- migration.sql
-- Migración para agregar soporte de países y tipo de producción
-- Ejecutar en Supabase SQL Editor o localmente

-- 1. Verificar si la tabla countries existe, si no, crearla
CREATE TABLE IF NOT EXISTS countries (
    id SERIAL PRIMARY KEY,
    code VARCHAR(3) UNIQUE NOT NULL,
    name VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Insertar Argentina si no existe
INSERT INTO countries (code, name) 
VALUES ('AR', 'Argentina')
ON CONFLICT (code) DO NOTHING;

-- 3. Agregar columnas a la tabla movies
ALTER TABLE movies 
ADD COLUMN IF NOT EXISTS countries TEXT[] DEFAULT ARRAY['Argentina']::TEXT[];

ALTER TABLE movies 
ADD COLUMN IF NOT EXISTS is_coproduction BOOLEAN DEFAULT FALSE;

ALTER TABLE movies 
ADD COLUMN IF NOT EXISTS production_type VARCHAR(50) DEFAULT 'national';

-- 4. Crear tabla de relación movie_countries
CREATE TABLE IF NOT EXISTS movie_countries (
    id SERIAL PRIMARY KEY,
    movie_id INTEGER NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    country_id INTEGER NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(movie_id, country_id)
);

-- 5. Crear índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_movies_countries ON movies USING GIN(countries);
CREATE INDEX IF NOT EXISTS idx_movies_is_coproduction ON movies(is_coproduction);
CREATE INDEX IF NOT EXISTS idx_movies_production_type ON movies(production_type);
CREATE INDEX IF NOT EXISTS idx_movie_countries_movie_id ON movie_countries(movie_id);
CREATE INDEX IF NOT EXISTS idx_movie_countries_country_id ON movie_countries(country_id);

-- 6. Actualizar todas las películas existentes con valores por defecto
UPDATE movies 
SET 
    countries = ARRAY['Argentina']::TEXT[],
    is_coproduction = FALSE,
    production_type = 'national'
WHERE countries IS NULL;

-- 7. Poblar la tabla movie_countries con las películas existentes
INSERT INTO movie_countries (movie_id, country_id)
SELECT 
    m.id,
    c.id
FROM movies m
CROSS JOIN countries c
WHERE c.code = 'AR'
AND NOT EXISTS (
    SELECT 1 FROM movie_countries mc 
    WHERE mc.movie_id = m.id AND mc.country_id = c.id
);

-- 8. Verificar que todo se creó correctamente
DO $$
DECLARE
    movies_count INTEGER;
    countries_count INTEGER;
    relations_count INTEGER;
    argentina_id INTEGER;
BEGIN
    -- Contar registros
    SELECT COUNT(*) INTO movies_count FROM movies;
    SELECT COUNT(*) INTO countries_count FROM countries;
    SELECT COUNT(*) INTO relations_count FROM movie_countries;
    SELECT id INTO argentina_id FROM countries WHERE code = 'AR';
    
    -- Mostrar resultados
    RAISE NOTICE '=================================';
    RAISE NOTICE 'Migración completada exitosamente';
    RAISE NOTICE '=================================';
    RAISE NOTICE 'Total películas: %', movies_count;
    RAISE NOTICE 'Total países: %', countries_count;
    RAISE NOTICE 'ID de Argentina: %', argentina_id;
    RAISE NOTICE 'Relaciones movie_countries: %', relations_count;
    RAISE NOTICE '=================================';
END $$;