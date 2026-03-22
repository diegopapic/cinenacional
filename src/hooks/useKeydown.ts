import { useEffect, useEffectEvent } from 'react'

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
  const onKeydown = useEffectEvent(handler)

  useEffect(() => {
    if (!enabled) return

    document.addEventListener('keydown', onKeydown)
    return () => document.removeEventListener('keydown', onKeydown)
  }, [enabled])
}
