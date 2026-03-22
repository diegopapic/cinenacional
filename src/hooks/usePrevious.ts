import { useEffect, useRef } from 'react'

/**
 * Hook que trackea el valor anterior de una variable.
 * Retorna `undefined` en el primer render, luego el valor del render anterior.
 *
 * Reemplaza el pattern de "ref.current durante render" que el React Compiler
 * no puede optimizar.
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined)

  useEffect(() => {
    ref.current = value
  }, [value])

  // eslint-disable-next-line react-hooks/refs -- Infrastructure hook: returning ref.current is the intended API
  return ref.current
}
