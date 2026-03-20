import { useEffect, type RefObject } from 'react'

/**
 * Ejecuta un callback cuando se hace clic fuera de uno o más elementos referenciados.
 * Usa el evento `mousedown` para capturar antes del `click`.
 *
 * @param refs - Ref o array de refs de los elementos a proteger
 * @param callback - Función a ejecutar al detectar clic externo
 * @param enabled - Si es false, el listener no se registra (default: true)
 */
export function useClickOutside(
  refs: RefObject<HTMLElement | null> | RefObject<HTMLElement | null>[],
  callback: () => void,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled) return

    function handleClickOutside(event: MouseEvent) {
      const refsArray = Array.isArray(refs) ? refs : [refs]
      const isOutside = refsArray.every(
        (ref) => ref.current && !ref.current.contains(event.target as Node),
      )
      if (isOutside) {
        callback()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [refs, callback, enabled])
}
