// src/components/admin/roles/RoleModal.tsx
'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { rolesService } from '@/services/roles.service';
import { getDepartmentOptions, getDepartmentColor, DEPARTMENTS } from '@/lib/roles/roleUtils';
import { Department } from '@/lib/roles/rolesTypes';

const roleSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  description: z.string().optional(),
  department: z.string(),
  isMainRole: z.boolean(),
  isActive: z.boolean()
});

type RoleFormData = z.infer<typeof roleSchema>;

interface Role {
  id: number;
  name: string;
  description?: string | null;
  department: string;
  isMainRole: boolean;
  isActive: boolean;
}

interface RoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  role?: Role | null;
  onSuccess: () => void;
}

export function RoleModal({
  isOpen,
  onClose,
  role,
  onSuccess
}: RoleModalProps) {
  const isEdit = !!role;
  const departmentOptions = getDepartmentOptions();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
    setValue
  } = useForm<RoleFormData>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: '',
      description: '',
      department: Department.DIRECCION,
      isMainRole: false,
      isActive: true
    }
  });

  // Cargar datos al editar
  React.useEffect(() => {
    if (isEdit && role) {
      reset({
        name: role.name,
        description: role.description || '',
        department: role.department,
        isMainRole: role.isMainRole,
        isActive: role.isActive
      });
    } else {
      reset({
        name: '',
        description: '',
        department: Department.DIRECCION,
        isMainRole: false,
        isActive: true
      });
    }
  }, [role, isEdit, reset]);

  const onSubmit = async (data: RoleFormData) => {
    try {
      const formattedData = {
        ...data,
        department: data.department as Department
      };
      
      if (isEdit && role) {
        await rolesService.update(role.id, formattedData);
        toast.success('Rol actualizado correctamente');
      } else {
        await rolesService.create(formattedData);
        toast.success('Rol creado correctamente');
      }
      
      onSuccess();
    } catch (error) {
      console.error('Error saving role:', error);
      toast.error(isEdit ? 'Error al actualizar rol' : 'Error al crear rol');
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  const selectedDepartment = watch('department');
  const selectedDepartmentColor = getDepartmentColor(selectedDepartment as Department);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-medium text-gray-900">
            {isEdit ? 'Editar Rol' : 'Nuevo Rol'}
          </h3>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {/* Nombre */}
          <div className="space-y-2">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Nombre del rol <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              {...register('name')}
              placeholder="Ej: Director, Productor, Gaffer..."
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.name && (
              <p className="text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          {/* Departamento */}
          <div className="space-y-2">
            <label htmlFor="department" className="block text-sm font-medium text-gray-700">
              Departamento <span className="text-red-500">*</span>
            </label>
            <select
              id="department"
              {...register('department')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSubmitting}
            >
              {departmentOptions.map(dept => (
                <option key={dept.value} value={dept.value}>
                  {dept.label}
                </option>
              ))}
            </select>
            {errors.department && (
              <p className="text-sm text-red-600">{errors.department.message}</p>
            )}
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Descripción
            </label>
            <textarea
              id="description"
              {...register('description')}
              placeholder="Descripción del rol (opcional)..."
              rows={3}
              disabled={isSubmitting}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.description && (
              <p className="text-sm text-red-600">{errors.description.message}</p>
            )}
          </div>

          {/* Rol principal */}
          <div className="flex items-center justify-between">
            <div>
              <label htmlFor="isMainRole" className="block text-sm font-medium text-gray-700">
                Rol principal
              </label>
              <p className="text-sm text-gray-500">
                Marca si es un rol de liderazgo en el departamento
              </p>
            </div>
            <input
              id="isMainRole"
              type="checkbox"
              {...register('isMainRole')}
              disabled={isSubmitting}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </div>

          {/* Estado activo */}
          <div className="flex items-center justify-between">
            <label htmlFor="isActive" className="block text-sm font-medium text-gray-700">
              Rol activo
            </label>
            <input
              id="isActive"
              type="checkbox"
              {...register('isActive')}
              disabled={isSubmitting}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </div>

          {/* Preview del rol */}
          <div className="p-3 rounded-lg border bg-gray-50">
            <p className="text-sm text-gray-600 mb-2">Vista previa:</p>
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                style={{ backgroundColor: selectedDepartmentColor }}
              >
                {departmentOptions.find(d => d.value === selectedDepartment)?.label}
              </span>
              <span className="font-medium">
                {watch('name') || 'Nombre del rol'}
              </span>
              {watch('isMainRole') && (
                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                  Principal
                </span>
              )}
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-gray-300 text-sm rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Guardando...' : isEdit ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}