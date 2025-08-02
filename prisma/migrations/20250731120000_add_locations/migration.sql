-- =====================================================
-- CREAR TABLA DE LOCALIDADES CON JERARQUÍA
-- =====================================================

-- Crear la tabla locations
CREATE TABLE IF NOT EXISTS locations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('province', 'state', 'region', 'city', 'locality', 'neighborhood')),
  parent_id INTEGER REFERENCES locations(id) ON DELETE RESTRICT,
  country_id INTEGER REFERENCES countries(id) ON DELETE RESTRICT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraint para evitar referencias circulares
  CONSTRAINT no_self_reference CHECK (id != parent_id)
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX idx_locations_parent_id ON locations(parent_id);
CREATE INDEX idx_locations_country_id ON locations(country_id);
CREATE INDEX idx_locations_type ON locations(type);
CREATE INDEX idx_locations_name ON locations(name);
CREATE INDEX idx_locations_slug ON locations(slug);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_locations_updated_at 
  BEFORE UPDATE ON locations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ACTUALIZAR TABLA PEOPLE PARA USAR LOCATIONS
-- =====================================================

-- Agregar columnas de localidad a la tabla people
ALTER TABLE people 
  ADD COLUMN IF NOT EXISTS birth_location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS death_location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL;

-- Crear índices para las nuevas columnas
CREATE INDEX IF NOT EXISTS idx_people_birth_location_id ON people(birth_location_id);
CREATE INDEX IF NOT EXISTS idx_people_death_location_id ON people(death_location_id);

-- =====================================================
-- CREAR VISTA PARA RUTAS COMPLETAS DE LOCALIDADES
-- =====================================================

-- Vista que muestra la jerarquía completa de cada localidad
CREATE OR REPLACE VIEW location_full_path AS
WITH RECURSIVE location_path AS (
  -- Casos base: localidades sin padre (provincias/estados de primer nivel)
  SELECT 
    l.id,
    l.name,
    l.slug,
    l.type,
    l.country_id,
    l.parent_id,
    l.latitude,
    l.longitude,
    l.name::TEXT as full_path,
    1 as level,
    ARRAY[l.id] as path_ids
  FROM locations l
  WHERE l.parent_id IS NULL
  
  UNION ALL
  
  -- Caso recursivo: agregar hijos
  SELECT 
    l.id,
    l.name,
    l.slug,
    l.type,
    l.country_id,
    l.parent_id,
    l.latitude,
    l.longitude,
    lp.full_path || ' > ' || l.name as full_path,
    lp.level + 1 as level,
    lp.path_ids || l.id as path_ids
  FROM locations l
  INNER JOIN location_path lp ON l.parent_id = lp.id
)
SELECT 
  lp.*,
  c.name as country_name,
  c.code as country_code
FROM location_path lp
INNER JOIN countries c ON lp.country_id = c.id
ORDER BY c.name, lp.full_path;

-- =====================================================
-- CREAR FUNCIÓN PARA OBTENER ANCESTROS DE UNA LOCALIDAD
-- =====================================================

CREATE OR REPLACE FUNCTION get_location_ancestors(location_id INTEGER)
RETURNS TABLE (
  id INTEGER,
  name VARCHAR(255),
  type VARCHAR(50),
  level INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE ancestors AS (
    -- Localidad inicial
    SELECT 
      l.id,
      l.name,
      l.type,
      l.parent_id,
      1 as level
    FROM locations l
    WHERE l.id = location_id
    
    UNION ALL
    
    -- Ancestros recursivos
    SELECT 
      l.id,
      l.name,
      l.type,
      l.parent_id,
      a.level + 1
    FROM locations l
    INNER JOIN ancestors a ON l.id = a.parent_id
  )
  SELECT 
    a.id,
    a.name,
    a.type,
    a.level
  FROM ancestors a
  ORDER BY a.level DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- CREAR FUNCIÓN PARA OBTENER LOCALIDAD COMPLETA
-- =====================================================

CREATE OR REPLACE FUNCTION get_location_full_name(location_id INTEGER)
RETURNS TEXT AS $$
DECLARE
  full_name TEXT;
BEGIN
  SELECT 
    string_agg(name, ', ' ORDER BY level DESC) || ', ' || c.name
  INTO full_name
  FROM get_location_ancestors(location_id) a
  CROSS JOIN countries c
  WHERE c.id = (SELECT country_id FROM locations WHERE id = location_id);
  
  RETURN full_name;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMENTARIOS PARA DOCUMENTACIÓN
-- =====================================================

COMMENT ON TABLE locations IS 'Tabla jerárquica de localidades (provincias, ciudades, barrios, etc.)';
COMMENT ON COLUMN locations.type IS 'Tipo de localidad: province, state, region, city, locality, neighborhood';
COMMENT ON COLUMN locations.parent_id IS 'ID de la localidad padre en la jerarquía';
COMMENT ON COLUMN locations.country_id IS 'ID del país al que pertenece la localidad';

COMMENT ON VIEW location_full_path IS 'Vista que muestra la ruta completa de cada localidad desde la raíz hasta la hoja';
COMMENT ON FUNCTION get_location_ancestors IS 'Obtiene todos los ancestros de una localidad en orden jerárquico';
COMMENT ON FUNCTION get_location_full_name IS 'Obtiene el nombre completo de una localidad incluyendo todos sus ancestros';

-- =====================================================
-- EJEMPLOS DE USO
-- =====================================================

/*
-- Insertar una provincia
INSERT INTO locations (name, slug, type, country_id)
VALUES ('Buenos Aires', 'buenos-aires', 'province', 1);

-- Insertar una ciudad dentro de la provincia
INSERT INTO locations (name, slug, type, country_id, parent_id)
VALUES ('Mar del Plata', 'mar-del-plata', 'city', 1, 1);

-- Insertar un barrio dentro de la ciudad
INSERT INTO locations (name, slug, type, country_id, parent_id)
VALUES ('La Perla', 'la-perla', 'neighborhood', 1, 2);

-- Ver la jerarquía completa
SELECT * FROM location_full_path;

-- Obtener el nombre completo de una localidad
SELECT get_location_full_name(3); -- Retorna: 'La Perla, Mar del Plata, Buenos Aires, Argentina'

-- Obtener todos los ancestros de una localidad
SELECT * FROM get_location_ancestors(3);
*/