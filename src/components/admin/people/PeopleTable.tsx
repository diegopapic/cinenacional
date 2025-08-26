// src/components/admin/people/PeopleTable.tsx

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Edit, 
  Trash2, 
  Search, 
  Eye, 
  Download,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Users
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { usePeople } from '@/hooks/usePeople';
import { formatPersonName, formatGender, getPersonSummary } from '@/lib/people/peopleUtils';
import { GENDER_OPTIONS, PEOPLE_PAGINATION } from '@/lib/people/peopleConstants';

export function PeopleTable() {
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteName, setDeleteName] = useState<string>('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const {
    people,
    totalCount,
    currentPage,
    totalPages,
    loading,
    filters,
    updateFilter,
    deletePerson,
    exportToCSV,
    goToNextPage,
    goToPreviousPage,
    canGoNext,
    canGoPrevious,
  } = usePeople();

  const handleDelete = async () => {
    if (deleteId) {
      try {
        await deletePerson(deleteId);
        setShowDeleteDialog(false);
        setDeleteId(null);
      } catch (error) {
        // El error ya se maneja en el hook
      }
    }
  };

  const handleDeleteClick = (person: any) => {
    setDeleteId(person.id);
    setDeleteName(formatPersonName(person));
    setShowDeleteDialog(true);
  };

  return (
    <>
      {/* Filtros */}
      <div className="mb-4 flex flex-wrap gap-4">
        <div className="relative flex-1 max-w-sm">
  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
  <input
    type="text"
    placeholder="Buscar por nombre..."
    value={filters.search || ''}
    onChange={(e) => updateFilter('search', e.target.value)}
    className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
  />
  {/* Indicador de búsqueda en progreso */}
  {loading && filters.search && (
    <div className="absolute right-3 top-2.5">
      <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
    </div>
  )}
</div>
        
        <select
          value={filters.gender || ''}
          onChange={(e) => updateFilter('gender', e.target.value as any)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
        >
          <option value="">Todos los géneros</option>
          {GENDER_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={String(filters.isActive ?? '')}
          onChange={(e) => updateFilter('isActive', e.target.value === '' ? '' : e.target.value === 'true')}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
        >
          <option value="">Todos</option>
          <option value="true">Activos</option>
          <option value="false">Inactivos</option>
        </select>

        <button
          onClick={exportToCSV}
          disabled={loading}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Exportar CSV
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nombre
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nombre Real
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Información
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Género
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Links
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Películas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                    <p className="mt-2 text-gray-500">Cargando personas...</p>
                  </td>
                </tr>
              ) : people?.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">
                      {filters.search 
                        ? 'No se encontraron personas con ese criterio de búsqueda' 
                        : 'No hay personas registradas'}
                    </p>
                  </td>
                </tr>
              ) : (
                people?.map((person) => (
                  <tr key={person.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatPersonName(person)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {person.realName || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {person.birthDate ? (
                        person.hideAge ? (
                          <span className="italic">Fecha oculta</span>
                        ) : (
                          getPersonSummary(person)
                        )
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatGender(person.gender)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {person._count?.links ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {person._count.links} {person._count.links === 1 ? 'link' : 'links'}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {(person._count?.castRoles || 0) + (person._count?.crewRoles || 0) > 0 ? (
                        <div>
                          {person._count?.castRoles || 0} como actor
                          {((person._count?.crewRoles || 0) > 0) && (
                            <>, {person._count?.crewRoles || 0} como crew</>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        person.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {person.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <Link 
                          href={`/admin/people/${person.id}`}
                          className="text-gray-600 hover:text-gray-900 transition-colors"
                          title="Ver detalles"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link 
                          href={`/admin/people/${person.id}/edit`}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDeleteClick(person)}
                          disabled={
                            (person._count?.castRoles || 0) + (person._count?.crewRoles || 0) > 0
                          }
                          className="text-red-600 hover:text-red-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title={
                            (person._count?.castRoles || 0) + (person._count?.crewRoles || 0) > 0
                              ? "No se puede eliminar porque tiene películas asociadas"
                              : "Eliminar"
                          }
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Información y paginación */}
      {people && people.length > 0 && totalPages > 1 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-4 rounded-lg shadow">
          {/* Vista móvil */}
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={goToPreviousPage}
              disabled={!canGoPrevious || loading}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            <button
              onClick={goToNextPage}
              disabled={!canGoNext || loading}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Siguiente
            </button>
          </div>

          {/* Vista desktop */}
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Mostrando <span className="font-medium">
                  {((currentPage - 1) * PEOPLE_PAGINATION.DEFAULT_LIMIT) + 1}
                </span> - <span className="font-medium">
                  {Math.min(currentPage * PEOPLE_PAGINATION.DEFAULT_LIMIT, totalCount)}
                </span> de <span className="font-medium">{totalCount}</span> personas
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={goToPreviousPage}
                  disabled={!canGoPrevious || loading}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-5 w-5" />
                  Anterior
                </button>
                
                <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                  Página {currentPage} de {totalPages}
                </span>
                
                <button
                  onClick={goToNextPage}
                  disabled={!canGoNext || loading}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Siguiente
                  <ChevronRight className="h-5 w-5" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              ¿Estás seguro?
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Esta acción no se puede deshacer. Se eliminará permanentemente a{' '}
              <span className="font-semibold">{deleteName}</span> del sistema.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteDialog(false);
                  setDeleteId(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}