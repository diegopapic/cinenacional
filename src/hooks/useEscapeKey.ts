import { useEffect, useEffectEvent } from 'react'

/**
 * Ejecuta un callback cuando se presiona la tecla Escape.
 *
 * @param callback - Función a ejecutar al presionar Escape
 * @param enabled - Si es false, el listener no se registra (default: true)
 */
export function useEscapeKey(callback: () => void, enabled = true) {
  const onEscape = useEffectEvent(callback)

  useEffect(() => {
    if (!enabled) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onEscape()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [enabled])
}
