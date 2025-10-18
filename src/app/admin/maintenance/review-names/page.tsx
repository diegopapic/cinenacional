'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface CaseToReview {
  id: number;
  firstName: string;
  lastName: string;
  slug: string;
  totalRoles: number;
  firstNameWords: number;
  lastNameWords: number;
}

export default function ReviewNamesPage() {
  const router = useRouter();
  const [cases, setCases] = useState<CaseToReview[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  // Cargar casos al montar
  useEffect(() => {
    loadCases();
  }, []);

  // Actualizar form cuando cambia el caso actual
  useEffect(() => {
    if (cases.length > 0 && cases[currentIndex]) {
      const currentCase = cases[currentIndex];
      setFirstName(currentCase.firstName);
      setLastName(currentCase.lastName);
    }
  }, [currentIndex, cases]);

  const loadCases = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/people/review-names');
      const data = await response.json();
      
      if (data.cases) {
        setCases(data.cases);
        if (data.cases.length === 0) {
          toast.success('¡No hay casos para revisar!');
        }
      }
    } catch (error) {
      console.error('Error loading cases:', error);
      toast.error('Error al cargar casos');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!cases[currentIndex]) return;
    
    try {
      setSaving(true);
      
      const response = await fetch('/api/people/review-names', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: cases[currentIndex].id,
          firstName: firstName.trim(),
          lastName: lastName.trim()
        })
      });

      if (!response.ok) {
        throw new Error('Error al guardar');
      }

      toast.success('Cambios guardados');
      
      // Remover caso actual de la lista
      const newCases = cases.filter((_, index) => index !== currentIndex);
      setCases(newCases);
      
      // Ajustar índice si es necesario
      if (currentIndex >= newCases.length && newCases.length > 0) {
        setCurrentIndex(newCases.length - 1);
      }

      // Si no quedan más casos
      if (newCases.length === 0) {
        toast.success('¡Todos los casos revisados!');
      }

    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Error al guardar cambios');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    // Remover caso actual (marcarlo como correcto)
    const newCases = cases.filter((_, index) => index !== currentIndex);
    setCases(newCases);
    
    // Ajustar índice
    if (currentIndex >= newCases.length && newCases.length > 0) {
      setCurrentIndex(newCases.length - 1);
    }

    toast.success('Caso marcado como correcto');

    if (newCases.length === 0) {
      toast.success('¡Todos los casos revisados!');
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < cases.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando casos...</p>
        </div>
      </div>
    );
  }

  if (cases.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            ¡Todos los casos revisados!
          </h2>
          <p className="text-gray-600 mb-6">
            No hay más nombres para revisar
          </p>
          <button
            onClick={() => router.push('/admin/people')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Volver a Personas
          </button>
        </div>
      </div>
    );
  }

  const currentCase = cases[currentIndex];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Revisar Nombres
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Casos con más de 3 palabras en nombre o apellido
              </p>
            </div>
            <button
              onClick={() => router.push('/admin/people')}
              className="text-gray-600 hover:text-gray-900"
            >
              ← Volver
            </button>
          </div>
        </div>

        {/* Progress */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Caso {currentIndex + 1} de {cases.length}
            </span>
            <span className="text-sm text-gray-500">
              {Math.round(((currentIndex + 1) / cases.length) * 100)}% completado
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / cases.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Current Case */}
        <div className="bg-white rounded-lg shadow">
          {/* Case Info */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-2">
                  ID: {currentCase.id}
                </h2>
                <div className="space-y-1 text-sm text-gray-600">
                  <p>Slug: <span className="font-mono">{currentCase.slug}</span></p>
                  <p>Roles en películas: <span className="font-semibold">{currentCase.totalRoles}</span></p>
                  <p>
                    Palabras: {currentCase.firstNameWords} (nombre) / {currentCase.lastNameWords} (apellido)
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="p-6">
            <div className="space-y-6">
              {/* First Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre
                  <span className="ml-2 text-xs text-gray-500">
                    ({firstName.trim().split(/\s+/).length} palabra{firstName.trim().split(/\s+/).length !== 1 ? 's' : ''})
                  </span>
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Nombre"
                />
              </div>

              {/* Last Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Apellido
                  <span className="ml-2 text-xs text-gray-500">
                    ({lastName.trim().split(/\s+/).length} palabra{lastName.trim().split(/\s+/).length !== 1 ? 's' : ''})
                  </span>
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Apellido"
                />
              </div>

              {/* Preview */}
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="text-sm text-gray-600 mb-1">Vista previa:</p>
                <p className="text-lg font-medium text-gray-900">
                  {firstName.trim()} {lastName.trim()}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="p-6 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <button
              onClick={handleSkip}
              disabled={saving}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Marcar como Correcto
            </button>

            <button
              onClick={handleSave}
              disabled={saving || (!firstName.trim() && !lastName.trim())}
              className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Anterior
          </button>

          <span className="text-sm text-gray-600">
            Caso {currentIndex + 1} de {cases.length}
          </span>

          <button
            onClick={handleNext}
            disabled={currentIndex === cases.length - 1}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Siguiente →
          </button>
        </div>

        {/* Help Text */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2">💡 Consejos</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Si el nombre está correcto, haz clic en "Marcar como Correcto"</li>
            <li>• Los apellidos compuestos (ej: "de la Cruz") son correctos</li>
            <li>• Las bandas y grupos pueden tener nombres largos</li>
            <li>• Los cambios se guardan automáticamente</li>
          </ul>
        </div>
      </div>
    </div>
  );
}