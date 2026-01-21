// src/app/(site)/listados/peliculas/ViewToggle.tsx
'use client';

import { ViewMode } from '@/lib/movies/movieListTypes';

interface ViewToggleProps {
  viewMode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export default function ViewToggle({ viewMode, onChange }: ViewToggleProps) {
  return (
    <div className="flex bg-gray-800 rounded-lg p-1">
      {/* Vista compacta (grid) */}
      <button
        onClick={() => onChange('compact')}
        className={`
          p-2 rounded-md transition-all
          ${viewMode === 'compact'
            ? 'bg-gray-700 text-white'
            : 'text-gray-400 hover:text-white'
          }
        `}
        title="Vista compacta"
        aria-label="Vista compacta"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      </button>

      {/* Vista detallada (lista) */}
      <button
        onClick={() => onChange('detailed')}
        className={`
          p-2 rounded-md transition-all
          ${viewMode === 'detailed'
            ? 'bg-gray-700 text-white'
            : 'text-gray-400 hover:text-white'
          }
        `}
        title="Vista detallada"
        aria-label="Vista detallada"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      </button>
    </div>
  );
}
