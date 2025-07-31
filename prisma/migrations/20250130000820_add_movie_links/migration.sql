-- Crear tabla para links de películas
CREATE TABLE movie_links (
  id SERIAL PRIMARY KEY,
  movie_id INTEGER NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  url TEXT NOT NULL,
  title VARCHAR(255), -- Descripción opcional del link
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para mejorar las consultas
CREATE INDEX idx_movie_links_movie_id ON movie_links(movie_id);
CREATE INDEX idx_movie_links_type ON movie_links(type);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_movie_links_updated_at BEFORE UPDATE
    ON movie_links FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();