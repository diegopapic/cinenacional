// src/lib/roles/rolesTypes.ts

import { z } from 'zod';

// Enum de departamentos
export enum Department {
  DIRECCION = 'DIRECCION',
  PRODUCCION = 'PRODUCCION',
  GUION = 'GUION',
  FOTOGRAFIA = 'FOTOGRAFIA',
  ARTE = 'ARTE',
  MONTAJE = 'MONTAJE',
  SONIDO = 'SONIDO',
  MUSICA = 'MUSICA',
  VESTUARIO = 'VESTUARIO',
  MAQUILLAJE = 'MAQUILLAJE',
  EFECTOS = 'EFECTOS',
  ANIMACION = 'ANIMACION',
  OTROS = 'OTROS'
}

// Labels para mostrar al usuario
/**
 * DEPARTMENT_LABELS
 * @TODO Add documentation
 */
export const DEPARTMENT_LABELS = {
  [Department.DIRECCION]: 'Dirección',
  [Department.PRODUCCION]: 'Producción',
  [Department.GUION]: 'Guión',
  [Department.FOTOGRAFIA]: 'Dirección de Fotografía',
  [Department.ARTE]: 'Dirección de Arte',
  [Department.MONTAJE]: 'Montaje',
  [Department.SONIDO]: 'Sonido',
  [Department.MUSICA]: 'Música',
  [Department.VESTUARIO]: 'Vestuario',
  [Department.MAQUILLAJE]: 'Maquillaje',
  [Department.EFECTOS]: 'Efectos',
  [Department.ANIMACION]: 'Animación',
  [Department.OTROS]: 'Otros'
} as const;

// Colores para badges
/**
 * DEPARTMENT_COLORS
 * @TODO Add documentation
 */
export const DEPARTMENT_COLORS = {
  [Department.DIRECCION]: '#dc2626',
  [Department.PRODUCCION]: '#059669',
  [Department.GUION]: '#7c3aed',
  [Department.FOTOGRAFIA]: '#2563eb',
  [Department.ARTE]: '#ea580c',
  [Department.MONTAJE]: '#be185d',
  [Department.SONIDO]: '#0891b2',
  [Department.MUSICA]: '#7c2d12',
  [Department.VESTUARIO]: '#9333ea',
  [Department.MAQUILLAJE]: '#c2410c',
  [Department.EFECTOS]: '#0369a1',
  [Department.ANIMACION]: '#ca8a04',
  [Department.OTROS]: '#6b7280'
} as const;

// Interfaces principales
export interface Role {
  id: number;
  name: string;
  slug: string;
  department: Department;
  description?: string | null;
  isMainRole: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    crewRoles: number;
  };
}

// Formularios
export interface RoleFormData {
  name: string;
  description?: string;
  department: Department;
  isMainRole?: boolean;
  isActive?: boolean;
}

// Filtros
export interface RoleFilters {
  search?: string;
  department?: Department | '';
  isActive?: boolean | '';
  isMainRole?: boolean | '';
  page?: number;
  limit?: number;
}

// Respuestas paginadas
export interface PaginatedRolesResponse {
  data: Role[];
  totalCount: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

// Validación con Zod
/**
 * roleSchema
 * @TODO Add documentation
 */
export const roleSchema = z.object({
  name: z.string()
    .min(1, 'El nombre es requerido')
    .max(100, 'Máximo 100 caracteres')
    .trim(),
  description: z.string()
    .max(500, 'Máximo 500 caracteres')
    .optional()
    .or(z.literal('')),
  department: z.nativeEnum(Department, {
    errorMap: () => ({ message: 'Debe seleccionar un departamento' })
  }),
  isMainRole: z.boolean().optional(),
  isActive: z.boolean().optional()
});

export type RoleFormSchema = z.infer<typeof roleSchema>;

// Utilidades
/**
 * getDepartmentLabel
 * @TODO Add documentation
 */
export const getDepartmentLabel = (department: Department): string => {
  return DEPARTMENT_LABELS[department] || department;
};

/**
 * getDepartmentColor
 * @TODO Add documentation
 */
export const getDepartmentColor = (department: Department): string => {
  return DEPARTMENT_COLORS[department] || '#6b7280';
};

/**
 * getDepartmentOptions
 * @TODO Add documentation
 */
export const getDepartmentOptions = () => {
  return Object.values(Department).map(dept => ({
    value: dept,
    label: getDepartmentLabel(dept),
    color: getDepartmentColor(dept)
  }));
};