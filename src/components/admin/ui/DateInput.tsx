// src/components/admin/ui/DateInput.tsx

'use client';

import { useState, useRef, useEffect } from 'react';
import { Calendar } from 'lucide-react';

interface DateInputProps {
    value: string; // formato ISO: YYYY-MM-DD
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

/**
 * Componente de fecha personalizado que:
 * - Muestra el formato DD/MM/AAAA
 * - Permite escribir la fecha manualmente
 * - Permite seleccionar desde un calendario
 */
export function DateInput({ value, onChange, placeholder = 'DD/MM/AAAA', className = '' }: DateInputProps) {
    const [displayValue, setDisplayValue] = useState('');
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const calendarRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const hiddenDateRef = useRef<HTMLInputElement>(null);

    // Convertir ISO (YYYY-MM-DD) a display (DD/MM/AAAA)
    const isoToDisplay = (isoDate: string): string => {
        if (!isoDate) return '';
        const parts = isoDate.split('-');
        if (parts.length !== 3) return '';
        const [year, month, day] = parts;
        return `${day}/${month}/${year}`;
    };

    // Convertir display (DD/MM/AAAA) a ISO (YYYY-MM-DD)
    const displayToIso = (displayDate: string): string => {
        if (!displayDate) return '';
        const parts = displayDate.split('/');
        if (parts.length !== 3) return '';
        const [day, month, year] = parts;
        if (!day || !month || !year) return '';
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    };

    // Validar si una fecha es válida
    const isValidDate = (day: number, month: number, year: number): boolean => {
        if (year < 1800 || year > 2100) return false;
        if (month < 1 || month > 12) return false;
        if (day < 1 || day > 31) return false;

        const date = new Date(year, month - 1, day);
        return date.getFullYear() === year &&
               date.getMonth() === month - 1 &&
               date.getDate() === day;
    };

    // Sincronizar valor externo con display
    useEffect(() => {
        setDisplayValue(isoToDisplay(value));
    }, [value]);

    // Cerrar calendario al hacer clic fuera
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
                setIsCalendarOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Manejar cambio en el input de texto
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let input = e.target.value;

        // Solo permitir números y /
        input = input.replace(/[^\d/]/g, '');

        // Auto-insertar / después de día y mes
        if (input.length === 2 && !input.includes('/')) {
            input = input + '/';
        } else if (input.length === 5 && input.split('/').length === 2) {
            input = input + '/';
        }

        // Limitar longitud
        if (input.length > 10) {
            input = input.substring(0, 10);
        }

        setDisplayValue(input);

        // Si tiene el formato completo, validar y actualizar
        if (input.length === 10) {
            const parts = input.split('/');
            if (parts.length === 3) {
                const day = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10);
                const year = parseInt(parts[2], 10);

                if (isValidDate(day, month, year)) {
                    onChange(displayToIso(input));
                }
            }
        } else if (input === '') {
            onChange('');
        }
    };

    // Manejar cambio desde el calendario nativo
    const handleCalendarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const isoDate = e.target.value;
        onChange(isoDate);
        setIsCalendarOpen(false);
    };

    // Abrir el calendario nativo
    const openCalendar = () => {
        if (hiddenDateRef.current) {
            hiddenDateRef.current.showPicker();
        }
    };

    return (
        <div className={`relative ${className}`} ref={calendarRef}>
            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    value={displayValue}
                    onChange={handleInputChange}
                    placeholder={placeholder}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                    type="button"
                    onClick={openCalendar}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Abrir calendario"
                >
                    <Calendar className="w-5 h-5" />
                </button>
                {/* Input date oculto para usar el picker nativo */}
                <input
                    ref={hiddenDateRef}
                    type="date"
                    value={value}
                    onChange={handleCalendarChange}
                    className="absolute opacity-0 w-0 h-0 pointer-events-none"
                    tabIndex={-1}
                />
            </div>
        </div>
    );
}
