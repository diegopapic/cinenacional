# Scripts y Comandos

### Desarrollo
```bash
npm run dev              # Inicia servidor de desarrollo
npm run build           # Build de producción
npm run start           # Inicia servidor de producción
npm run lint            # Ejecuta ESLint
```

### Base de Datos
```bash
npm run db:push         # Push del schema sin migración
npm run db:migrate      # Crear y ejecutar migraciones
npm run db:seed         # Poblar base de datos
npm run db:studio       # Abrir Prisma Studio (GUI)
npm run db:generate     # Generar cliente Prisma
npm run db:reset        # Reset completo de la DB
npm run db:export       # Exportar estructura de DB

# Comando para corregir auto-increment después de migración
# Ejecutar en consola SQL de Supabase:
SELECT setval('movies_id_seq', (SELECT MAX(id) + 1 FROM movies));
SELECT setval('people_id_seq', (SELECT MAX(id) + 1 FROM people));
SELECT setval('genres_id_seq', (SELECT MAX(id) + 1 FROM genres));
SELECT setval('roles_id_seq', (SELECT MAX(id) + 1 FROM roles)); # 🆕
SELECT setval('locations_id_seq', (SELECT MAX(id) + 1 FROM locations));
```

### Documentación
```bash
npm run compile         # Compila código en un archivo
npm run structure       # Genera estructura del proyecto
npm run update-docs     # Actualiza toda la documentación
```

### Git Hooks (Husky)
```bash
npm run prepare         # Instala hooks de git
npm run precommit      # Ejecuta antes de cada commit
```

### Scripts de Migración
```bash
# Análisis de datos WordPress
node scripts/analyze-wp-completeness.js
node scripts/analyze-wp-structure.js

# Migración a Supabase
node scripts/migrate-wp-titles-supabase.js
node scripts/migrate-wp-people-supabase.js
node scripts/migrate-wp-relations-supabase.js
node scripts/migrate-wp-roles-supabase.js # 🆕
```

---