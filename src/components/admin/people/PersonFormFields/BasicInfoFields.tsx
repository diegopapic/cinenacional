// src/components/admin/people/PersonFormFields/BasicInfoFields.tsx

import { PersonFormData } from '@/lib/people/peopleTypes';
import { GENDER_OPTIONS } from '@/lib/people/peopleConstants';

interface BasicInfoFieldsProps {
  formData: PersonFormData;
  updateField: <K extends keyof PersonFormData>(field: K, value: PersonFormData[K]) => void;
  isEdit?: boolean;
}

export function BasicInfoFields({ formData, updateField, isEdit }: BasicInfoFieldsProps) {
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

      {/* Fechas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="birthDate" className="block text-sm font-medium text-gray-700 mb-1">
            Fecha de Nacimiento
          </label>
          <input
            type="date"
            id="birthDate"
            value={formData.birthDate  || ''}
            onChange={(e) => updateField('birthDate', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
          />
        </div>
        
        <div>
          <label htmlFor="deathDate" className="block text-sm font-medium text-gray-700 mb-1">
            Fecha de Fallecimiento
          </label>
          <input
            type="date"
            id="deathDate"
            value={formData.deathDate  || ''}
            onChange={(e) => updateField('deathDate', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
          />
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