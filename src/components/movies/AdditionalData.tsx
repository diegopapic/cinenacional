// src/components/movies/AdditionalData.tsx
'use client';

interface AlternativeTitle {
  id: number;
  title: string;
  description?: string | null;
}

interface AdditionalDataProps {
  alternativeTitles?: AlternativeTitle[];
  notes?: string | null;
}

export function AdditionalData({
  alternativeTitles = [],
  notes,
}: AdditionalDataProps) {
  return (
    <div>
      <h2 className="font-serif text-xl tracking-tight text-foreground md:text-2xl">Datos adicionales</h2>

      <div className="mt-4 border-t border-border/30 pt-4 md:mt-6 md:pt-6">
        {/* Títulos alternativos */}
        {alternativeTitles.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground/40 md:text-[11px] md:tracking-widest">
              {alternativeTitles.length === 1 ? 'Título alternativo' : 'Títulos alternativos'}
            </span>
            <div className="flex flex-col gap-1.5">
              {alternativeTitles.map((at) => (
                <div key={at.id} className="flex items-baseline gap-1.5">
                  <span className="text-[13px] leading-snug text-foreground/80 md:text-sm">
                    {at.title}
                  </span>
                  {at.description && (
                    <span className="text-[12px] text-muted-foreground/50">
                      ({at.description})
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notas */}
        {notes && (
          <div className={`flex flex-col gap-2${alternativeTitles.length > 0 ? ' mt-4' : ''}`}>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground/40 md:text-[11px] md:tracking-widest">
              Notas
            </span>
            <p className="text-[13px] leading-relaxed text-foreground/80 md:text-sm">
              {notes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
