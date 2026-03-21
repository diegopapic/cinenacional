import { useEffect, useRef } from 'react'

/**
 * Registra un keydown listener en document.
 * Se limpia automáticamente al desmontar o cuando `enabled` pasa a false.
 *
 * @param handler - Callback que recibe el KeyboardEvent
 * @param enabled - Si false, no se registra el listener (default: true)
 */
export function useKeydown(
  handler: (e: KeyboardEvent) => void,
  enabled: boolean = true
) {
  const savedHandler = useRef(handler)
  savedHandler.current = handler

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!enabled) return

    const listener = (e: KeyboardEvent) => savedHandler.current(e)
    document.addEventListener('keydown', listener)
    return () => document.removeEventListener('keydown', listener)
  }, [enabled])
}
