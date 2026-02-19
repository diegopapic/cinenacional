// src/components/admin/people/PersonFormFields/LinksSection.tsx

import { Plus, Trash2, ExternalLink, GripVertical } from 'lucide-react';
import { PersonLink } from '@/lib/people/peopleTypes';
import { PERSON_LINK_TYPE_OPTIONS, LINK_CATEGORIES } from '@/lib/people/peopleConstants';

interface LinksSectionProps {
  links: PersonLink[];
  onAddLink: () => void;
  onUpdateLink: (index: number, updates: Partial<PersonLink>) => void;
  onRemoveLink: (index: number) => void;
}

export function LinksSection({ 
  links, 
  onAddLink, 
  onUpdateLink, 
  onRemoveLink 
}: LinksSectionProps) {
  return (
    <div className="space-y-4">
      {/* Descripción y botón agregar */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">
          Agregue enlaces a perfiles en redes sociales, sitios web, etc.
        </p>
        <button
          type="button"
          onClick={onAddLink}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Agregar Enlace
        </button>
      </div>

      {/* Lista de links */}
      {links.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500 mb-4">
            No hay enlaces agregados
          </p>
          <button
            type="button"
            onClick={onAddLink}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Agregar primer enlace
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {links.map((link, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="space-y-4">
                {/* Header del link */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <GripVertical className="w-4 h-4" />
                    Enlace #{index + 1}
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveLink(index)}
                    className="text-red-600 hover:text-red-800 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Tipo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de enlace
                  </label>
                  <select
                    value={link.type}
                    onChange={(e) => onUpdateLink(index, { type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  >
                    {Object.entries(LINK_CATEGORIES).map(([key, category]) => (
                      <optgroup key={key} label={category.label}>
                        {category.types.map((type) => {
                          const option = PERSON_LINK_TYPE_OPTIONS.find(opt => opt.value === type);
                          return (
                            <option key={type} value={type}>
                              {option?.label || type}
                            </option>
                          );
                        })}
                      </optgroup>
                    ))}
                  </select>
                </div>

                {/* URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={link.url}
                      onChange={(e) => onUpdateLink(index, { url: e.target.value })}
                      placeholder="https://..."
                      required
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    />
                    {link.url && (
                      <button
                        type="button"
                        onClick={() => window.open(link.url, '_blank')}
                        title="Abrir enlace"
                        className="px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Opciones */}
                <div className="flex items-center gap-6">
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      checked={link.isVerified}
                      onChange={(e) => onUpdateLink(index, { isVerified: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Verificado</span>
                  </label>

                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      checked={link.isActive}
                      onChange={(e) => onUpdateLink(index, { isActive: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Activo</span>
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Información adicional */}
      {links.length > 0 && (
        <p className="text-xs text-gray-500">
          Los enlaces verificados se mostrarán con un ícono especial. 
          Los enlaces inactivos no se mostrarán en el sitio público.
        </p>
      )}
    </div>
  );
}