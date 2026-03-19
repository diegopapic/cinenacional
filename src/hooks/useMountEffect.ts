import { useEffect } from 'react';

/**
 * Ejecuta un efecto solo al montar el componente.
 * Wrapper explícito de useEffect(fn, []) para indicar intención.
 */
export function useMountEffect(fn: () => void | (() => void)) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(fn, []);
}
