# Sistema de Fechas Parciales

### Ubicación Central
`/src/lib/shared/dateUtils.ts`

### Problema que Resuelve
Permite almacenar fechas incompletas cuando no se conoce la información exacta:
- Solo año: "1995"
- Año y mes: "Marzo 1995"
- Fecha completa: "15 de marzo de 1995"

### Implementación Completa

#### Interface Base
```typescript
export interface PartialDate {
  year: number | null;
  month: number | null;
  day: number | null;
}
```

#### Funciones Principales

**Conversión de Fechas**
```typescript
// ISO String → PartialDate
dateToPartialFields(dateString: string): PartialDate
// Extrae año, mes y día de una fecha ISO

// PartialDate → ISO String
partialFieldsToDate(partial: PartialDate): string | null
// Solo retorna si la fecha está completa (año, mes Y día)
```

**Formateo para Display**
```typescript
formatPartialDate(partial: PartialDate, options): string
// Opciones:
// - monthFormat: 'short' | 'long'
// - includeDay: boolean
// - fallback: string

// Ejemplos de salida:
// "1995" (solo año)
// "Marzo de 1995" (año y mes)
// "15 de marzo de 1995" (fecha completa)
```

**Validación**
```typescript
validatePartialDate(partial: PartialDate, options): string | null
// Opciones:
// - minYear: número mínimo de año (default: 1800)
// - maxYear: número máximo de año
// - allowFuture: permitir fechas futuras
// - fieldName: nombre del campo para mensajes

// Validaciones:
// - Año requerido si hay mes o día
// - Mes requerido si hay día
// - Rango de año válido
// - Mes entre 1-12
// - Día válido para el mes
```

**Comparación y Cálculos**
```typescript
// Compara dos fechas parciales
comparePartialDates(date1: PartialDate, date2: PartialDate): number | null
// Retorna: -1 (date1 < date2), 0 (iguales), 1 (date1 > date2)

// Calcula años entre fechas
calculateYearsBetween(startDate: PartialDate, endDate?: PartialDate): number | null
// Si no se proporciona endDate, usa la fecha actual

// Valida un rango de fechas
validateDateRange(startDate: PartialDate, endDate: PartialDate): string | null
```

**Utilidades Helper**
```typescript
// Crea PartialDate desde valores de formulario
createPartialDate(year: any, month: any, day: any): PartialDate

// Verifica si está completa
isCompleteDate(partial: PartialDate): boolean

// Verifica si está vacía
isEmptyDate(partial: PartialDate): boolean
```

### Constantes
```typescript
export const MONTHS = [
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' }
]
```

### Uso en la UI
- Checkbox "Fecha incompleta" para activar modo parcial
- Campos separados para año, mes (dropdown), día
- Validación en tiempo real
- Formateo automático para mostrar

---