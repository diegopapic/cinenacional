// src/lib/people/peopleUtils.ts

import { Person, PersonWithRelations, PersonFormData, PersonLink, Gender } from './peopleTypes';
import { DEFAULT_PERSON_FORM_VALUES, DEFAULT_PERSON_LINK } from './peopleConstants';
import { PartialDate, partialFieldsToDate } from '@/lib/shared/dateUtils';

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
* NOTA: Esta función ya no se usa, se usa formatPersonDataForAPI en people.service.ts
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

// Función auxiliar para formatear el path de la ubicación (recursiva para cualquier profundidad)
function formatLocationPath(location: any): string {
   // Si la ubicación ya tiene un path, usarlo
   if (location.path) return location.path;

   // Construir el path de forma recursiva
   const parts: string[] = [];
   let current = location;
   
   while (current) {
       parts.push(current.name);
       current = current.parent;
   }
   
   return parts.join(', ');
}

/**
* Convierte los datos de la API al formato del formulario
* Maneja tanto fechas completas como parciales
*/
export function formatPersonDataForForm(person?: PersonWithRelations | null): PersonFormData {
   if (!person) return DEFAULT_PERSON_FORM_VALUES;

   const formData: PersonFormData = {
       firstName: person.firstName || '',
       lastName: person.lastName || '',
       realName: person.realName || '',
       birthDate: '',
       deathDate: '',
       birthLocationId: person.birthLocationId || null,
       deathLocationId: person.deathLocationId || null,
       birthLocation: person.birthLocation ? formatLocationPath(person.birthLocation) : '',
       deathLocation: person.deathLocation ? formatLocationPath(person.deathLocation) : '',
       biography: person.biography || '',
       photoUrl: person.photoUrl || '',
       gender: person.gender || '',
       hideAge: person.hideAge || false,
       isActive: person.isActive ?? true,
       links: person.links || [], // Cargar los links directamente si vienen
       nationalities: []
   };

   // Procesar fecha de nacimiento
   if ('birthYear' in person && person.birthYear) {
       const birthPartial: PartialDate = {
           year: person.birthYear,
           month: person.birthMonth ?? null,  // Usar ?? para convertir undefined a null
           day: person.birthDay ?? null       // Usar ?? para convertir undefined a null
       };

       // Si la fecha está completa (año, mes y día), convertirla a formato ISO
       if (person.birthYear && person.birthMonth && person.birthDay) {
           const isoDate = partialFieldsToDate(birthPartial);
           if (isoDate) {
               formData.birthDate = isoDate;
               formData.isPartialBirthDate = false;
           }
       } else {
           // Es una fecha parcial
           formData.partialBirthDate = birthPartial;
           formData.isPartialBirthDate = true;
           formData.birthDate = '';
       }
   } else if (person.birthDate) {
       // Fallback para formato antiguo con birthDate como string
       formData.birthDate = person.birthDate.split('T')[0];
       formData.isPartialBirthDate = false;
   }

   // Procesar fecha de fallecimiento
   if ('deathYear' in person && person.deathYear) {
       const deathPartial: PartialDate = {
           year: person.deathYear,
           month: person.deathMonth ?? null,  // Usar ?? para convertir undefined a null
           day: person.deathDay ?? null       // Usar ?? para convertir undefined a null
       };

       // Si la fecha está completa (año, mes y día), convertirla a formato ISO
       if (person.deathYear && person.deathMonth && person.deathDay) {
           const isoDate = partialFieldsToDate(deathPartial);
           if (isoDate) {
               formData.deathDate = isoDate;
               formData.isPartialDeathDate = false;
           }
       } else {
           // Es una fecha parcial
           formData.partialDeathDate = deathPartial;
           formData.isPartialDeathDate = true;
           formData.deathDate = '';
       }
   } else if (person.deathDate) {
       // Fallback para formato antiguo con deathDate como string
       formData.deathDate = person.deathDate.split('T')[0];
       formData.isPartialDeathDate = false;
   }

   // Procesar nacionalidades si existen
   if (person.nationalities && Array.isArray(person.nationalities)) {
       formData.nationalities = person.nationalities.map((n: any) => {
           // Si es un número directo
           if (typeof n === 'number') return n;

           // Si es un objeto
           if (typeof n === 'object' && n !== null) {
               // Intentar extraer el ID de diferentes estructuras posibles
               if (n.locationId) return n.locationId;
               if (n.location && n.location.id) return n.location.id;
               if (n.id) return n.id;
           }

           return null;
       }).filter((id: any) => id !== null);
   }

   return formData;
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

   // Validar fechas si ambas son completas
   if (data.birthDate && data.deathDate) {
       const birthDate = new Date(data.birthDate);
       const deathDate = new Date(data.deathDate);

       if (deathDate < birthDate) {
           errors.push('La fecha de fallecimiento debe ser posterior a la fecha de nacimiento');
       }
   }

   // Validar fechas parciales
   if (data.isPartialBirthDate && data.partialBirthDate &&
       data.isPartialDeathDate && data.partialDeathDate) {
       const birthYear = data.partialBirthDate.year;
       const deathYear = data.partialDeathDate.year;

       if (birthYear && deathYear && deathYear < birthYear) {
           errors.push('El año de fallecimiento debe ser posterior al año de nacimiento');
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
* Actualizada para manejar fechas parciales
*/
export function formatBirthInfo(person: any): string {
   // Si hay campos de fecha parcial
   if ('birthYear' in person && person.birthYear) {
       if (person.hideAge) return 'Fecha oculta';

       let dateStr = '';
       if (person.birthDay && person.birthMonth) {
           // Fecha completa
           const date = new Date(person.birthYear, person.birthMonth - 1, person.birthDay);
           dateStr = date.toLocaleDateString('es-AR', {
               day: '2-digit',
               month: '2-digit',
               year: 'numeric',
           });

           // Calcular edad si no hay fecha de muerte
           if (!person.deathYear) {
               const age = calculateAge(date);
               return `${dateStr} (${age} años)`;
           }
       } else if (person.birthMonth) {
           // Solo año y mes
           const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
               'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
           dateStr = `${months[person.birthMonth - 1]} ${person.birthYear}`;
       } else {
           // Solo año
           dateStr = String(person.birthYear);
       }

       return dateStr;
   }

   // Fallback al formato antiguo
   if (!person.birthDate) return '-';
   if (person.hideAge) return 'Fecha oculta';

   const birthDate = new Date(person.birthDate);
   const formattedDate = birthDate.toLocaleDateString('es-AR', {
       day: '2-digit',
       month: '2-digit',
       year: 'numeric',
   });

   if (!person.deathDate) {
       const age = calculateAge(birthDate);
       return `${formattedDate} (${age} años)`;
   }

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
* Actualizada para manejar fechas parciales
*/
export function getPersonSummary(person: any): string {
   const parts = [];

   // Manejar fecha de nacimiento
   if ('birthYear' in person && person.birthYear && !person.hideAge) {
       parts.push(`n. ${person.birthYear}`);
   } else if (person.birthDate && !person.hideAge) {
       const year = new Date(person.birthDate).getFullYear();
       parts.push(`n. ${year}`);
   }

   // Manejar fecha de fallecimiento
   if ('deathYear' in person && person.deathYear) {
       parts.push(`f. ${person.deathYear}`);
   } else if (person.deathDate) {
       const year = new Date(person.deathDate).getFullYear();
       parts.push(`f. ${year}`);
   }

   return parts.join(' - ');
}