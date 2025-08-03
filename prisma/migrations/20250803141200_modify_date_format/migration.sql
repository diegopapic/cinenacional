-- ============================================
-- ESTRUCTURA SIMPLIFICADA DE FECHAS PARCIALES
-- ============================================

-- Opción B: Si la tabla YA EXISTE y necesitas modificarla
ALTER TABLE movies 
  DROP COLUMN IF EXISTS release_date, -- Eliminar el campo DATE anterior si existe
  ADD COLUMN IF NOT EXISTS release_year INTEGER,
  ADD COLUMN IF NOT EXISTS release_month INTEGER CHECK (release_month >= 1 AND release_month <= 12),
  ADD COLUMN IF NOT EXISTS release_day INTEGER CHECK (release_day >= 1 AND release_day <= 31);

-- Comentarios para documentar
COMMENT ON COLUMN movies.release_year IS 'Año de estreno';
COMMENT ON COLUMN movies.release_month IS 'Mes de estreno (NULL si solo se conoce el año)';
COMMENT ON COLUMN movies.release_day IS 'Día de estreno (NULL si solo se conoce año o año/mes)';

-- Índices para búsquedas eficientes
CREATE INDEX IF NOT EXISTS idx_movies_release_year ON movies(release_year);
CREATE INDEX IF NOT EXISTS idx_movies_release_year_month ON movies(release_year, release_month);

-- Vista para mostrar la fecha formateada
CREATE OR REPLACE VIEW movies_with_formatted_date AS
SELECT 
  *,
  CASE 
    WHEN release_day IS NOT NULL THEN 
      release_year || '-' || LPAD(release_month::TEXT, 2, '0') || '-' || LPAD(release_day::TEXT, 2, '0')
    WHEN release_month IS NOT NULL THEN 
      release_year || '-' || LPAD(release_month::TEXT, 2, '0')
    WHEN release_year IS NOT NULL THEN 
      release_year::TEXT
    ELSE NULL
  END as release_date_display
FROM movies;

-- Función helper para obtener películas por década
CREATE OR REPLACE FUNCTION movies_by_decade(decade_start INTEGER)
RETURNS TABLE (
  id INTEGER,
  title VARCHAR,
  release_year INTEGER,
  release_date_display TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.title,
    m.release_year,
    CASE 
      WHEN m.release_day IS NOT NULL THEN 
        m.release_year || '-' || LPAD(m.release_month::TEXT, 2, '0') || '-' || LPAD(m.release_day::TEXT, 2, '0')
      WHEN m.release_month IS NOT NULL THEN 
        m.release_year || '-' || LPAD(m.release_month::TEXT, 2, '0')
      ELSE 
        m.release_year::TEXT
    END
  FROM movies m
  WHERE m.release_year >= decade_start 
    AND m.release_year < decade_start + 10
  ORDER BY m.release_year, m.release_month, m.release_day;
END;
$$ LANGUAGE plpgsql;

-- Ejemplos de uso:
-- SELECT * FROM movies_by_decade(1980); -- Todas las películas de los 80s
-- SELECT * FROM movies WHERE release_year = 1988 AND release_month = 6; -- Películas de junio 1988
-- SELECT * FROM movies_with_formatted_date WHERE release_year BETWEEN 1910 AND 1920;