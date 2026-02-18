// src/app/listados/estrenos/page.tsx
'use client';

import { Suspense } from 'react';
import EstrenosContent from './EstrenosContent';

export const dynamic = 'force-dynamic';

export default function EstrenosPage() {
  return (
    <Suspense fallback={
      <div className="mx-auto flex min-h-[60vh] w-full max-w-7xl items-center justify-center px-4">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-accent" />
          <p className="text-[13px] text-muted-foreground/40">Cargando estrenos…</p>
        </div>
      </div>
    }>
      <EstrenosContent />
    </Suspense>
  );
}
