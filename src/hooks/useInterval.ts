import { useEffect, useEffectEvent } from 'react'

/**
 * Ejecuta un callback a intervalos regulares.
 * Se limpia automáticamente al desmontar.
 *
 * @param callback - Función a ejecutar en cada tick
 * @param delay - Intervalo en ms (null para pausar)
 */
export function useInterval(callback: () => void, delay: number | null) {
  const onTick = useEffectEvent(callback)

  useEffect(() => {
    if (delay === null) return

    const id = setInterval(onTick, delay)
    return () => clearInterval(id)
  }, [delay])
}
