// src/components/admin/roles/RoleCard.tsx
'use client';

import { Edit, Trash2, Users, Star } from 'lucide-react';
import { getDepartmentLabel, getDepartmentColor } from '@/lib/roles/roleUtils';
import { Department } from '@/lib/roles/rolesTypes';

interface Role {
  id: number;
  name: string;
  department: string;
  description?: string | null;
  isMainRole: boolean;
  isActive: boolean;
  _count?: {
    crewRoles: number;
  };
}

interface RoleCardProps {
  role: Role;
  onEdit: (role: Role) => void;
  onDelete: (id: number) => void;
}

export function RoleCard({ role, onEdit, onDelete }: RoleCardProps) {
  const departmentLabel = getDepartmentLabel(role.department as Department);
  const departmentColor = getDepartmentColor(role.department as Department);
  const usageCount = role._count?.crewRoles || 0;

  return (
    <div className="bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow">
      {/* Header con departamento */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <span
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
            style={{ backgroundColor: departmentColor }}
          >
            {departmentLabel}
          </span>
          <div className="flex items-center gap-1">
            {role.isMainRole && (
              <Star className="w-4 h-4 text-yellow-500 fill-current" />
            )}
            {!role.isActive && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                Inactivo
              </span>
            )}
          </div>
        </div>
        
        <h3 className="font-semibold text-gray-900 text-lg">
          {role.name}
        </h3>
        
        {role.description && (
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
            {role.description}
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="px-4 py-3 bg-gray-50">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1 text-gray-600">
            <Users className="w-4 h-4" />
            <span>{usageCount} uso{usageCount !== 1 ? 's' : ''}</span>
          </div>
          
          <div className="flex items-center gap-1">
            {role.isMainRole && (
              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded font-medium">
                Principal
              </span>
            )}
            <span className={`text-xs px-2 py-1 rounded font-medium ${
              role.isActive 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-600'
            }`}>
              {role.isActive ? 'Activo' : 'Inactivo'}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 pt-3">
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(role)}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 border border-gray-300 text-sm rounded-md hover:bg-gray-50"
          >
            <Edit className="w-4 h-4" />
            Editar
          </button>
          <button
            onClick={() => onDelete(role.id)}
            disabled={usageCount > 0}
            title={usageCount > 0 ? 'No se puede eliminar un rol en uso' : 'Eliminar rol'}
            className="px-3 py-2 border border-gray-300 text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-md"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        
        {usageCount > 0 && (
          <p className="text-xs text-gray-500 mt-2 text-center">
            No se puede eliminar (en uso)
          </p>
        )}
      </div>
    </div>
  );
}