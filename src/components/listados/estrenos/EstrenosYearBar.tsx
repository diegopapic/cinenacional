// src/components/listados/estrenos/EstrenosYearBar.tsx
'use client';

import { getDecadeById, getCurrentYear, generateDecades } from '@/lib/estrenos/estrenosUtils';
import { DecadePeriod } from '@/lib/estrenos/estrenosTypes';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface EstrenosYearBarProps {
    period: DecadePeriod;
    selectedYear: number | null;
    onYearChange: (year: number | null) => void; // Ahora acepta null
    onPeriodChange: (period: DecadePeriod) => void;
}

export default function EstrenosYearBar({
    period,
    selectedYear,
    onYearChange,
    onPeriodChange
}: EstrenosYearBarProps) {
    // Solo mostrar si hay una década seleccionada
    if (period === 'all' || period === 'upcoming') {
        return null;
    }

    const decade = getDecadeById(period);
    if (!decade) {
        return null;
    }

    const currentYear = getCurrentYear();
    const allDecades = generateDecades();

    // Encontrar índice de la década actual
    const currentDecadeIndex = allDecades.findIndex(d => d.id === period);

    // Verificar si hay década anterior y posterior
    const hasPreviousDecade = currentDecadeIndex < allDecades.length - 1; // Recordar que está en orden inverso
    const hasNextDecade = currentDecadeIndex > 0;

    // Obtener década anterior y posterior
    const previousDecade = hasPreviousDecade ? allDecades[currentDecadeIndex + 1] : null;
    const nextDecade = hasNextDecade ? allDecades[currentDecadeIndex - 1] : null;

    const handlePreviousDecade = () => {
        if (previousDecade) {
            onPeriodChange(previousDecade.id);
        }
    };

    const handleNextDecade = () => {
        if (nextDecade) {
            onPeriodChange(nextDecade.id);
        }
    };

    return (
        <div className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-center gap-2 py-2">
                    {/* Flecha izquierda - Década anterior */}
                    <button
                        onClick={handlePreviousDecade}
                        disabled={!hasPreviousDecade}
                        className={`
              flex-shrink-0 p-2 rounded-lg transition-all
              ${hasPreviousDecade
                                ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
                                : 'bg-gray-800/50 text-gray-600 cursor-not-allowed'
                            }
            `}
                        title={previousDecade ? `${previousDecade.label}` : 'No hay década anterior'}
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>

                    {/* Años de la década */}
                    <div className="flex items-center gap-2 overflow-x-auto px-2 
  [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">

                        {/* Botón de la década completa */}
<button
  onClick={() => onYearChange(null as any)} // null = toda la década
  className={`
    flex-shrink-0 px-4 py-2 rounded-lg font-medium transition-all
    ${selectedYear === null
      ? 'bg-orange-600 text-white shadow-lg scale-105' 
      : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
    }
  `}
>
  {decade.label}
</button>

                        {decade.years.map((year) => {
                            const isSelected = selectedYear === year;
                            const isFuture = year > currentYear;

                            return (
                                <button
                                    key={year}
                                    onClick={() => onYearChange(year)}
                                    disabled={isFuture}
                                    className={`
          flex-shrink-0 px-4 py-2 rounded-lg font-medium transition-all
          ${isSelected
                                            ? 'bg-orange-600 text-white shadow-lg scale-105'
                                            : isFuture
                                                ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                                                : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
                                        }
        `}
                                >
                                    {year}
                                </button>
                            );
                        })}
                    </div>
                    {/* Flecha derecha - Década posterior */}
                    <button
                        onClick={handleNextDecade}
                        disabled={!hasNextDecade}
                        className={`
              flex-shrink-0 p-2 rounded-lg transition-all
              ${hasNextDecade
                                ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
                                : 'bg-gray-800/50 text-gray-600 cursor-not-allowed'
                            }
            `}
                        title={nextDecade ? `${nextDecade.label}` : 'No hay década posterior'}
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}