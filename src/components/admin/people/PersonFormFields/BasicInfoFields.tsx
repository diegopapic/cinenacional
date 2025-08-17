// src/components/admin/people/PersonFormFields/BasicInfoFields.tsx

import { useState, useEffect, useCallback } from 'react';
import { PersonFormData } from '@/lib/people/peopleTypes';
import { GENDER_OPTIONS } from '@/lib/people/peopleConstants';
import { PartialDate, MONTHS } from '@/lib/shared/dateUtils';

interface BasicInfoFieldsProps {
  formData: PersonFormData;
  updateField: <K extends keyof PersonFormData>(field: K, value: PersonFormData[K]) => void;
  isEdit?: boolean;
}

export function BasicInfoFields({ formData, updateField, isEdit }: BasicInfoFieldsProps) {
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

  // Inicializar fechas parciales si estamos editando
  useEffect(() => {
    if (isEdit) {
      // Verificar si hay fechas parciales en formData
      if (formData.isPartialBirthDate && formData.partialBirthDate) {
        setIsPartialBirthDate(true);
        setPartialBirthDate(formData.partialBirthDate);
      } else if (formData.birthDate) {
        // Si hay fecha completa, mantener el checkbox desmarcado
        setIsPartialBirthDate(false);
      }
      
      if (formData.isPartialDeathDate && formData.partialDeathDate) {
        setIsPartialDeathDate(true);
        setPartialDeathDate(formData.partialDeathDate);
      } else if (formData.deathDate) {
        setIsPartialDeathDate(false);
      }
    }
  }, [isEdit, formData.isPartialBirthDate, formData.isPartialDeathDate]);

  // Handlers para cambios en fechas parciales
  const handlePartialBirthDateToggle = useCallback((checked: boolean) => {
    setIsPartialBirthDate(checked);
    
    if (checked) {
      // Al activar fecha parcial, limpiar fecha completa
      updateField('birthDate', '');
      updateField('isPartialBirthDate', true);
      // Si hay una fecha completa, convertirla a parcial (solo año y mes)
      if (formData.birthDate) {
        const [year, month] = formData.birthDate.split('-').map(v => parseInt(v));
        const newPartialDate = { 
          year: year || null, 
          month: month || null, 
          day: null // Siempre null para fechas parciales
        };
        setPartialBirthDate(newPartialDate);
        updateField('partialBirthDate', newPartialDate);
      }
    } else {
      // Al desactivar fecha parcial, limpiar datos parciales
      updateField('isPartialBirthDate', false);
      updateField('partialBirthDate', { year: null, month: null, day: null });
      setPartialBirthDate({ year: null, month: null, day: null });
    }
  }, [formData.birthDate, updateField]);

  const handlePartialDeathDateToggle = useCallback((checked: boolean) => {
    setIsPartialDeathDate(checked);
    
    if (checked) {
      updateField('deathDate', '');
      updateField('isPartialDeathDate', true);
      // Si hay una fecha completa, convertirla a parcial (solo año y mes)
      if (formData.deathDate) {
        const [year, month] = formData.deathDate.split('-').map(v => parseInt(v));
        const newPartialDate = { 
          year: year || null, 
          month: month || null, 
          day: null // Siempre null para fechas parciales
        };
        setPartialDeathDate(newPartialDate);
        updateField('partialDeathDate', newPartialDate);
      }
    } else {
      updateField('isPartialDeathDate', false);
      updateField('partialDeathDate', { year: null, month: null, day: null });
      setPartialDeathDate({ year: null, month: null, day: null });
    }
  }, [formData.deathDate, updateField]);

  // Handlers para cambios en los valores de las fechas parciales
  const handlePartialBirthDateChange = useCallback((field: keyof PartialDate, value: number | null) => {
    const newPartialDate = { ...partialBirthDate, [field]: value };
    setPartialBirthDate(newPartialDate);
    updateField('partialBirthDate', newPartialDate);
  }, [partialBirthDate, updateField]);

  const handlePartialDeathDateChange = useCallback((field: keyof PartialDate, value: number | null) => {
    const newPartialDate = { ...partialDeathDate, [field]: value };
    setPartialDeathDate(newPartialDate);
    updateField('partialDeathDate', newPartialDate);
  }, [partialDeathDate, updateField]);

  return (
    <div className="space-y-6">
      {/* Nombre y Apellido */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
            Nombre <span className="text-gray-400">(opcional)</span>
          </label>
          <input
            type="text"
            id="firstName"
            value={formData.firstName}
            onChange={(e) => updateField('firstName', e.target.value)}
            placeholder="Ej: Juan"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
          />
        </div>
        
        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
            Apellido <span className="text-gray-400">(opcional)</span>
          </label>
          <input
            type="text"
            id="lastName"
            value={formData.lastName}
            onChange={(e) => updateField('lastName', e.target.value)}
            placeholder="Ej: Pérez"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
          />
        </div>
      </div>
      
      <p className="text-sm text-gray-500">
        Debe ingresar al menos el nombre o el apellido
      </p>

      {/* Nombre Real */}
      <div>
        <label htmlFor="realName" className="block text-sm font-medium text-gray-700 mb-1">
          Nombre Real
          <span className="text-gray-400 ml-1">(si es diferente al artístico)</span>
        </label>
        <input
          type="text"
          id="realName"
          value={formData.realName}
          onChange={(e) => updateField('realName', e.target.value)}
          placeholder="Ej: Juan Carlos Pérez González"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
        />
      </div>

      {/* Género */}
      <div>
        <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">
          Género
        </label>
        <select
          id="gender"
          value={formData.gender}
          onChange={(e) => updateField('gender', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
        >
          <option value="">Seleccionar género</option>
          {GENDER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Fechas con soporte para fechas parciales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Fecha de Nacimiento */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fecha de Nacimiento
          </label>

          <div className="mb-2">
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                checked={isPartialBirthDate}
                onChange={(e) => handlePartialBirthDateToggle(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-600">
                Fecha incompleta
              </span>
            </label>
          </div>

          {!isPartialBirthDate ? (
            <input
              type="date"
              value={formData.birthDate || ''}
              onChange={(e) => updateField('birthDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="flex-1">
                  <input
                    type="number"
                    placeholder="Año"
                    min="1800"
                    max="2100"
                    value={partialBirthDate.year || ''}
                    onChange={(e) => handlePartialBirthDateChange(
                      'year', 
                      e.target.value ? parseInt(e.target.value) : null
                    )}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  />
                </div>
                <div className="flex-1">
                  <select
                    value={partialBirthDate.month || ''}
                    onChange={(e) => handlePartialBirthDateChange(
                      'month',
                      e.target.value ? parseInt(e.target.value) : null
                    )}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  >
                    <option value="">Mes (opcional)</option>
                    {MONTHS.map(month => (
                      <option key={month.value} value={month.value}>
                        {month.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Ingrese el año (requerido) y mes (opcional) si los conoce
              </p>
            </div>
          )}
        </div>
        
        {/* Fecha de Fallecimiento */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fecha de Fallecimiento
          </label>

          <div className="mb-2">
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                checked={isPartialDeathDate}
                onChange={(e) => handlePartialDeathDateToggle(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-600">
                Fecha incompleta
              </span>
            </label>
          </div>

          {!isPartialDeathDate ? (
            <input
              type="date"
              value={formData.deathDate || ''}
              onChange={(e) => updateField('deathDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="flex-1">
                  <input
                    type="number"
                    placeholder="Año"
                    min="1800"
                    max="2100"
                    value={partialDeathDate.year || ''}
                    onChange={(e) => handlePartialDeathDateChange(
                      'year',
                      e.target.value ? parseInt(e.target.value) : null
                    )}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  />
                </div>
                <div className="flex-1">
                  <select
                    value={partialDeathDate.month || ''}
                    onChange={(e) => handlePartialDeathDateChange(
                      'month',
                      e.target.value ? parseInt(e.target.value) : null
                    )}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  >
                    <option value="">Mes (opcional)</option>
                    {MONTHS.map(month => (
                      <option key={month.value} value={month.value}>
                        {month.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Ingrese el año (requerido) y mes (opcional) si los conoce
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Ocultar edad */}
      <div className="flex items-center">
        <input
          type="checkbox"
          id="hideAge"
          checked={formData.hideAge}
          onChange={(e) => updateField('hideAge', e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="hideAge" className="ml-2 block text-sm text-gray-700">
          Ocultar fecha de nacimiento en el sitio público
        </label>
      </div>

      {/* Estado activo */}
      <div className="flex items-center pt-2">
        <input
          type="checkbox"
          id="isActive"
          checked={formData.isActive}
          onChange={(e) => updateField('isActive', e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
          Persona activa
        </label>
      </div>
    </div>
  );
}