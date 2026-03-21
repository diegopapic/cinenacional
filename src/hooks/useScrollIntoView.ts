import { useEffect, type DependencyList } from 'react'

/**
 * Hace scroll a un elemento después del paint cuando cambian las dependencias.
 * Usa requestAnimationFrame para esperar al layout del browser.
 *
 * @param getElement - Función que retorna el elemento al que hacer scroll (o null)
 * @param deps - Dependencias que disparan el scroll
 * @param options - Opciones de scrollIntoView (default: smooth, nearest, center)
 */
export function useScrollIntoView(
  getElement: () => HTMLElement | null,
  deps: DependencyList,
  options: ScrollIntoViewOptions = { behavior: 'smooth', block: 'nearest', inline: 'center' }
) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    requestAnimationFrame(() => {
      const element = getElement()
      if (element) {
        element.scrollIntoView(options)
      }
    })
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps
}
