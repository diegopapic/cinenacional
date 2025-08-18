// src/components/admin/people/PersonForm.tsx

'use client';

import { useEffect, useState, useRef } from 'react';
import { Save, Loader2, AlertCircle } from 'lucide-react';
import { usePeopleForm } from '@/hooks/usePeopleForm';
import { PersonWithRelations } from '@/lib/people/peopleTypes';
import NationalitiesField from './PersonFormFields/NationalitiesField'

// Importar sub-componentes del formulario
import { BasicInfoFields } from './PersonFormFields/BasicInfoFields';
import { BiographyFields } from './PersonFormFields/BiographyFields';
import { LocationFields } from './PersonFormFields/LocationFields';
import { LinksSection } from './PersonFormFields/LinksSection';

interface PersonFormProps {
    personId?: number;
    initialData?: PersonWithRelations;
    onSuccess?: (person: PersonWithRelations) => void;
    onCancel?: () => void;
}

export function PersonForm({
    personId,
    initialData,
    onSuccess,
    onCancel
}: PersonFormProps) {
    const {
        formData,
        loading,
        saving,
        errors,
        isDirty,
        isEdit,
        updateField,
        updateFields,
        addLink,
        updateLink,
        removeLink,
        save,
        cancel,
    } = usePeopleForm({ personId, onSuccess });

    // Estado para nacionalidades
    const [nationalities, setNationalities] = useState<number[]>([]);

    // Usar ref para evitar loops infinitos
    const nationalitiesInitialized = useRef(false);

    // Si hay datos iniciales y no es edición, cargarlos
    useEffect(() => {
        if (initialData && !personId) {
            updateFields({
                firstName: initialData.firstName || '',
                lastName: initialData.lastName || '',
                realName: initialData.realName || '',
                gender: initialData.gender || '',
            });

            // Cargar nacionalidades si existen
            if (initialData.nationalities) {
                const nationalityIds = initialData.nationalities.map((n: any) => {
                    if (typeof n === 'number') return n;
                    if (typeof n === 'object' && n !== null) {
                        return n.locationId;
                    }
                    return null;
                }).filter((id): id is number => id !== null);
                setNationalities(nationalityIds);
            }
        }
    }, [initialData, personId, updateFields]);

    // Cargar nacionalidades cuando se edita una persona existente
    useEffect(() => {
        if (isEdit && formData.nationalities && formData.nationalities.length > 0 && !nationalitiesInitialized.current) {
            console.log('PersonForm - Loading nationalities for edit');
            console.log('PersonForm - formData.nationalities:', formData.nationalities);
            // Asegurarse de que tenemos un array de IDs
            const nationalityIds = Array.isArray(formData.nationalities)
                ? formData.nationalities.map((n: any) => {  // Cambiar de ( a {
                    console.log('PersonForm - Processing nationality item:', n);
                    const id = typeof n === 'object' ? n.locationId : n;
                    console.log('PersonForm - Extracted ID:', id);
                    return id;  // Agregar return explícito
                })  // Cambiar de ) a }
                : [];
            console.log('PersonForm - Final nationalityIds:', nationalityIds);

            setNationalities(nationalityIds);
            nationalitiesInitialized.current = true;
        }
    }, [isEdit, formData.nationalities]);

    // Función para manejar el cambio de nacionalidades
    const handleNationalitiesChange = (newNationalities: number[]) => {
        setNationalities(newNationalities);
        updateField('nationalities', newNationalities);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await save();
    };

    const handleCancel = () => {
        if (onCancel) {
            onCancel();
        } else {
            cancel();
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Mostrar errores si hay */}
            {errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex">
                        <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-red-800">
                                Se encontraron los siguientes errores:
                            </h3>
                            <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                                {errors.map((error, index) => (
                                    <li key={index}>{error}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {/* Información básica */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-6">
                    Información Personal
                </h3>
                <BasicInfoFields
                    formData={formData}
                    updateField={updateField}
                    isEdit={isEdit}
                />
            </div>

            {/* Nacionalidades */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-6">
                    Nacionalidades
                </h3>
                <NationalitiesField
                    value={nationalities}
                    onChange={handleNationalitiesChange}
                    disabled={saving}
                />
            </div>

            {/* Ubicaciones */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-6">
                    Ubicaciones
                </h3>
                <LocationFields
                    formData={formData}
                    updateField={updateField}
                />
            </div>

            {/* Biografía e información adicional */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-6">
                    Información Adicional
                </h3>
                <BiographyFields
                    formData={formData}
                    updateField={updateField}
                />
            </div>

            {/* Links */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-6">
                    Enlaces
                </h3>
                <LinksSection
                    links={formData.links}
                    onAddLink={addLink}
                    onUpdateLink={updateLink}
                    onRemoveLink={removeLink}
                />
            </div>

            {/* Botones de acción */}
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                        {isDirty && (
                            <span className="text-orange-600">
                                * Hay cambios sin guardar
                            </span>
                        )}
                    </div>

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={handleCancel}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            Cancelar
                        </button>

                        <button
                            type="submit"
                            disabled={saving || loading}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Guardando...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    {isEdit ? 'Actualizar' : 'Crear'} Persona
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </form>
    );
}