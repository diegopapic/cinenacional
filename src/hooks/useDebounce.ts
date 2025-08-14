// src/hooks/useDebounce.ts

import { useState, useEffect } from 'react';

/**
 * Hook que retrasa la actualización de un valor hasta que haya pasado
 * un tiempo determinado sin cambios
 * 
 * @param value - El valor a retrasar
 * @param delay - El tiempo de retraso en milisegundos
 * @returns El valor retrasado
 * 
 * @example
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearchTerm = useDebounce(searchTerm, 300);
 * 
 * // debouncedSearchTerm se actualizará 300ms después de que 
 * // el usuario deje de escribir
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Crear un timeout para actualizar el valor después del delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Limpiar el timeout si el value cambia antes del delay
    // Esto "cancela" la actualización anterior y empieza una nueva
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}