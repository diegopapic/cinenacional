import { useEffect, useEffectEvent } from 'react'

/**
 * Registra un event listener en window (o un elemento).
 * Se limpia automáticamente al desmontar o cuando `enabled` pasa a false.
 *
 * @param event - Nombre del evento (ej: 'scroll', 'resize')
 * @param handler - Callback del evento
 * @param enabled - Si false, no se registra el listener (default: true)
 * @param options - Opciones del addEventListener (ej: { passive: true })
 */
export function useWindowEvent<K extends keyof WindowEventMap>(
  event: K,
  handler: (e: WindowEventMap[K]) => void,
  enabled: boolean = true,
  options?: boolean | AddEventListenerOptions
) {
  const onEvent = useEffectEvent(handler)

  useEffect(() => {
    if (!enabled) return

    window.addEventListener(event, onEvent, options)
    return () => window.removeEventListener(event, onEvent, options)
  }, [event, enabled, options])
}
