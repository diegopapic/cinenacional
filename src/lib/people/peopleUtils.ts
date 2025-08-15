// src/lib/people/peopleUtils.ts

import { Person, PersonWithRelations, PersonFormData, PersonLink, Gender } from './peopleTypes';
import { DEFAULT_PERSON_FORM_VALUES, DEFAULT_PERSON_LINK } from './peopleConstants';

/**
 * Genera un slug único para una persona basado en nombre y apellido
 */
export function generatePersonSlug(firstName?: string, lastName?: string): string {
    const parts = [firstName, lastName].filter(Boolean);
    if (parts.length === 0) return '';

    return parts
        .join(' ')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remover diacríticos
        .replace(/[^\w\s-]/g, '') // Remover caracteres especiales
        .trim()
        .replace(/\s+/g, '-') // Reemplazar espacios con guiones
        .replace(/-+/g, '-') // Reemplazar múltiples guiones con uno
        .replace(/^-+|-+$/g, ''); // Remover guiones al inicio y final
}

/**
 * Formatea el nombre completo de una persona
 */
export function formatPersonName(person: Partial<Person>): string {
    const parts = [person.firstName, person.lastName].filter(Boolean);
    return parts.join(' ') || 'Sin nombre';
}

/**
 * Formatea el género para mostrar
 */
export function formatGender(gender?: Gender | null): string {
    if (!gender) return '-';

    const genderMap: Record<Gender, string> = {
        MALE: 'Masculino',
        FEMALE: 'Femenino',
        OTHER: 'Otro',
    };

    return genderMap[gender] || '-';
}

/**
 * Convierte los datos del formulario para enviar a la API
 */
export function formatPersonFormDataForAPI(data: PersonFormData) {
    return {
        firstName: data.firstName || null,
        lastName: data.lastName || null,
        realName: data.realName || null,
        birthDate: data.birthDate || null,
        deathDate: data.deathDate || null,
        birthLocationId: data.birthLocationId || null,
        deathLocationId: data.deathLocationId || null,
        biography: data.biography || null,
        photoUrl: data.photoUrl || null,
        gender: data.gender || null,
        hideAge: data.hideAge,
        isActive: data.isActive,
        links: data.links.map((link, index) => ({
            ...link,
            displayOrder: index,
            title: link.title || null,
        })),
    };
}

// Función auxiliar para formatear el path de la ubicación
function formatLocationPath(location: any): string {
    // Si la ubicación ya tiene un path, usarlo
    if (location.path) return location.path;

    // Si no, construir el path con la información disponible
    const parts = [location.name];
    if (location.parent) {
        parts.push(location.parent.name);
        if (location.parent.parent) {
            parts.push(location.parent.parent.name);
        }
    }
    return parts.join(', ');
}

/**
 * Convierte los datos de la API al formato del formulario
 */
export function formatPersonDataForForm(person?: PersonWithRelations | null): PersonFormData {
    if (!person) return DEFAULT_PERSON_FORM_VALUES;

    return {
        firstName: person.firstName || '',
        lastName: person.lastName || '',
        realName: person.realName || '',
        birthDate: person.birthDate ? person.birthDate.split('T')[0] : '',
        deathDate: person.deathDate ? person.deathDate.split('T')[0] : '',
        birthLocationId: person.birthLocationId || null,
        deathLocationId: person.deathLocationId || null,
        birthLocation: person.birthLocation ? formatLocationPath(person.birthLocation) : '',
        deathLocation: person.deathLocation ? formatLocationPath(person.deathLocation) : '',
        biography: person.biography || '',
        photoUrl: person.photoUrl || '',
        gender: person.gender || '',
        hideAge: person.hideAge || false,
        isActive: person.isActive ?? true,
        links: [], // Se cargan por separado si es necesario
    };
}

/**
 * Valida los datos del formulario de persona
 */
export function validatePersonForm(data: PersonFormData): string[] {
    const errors: string[] = [];

    // Validar que tenga al menos nombre o apellido
    if (!data.firstName && !data.lastName) {
        errors.push('Debe ingresar al menos el nombre o el apellido');
    }

    // Validar fechas
    if (data.birthDate && data.deathDate) {
        const birthDate = new Date(data.birthDate);
        const deathDate = new Date(data.deathDate);

        if (deathDate < birthDate) {
            errors.push('La fecha de fallecimiento debe ser posterior a la fecha de nacimiento');
        }
    }

    // Validar links
    data.links.forEach((link, index) => {
        if (!link.url) {
            errors.push(`El link #${index + 1} debe tener una URL`);
        } else if (!isValidUrl(link.url)) {
            errors.push(`La URL del link #${index + 1} no es válida`);
        }
    });

    return errors;
}

/**
 * Valida si una cadena es una URL válida
 */
export function isValidUrl(url: string): boolean {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

/**
 * Ordena los links por displayOrder
 */
export function sortPersonLinks(links: PersonLink[]): PersonLink[] {
    return [...links].sort((a, b) => a.displayOrder - b.displayOrder);
}

/**
 * Agrega un nuevo link con valores por defecto
 */
export function addNewPersonLink(currentLinks: PersonLink[]): PersonLink[] {
    return [
        ...currentLinks,
        {
            ...DEFAULT_PERSON_LINK,
            displayOrder: currentLinks.length,
        },
    ];
}

/**
 * Actualiza un link específico
 */
export function updatePersonLink(
    links: PersonLink[],
    index: number,
    updates: Partial<PersonLink>
): PersonLink[] {
    const newLinks = [...links];
    newLinks[index] = { ...newLinks[index], ...updates };
    return newLinks;
}

/**
 * Elimina un link y reordena los displayOrder
 */
export function removePersonLink(links: PersonLink[], index: number): PersonLink[] {
    return links
        .filter((_, i) => i !== index)
        .map((link, i) => ({ ...link, displayOrder: i }));
}

/**
 * Genera el texto para mostrar la edad o fecha de nacimiento
 */
export function formatBirthInfo(person: Person): string {
    if (!person.birthDate) return '-';
    if (person.hideAge) return 'Fecha oculta';

    const birthDate = new Date(person.birthDate);
    const formattedDate = birthDate.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });

    // Si no hay fecha de muerte, calcular edad
    if (!person.deathDate) {
        const age = calculateAge(birthDate);
        return `${formattedDate} (${age} años)`;
    }

    // Si hay fecha de muerte, mostrar solo la fecha
    return formattedDate;
}

/**
 * Calcula la edad a partir de una fecha de nacimiento
 */
export function calculateAge(birthDate: Date, deathDate?: Date): number {
    const endDate = deathDate || new Date();
    let age = endDate.getFullYear() - birthDate.getFullYear();
    const monthDiff = endDate.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && endDate.getDate() < birthDate.getDate())) {
        age--;
    }

    return age;
}

/**
 * Genera un resumen de la persona para mostrar en listas
 */
export function getPersonSummary(person: Person): string {
    const parts = [];

    if (person.birthDate && !person.hideAge) {
        const year = new Date(person.birthDate).getFullYear();
        parts.push(`n. ${year}`);
    }

    if (person.deathDate) {
        const year = new Date(person.deathDate).getFullYear();
        parts.push(`f. ${year}`);
    }

    return parts.join(' - ');
}