// src/app/listados/obituarios/page.tsx
'use client';

import { Suspense } from 'react';
import ObituariosContent from './ObituariosContent';

export const dynamic = 'force-dynamic';

export default function ObituariosPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-gray-400">Cargando obituarios...</p>
        </div>
      </div>
    }>
      <ObituariosContent />
    </Suspense>
  );
}