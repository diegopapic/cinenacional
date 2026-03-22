// src/hooks/usePageView.ts
'use client';

import { useEffect, useEffectEvent, useRef } from 'react';
import { createLogger } from '@/lib/logger'

const log = createLogger('hook:pageView')

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
    log.warn('Failed to track pageview', { errorMessage: error instanceof Error ? error.message : String(error) });
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
 */
export function usePageView(options: PageViewOptions): void {
  const hasTracked = useRef(false);
  const onTrack = useEffectEvent(() => trackPageView(options));

  useEffect(() => {
    // Evitar doble tracking en StrictMode o re-renders
    if (hasTracked.current) return;

    hasTracked.current = true;
    onTrack();
  }, [options.pageType, options.movieId, options.personId]);
}

/**
 * Función utilitaria para trackear manualmente (sin hook)
 * Útil para eventos específicos o tracking condicional
 */
export { trackPageView };
