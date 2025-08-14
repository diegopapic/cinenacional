// src/components/admin/people/PersonFormFields/LocationFields.tsx

import { PersonFormData } from '@/lib/people/peopleTypes';
import { MapPin } from 'lucide-react';

interface LocationFieldsProps {
  formData: PersonFormData;
  updateField: <K extends keyof PersonFormData>(field: K, value: PersonFormData[K]) => void;
}

export function LocationFields({ formData, updateField }: LocationFieldsProps) {
  return (
    <div className="space-y-6">
      {/* Lugar de Nacimiento */}
      <div>
        <label htmlFor="birthLocation" className="block text-sm font-medium text-gray-700 mb-1">
          <span className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Lugar de Nacimiento
          </span>
        </label>
        <input
          type="text"
          id="birthLocation"
          value={formData.birthLocation}
          onChange={(e) => updateField('birthLocation', e.target.value)}
          placeholder="Ej: Buenos Aires, Argentina"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
        />
        <p className="mt-1 text-sm text-gray-500">
          Ingrese ciudad y país. Ej: "Buenos Aires, Argentina" o "Madrid, España"
        </p>
      </div>

      {/* Lugar de Fallecimiento */}
      <div>
        <label htmlFor="deathLocation" className="block text-sm font-medium text-gray-700 mb-1">
          <span className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Lugar de Fallecimiento
          </span>
        </label>
        <input
          type="text"
          id="deathLocation"
          value={formData.deathLocation}
          onChange={(e) => updateField('deathLocation', e.target.value)}
          placeholder="Ej: Buenos Aires, Argentina"
          disabled={!formData.deathDate}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 disabled:bg-gray-50 disabled:text-gray-500"
        />
        {!formData.deathDate && (
          <p className="mt-1 text-sm text-gray-500">
            Primero debe ingresar una fecha de fallecimiento
          </p>
        )}
      </div>
    </div>
  );
}