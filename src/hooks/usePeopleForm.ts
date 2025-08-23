// src/hooks/usePeopleForm.ts

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { peopleService } from '@/services/people.service';
import {
    PersonFormData,
    PersonWithRelations,
    PersonLink
} from '@/lib/people/peopleTypes';
import {
    DEFAULT_PERSON_FORM_VALUES,
    PERSON_ERROR_MESSAGES,
    PERSON_SUCCESS_MESSAGES
} from '@/lib/people/peopleConstants';
import {
    formatPersonDataForForm,
    validatePersonForm,
    addNewPersonLink,
    updatePersonLink,
    removePersonLink
} from '@/lib/people/peopleUtils';
import { toast } from 'react-hot-toast';

interface UsePeopleFormProps {
    personId?: number;
    onSuccess?: (person: PersonWithRelations) => void;
}

export function usePeopleForm({ personId, onSuccess }: UsePeopleFormProps = {}) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState<PersonFormData>(DEFAULT_PERSON_FORM_VALUES);
    const [errors, setErrors] = useState<string[]>([]);
    const [isDirty, setIsDirty] = useState(false);

    // Cargar datos de la persona si es edición
    useEffect(() => {
        if (personId) {
            loadPerson();
        }
    }, [personId]);

    // Cargar persona existente
    const loadPerson = async () => {
    if (!personId) return;

    try {
        setLoading(true);
        const person = await peopleService.getById(personId);
        console.log('usePeopleForm - Raw person from getById:', person);
        const formattedData = formatPersonDataForForm(person);
        
        // NUEVO: Agregar el ID al formData para saber que es edición
        formattedData.id = personId;
        
        // NUEVO: Preservar el photoPublicId si existe
        if (person.photoPublicId) {
            formattedData.photoPublicId = person.photoPublicId;
        }
        
        // Si la persona tiene links, cargarlos también
        if (person.links) {
            formattedData.links = person.links;
        }

        // Si la persona tiene nacionalidades, cargarlas como array de IDs
        if (person.nationalities && Array.isArray(person.nationalities)) {
            formattedData.nationalities = person.nationalities.map((n: any) => {
                if (typeof n === 'number') {
                    return n;
                } 
                if (typeof n === 'object' && n !== null) {
                    const id = n.locationId || n;
                    return id;
                }
                return n;
            });
        } else {
            formattedData.nationalities = [];
        }

        setFormData(formattedData);
    } catch (error) {
        console.error('Error loading person:', error);
        toast.error('No se pudo cargar la información de la persona');
    } finally {
        setLoading(false);
    }
};

    // Actualizar campo del formulario
    const updateField = useCallback(<K extends keyof PersonFormData>(
        field: K,
        value: PersonFormData[K]
    ) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setIsDirty(true);
        setErrors([]); // Limpiar errores al modificar
    }, []);

    // Actualizar múltiples campos
    const updateFields = useCallback((updates: Partial<PersonFormData>) => {
        setFormData(prev => ({ ...prev, ...updates }));
        setIsDirty(true);
        setErrors([]);
    }, []);

    // Manejo de links
    const addLink = useCallback(() => {
        setFormData(prev => ({
            ...prev,
            links: addNewPersonLink(prev.links)
        }));
        setIsDirty(true);
    }, []);

    const updateLink = useCallback((index: number, updates: Partial<PersonLink>) => {
        setFormData(prev => ({
            ...prev,
            links: updatePersonLink(prev.links, index, updates)
        }));
        setIsDirty(true);
    }, []);

    const removeLink = useCallback((index: number) => {
        setFormData(prev => ({
            ...prev,
            links: removePersonLink(prev.links, index)
        }));
        setIsDirty(true);
    }, []);

    // Manejo de nacionalidades
    const updateNationalities = useCallback((nationalities: number[]) => {
        setFormData(prev => ({
            ...prev,
            nationalities
        }));
        setIsDirty(true);
        setErrors([]);
    }, []);

    // Validar formulario
    const validate = useCallback((): boolean => {
        const validationErrors = validatePersonForm(formData);
        setErrors(validationErrors);
        return validationErrors.length === 0;
    }, [formData]);

    // Guardar persona
    const save = useCallback(async () => {
        console.log('FormData before save:', formData);
        console.log('Birth Location ID:', formData.birthLocationId);
        console.log('Death Location ID:', formData.deathLocationId);
        console.log('Nationalities:', formData.nationalities); // Log de nacionalidades

        if (!validate()) {
            toast.error('Por favor corrige los errores en el formulario');
            return false;
        }

        try {
            setSaving(true);
            let savedPerson: PersonWithRelations;

            // Preparar datos para enviar
            const dataToSave = {
                ...formData,
                nationalities: formData.nationalities || []
            };

            if (personId) {
                savedPerson = await peopleService.update(personId, dataToSave);
                toast.success(PERSON_SUCCESS_MESSAGES.UPDATED);
            } else {
                savedPerson = await peopleService.create(dataToSave);
                toast.success(PERSON_SUCCESS_MESSAGES.CREATED);
            }

            setIsDirty(false);

            if (onSuccess) {
                onSuccess(savedPerson);
            } else {
                router.push('/admin/people');
            }

            return true;
        } catch (error) {
            console.error('Error saving person:', error);

            const errorMessage = error instanceof Error
                ? error.message
                : personId ? PERSON_ERROR_MESSAGES.UPDATE_ERROR : PERSON_ERROR_MESSAGES.CREATE_ERROR;

            toast.error(errorMessage);

            return false;
        } finally {
            setSaving(false);
        }
    }, [formData, personId, validate, router, onSuccess]);

    // Resetear formulario
    const reset = useCallback(() => {
        setFormData(DEFAULT_PERSON_FORM_VALUES);
        setErrors([]);
        setIsDirty(false);
    }, []);

    // Cancelar y volver
    const cancel = useCallback(() => {
        if (isDirty) {
            const confirmed = window.confirm('¿Estás seguro? Se perderán los cambios no guardados.');
            if (!confirmed) return;
        }
        router.push('/admin/people');
    }, [isDirty, router]);

    return {
        // Estado
        formData,
        loading,
        saving,
        errors,
        isDirty,
        isEdit: !!personId,

        // Acciones
        updateField,
        updateFields,
        updateNationalities, // Nueva función para actualizar nacionalidades
        addLink,
        updateLink,
        removeLink,
        save,
        reset,
        cancel,
        reload: loadPerson,
    };
}