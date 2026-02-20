// src/components/admin/people/PersonFormFields/LocationFields.tsx

import { useState, useEffect, useCallback, useRef } from 'react';
import { PersonFormData } from '@/lib/people/peopleTypes';
import { MapPin, Search, X, Loader2 } from 'lucide-react';

interface LocationFieldsProps {
  formData: PersonFormData;
  updateField: <K extends keyof PersonFormData>(field: K, value: PersonFormData[K]) => void;
}

interface Location {
  id: number;
  name: string;
  slug: string;
  parentId?: number;
  path?: string;
  parent?: {
    name: string;
    parent?: {
      name: string;
    };
  };
}

// ID conocido de Ciudad de Buenos Aires en la base de datos
const CABA_LOCATION = {
  id: 1, // Se buscará dinámicamente
  name: 'Ciudad de Buenos Aires',
  path: 'Ciudad de Buenos Aires, Argentina'
};

// Componente de Autocompletado reutilizable
function LocationAutocomplete({
  value,
  onChange,
  placeholder,
  disabled = false,
  label,
  showCabaButton = false
}: {
  value: number | null;
  onChange: (locationId: number | null, locationName: string) => void;
  placeholder: string;
  disabled?: boolean;
  label: string;
  showCabaButton?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [displayValue, setDisplayValue] = useState('');
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cargar el valor inicial si existe
  useEffect(() => {
    if (value) {
      fetchLocationById(value);
    }
  }, [value]);

  // Obtener ubicación por ID
  const fetchLocationById = async (locationId: number) => {
    try {
      const response = await fetch(`/api/locations/${locationId}`);
      if (response.ok) {
        const location = await response.json();
        // Usar el path completo que ya viene del API
        const formatted = location.path || formatLocationDisplay(location);
        setDisplayValue(formatted);
        setSearchTerm(formatted);
      }
    } catch (error) {
      console.error('Error fetching location:', error);
    }
  };

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Buscar ubicaciones (debounce manual)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchLocations = useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query || query.length < 2) {
      setLocations([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/locations/search?q=${encodeURIComponent(query)}`);
        if (response.ok) {
          const data = await response.json();
          setLocations(data);
        }
      } catch (error) {
        console.error('Error searching locations:', error);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, []);

  // Formatear la ubicación para mostrar (con jerarquía)
  const formatLocationDisplay = (location: Location): string => {
    const parts = [location.name];
    
    // Si tiene path, usarlo directamente
    if ('path' in location && location.path) {
      return location.path;
    }
    
    // Si no, construir la jerarquía
    if (location.parent) {
      parts.push(location.parent.name);
      if (location.parent.parent) {
        parts.push(location.parent.parent.name);
      }
    }
    
    return parts.join(', ');
  };

  // Manejar cambio en el input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setDisplayValue(value);
    
    if (value.length >= 2) {
      setIsOpen(true);
      searchLocations(value);
    } else {
      setIsOpen(false);
      setLocations([]);
    }
  };

  // Seleccionar una ubicación
  const handleSelectLocation = (location: Location) => {
    const formatted = formatLocationDisplay(location);
    console.log('Selected location:', { location, formatted });
    setSearchTerm(formatted);
    setDisplayValue(formatted);
    onChange(location.id, formatted);
    setIsOpen(false);
    setLocations([]);
  };

  // Limpiar campo
  const handleClear = () => {
    setSearchTerm('');
    setDisplayValue('');
    onChange(null, '');
    setLocations([]);
    inputRef.current?.focus();
  };

  // Setear Ciudad de Buenos Aires
  const handleSetCaba = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/locations/search?q=${encodeURIComponent('Ciudad de Buenos Aires')}`);
      if (response.ok) {
        const data = await response.json();
        // Buscar la ubicación exacta de CABA
        const caba = data.find((loc: Location) =>
          loc.name === 'Ciudad de Buenos Aires' ||
          loc.name === 'Ciudad Autónoma de Buenos Aires'
        );
        if (caba) {
          const formatted = formatLocationDisplay(caba);
          setSearchTerm(formatted);
          setDisplayValue(formatted);
          onChange(caba.id, formatted);
        }
      }
    } catch (error) {
      console.error('Error setting CABA:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label htmlFor={label} className="block text-sm font-medium text-gray-700">
          <span className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            {label}
          </span>
        </label>
        {showCabaButton && !disabled && (
          <button
            type="button"
            onClick={handleSetCaba}
            disabled={loading}
            className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors disabled:opacity-50"
            title="Ciudad de Buenos Aires, Argentina"
          >
            CABA
          </button>
        )}
      </div>
      <div className="relative" ref={dropdownRef}>
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            id={label}
            value={searchTerm}
            onChange={handleInputChange}
            onFocus={() => searchTerm.length >= 2 && setIsOpen(true)}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 disabled:bg-gray-50 disabled:text-gray-500"
            autoComplete="off"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          {searchTerm && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>

        {/* Dropdown de resultados */}
        {isOpen && !disabled && (
          <div className="absolute z-50 mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-200 max-h-60 overflow-auto">
            {loading ? (
              <div className="px-4 py-3 text-center">
                <Loader2 className="h-4 w-4 animate-spin inline-block text-gray-500" />
                <span className="ml-2 text-sm text-gray-500">Buscando...</span>
              </div>
            ) : locations.length > 0 ? (
              <ul className="py-1">
                {locations.map((location) => (
                  <li key={location.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectLocation(location)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none transition-colors"
                    >
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {location.name}
                          </div>
                          {(location.parent?.name || location.parent?.parent?.name) && (
                            <div className="text-xs text-gray-500">
                              {[location.parent?.name, location.parent?.parent?.name]
                                .filter(Boolean)
                                .join(', ')}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            ) : searchTerm.length >= 2 ? (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                No se encontraron ubicaciones
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

export function LocationFields({ formData, updateField }: LocationFieldsProps) {
  const handleBirthLocationChange = (locationId: number | null, locationName: string) => {
    console.log('Birth location change:', { locationId, locationName });
    // Actualizar tanto el ID como el texto
    updateField('birthLocationId', locationId);
    updateField('birthLocation', locationName);
  };

  const handleDeathLocationChange = (locationId: number | null, locationName: string) => {
    console.log('Death location change:', { locationId, locationName });
    // Actualizar tanto el ID como el texto
    updateField('deathLocationId', locationId);
    updateField('deathLocation', locationName);
  };

  return (
    <div className="space-y-6">
      {/* Lugar de Nacimiento */}
      <LocationAutocomplete
        value={formData.birthLocationId || null}
        onChange={handleBirthLocationChange}
        placeholder="Buscar ciudad, provincia o país"
        label="Lugar de Nacimiento"
        showCabaButton={true}
      />

      {/* Lugar de Fallecimiento */}
      <LocationAutocomplete
        value={formData.deathLocationId || null}
        onChange={handleDeathLocationChange}
        placeholder="Buscar ciudad, provincia o país"
        disabled={false}
        label="Lugar de Fallecimiento"
        showCabaButton={true}
      />
    </div>
  );
}