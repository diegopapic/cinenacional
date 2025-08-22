# Scripts de Migración

de Roles 🆕

```sql
-- 1. Crear roles únicos desde datos existentes
INSERT INTO roles (name, slug, department, created_at, updated_at)
SELECT DISTINCT 
  role as name,
  LOWER(REPLACE(REPLACE(role, ' ', '-'), 'á', 'a')) as slug,
  CASE 
    WHEN role LIKE '%Director%' THEN 'Dirección'
    WHEN role LIKE '%Productor%' THEN 'Producción'
    WHEN role LIKE '%Fotografía%' THEN 'Fotografía'
    WHEN role LIKE '%Editor%' OR role LIKE '%Montaje%' THEN 'Edición'
    WHEN role LIKE '%Sonido%' THEN 'Sonido'
    WHEN role LIKE '%Música%' OR role LIKE '%Compositor%' THEN 'Música'
    ELSE 'Otros'
  END as department,
  NOW() as created_at,
  NOW() as updated_at
FROM movie_crew
WHERE role IS NOT NULL
ON CONFLICT (name) DO NOTHING;

-- 2. Actualizar movie_crew con roleId
UPDATE movie_crew mc
SET role_id = r.id
FROM roles r
WHERE mc.role = r.name;

-- 3. Verificar migración
SELECT 
  COUNT(*) as total_crew,
  COUNT(role_id) as with_role_id,
  COUNT(*) - COUNT(role_id) as without_role_id
FROM movie_crew;
```