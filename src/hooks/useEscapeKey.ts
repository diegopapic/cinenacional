import { useEffect } from 'react'

/**
 * Ejecuta un callback cuando se presiona la tecla Escape.
 *
 * @param callback - Función a ejecutar al presionar Escape
 * @param enabled - Si es false, el listener no se registra (default: true)
 */
export function useEscapeKey(callback: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        callback()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [callback, enabled])
}
