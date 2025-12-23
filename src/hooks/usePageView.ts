// src/hooks/usePageView.ts
'use client';

import { useEffect, useRef } from 'react';

// Tipos de página disponibles
export type PageType = 
  | 'HOME'
  | 'MOVIE'
  | 'PERSON'
  | 'EPHEMERIS'
  | 'PERSON_LIST'
  | 'RELEASES'
  | 'OBITUARIES';

interface PageViewOptions {
  pageType: PageType;
  movieId?: number;
  personId?: number;
  extraData?: Record<string, any>;
}

// Generar o recuperar sessionId
function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  
  const SESSION_KEY = 'cn_session_id';
  let sessionId = sessionStorage.getItem(SESSION_KEY);
  
  if (!sessionId) {
    // Generar UUID v4
    sessionId = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  
  return sessionId;
}

// Función para enviar el pageview
async function trackPageView(options: PageViewOptions): Promise<void> {
  try {
    const sessionId = getSessionId();
    
    const payload = {
      ...options,
      sessionId,
    };
    
    // Usar sendBeacon si está disponible (no bloquea navegación)
    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      navigator.sendBeacon('/api/analytics/pageview', blob);
    } else {
      // Fallback a fetch
      await fetch('/api/analytics/pageview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true, // Permite que la request continúe incluso si el usuario navega
      });
    }
  } catch (error) {
    // Silenciar errores de analytics - no afectar UX
    console.warn('Error tracking pageview:', error);
  }
}

/**
 * Hook para trackear vistas de página
 * 
 * @example
 * // En página de película
 * usePageView({ pageType: 'MOVIE', movieId: movie.id });
 * 
 * // En página de persona
 * usePageView({ pageType: 'PERSON', personId: person.id });
 * 
 * // En home
 * usePageView({ pageType: 'HOME' });
 * 
 * // En listado con filtros
 * usePageView({ 
 *   pageType: 'PERSON_LIST', 
 *   extraData: { filters: { gender: 'FEMALE', decade: '1990' } } 
 * });
 * 
 * // En efemérides
 * usePageView({ 
 *   pageType: 'EPHEMERIS', 
 *   extraData: { date: '12-25' } 
 * });
 * 
 * // En estrenos
 * usePageView({ 
 *   pageType: 'RELEASES', 
 *   extraData: { year: 2024 } 
 * });
 */
export function usePageView(options: PageViewOptions): void {
  const hasTracked = useRef(false);
  
  useEffect(() => {
    // Evitar doble tracking en StrictMode o re-renders
    if (hasTracked.current) return;
    
    // No trackear en desarrollo si se prefiere
    // if (process.env.NODE_ENV === 'development') return;
    
    hasTracked.current = true;
    trackPageView(options);
    
    // Cleanup: si el componente se desmonta antes de trackear, permitir re-track
    return () => {
      // No reseteamos hasTracked para evitar double-tracking
    };
  }, [options.pageType, options.movieId, options.personId]);
}

/**
 * Función utilitaria para trackear manualmente (sin hook)
 * Útil para eventos específicos o tracking condicional
 */
export { trackPageView };