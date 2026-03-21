import { useEffect, useRef } from 'react'

/**
 * Ejecuta un callback a intervalos regulares.
 * Se limpia automáticamente al desmontar.
 *
 * @param callback - Función a ejecutar en cada tick
 * @param delay - Intervalo en ms (null para pausar)
 */
export function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback)

  // Mantener la referencia al callback actualizada
  savedCallback.current = callback

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (delay === null) return

    const id = setInterval(() => savedCallback.current(), delay)
    return () => clearInterval(id)
  }, [delay])
}
