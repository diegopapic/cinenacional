# 📝 CHANGELOG

Todos los cambios notables de este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.2.0] - 2025-08-22

### ✨ Agregado
- Secciones dinámicas en HomePage (Últimos y Próximos Estrenos)
- Integración completa con la API para datos en tiempo real
- Manejo inteligente de fechas parciales en secciones

### 🔄 Cambiado
- HomePage ahora lee datos directamente de la base de datos
- Mejorado el sistema de obtención de directores desde movie_crew

## [2.1.0] - 2024-12-01

### ✨ Agregado
- CRUD completo de roles cinematográficos
- Tabla `roles` en base de datos con 8 campos
- API Routes para gestión de roles (GET, POST, PUT, DELETE)
- Hook `useRoles` para gestión de estado
- Componentes RoleForm y RolesList

### 🔄 Cambiado
- MovieCrew actualizado para referenciar roleId
- Migración de roles históricos desde datos existentes

## [2.0.0] - 2024-11-15

### ♻️ Refactorizado
- Implementación completa de Context API en MovieModal
- Eliminación de props drilling (46+ props → 2 props)
- Todos los tabs de MovieModal ahora sin props

### 🐛 Corregido
- Auto-increment de base de datos después de migración
- Validación de campos numéricos con z.preprocess
- Manejo de valores null en formularios

## [1.0.0] - 2024-10-01

### ✨ Inicial
- Migración de 10,589 películas desde WordPress
- Sistema de fechas parciales
- CRUD de películas y personas
- Integración con Cloudinary
- Sistema de enlaces externos

---

*Para ver cambios detallados, consultar la documentación específica de cada módulo.*
