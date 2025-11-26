// src/app/listados/estrenos/page.tsx
'use client';

import { Suspense } from 'react';
import EstrenosContent from './EstrenosContent';

export const dynamic = 'force-dynamic';

export default function EstrenosPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-gray-400">Cargando estrenos...</p>
        </div>
      </div>
    }>
      <EstrenosContent />
    </Suspense>
  );
}