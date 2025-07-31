-- CreateEnum
CREATE TYPE "color_category" AS ENUM ('COLOR', 'BLACK_AND_WHITE', 'MIXED', 'UNKNOWN');

-- CreateTable
CREATE TABLE "color_types" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "slug" VARCHAR(50) NOT NULL,
    "category" "color_category" NOT NULL,
    "technical_name" VARCHAR(50),
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "color_types_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "color_types_slug_key" ON "color_types"("slug");

-- CreateIndex
CREATE INDEX "color_types_category_idx" ON "color_types"("category");

-- CreateIndex
CREATE INDEX "color_types_slug_idx" ON "color_types"("slug");

-- AlterTable: Eliminar columna antigua y agregar la nueva
ALTER TABLE "movies" DROP COLUMN IF EXISTS "color_type";
ALTER TABLE "movies" ADD COLUMN "color_type_id" INTEGER;

-- CreateIndex
CREATE INDEX "movies_color_type_id_idx" ON "movies"("color_type_id");

-- AddForeignKey
ALTER TABLE "movies" ADD CONSTRAINT "movies_color_type_id_fkey" 
    FOREIGN KEY ("color_type_id") REFERENCES "color_types"("id") 
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Insertar datos iniciales
INSERT INTO "color_types" ("name", "slug", "category", "technical_name", "display_order") VALUES
-- Categorías principales
('Color', 'color', 'COLOR', NULL, 1),
('Blanco y Negro', 'blanco-y-negro', 'BLACK_AND_WHITE', NULL, 2),
('Blanco y Negro / Color', 'blanco-y-negro-color', 'MIXED', NULL, 3),

-- Tipos técnicos de color
('Color (Eastmancolor)', 'color-eastmancolor', 'COLOR', 'Eastmancolor', 10),
('Color (FerraniaColor)', 'color-ferraniacolor', 'COLOR', 'FerraniaColor', 11),
('Color (Agfacolor)', 'color-agfacolor', 'COLOR', 'Agfacolor', 12),
('Color (FujiColor)', 'color-fujicolor', 'COLOR', 'FujiColor', 13),
('Color (Technicolor)', 'color-technicolor', 'COLOR', 'Technicolor', 14),
('Color (GevaColor)', 'color-gevacolor', 'COLOR', 'GevaColor', 15),
('Color (Kodak Color)', 'color-kodak-color', 'COLOR', 'Kodak Color', 16),
('Color (Super Eastmancolor)', 'color-super-eastmancolor', 'COLOR', 'Super Eastmancolor', 17),

-- Sin datos
('No disponible', 'n-d', 'UNKNOWN', NULL, 99)
ON CONFLICT (slug) DO NOTHING;

-- Crear vistas auxiliares
CREATE OR REPLACE VIEW color_categories AS
SELECT 
  ct.category,
  CASE ct.category
    WHEN 'COLOR' THEN 'Color'
    WHEN 'BLACK_AND_WHITE' THEN 'Blanco y Negro'
    WHEN 'MIXED' THEN 'Mixto'
    WHEN 'UNKNOWN' THEN 'Sin datos'
  END as display_name,
  COUNT(DISTINCT m.id) as movie_count
FROM color_types ct
LEFT JOIN movies m ON m.color_type_id = ct.id
GROUP BY ct.category
ORDER BY 
  CASE ct.category
    WHEN 'COLOR' THEN 1
    WHEN 'BLACK_AND_WHITE' THEN 2
    WHEN 'MIXED' THEN 3
    WHEN 'UNKNOWN' THEN 4
  END;

CREATE OR REPLACE VIEW color_types_with_counts AS
SELECT 
  ct.*,
  COUNT(m.id) as movie_count
FROM color_types ct
LEFT JOIN movies m ON m.color_type_id = ct.id
GROUP BY ct.id
ORDER BY ct.display_order;

-- Función para búsquedas por categoría
CREATE OR REPLACE FUNCTION get_movies_by_color_category(p_category VARCHAR)
RETURNS TABLE (
  movie_id INTEGER,
  title VARCHAR,
  year INTEGER,
  color_type_name VARCHAR,
  color_technical_name VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.title,
    m.year,
    ct.name,
    ct.technical_name
  FROM movies m
  JOIN color_types ct ON m.color_type_id = ct.id
  WHERE ct.category = p_category
  ORDER BY m.year DESC, m.title;
END;
$$ LANGUAGE plpgsql;

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_color_types_updated_at 
  BEFORE UPDATE ON color_types
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Políticas RLS (Row Level Security)
ALTER TABLE color_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Color types son públicamente visibles" 
  ON color_types FOR SELECT 
  USING (true);

CREATE POLICY "Solo admins pueden insertar color types" 
  ON color_types FOR INSERT 
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Solo admins pueden actualizar color types" 
  ON color_types FOR UPDATE 
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Solo admins pueden eliminar color types" 
  ON color_types FOR DELETE 
  USING (auth.jwt() ->> 'role' = 'admin');

-- Comentarios de documentación
COMMENT ON TABLE color_types IS 'Catálogo de tipos de color para películas';
COMMENT ON COLUMN color_types.category IS 'Categoría general: COLOR, BLACK_AND_WHITE, MIXED, UNKNOWN';
COMMENT ON COLUMN color_types.technical_name IS 'Nombre técnico del proceso de color (ej: Eastmancolor, Technicolor)';
COMMENT ON COLUMN color_types.display_order IS 'Orden para mostrar en interfaces de usuario';