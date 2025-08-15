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

            const formattedData = formatPersonDataForForm(person);
            // Si la persona tiene links, cargarlos también
            if (person.links) {
                formattedData.links = person.links;
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

    // Validar formulario
    const validate = useCallback((): boolean => {
        const validationErrors = validatePersonForm(formData);
        setErrors(validationErrors);
        return validationErrors.length === 0;
    }, [formData]);

    // Guardar persona
    const save = useCallback(async () => {
        console.log('FormData before save:', formData); // <-- Agregar esta línea
        console.log('Birth Location ID:', formData.birthLocationId);
        console.log('Death Location ID:', formData.deathLocationId);
        if (!validate()) {
            toast.error('Por favor corrige los errores en el formulario');
            return false;
        }

        try {
            setSaving(true);
            let savedPerson: PersonWithRelations;

            if (personId) {
                savedPerson = await peopleService.update(personId, formData);
                toast.success(PERSON_SUCCESS_MESSAGES.UPDATED);
            } else {
                savedPerson = await peopleService.create(formData);
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
        addLink,
        updateLink,
        removeLink,
        save,
        reset,
        cancel,
        reload: loadPerson,
    };
}