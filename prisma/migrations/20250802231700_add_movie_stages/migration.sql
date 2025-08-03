-- =====================================================
-- Migración: Agregar etapas a las películas
-- Fecha: 2025
-- Descripción: Agrega el campo 'stage' a la tabla movies
-- para indicar el estado de desarrollo de la película
-- =====================================================

-- Crear el enum para las etapas de película
CREATE TYPE movie_stage AS ENUM (
  'COMPLETA',           -- Película completada y estrenada
  'EN_DESARROLLO',      -- En etapa de desarrollo
  'EN_POSTPRODUCCION',  -- En postproducción
  'EN_PREPRODUCCION',   -- En preproducción
  'EN_RODAJE',          -- En rodaje/filmación
  'INCONCLUSA',         -- Proyecto inconcluso o abandonado
  'INEDITA'            -- Película completa pero no estrenada
);

-- Agregar la columna stage a la tabla movies
ALTER TABLE movies 
ADD COLUMN stage movie_stage DEFAULT 'COMPLETA';

-- Agregar comentario a la columna para documentación
COMMENT ON COLUMN movies.stage IS 'Etapa de desarrollo/producción de la película';

-- Crear índice para búsquedas por etapa
CREATE INDEX idx_movies_stage ON movies(stage);

-- Actualizar películas existentes (opcional)
-- Por defecto todas quedan como COMPLETA
-- Puedes actualizar casos específicos si tienes información

-- Ejemplo de actualización para películas específicas (descomenta si necesitas)
-- UPDATE movies SET stage = 'INEDITA' WHERE status = 'DRAFT' AND release_date IS NULL;
-- UPDATE movies SET stage = 'EN_DESARROLLO' WHERE year > EXTRACT(YEAR FROM CURRENT_DATE);

-- =====================================================
-- Para revertir esta migración (ROLLBACK):
-- =====================================================
-- DROP INDEX IF EXISTS idx_movies_stage;
-- ALTER TABLE movies DROP COLUMN stage;
-- DROP TYPE IF EXISTS movie_stage;