// src/lib/roles/roleUtils.ts
import { 
  Department, 
  DEPARTMENT_LABELS, 
  DEPARTMENT_COLORS,
  getDepartmentLabel as getLabel,
  getDepartmentColor as getColor,
  getDepartmentOptions as getOptions
} from './rolesTypes';

// Re-exportar el enum para mantener compatibilidad con imports existentes
export const DEPARTMENTS = Department;

// Re-exportar funciones desde rolesTypes
export const getDepartmentLabel = getLabel;
export const getDepartmentColor = getColor;
export const getDepartmentOptions = getOptions;

export function sortRolesByDepartment(roles: any[]): any[] {
  return [...roles].sort((a, b) => {
    // Roles principales primero
    if (a.isMainRole && !b.isMainRole) return -1;
    if (!a.isMainRole && b.isMainRole) return 1;
    
    // Por orden de departamento
    const deptOrder = Object.keys(DEPARTMENTS);
    const aIndex = deptOrder.indexOf(a.department);
    const bIndex = deptOrder.indexOf(b.department);
    
    if (aIndex !== bIndex) {
      return aIndex - bIndex;
    }
    
    // Alfabético por nombre
    return a.name.localeCompare(b.name, 'es');
  });
}

export function validateRole(name: string, department: Department): string | null {
  if (!name || name.trim().length === 0) {
    return 'El nombre del rol es requerido';
  }
  
  if (name.trim().length < 2) {
    return 'El nombre del rol debe tener al menos 2 caracteres';
  }
  
  if (name.trim().length > 100) {
    return 'El nombre del rol no puede exceder 100 caracteres';
  }
  
  if (!Object.values(Department).includes(department as Department)) {
    return 'Departamento inválido';
  }
  
  return null;
}