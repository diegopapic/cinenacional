-- Configuración para importación rápida
SET foreign_key_checks = 0;
SET unique_checks = 0;
SET autocommit = 0;
SET sql_log_bin = 0;

-- Desactivar índices
ALTER TABLE wp_postmeta DISABLE KEYS;

-- Importar datos
SOURCE C:/Users/diego/cinenacional/dumps/wp_postmeta.sql;
SOURCE C:/Users/diego/cinenacional/dumps/wp_postmeta.sql (4).sql;
SOURCE C:/Users/diego/cinenacional/dumps/wp_postmeta.sql (5).sql;
SOURCE C:/Users/diego/cinenacional/dumps/wp_postmeta.sql (6).sql;
SOURCE C:/Users/diego/cinenacional/dumps/wp_postmeta.sql (7).sql;

-- Reactivar todo
ALTER TABLE wp_postmeta ENABLE KEYS;
SET foreign_key_checks = 1;
SET unique_checks = 1;
COMMIT;