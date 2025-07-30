-- Agregar campos de fecha de inicio y fin de rodaje a la tabla movies
ALTER TABLE movies 
ADD COLUMN filming_start_date DATE,
ADD COLUMN filming_end_date DATE;

-- Agregar comentarios para documentación
COMMENT ON COLUMN movies.filming_start_date IS 'Fecha de inicio del rodaje de la película';
COMMENT ON COLUMN movies.filming_end_date IS 'Fecha de finalización del rodaje de la película';

-- Crear índices para optimizar búsquedas por fechas de rodaje
CREATE INDEX idx_movies_filming_start_date ON movies(filming_start_date);
CREATE INDEX idx_movies_filming_end_date ON movies(filming_end_date);