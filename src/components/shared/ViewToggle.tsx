'use client';

import { LayoutGrid, List } from 'lucide-react';
import type { ViewMode } from '@/lib/shared/listTypes';

export type { ViewMode };

interface ViewToggleProps {
  viewMode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export default function ViewToggle({ viewMode, onChange }: ViewToggleProps) {
  return (
    <div className="flex overflow-hidden border border-border/30">
      <button
        onClick={() => onChange('compact')}
        className={`
          flex h-8 w-8 items-center justify-center transition-colors
          ${viewMode === 'compact'
            ? 'bg-muted/30 text-foreground/70'
            : 'text-muted-foreground/40 hover:text-foreground/60'
          }
        `}
        title="Vista compacta"
        aria-label="Vista compacta"
      >
        <LayoutGrid className="h-3.5 w-3.5" />
      </button>

      <button
        onClick={() => onChange('detailed')}
        className={`
          flex h-8 w-8 items-center justify-center border-l border-border/30 transition-colors
          ${viewMode === 'detailed'
            ? 'bg-muted/30 text-foreground/70'
            : 'text-muted-foreground/40 hover:text-foreground/60'
          }
        `}
        title="Vista detallada"
        aria-label="Vista detallada"
      >
        <List className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
