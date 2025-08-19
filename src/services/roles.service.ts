// src/services/roles.service.ts

import { apiClient } from './api-client';
import type { 
  Role,
  RoleFormData, 
  RoleFilters, 
  PaginatedRolesResponse,
  Department 
} from '@/lib/roles/rolesTypes';

export const rolesService = {
  /**
   * Obtiene todos los roles con filtros y paginación
   */
  async getAll(filters: RoleFilters = {}): Promise<PaginatedRolesResponse> {
    const params: Record<string, string> = {};
    
    if (filters.search) params.search = filters.search;
    if (filters.department) params.department = filters.department;
    if (filters.isActive !== undefined && filters.isActive !== '') {
      params.isActive = filters.isActive.toString();
    }
    if (filters.isMainRole !== undefined && filters.isMainRole !== '') {
      params.isMainRole = filters.isMainRole.toString();
    }
    if (filters.page) params.page = filters.page.toString();
    if (filters.limit) params.limit = filters.limit.toString();

    return apiClient.get<PaginatedRolesResponse>('/roles', { params });
  },

  /**
   * Obtiene roles por departamento
   */
  async getByDepartment(department: Department): Promise<Role[]> {
    const params = {
      department: department,
      isActive: 'true',
      limit: '100'
    };

    const response = await apiClient.get<PaginatedRolesResponse>('/roles', { params });
    return response.data;
  },

  /**
   * Obtiene un rol por ID
   */
  async getById(id: number): Promise<Role> {
    return apiClient.get<Role>(`/roles/${id}`);
  },

  /**
   * Búsqueda rápida para autocomplete
   */
  async search(query: string, department?: Department, limit: number = 10): Promise<Role[]> {
    if (query.length < 2) return [];
    
    const params: Record<string, string> = {
      search: query,
      limit: limit.toString(),
      isActive: 'true'
    };

    if (department) params.department = department;

    const response = await apiClient.get<PaginatedRolesResponse>('/roles', { params });
    return response.data;
  },

  /**
   * Obtiene roles principales por departamento (para crew de películas)
   */
  async getMainRolesByDepartment(): Promise<Record<string, Role[]>> {
    const response = await apiClient.get<Record<string, Role[]>>('/roles/main-by-department');
    return response;
  },

  /**
   * Obtiene lista simple para dropdowns
   */
  async getSimpleList(department?: Department): Promise<Pick<Role, 'id' | 'name' | 'department'>[]> {
    const params: Record<string, string> = {
      isActive: 'true',
      limit: '200'
    };

    if (department) params.department = department;

    const response = await apiClient.get<PaginatedRolesResponse>('/roles', { params });
    return response.data.map(role => ({
      id: role.id,
      name: role.name,
      department: role.department
    }));
  },

  /**
   * Crea un nuevo rol
   */
  async create(data: RoleFormData): Promise<Role> {
    console.log('🎭 Creating role:', data);
    
    const formattedData = {
      ...data,
      isActive: data.isActive ?? true,
      isMainRole: data.isMainRole ?? false
    };

    return apiClient.post<Role>('/roles', formattedData);
  },

  /**
   * Actualiza un rol existente
   */
  async update(id: number, data: RoleFormData): Promise<Role> {
    console.log('📝 Updating role:', id, data);
    
    return apiClient.put<Role>(`/roles/${id}`, data);
  },

  /**
   * Elimina un rol
   */
  async delete(id: number): Promise<void> {
    console.log('🗑️ Deleting role:', id);
    return apiClient.delete(`/roles/${id}`);
  },

  /**
   * Verifica disponibilidad de slug
   */
  async checkSlugAvailability(slug: string, excludeId?: number): Promise<boolean> {
    const params: Record<string, string> = { slug };
    if (excludeId) params.excludeId = excludeId.toString();

    try {
      await apiClient.get('/roles/check-slug', { params });
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Obtiene estadísticas de roles
   */
  async getStats(): Promise<{
    total: number;
    active: number;
    mainRoles: number;
    byDepartment: Record<number, number>;
  }> {
    return apiClient.get('/roles/stats');
  },

  /**
   * Exporta roles a CSV
   */
  async exportToCSV(filters: RoleFilters = {}): Promise<Blob> {
    const params: Record<string, string> = { export: 'csv' };
    
    if (filters.search) params.search = filters.search;
    if (filters.department) params.department = filters.department;
    if (filters.isActive !== undefined && filters.isActive !== '') {
      params.isActive = filters.isActive.toString();
    }
    if (filters.isMainRole !== undefined && filters.isMainRole !== '') {
      params.isMainRole = filters.isMainRole.toString();
    }

    const response = await fetch(`/api/roles?${new URLSearchParams(params)}`);
    return response.blob();
  },

  /**
   * Reordena roles dentro de un departamento
   */
  async reorder(roleIds: number[]): Promise<void> {
    return apiClient.post('/roles/reorder', { roleIds });
  },

  /**
   * Crea rol rápido con solo nombre y departamento
   */
  async createQuick(name: string, department: Department): Promise<Role> {
    return this.create({
      name,
      department,
      isActive: true
    });
  },

  /**
   * Crea roles por defecto
   */
  async seedDefault(): Promise<{ created: number; skipped: number }> {
    const response = await fetch('/api/roles/seed', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Error al crear roles por defecto');
    }
    
    return response.json();
  }
};