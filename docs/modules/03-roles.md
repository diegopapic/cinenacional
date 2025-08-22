# Módulo de Roles

- **NUEVO** 🆕

#### Componentes Principales
- **RoleForm** (`/components/admin/roles/RoleForm.tsx`)
  - Formulario para crear/editar roles
  - Validación con Zod
  - Generación automática de slug
  
- **RolesList** (`/components/admin/roles/RolesList.tsx`)
  - Listado con paginación
  - Búsqueda y filtros
  - Acciones CRUD

#### Características del Módulo de Roles 🆕
- **CRUD completo**: Crear, leer, actualizar y eliminar roles
- **Validación**: Nombre único, slug único
- **Campos**:
  - `name`: Nombre del rol (único, requerido)
  - `slug`: Slug único generado automáticamente
  - `description`: Descripción opcional
  - `department`: Departamento (Dirección, Fotografía, etc.)
  - `displayOrder`: Orden de visualización
  - `isActive`: Estado activo/inactivo
- **Búsqueda**: Por nombre, descripción o departamento
- **Filtros**: Por departamento y estado activo
- **Ordenamiento**: Por nombre, departamento o fecha de creación
- **Paginación**: 20 elementos por página