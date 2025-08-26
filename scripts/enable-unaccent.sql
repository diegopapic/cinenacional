-- scripts/enable-unaccent.sql
-- Ejecutar este script en la base de datos PostgreSQL para habilitar búsquedas sin acentos

-- Crear la extensión unaccent si no existe
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Verificar que se instaló correctamente
SELECT * FROM pg_extension WHERE extname = 'unaccent';

-- Prueba de funcionamiento
SELECT 
    unaccent('Martín') as sin_acentos,
    unaccent('José María') as nombre_completo,
    unaccent('Ñoño') as con_enie;