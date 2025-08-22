# Módulo de Películas

#### Componentes Principales
- **MovieModal** (`/components/admin/movies/MovieModal/`) - **REFACTORIZADO**
  - ✅ **De 46 props a 2 props** (`isOpen`, `onClose`)
  - ✅ **Context API**: `MovieModalContext` centraliza todo el estado
  - ✅ **Tabs sin props**: Todos los tabs (BasicInfo, Cast, Crew, Media, Advanced) ahora tienen 0 props
  - ✅ **Carga automática**: useEffect en Context carga datos automáticamente al editar
  - ✅ **Manejo centralizado**: Todas las fechas parciales, relaciones y metadata gestionados por el Context

#### Características
- ABM completo con validación
- Sistema de títulos alternativos
- Enlaces a redes sociales
- Gestión de elenco y crew con roles
- Múltiples productoras y distribuidoras
- Salas de proyección
- Calificación por edad
- Tipo de color y sonido
- Estado de producción (stage)
- Nivel de completitud de datos