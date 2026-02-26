// src/lib/shared/dateUtils.ts

/**
 * Tipo compartido para fechas parciales
 */
export interface PartialDate {
  year: number | null;
  month: number | null;
  day: number | null;
}

/**
 * Meses en español para los selectores
 */
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
];

/**
 * Convierte una fecha completa (string ISO) a campos parciales
 * IMPORTANTE: Maneja correctamente las zonas horarias para evitar el problema del día anterior
 */
export function dateToPartialFields(dateString: string | null | undefined): PartialDate {
  if (!dateString) {
    return { year: null, month: null, day: null };
  }
  
  // Si el string viene en formato ISO (YYYY-MM-DD), parsearlo directamente
  // sin crear un objeto Date para evitar problemas de timezone
  if (dateString.match(/^\d{4}-\d{2}-\d{2}/)) {
    const [yearStr, monthStr, dayStr] = dateString.split('-');
    return {
      year: parseInt(yearStr, 10),
      month: parseInt(monthStr, 10),
      day: parseInt(dayStr, 10)
    };
  }
  
  // Si viene con tiempo (formato ISO completo con T), usar Date pero ajustar
  const date = new Date(dateString);
  
  // Si la fecha incluye 'T', ya está en formato ISO completo
  if (dateString.includes('T')) {
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate()
    };
  }
  
  // Para otros formatos, intentar parsear con Date
  // pero usar getUTC* para evitar ajustes de timezone
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate()
  };
}

/**
 * Convierte campos parciales a una fecha completa si es posible
 * Retorna en formato YYYY-MM-DD sin información de hora para evitar problemas de timezone
 */
