// src/app/admin/roles/page.tsx

'use client';

import React, { useState } from 'react';
import { Plus, Search, Download, Filter } from 'lucide-react';
import { useRoles } from '@/hooks/useRoles';
import { RoleModal } from '@/components/admin/roles/RoleModal';
import { RoleCard } from '@/components/admin/roles/RoleCard';
import { useDebounce } from '@/hooks/useDebounce';
import { Department, getDepartmentOptions } from '@/lib/roles/rolesTypes';
import toast from 'react-hot-toast';

export default function RolesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<'all' | Department>('all');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [mainRoleFilter, setMainRoleFilter] = useState<'all' | 'main' | 'regular'>('all');

  const debouncedSearch = useDebounce(searchTerm, 300);

  const {
    roles,
    totalCount,
    totalPages,
    currentPage,
    loading,
    error,
    filters,
    updateFilter,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    canGoNext,
    canGoPrevious,
    deleteRole,
    exportToCSV,
    seedDefault
  } = useRoles();

  // Aplicar filtros cuando cambien los valores
  React.useEffect(() => {
    updateFilter('search', debouncedSearch);
  }, [debouncedSearch, updateFilter]);

  React.useEffect(() => {
    const deptValue = departmentFilter === 'all' ? '' : departmentFilter;
    updateFilter('department', deptValue);
  }, [departmentFilter, updateFilter]);

  React.useEffect(() => {
    const isActiveValue = activeFilter === 'all' ? '' : activeFilter === 'active';
    updateFilter('isActive', isActiveValue);
  }, [activeFilter, updateFilter]);

  React.useEffect(() => {
    const isMainValue = mainRoleFilter === 'all' ? '' : mainRoleFilter === 'main';
    updateFilter('isMainRole', isMainValue);
  }, [mainRoleFilter, updateFilter]);

  const handleCreateNew = () => {
    setEditingRole(null);
    setIsModalOpen(true);
  };

  const handleEdit = (role: any) => {
    setEditingRole(role);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este rol?')) {
      try {
        await deleteRole(id);
        toast.success('Rol eliminado correctamente');
      } catch (error) {
        toast.error('Error al eliminar el rol');
      }
    }
  };

  const handleExport = async () => {
    try {
      await exportToCSV();
      toast.success('Exportación iniciada');
    } catch (error) {
      toast.error('Error al exportar');
    }
  };

  const handleSeedDefault = async () => {
    if (window.confirm('¿Quieres crear los roles por defecto? Esto no eliminará los existentes.')) {
      try {
        const result = await seedDefault();
        toast.success(`Se crearon ${result.created} roles nuevos (${result.skipped} ya existían)`);
      } catch (error) {
        toast.error('Error al crear roles por defecto');
      }
    }
  };

  const handleModalSuccess = () => {
    setIsModalOpen(false);
    setEditingRole(null);
  };

  const departmentOptions = getDepartmentOptions();

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error al cargar roles</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Intentar de nuevo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Roles</h1>
          <p className="text-gray-600">
            Gestiona los roles del equipo técnico y artístico
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSeedDefault}
            className="hidden sm:flex px-3 py-2 border border-gray-300 text-sm rounded-md hover:bg-gray-50"
          >
            Crear por defecto
          </button>
          <button
            onClick={handleExport}
            className="hidden sm:flex items-center gap-2 px-3 py-2 border border-gray-300 text-sm rounded-md hover:bg-gray-50"
          >
            <Download className="w-4 h-4" />
            Exportar
          </button>
          <button
            onClick={handleCreateNew}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Nuevo Rol
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar roles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">Filtros:</span>
          </div>
          
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">Todos los departamentos</option>
            {departmentOptions.map(dept => (
              <option key={dept.value} value={dept.value}>
                {dept.label}
              </option>
            ))}
          </select>

          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">Todos</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>

          <select
            value={mainRoleFilter}
            onChange={(e) => setMainRoleFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">Todos los tipos</option>
            <option value="main">Roles principales</option>
            <option value="regular">Roles regulares</option>
          </select>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <p className="text-sm text-gray-600">Total</p>
          <p className="text-2xl font-bold">{totalCount}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <p className="text-sm text-gray-600">Página</p>
          <p className="text-2xl font-bold">{currentPage} de {totalPages}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <p className="text-sm text-gray-600">Resultados</p>
          <p className="text-2xl font-bold">{roles.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <p className="text-sm text-gray-600">Departamento</p>
          <p className="text-sm font-medium">
            {departmentFilter === 'all' ? 'Todos' : 
             departmentOptions.find(d => d.value === departmentFilter)?.label}
          </p>
        </div>
      </div>

      {/* Lista de roles */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-lg border animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded mb-4 w-2/3"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      ) : roles.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No se encontraron roles</p>
          <button
            onClick={handleCreateNew}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 mx-auto"
          >
            <Plus className="w-4 h-4" />
            Crear primer rol
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((role) => (
            <RoleCard
              key={role.id}
              role={role}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={goToPreviousPage}
            disabled={!canGoPrevious}
            className="px-3 py-2 border border-gray-300 text-sm rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Anterior
          </button>
          <span className="text-sm text-gray-600">
            Página {currentPage} de {totalPages}
          </span>
          <button
            onClick={goToNextPage}
            disabled={!canGoNext}
            className="px-3 py-2 border border-gray-300 text-sm rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Siguiente
          </button>
        </div>
      )}

      {/* Modal */}
      <RoleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        role={editingRole}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
}