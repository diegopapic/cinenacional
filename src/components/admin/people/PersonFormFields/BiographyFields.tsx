// src/components/admin/people/PersonFormFields/BiographyFields.tsx

import { PersonFormData } from '@/lib/people/peopleTypes';
import { Image, FileText } from 'lucide-react';

interface BiographyFieldsProps {
  formData: PersonFormData;
  updateField: <K extends keyof PersonFormData>(field: K, value: PersonFormData[K]) => void;
}

export function BiographyFields({ formData, updateField }: BiographyFieldsProps) {
  return (
    <div className="space-y-6">
      {/* Biografía */}
      <div>
        <label htmlFor="biography" className="block text-sm font-medium text-gray-700 mb-1">
          <span className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Biografía
          </span>
        </label>
        <textarea
          id="biography"
          value={formData.biography}
          onChange={(e) => updateField('biography', e.target.value)}
          placeholder="Escriba aquí la biografía de la persona..."
          rows={6}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 resize-none"
        />
        <div className="mt-1 flex justify-between text-sm text-gray-500">
          <span>Puede usar formato Markdown para dar estilo al texto</span>
          <span>{(formData.biography  || '').length } caracteres</span>
        </div>
      </div>

      {/* URL de Foto */}
      <div>
        <label htmlFor="photoUrl" className="block text-sm font-medium text-gray-700 mb-1">
          <span className="flex items-center gap-2">
            <Image className="w-4 h-4" />
            URL de Foto
          </span>
        </label>
        <input
          type="url"
          id="photoUrl"
          value={formData.photoUrl}
          onChange={(e) => updateField('photoUrl', e.target.value)}
          placeholder="https://ejemplo.com/foto.jpg"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
        />
        <p className="mt-1 text-sm text-gray-500">
          Ingrese la URL completa de la imagen. Se recomienda usar imágenes de al menos 400x600px
        </p>
      </div>

      {/* Vista previa de la imagen si hay URL */}
      {formData.photoUrl && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Vista previa
          </label>
          <div className="relative w-32 h-48 rounded-lg overflow-hidden border border-gray-300">
            <img
              src={formData.photoUrl}
              alt="Vista previa"
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const errorDiv = target.nextElementSibling as HTMLElement;
                if (errorDiv) errorDiv.style.display = 'flex';
              }}
            />
            <div 
              className="absolute inset-0 bg-gray-100 items-center justify-center hidden"
              style={{ display: 'none' }}
            >
              <span className="text-sm text-gray-500">
                Error al cargar imagen
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}