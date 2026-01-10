// src/components/admin/people/PersonFormFields/AlternativeNamesSection.tsx

'use client';

import { PersonAlternativeName } from '@/lib/people/peopleTypes';
import { Plus, Trash2, User } from 'lucide-react';

interface AlternativeNamesSectionProps {
    alternativeNames: PersonAlternativeName[];
    onAdd: () => void;
    onUpdate: (index: number, fullName: string) => void;
    onRemove: (index: number) => void;
}

export function AlternativeNamesSection({
    alternativeNames,
    onAdd,
    onUpdate,
    onRemove
}: AlternativeNamesSectionProps) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">
                    <User className="inline w-4 h-4 mr-1" />
                    Nombres Alternativos
                </label>
                <button
                    type="button"
                    onClick={onAdd}
                    className="inline-flex items-center px-3 py-1 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                    <Plus className="w-4 h-4 mr-1" />
                    Agregar
                </button>
            </div>

            <p className="text-xs text-gray-500">
                Nombres con los que aparece acreditada en algunas películas (ej: Andy Kleinman en lugar de Andrea Kleinman)
            </p>

            {alternativeNames.length === 0 ? (
                <p className="text-sm text-gray-400 italic">
                    No hay nombres alternativos registrados
                </p>
            ) : (
                <div className="space-y-2">
                    {alternativeNames.map((altName, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <input
                                type="text"
                                value={altName.fullName}
                                onChange={(e) => onUpdate(index, e.target.value)}
                                placeholder="Nombre alternativo completo"
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <button
                                type="button"
                                onClick={() => onRemove(index)}
                                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                title="Eliminar"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}