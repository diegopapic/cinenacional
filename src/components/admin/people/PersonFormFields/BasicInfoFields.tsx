// src/components/admin/people/PersonFormFields/BasicInfoFields.tsx

'use client';

import { PersonFormData } from '@/lib/people/peopleTypes';
import { Calendar } from 'lucide-react';
import { useState, useEffect } from 'react';
import { PartialDate } from '@/lib/shared/dateUtils';

interface BasicInfoFieldsProps {
    formData: PersonFormData;
    updateField: <K extends keyof PersonFormData>(
        field: K,
        value: PersonFormData[K]
    ) => void;
    isEdit: boolean;
}

export function BasicInfoFields({
    formData,
    updateField,
    isEdit
}: BasicInfoFieldsProps) {
    // Estados para fechas parciales
    const [isPartialBirthDate, setIsPartialBirthDate] = useState(false);
    const [partialBirthDate, setPartialBirthDate] = useState<PartialDate>({
        year: null,
        month: null,
        day: null
    });
    
    const [isPartialDeathDate, setIsPartialDeathDate] = useState(false);
    const [partialDeathDate, setPartialDeathDate] = useState<PartialDate>({
        year: null,
        month: null,
        day: null
    });

    // Cargar estados de fechas parciales desde formData
    useEffect(() => {
        if (formData.isPartialBirthDate) {
            setIsPartialBirthDate(true);
            setPartialBirthDate(formData.partialBirthDate || { year: null, month: null, day: null });
        }
        if (formData.isPartialDeathDate) {
            setIsPartialDeathDate(true);
            setPartialDeathDate(formData.partialDeathDate || { year: null, month: null, day: null });
        }
    }, [formData.isPartialBirthDate, formData.isPartialDeathDate, formData.partialBirthDate, formData.partialDeathDate]);

    // Manejar cambios en fechas parciales
    const handlePartialBirthDateChange = (field: keyof PartialDate, value: any) => {
        const updated = { ...partialBirthDate, [field]: value ? parseInt(value) : null };
        setPartialBirthDate(updated);
        updateField('partialBirthDate', updated);
    };

    const handlePartialDeathDateChange = (field: keyof PartialDate, value: any) => {
        const updated = { ...partialDeathDate, [field]: value ? parseInt(value) : null };
        setPartialDeathDate(updated);
        updateField('partialDeathDate', updated);
    };

    const handleBirthDateTypeChange = (isPartial: boolean) => {
        setIsPartialBirthDate(isPartial);
        updateField('isPartialBirthDate', isPartial);
        if (!isPartial) {
            updateField('partialBirthDate', undefined);
        } else {
            updateField('birthDate', '');
        }
    };

    const handleDeathDateTypeChange = (isPartial: boolean) => {
        setIsPartialDeathDate(isPartial);
        updateField('isPartialDeathDate', isPartial);
        if (!isPartial) {
            updateField('partialDeathDate', undefined);
        } else {
            updateField('deathDate', '');
        }
    };

    // Generar opciones de años
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 150 }, (_, i) => currentYear - i);
    const months = [
        { value: 1, label: 'Enero' },
        { value: 2, label: 'Febrero' },
        { value: 3, label: 'Marzo' },
        { value: 4, label: 'Abril' },
        { value: 5, label: 'Mayo' },
        { value: 6, label: 'Junio' },
        { value: 7, label: 'Julio' },
        { value: 8, label: 'Agosto' },
        { value: 9, label: 'Septiembre' },
        { value: 10, label: 'Octubre' },
        { value: 11, label: 'Noviembre' },
        { value: 12, label: 'Diciembre' }
    ];

    return (
        <div className="space-y-6">
            {/* Nombre y datos básicos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nombre
                    </label>
                    <input
                        type="text"
                        value={formData.firstName}
                        onChange={(e) => updateField('firstName', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Ej: Juan"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Apellido
                    </label>
                    <input
                        type="text"
                        value={formData.lastName}
                        onChange={(e) => updateField('lastName', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Ej: Pérez"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nombre Real/Completo
                    </label>
                    <input
                        type="text"
                        value={formData.realName || ''}
                        onChange={(e) => updateField('realName', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Ej: Juan Carlos Pérez García"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Género
                    </label>
                    <select
                        value={formData.gender || ''}
                        onChange={(e) => updateField('gender', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="">Seleccionar...</option>
                        <option value="MALE">Masculino</option>
                        <option value="FEMALE">Femenino</option>
                        <option value="OTHER">Otro</option>
                    </select>
                </div>
            </div>

            {/* Fecha de nacimiento */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="inline w-4 h-4 mr-1" />
                    Fecha de Nacimiento
                </label>
                
                <div className="mb-2">
                    <label className="inline-flex items-center">
                        <input
                            type="checkbox"
                            checked={isPartialBirthDate}
                            onChange={(e) => handleBirthDateTypeChange(e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-600">
                            Fecha incompleta (solo año o año/mes)
                        </span>
                    </label>
                </div>

                {isPartialBirthDate ? (
                    <div className="grid grid-cols-3 gap-2">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Año</label>
                            <select
                                value={partialBirthDate.year || ''}
                                onChange={(e) => handlePartialBirthDateChange('year', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">----</option>
                                {years.map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Mes</label>
                            <select
                                value={partialBirthDate.month || ''}
                                onChange={(e) => handlePartialBirthDateChange('month', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                disabled={!partialBirthDate.year}
                            >
                                <option value="">--</option>
                                {months.map(month => (
                                    <option key={month.value} value={month.value}>
                                        {month.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Día</label>
                            <input
                                type="number"
                                min="1"
                                max="31"
                                value={partialBirthDate.day || ''}
                                onChange={(e) => handlePartialBirthDateChange('day', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                disabled={!partialBirthDate.month}
                                placeholder="--"
                            />
                        </div>
                    </div>
                ) : (
                    <input
                        type="date"
                        value={formData.birthDate}
                        onChange={(e) => updateField('birthDate', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                )}
            </div>

            {/* Fecha de muerte */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="inline w-4 h-4 mr-1" />
                    Fecha de Fallecimiento
                </label>
                
                <div className="mb-2">
                    <label className="inline-flex items-center">
                        <input
                            type="checkbox"
                            checked={isPartialDeathDate}
                            onChange={(e) => handleDeathDateTypeChange(e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-600">
                            Fecha incompleta (solo año o año/mes)
                        </span>
                    </label>
                </div>

                {isPartialDeathDate ? (
                    <div className="grid grid-cols-3 gap-2">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Año</label>
                            <select
                                value={partialDeathDate.year || ''}
                                onChange={(e) => handlePartialDeathDateChange('year', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">----</option>
                                {years.map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Mes</label>
                            <select
                                value={partialDeathDate.month || ''}
                                onChange={(e) => handlePartialDeathDateChange('month', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                disabled={!partialDeathDate.year}
                            >
                                <option value="">--</option>
                                {months.map(month => (
                                    <option key={month.value} value={month.value}>
                                        {month.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Día</label>
                            <input
                                type="number"
                                min="1"
                                max="31"
                                value={partialDeathDate.day || ''}
                                onChange={(e) => handlePartialDeathDateChange('day', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                disabled={!partialDeathDate.month}
                                placeholder="--"
                            />
                        </div>
                    </div>
                ) : (
                    <input
                        type="date"
                        value={formData.deathDate}
                        onChange={(e) => updateField('deathDate', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                )}
            </div>

            {/* Opciones adicionales */}
            <div className="space-y-3">
                <label className="inline-flex items-center">
                    <input
                        type="checkbox"
                        checked={formData.hideAge || false}
                        onChange={(e) => updateField('hideAge', e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                        Ocultar edad en el perfil público
                    </span>
                </label>

                <label className="inline-flex items-center">
                    <input
                        type="checkbox"
                        checked={formData.isActive !== false}
                        onChange={(e) => updateField('isActive', e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                        Persona activa (visible en el sitio)
                    </span>
                </label>
            </div>
        </div>
    );
}