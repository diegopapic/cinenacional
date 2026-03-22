import { useEffect, useRef } from 'react'

/**
 * Hook que ejecuta un callback cuando un valor cambia.
 * Reemplaza el pattern de comparar ref.current durante render.
 *
 * El callback recibe el valor actual y el valor anterior.
 * No se ejecuta en el primer render (solo en cambios subsiguientes).
 */
export function useValueChange<T>(
  value: T,
  callback: (current: T, previous: T) => void,
) {
  const prevRef = useRef(value)
  const callbackRef = useRef(callback)
  // eslint-disable-next-line react-hooks/refs -- Infrastructure hook: updating callback ref to avoid stale closures
  callbackRef.current = callback

  useEffect(() => {
    const prev = prevRef.current
    if (value !== prev) {
      prevRef.current = value
      callbackRef.current(value, prev)
    }
  }, [value])
}