export function partialFieldsToDate(partial: PartialDate): string | null {
  if (!partial.year || !partial.month || !partial.day) {
    return null;
  }
  
  // Formato ISO: YYYY-MM-DD
  const year = partial.year.toString().padStart(4, '0');
  const month = partial.month.toString().padStart(2, '0');
  const day = partial.day.toString().padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Formatea una fecha parcial para mostrar
 * @param partial - La fecha parcial
 * @param options - Opciones de formato
 */
export function formatPartialDate(
  partial: PartialDate,
  options: {
    monthFormat?: 'short' | 'long';
    includeDay?: boolean;
    fallback?: string;
  } = {}
): string {
  const {
    monthFormat = 'long',
    includeDay = true,
    fallback = 'Fecha desconocida'
  } = options;

  if (!partial.year) {
    return fallback;
  }
  
  const monthNames = {
    short: [
      'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
      'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
    ],
    long: [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ]
  };
  
  // Solo año
  if (!partial.month) {
    return partial.year.toString();
  }
  
  const monthName = monthNames[monthFormat][partial.month - 1];
  
  // Año y mes
  if (!partial.day || !includeDay) {
    return monthFormat === 'long' 
      ? `${monthName} de ${partial.year}`
      : `${monthName} ${partial.year}`;
  }
  
  // Fecha completa
  return monthFormat === 'long'
    ? `${partial.day} de ${monthName} de ${partial.year}`
    : `${partial.day} ${monthName} ${partial.year}`;
}

/**
 * Calcula la edad o años transcurridos entre dos fechas parciales
 * @param startDate - Fecha de inicio (nacimiento, estreno, etc.)
 * @param endDate - Fecha de fin (muerte, fecha actual, etc.). Si no se proporciona, usa la fecha actual
 */
export function calculateYearsBetween(
  startDate: PartialDate,
  endDate?: PartialDate
): number | null {
  if (!startDate.year) {
    return null;
  }
  
  const currentDate = new Date();
  const referenceYear = endDate?.year || currentDate.getFullYear();
  const referenceMonth = endDate?.month || (currentDate.getMonth() + 1);
  const referenceDay = endDate?.day || currentDate.getDate();
  
  let years = referenceYear - startDate.year;
  
  // Ajustar si no ha llegado el aniversario
  if (startDate.month && referenceMonth) {
    if (referenceMonth < startDate.month) {
      years--;
    } else if (referenceMonth === startDate.month && startDate.day && referenceDay) {
      if (referenceDay < startDate.day) {
        years--;
      }
    }
  }
  
  return years;
}

/**
 * Valida que una fecha parcial sea válida
 * @param partial - La fecha parcial a validar
 * @param options - Opciones de validación
 */
export function validatePartialDate(
  partial: PartialDate,
  options: {
    minYear?: number;
    maxYear?: number;
    allowFuture?: boolean;
    fieldName?: string;
  } = {}
): string | null {
  const {
    minYear = 1800,
    maxYear = new Date().getFullYear() + 1,
    allowFuture = false,
    fieldName = 'fecha'
  } = options;
  
  // Si no hay año, es válido (fecha vacía)
  if (!partial.year) {
    if (partial.month || partial.day) {
      return `Si ingresa mes o día, debe ingresar también el año`;
    }
    return null;
  }
  
  // Validar año
  const currentYear = new Date().getFullYear();
  const effectiveMaxYear = allowFuture ? maxYear : Math.min(maxYear, currentYear);
  
  if (partial.year < minYear || partial.year > effectiveMaxYear) {
    return `El año de ${fieldName} debe estar entre ${minYear} y ${effectiveMaxYear}`;
  }
  
  // Si hay mes, validarlo
  if (partial.month) {
    if (partial.month < 1 || partial.month > 12) {
      return `El mes debe estar entre 1 y 12`;
    }
    
    // Si hay día, validarlo según el mes
    if (partial.day) {
      const daysInMonth = new Date(partial.year, partial.month, 0).getDate();
      if (partial.day < 1 || partial.day > daysInMonth) {
        return `El día debe estar entre 1 y ${daysInMonth} para el mes seleccionado`;
      }
    }
  } else if (partial.day) {
    return `Si ingresa día, debe ingresar también el mes`;
  }
  
  return null;
}

/**
 * Compara dos fechas parciales
 * @returns -1 si date1 < date2, 0 si son iguales, 1 si date1 > date2, null si no se pueden comparar
 */
export function comparePartialDates(date1: PartialDate, date2: PartialDate): number | null {
  // Si alguna no tiene año, no se pueden comparar
  if (!date1.year || !date2.year) {
    return null;
  }
  
  // Comparar años
  if (date1.year !== date2.year) {
    return date1.year < date2.year ? -1 : 1;
  }
  
  // Si ambas tienen mes, comparar
  if (date1.month && date2.month) {
    if (date1.month !== date2.month) {
      return date1.month < date2.month ? -1 : 1;
    }
    
    // Si ambas tienen día, comparar
    if (date1.day && date2.day) {
      if (date1.day !== date2.day) {
        return date1.day < date2.day ? -1 : 1;
      }
      return 0; // Son iguales
    }
  }
  
  // Si una tiene más precisión que la otra, considerarlas iguales en el nivel comparable
  return 0;
}

/**
 * Valida un rango de fechas parciales
 */
export function validateDateRange(
  startDate: PartialDate,
  endDate: PartialDate,
  startFieldName: string = 'inicio',
  endFieldName: string = 'fin'
): string | null {
  // Primero validar cada fecha individualmente
  const startError = validatePartialDate(startDate, { fieldName: startFieldName });
  if (startError) return startError;
  
  const endError = validatePartialDate(endDate, { fieldName: endFieldName });
  if (endError) return endError;
  
  // Si ambas tienen año, verificar que el rango sea válido
  if (startDate.year && endDate.year) {
    const comparison = comparePartialDates(startDate, endDate);
    if (comparison === 1) {
      return `La fecha de ${startFieldName} no puede ser posterior a la fecha de ${endFieldName}`;
    }
  }
  
  return null;
}

/**
 * Crea una fecha parcial desde valores de formulario
 */
export function createPartialDate(
  year: string | number | null | undefined,
  month: string | number | null | undefined,
  day: string | number | null | undefined
): PartialDate {
  return {
    year: year ? (typeof year === 'string' ? parseInt(year) : year) : null,
    month: month ? (typeof month === 'string' ? parseInt(month) : month) : null,
    day: day ? (typeof day === 'string' ? parseInt(day) : day) : null
  };
}

/**
 * Verifica si una fecha parcial está completa
 */
export function isCompleteDate(partial: PartialDate): boolean {
  return !!(partial.year && partial.month && partial.day);
}

/**
 * Verifica si una fecha parcial está vacía
 */
export function isEmptyDate(partial: PartialDate): boolean {
  return !partial.year && !partial.month && !partial.day;
}

/**
 * Resultado de convertir campos de fecha de la API al formato del formulario
 */
export interface PartialDateFormFields {
  date: string;
  isPartial: boolean;
  partialDate?: PartialDate;
}

/**
 * Procesa una fecha parcial o completa del formulario al formato de la API (year/month/day).
 * Unifica el patrón repetido en formatMovieDataForAPI y formatPersonDataForAPI.
 */
export function processPartialDateForAPI(
  isPartial: boolean | undefined,
  partialDate: PartialDate | undefined,
  fullDate: string | undefined
): PartialDate {
  if (isPartial && partialDate) {
    return { year: partialDate.year, month: partialDate.month, day: partialDate.day }
  }
  if (fullDate) {
    return dateToPartialFields(fullDate)
  }
  return { year: null, month: null, day: null }
}

/**
 * Procesa campos year/month/day de la API al formato del formulario (date string + isPartial + partialDate).
 * Unifica el patrón repetido en formatMovieFromAPI y formatPersonFromAPI.
 * Retorna null si no hay año (sin fecha).
 */
export function processPartialDateFromAPI(
  year: number | null,
  month: number | null,
  day: number | null
): PartialDateFormFields | null {
  if (!year) return null

  const partial: PartialDate = { year, month, day }
  if (year && month && day) {
    return { date: partialFieldsToDate(partial) || '', isPartial: false }
  }
  return { date: '', isPartial: true, partialDate: partial }
}