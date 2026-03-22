import { useEffect } from 'react'

/**
 * Controla document.body.style.overflow basado en un booleano.
 * Cuando `hidden` es true, bloquea el scroll del body.
 * Restaura el overflow original al desmontar o cuando `hidden` cambia a false.
 */
export function useBodyOverflow(hidden: boolean) {
  useEffect(() => {
    if (!hidden) return

    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [hidden])
}
