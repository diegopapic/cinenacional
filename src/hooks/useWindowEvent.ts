import { useEffect, useRef } from 'react'

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
  const savedHandler = useRef(handler)
  savedHandler.current = handler

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!enabled) return

    const listener = (e: WindowEventMap[K]) => savedHandler.current(e)
    window.addEventListener(event, listener, options)
    return () => window.removeEventListener(event, listener, options)
  }, [event, enabled, options])
}
